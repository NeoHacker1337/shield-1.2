import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Alert,
  PermissionsAndroid, Platform, ActivityIndicator,
  TextInput, Modal, BackHandler, Animated, Easing,
  TouchableWithoutFeedback, Dimensions, Linking,
  AppState, NativeModules, StatusBar, SafeAreaView
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// ─── Styles & Theme ───────────────────────────────────────
import styles from '../../assets/FileLockerStyles';

// ─── Services ─────────────────────────────────────────────
import fileManager from '../../services/fileManager';
import { encryptFile, decryptFile, hashPassword } from '../../services/cryptoService';

// ─── Components ───────────────────────────────────────────
import CustomDrawerContent from '../../components/CustomDrawerContent';
import PasswordModal from '../FileLocker/components/PasswordModal';
import StorageModal from '../FileLocker/components/StorageModal';
import FileCreateModal from '../FileLocker/components/FileCreateModal';
import GalleryModal from '../FileLocker/components/GalleryModal';
import FileBrowser from '../FileLocker/components/FileBrowser';
import NewFolderModal from '../FileLocker/components/NewFolderModal';
import FileOptionsModal from '../FileLocker/components/FileOptionsModal';
import UploadProgress from '../FileLocker/components/UploadProgress';

// ─── Hooks ────────────────────────────────────────────────
import { useVault } from '../FileLocker/hooks/useVault';
import { usePassword } from '../FileLocker/hooks/usePassword';
import { usePermissions } from '../FileLocker/hooks/usePermissions';
import { useSecurityVisibility } from '../../context/SecurityVisibilityContext';
import { useChatVisibility } from '../../context/ChatVisibilityContext';

// ─── Utils ────────────────────────────────────────────────
import {
  ROOT_DIRECTORY, HIDDEN_FILES_DIR, METADATA_KEY,
  getFileType, getFileIcon, getFileIconColor,
  getParentDirectory, initializeHiddenDirectory,
} from '../../utils/fileHelpers';

import {
  verifyPin,
  LOGIN_AUTH_SERVICE,
  CHAT_HIDE_SERVICE,
  CHAT_LOCK_SERVICE,
  SECURITY_HIDE_SERVICE
} from '../../services/pinService';

import deviceService from './../../services/deviceService';

// ─────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────
const DRAWER_WIDTH_RATIO = 0.75;
const DRAWER_ANIMATION_DURATION = 280;

// ─────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────
const FileLockerScreen = ({ navigation }) => {

  // ─── Dimension-aware drawer width ─────────────────────
  const [screenWidth, setScreenWidth] = useState(() => Dimensions.get('window').width);
  const drawerWidth = useMemo(() => screenWidth * DRAWER_WIDTH_RATIO, [screenWidth]);

  // Listen for dimension changes (rotation, etc.)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // ─── Vault Hook ───────────────────────────────────────
  const {
    displayFiles, allFiles, currentPath, loading, refreshing,
    hiddenFolders, storagePaths,
    loadDirectory, saveHiddenFolders, loadHiddenFolders,
    getStoragePaths, setRefreshing, setHiddenFolders
  } = useVault();

  // ─── Password Hook ────────────────────────────────────
  const {
    protectedFiles, usedPasswords, originalLocations,
    loadProtectedFiles, saveProtectedFiles,
    loadUsedPasswords, saveUsedPasswords,
    loadOriginalLocations, saveOriginalLocations,
  } = usePassword();

  // ─── Permissions Hook ─────────────────────────────────
  const { checkAllFilesAccess, requestStoragePermission } = usePermissions();

  // ─── UI State ─────────────────────────────────────────
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [currentFileForPassword, setCurrentFileForPassword] = useState(null);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [showPasswordOverlay, setShowPasswordOverlay] = useState(false);
  const [overlayPassword, setOverlayPassword] = useState('');
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [fileBrowserVisible, setFileBrowserVisible] = useState(false);
  const [browserPath, setBrowserPath] = useState('');
  const [browserMode, setBrowserMode] = useState('open');
  const [globalPassword, setGlobalPassword] = useState('');
  const [galleryModalVisible, setGalleryModalVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [pendingFileSelection, setPendingFileSelection] = useState(null);
  const [unlockedFolderPath, setUnlockedFolderPath] = useState(null);
  const [fileOptionsModalVisible, setFileOptionsModalVisible] = useState(false);
  const [selectedFileForOptions, setSelectedFileForOptions] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('encrypting');
  const [cancelSource, setCancelSource] = useState(null);
  const [restoreTargetFile, setRestoreTargetFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('');

  // New Folder State
  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderPassword, setNewFolderPassword] = useState('');
  const [newFolderConfirmPassword, setNewFolderConfirmPassword] = useState('');
  const [newFolderStep, setNewFolderStep] = useState(1);

  // ─── Drawer State (FIXED: proper animation management) ─
  const drawerOffset = useRef(new Animated.Value(-1000)).current; // Start off-screen; set properly below
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnimating = useRef(false);
  const drawerMounted = useRef(false); // Track if drawer should render

  // ─── Derived State ────────────────────────────────────
  const isAtRoot = currentPath === ROOT_DIRECTORY;
  const isInsideUnlockedFolder = useMemo(
    () => !!unlockedFolderPath && currentPath.startsWith(unlockedFolderPath),
    [unlockedFolderPath, currentPath]
  );

  // ─── Context ──────────────────────────────────────────
  const {
    securityHidden: securityHideEnabled,
    setSecurityHidden
  } = useSecurityVisibility();

  const {
    chatHidden: chatHideEnabled,
    setChatHidden
  } = useChatVisibility();

  // ─── Sync drawer offset when drawerWidth changes ─────
  useEffect(() => {
    if (!drawerOpen) {
      drawerOffset.setValue(-drawerWidth);
    }
  }, [drawerWidth]);

  // ─── Drawer Animation (FIXED: prevents hanging) ──────
  const openDrawer = useCallback(() => {
    if (drawerAnimating.current) return;
    drawerAnimating.current = true;
    drawerMounted.current = true;
    setDrawerOpen(true);

    // Ensure starting position is correct before animating
    drawerOffset.setValue(-drawerWidth);

    Animated.parallel([
      Animated.timing(drawerOffset, {
        toValue: 0,
        duration: DRAWER_ANIMATION_DURATION,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.7,
        duration: DRAWER_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      drawerAnimating.current = false;
    });
  }, [drawerWidth, drawerOffset, overlayOpacity]);

  const closeDrawer = useCallback(() => {
    if (drawerAnimating.current) return;
    drawerAnimating.current = true;

    Animated.parallel([
      Animated.timing(drawerOffset, {
        toValue: -drawerWidth,
        duration: DRAWER_ANIMATION_DURATION,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: DRAWER_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      drawerAnimating.current = false;
      drawerMounted.current = false;
      setDrawerOpen(false);
    });
  }, [drawerWidth, drawerOffset, overlayOpacity]);

  const toggleDrawer = useCallback(() => {
    if (drawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }, [drawerOpen, openDrawer, closeDrawer]);

  // ─── Helpers (normalized hidden folders) ──────────────
  const normalizeHiddenFolders = useCallback((raw) => {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        return {};
      }
    }
    if (Array.isArray(raw)) {
      const obj = {};
      raw.forEach(p => { obj[p] = true; });
      return obj;
    }
    if (typeof raw === 'object') return { ...raw };
    return {};
  }, []);

  // ─── Permission recheck on resume (FIXED: was missing) ─
  const recheckPermissionsOnResume = useCallback(async () => {
    try {
      const hasAccess = await checkAllFilesAccess();
      if (!hasAccess) {
        setUnlockedFolderPath(null);
        setPendingFileSelection(null);
      }
    } catch (e) {
      console.error('Permission recheck error:', e);
    }
  }, [checkAllFilesAccess]);

  // ─── AppState: recheck permissions on resume ──────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        await recheckPermissionsOnResume();
      }
    });
    return () => subscription?.remove();
  }, [recheckPermissionsOnResume]);

  // ─── App Init (FIXED: consolidated from two useEffects) ─
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const hasAccess = await checkAllFilesAccess();
        if (!hasAccess) {
          setUnlockedFolderPath(null);
          setPendingFileSelection(null);
          // Still attempt initial directory load for UI
          try {
            await loadDirectory(ROOT_DIRECTORY);
          } catch (e) {
            console.log("❌ INIT ERROR (no access):", e);
          }
          return;
        }

        const [storedHidden, protectedRes, usedPwRes, originalRes] = await Promise.all([
          AsyncStorage.getItem('hiddenFolders'),
          AsyncStorage.getItem('protectedFiles'),
          AsyncStorage.getItem('usedPasswords'),
          AsyncStorage.getItem('originalLocations'),
        ]);

        let parsedHidden = normalizeHiddenFolders(storedHidden);

        let parsedProtected = {};
        if (protectedRes) {
          try {
            parsedProtected = JSON.parse(protectedRes);
          } catch {
            parsedProtected = {};
          }
        }

        let needsUpdate = false;
        Object.keys(parsedProtected).forEach(p => {
          const isDir = !p.match(/\.\w+$/);
          if (isDir && !parsedHidden[p]) {
            parsedHidden[p] = true;
            needsUpdate = true;
          }
        });
        if (needsUpdate) {
          await AsyncStorage.setItem('hiddenFolders', JSON.stringify(parsedHidden));
        }

        await Promise.all([
          loadProtectedFiles(),
          loadUsedPasswords(),
          loadOriginalLocations(),
          initializeHiddenDirectory(),
          getStoragePaths(),
        ]);

        await loadDirectory(ROOT_DIRECTORY, null, parsedHidden, parsedProtected);
      } catch (e) {
        console.error('Initialization error:', e);
        // Fallback: try basic directory load
        try {
          await loadDirectory(ROOT_DIRECTORY);
        } catch (innerErr) {
          console.log("❌ INIT FALLBACK ERROR:", innerErr);
        }
      }
    };
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Focus: verify permission on screen focus ─────────
  useFocusEffect(
    useCallback(() => {
      const verifyPermission = async () => {
        // 🔒 Always lock vault when screen regains focus
        setVaultUnlocked(false);

        const granted = await checkAllFilesAccess();
        if (!granted) {
          setUnlockedFolderPath(null);
          setPendingFileSelection(null);
          return;
        }

        const storedHidden = await AsyncStorage.getItem('hiddenFolders');
        const parsedHidden = normalizeHiddenFolders(storedHidden);

        const storedProtected = await AsyncStorage.getItem('protectedFiles');
        let parsedProtected = {};
        if (storedProtected) {
          try {
            parsedProtected = JSON.parse(storedProtected);
          } catch {
            parsedProtected = {};
          }
        }

        // Force reload all maps from AsyncStorage
        await Promise.all([
          loadProtectedFiles(),
          loadUsedPasswords(),
          loadOriginalLocations(),
        ]);

        setHiddenFolders(parsedHidden);
        loadDirectory(ROOT_DIRECTORY);
      };

      verifyPermission();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // ─── Unified Back Navigation Logic (FIXED: single source of truth) ─
  const handleNavigateBack = useCallback(() => {
    if (drawerOpen) {
      closeDrawer();
      return true;
    }
    if (showStorageModal) {
      setShowStorageModal(false);
      return true;
    }

    if (currentPath !== ROOT_DIRECTORY) {
      const parentPath = getParentDirectory(currentPath);

      if (unlockedFolderPath && currentPath.startsWith(unlockedFolderPath)) {
        if (parentPath === ROOT_DIRECTORY || currentPath === unlockedFolderPath) {
          const folderToHide = unlockedFolderPath;
          const newHiddenFolders = { ...hiddenFolders, [folderToHide]: true };

          AsyncStorage.setItem('hiddenFolders', JSON.stringify(newHiddenFolders));
          setHiddenFolders(newHiddenFolders);
          setUnlockedFolderPath(null);

          // 🔒 Lock vault when returning to root
          setVaultUnlocked(false);

          loadDirectory(ROOT_DIRECTORY, null, newHiddenFolders, protectedFiles);
          return true;
        }
      }

      loadDirectory(parentPath, unlockedFolderPath, hiddenFolders, protectedFiles);
      return true;
    }

    return false;
  }, [
    drawerOpen, closeDrawer, showStorageModal, currentPath,
    unlockedFolderPath, hiddenFolders, protectedFiles,
    setHiddenFolders, loadDirectory, setVaultUnlocked
  ]);

  // ─── Hardware back press (FIXED: uses unified handler) ─
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleNavigateBack);
    return () => sub.remove();
  }, [handleNavigateBack]);

  // ─── Helpers ──────────────────────────────────────────
  const showCustomAlert = useCallback((title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setCustomAlertVisible(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDirectory(currentPath, unlockedFolderPath, hiddenFolders, protectedFiles);
  }, [currentPath, unlockedFolderPath, hiddenFolders, protectedFiles, setRefreshing, loadDirectory]);

  // Kept for external reference compatibility (uses unified handler)
  const handleBackPress = handleNavigateBack;

  const toggleFolderVisibility = useCallback(async (folderPath) => {
    const currentHidden = normalizeHiddenFolders(hiddenFolders);
    if (currentHidden[folderPath]) {
      delete currentHidden[folderPath];
    } else {
      currentHidden[folderPath] = true;
    }
    await saveHiddenFolders(currentHidden);
    loadDirectory(currentPath, unlockedFolderPath, currentHidden, protectedFiles);
  }, [hiddenFolders, normalizeHiddenFolders, saveHiddenFolders, loadDirectory, currentPath, unlockedFolderPath, protectedFiles]);

  const updateMediaStore = useCallback(async (filePath) => {
    if (Platform.OS === 'android') {
      try {
        const { MediaScanner } = require('react-native-media-scanner');
        await MediaScanner.scanFile(filePath);
      } catch { }
    }
  }, []);

  // ─── File Navigation ──────────────────────────────────
  const handleFilePress = (item) => {
    if (unlockedFolderPath && item.path.startsWith(unlockedFolderPath)) {
      if (item.isDirectory) {
        loadDirectory(item.path);
      } else {
        openFile(item);
      }
      return;
    }
    if (item.isDirectory) {
      if (unlockedFolderPath === item.path) {
        loadDirectory(item.path);
        return;
      }
      if (protectedFiles[item.path]) {
        setCurrentFileForPassword(item);
        setIsSettingPassword(false);
        setPasswordInput('');
        setPasswordModalVisible(true);
      } else {
        loadDirectory(item.path);
      }
    } else {
      if (protectedFiles[item.path]) {
        setCurrentFileForPassword(item);
        setIsSettingPassword(false);
        setPasswordInput('');
        setPasswordModalVisible(true);
      } else {
        openFile(item);
      }
    }
  };

  const openFile = async (item) => {
    const { name, path, fileId: passedFileId } = item;
    const type = getFileType(name);
    let fileId = passedFileId || null;
    try {
      if (!fileId) {
        const stored = await AsyncStorage.getItem('fileServerIds');
        const fileServerIds = stored ? JSON.parse(stored) : {};
        const entry = Object.entries(fileServerIds).find(
          ([key]) => key.toLowerCase() === name.toLowerCase()
        );
        fileId = entry ? entry[1] : null;
      }
    } catch (err) {
      console.error('Error loading fileId:', err);
    }
    navigation.navigate('FileViewer', {
      filePath: path,
      hiddenPath: item.hiddenPath || path,
      fileType: type,
      fileName: name,
      isProtected: !!protectedFiles[item.hiddenPath || item.path],
      passwordHash: protectedFiles[item.hiddenPath || item.path],
      fileId,
      onDelete: async (deletedPath, deletedPassword) => {
        const newProtectedFiles = { ...protectedFiles };
        delete newProtectedFiles[deletedPath];
        await AsyncStorage.setItem('protectedFiles', JSON.stringify(newProtectedFiles));
        const newUsedPasswords = new Set(usedPasswords);
        newUsedPasswords.delete(deletedPassword);
        await AsyncStorage.setItem('usedPasswords', JSON.stringify([...newUsedPasswords]));
        try {
          const s = await AsyncStorage.getItem('fileServerIds');
          const map = s ? JSON.parse(s) : {};
          delete map[deletedPath];
          await AsyncStorage.setItem('fileServerIds', JSON.stringify(map));
        } catch { }
        handleRefresh();
      },
      onSave: async () => true,
    });
  };


  // ─── Password Actions ─────────────────────────────────
  const handlePasswordSubmit = async () => {
    setProcessing(true);
    if (isSettingPassword) {
      // LOCK FILE
      try {
        const hasAccess = await checkAllFilesAccess();
        if (!hasAccess) { setProcessing(false); return; }

        if (!passwordInput || passwordInput.length < 4) {
          setProcessing(false);
          Alert.alert('Error', 'Password must be at least 4 characters.');
          return;
        }
        if (passwordInput !== confirmPassword) {
          setProcessing(false);
          Alert.alert('Error', 'Passwords do not match.');
          return;
        }

        const storedPw = await AsyncStorage.getItem('usedPasswords');
        const latestPasswords = storedPw ? new Set(JSON.parse(storedPw)) : new Set();
        if (latestPasswords.has(passwordInput)) {
          setProcessing(false);
          Alert.alert('Error', 'This password is already used for another file.');
          return;
        }

        const originalPath = currentFileForPassword?.path;
        const originalName = currentFileForPassword?.name;
        if (!originalPath) { setProcessing(false); Alert.alert('Error', 'No file selected'); return; }

        const existsBefore = await RNFS.exists(originalPath);
        if (!existsBefore) { setProcessing(false); Alert.alert('Error', 'Original file not found'); return; }

        const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const stealthName = `.shield.${uniqueId}.${originalName}`;
        const destPath = `${HIDDEN_FILES_DIR}/${stealthName}`;

        const vaultExists = await RNFS.exists(HIDDEN_FILES_DIR);
        if (!vaultExists) {
          await RNFS.mkdir(HIDDEN_FILES_DIR);
          await RNFS.writeFile(`${HIDDEN_FILES_DIR}/.nomedia`, '', 'utf8');
        }

        await encryptFile(originalPath, destPath, passwordInput);
        await RNFS.unlink(originalPath);

        await saveOriginalLocations({ ...originalLocations, [destPath]: originalPath });
        const hashed = hashPassword(passwordInput);
        await saveProtectedFiles({ ...protectedFiles, [destPath]: hashed });
        latestPasswords.add(passwordInput);
        await saveUsedPasswords(latestPasswords);

        try {
          let fileContentForAPI;
          try { fileContentForAPI = await RNFS.readFile(destPath, 'utf8'); }
          catch { fileContentForAPI = 'Encrypted file'; }
          await fileManager.saveFilePassword(originalName, fileContentForAPI, passwordInput);
        } catch { }

        setPasswordModalVisible(false);
        setPasswordInput('');
        setConfirmPassword('');
        setProcessing(false);
        Alert.alert('File Secured', `${originalName} encrypted and moved to vault.`);
        handleRefresh();
      } catch (error) {
        setProcessing(false);
        Alert.alert('Error', error?.message || 'Could not protect file.');
      }
    } else {
      // UNLOCK FILE or FOLDER
      try {
        const hiddenPath = currentFileForPassword?.path;
        if (!hiddenPath) { setProcessing(false); Alert.alert('Error', 'No item selected'); return; }
        if (!passwordInput) { setProcessing(false); Alert.alert('Error', 'Enter password'); return; }

        const savedHash = protectedFiles[hiddenPath];
        const inputHash = hashPassword(passwordInput);
        if (inputHash !== savedHash) {
          setProcessing(false);
          Alert.alert('Error', 'Incorrect password');
          return;
        }

        setPasswordModalVisible(false);
        setPasswordInput('');
        setProcessing(false);

        if (currentFileForPassword.isDirectory) {
          setUnlockedFolderPath(hiddenPath);
          setVaultUnlocked(true);
          const newHiddenFolders = { ...hiddenFolders };
          if (newHiddenFolders[hiddenPath]) {
            delete newHiddenFolders[hiddenPath];
            await saveHiddenFolders(newHiddenFolders);
          }
          await loadDirectory(hiddenPath, hiddenPath, newHiddenFolders, protectedFiles);
        } else {
          const tempPath = `${RNFS.CachesDirectoryPath}/${currentFileForPassword.name}`;
          await decryptFile(hiddenPath, tempPath, passwordInput);
          openFile({ ...currentFileForPassword, path: tempPath, hiddenPath });
        }
      } catch (e) {
        setProcessing(false);
        Alert.alert('Error', 'Failed to unlock');
      }
    }
  };


  const handleGlobalPasswordSubmit = async () => {
    if (!globalPassword) {
      Alert.alert('Error', 'Please enter password');
      return;
    }

    try {
      setProcessing(true);

      /* ===============================
         🔐 SECURITY PIN CHECK
      =============================== */
      const securityResult = await verifyPin(SECURITY_HIDE_SERVICE, globalPassword);
      const chatHideResult = await verifyPin(CHAT_HIDE_SERVICE, globalPassword);

      if (securityResult?.success === true) {
        setProcessing(false);
        setGlobalPassword('');
        navigation.navigate('Security');
        return;
      }

      if (chatHideResult?.success === true) {
        setProcessing(false);
        setGlobalPassword('');
        navigation.navigate('Chat');
        return;
      }


      /* ===============================
         ✅ LOAD LATEST DATA
      =============================== */
      const rawProtected = await AsyncStorage.getItem('protectedFiles');
      const latestProtected = rawProtected ? JSON.parse(rawProtected) : {};

      const inputHash = hashPassword(globalPassword);

      console.log('🔍 DEBUG protectedFiles:', latestProtected);
      console.log('🔍 DEBUG inputHash:', inputHash);

      /* ===============================
         🔍 FIND MATCHED PATH
      =============================== */
      const matchedPath = Object.keys(latestProtected).find(
        path => latestProtected[path] === inputHash
      );

      if (!matchedPath) {
        setProcessing(false);
        Alert.alert('Error', 'No file or folder matches this password');
        setGlobalPassword('');
        return;
      }

      /* ===============================
         📁 CHECK FILE EXISTS
      =============================== */
      const exists = await RNFS.exists(matchedPath);

      if (!exists) {
        setProcessing(false);
        Alert.alert('Not Found', 'The file or folder was deleted.');
        setGlobalPassword('');
        return;
      }

      const stat = await RNFS.stat(matchedPath);
      setProcessing(false);

      /* ===============================
         📂 FOLDER OPEN (DIRECT)
      =============================== */
      if (stat.isDirectory()) {

        console.log('🚀 Opening folder:', matchedPath);

        setUnlockedFolderPath(matchedPath);

        // ✅ Unlock vault — FlatList now shows folder contents
        setVaultUnlocked(true);

        await loadDirectory(
          matchedPath,
          matchedPath,
          {}, // empty hidden
          latestProtected
        );

        console.log('✅ Folder opened successfully');
        setGlobalPassword('');

      } else {

        /* ===============================
           📄 FILE OPEN
        =============================== */
        const fName = matchedPath.split('/').pop();
        const tempPath = `${RNFS.CachesDirectoryPath}/${fName}`;

        await decryptFile(matchedPath, tempPath, globalPassword);

        openFile({
          path: tempPath,
          name: fName,
          isDirectory: false,
          type: getFileType(fName),
        });

        setGlobalPassword('');
      }

    } catch (err) {
      console.log('❌ GLOBAL UNLOCK ERROR:', err);
      setProcessing(false);
      setGlobalPassword('');
      Alert.alert('Error', 'Failed to unlock');
    }
  };

  const handleOverlayPasswordSubmit = () => {
    if (!overlayPassword) { Alert.alert('Error', 'Please enter password'); return; }
    if (currentFileForPassword && protectedFiles[currentFileForPassword.path] === hashPassword(overlayPassword)) {
      setShowPasswordOverlay(false);
      setOverlayPassword('');
      openFile(currentFileForPassword);
    } else {
      Alert.alert('Error', 'Incorrect password');
      setOverlayPassword('');
    }
  };


  const removePasswordProtection = async (filePath, password) => {
    if (protectedFiles[filePath] !== hashPassword(password)) {
      Alert.alert('Error', 'Incorrect password. Cannot remove protection.');
      return false;
    }
    try {
      if (originalLocations[filePath]) {
        const originalPath = originalLocations[filePath];
        Alert.alert('Restore File', 'Do you want to restore the file to its original location?', [
          {
            text: 'Keep Hidden',
            onPress: async () => {
              const newP = { ...protectedFiles };
              delete newP[filePath];
              await saveProtectedFiles(newP);
              const newPw = new Set(usedPasswords);
              newPw.delete(password);
              await saveUsedPasswords(newPw);
              Alert.alert('Success', 'Password protection removed.');
            },
          },
          {
            text: 'Restore & Show',
            onPress: async () => {
              try {
                const originalDir = originalPath.substring(0, originalPath.lastIndexOf('/'));
                const dirExists = await RNFS.exists(originalDir);
                if (dirExists) {
                  let restorePath = originalPath;
                  if (await RNFS.exists(originalPath)) {
                    const parts = originalPath.split('/').pop().split('.');
                    const ext = parts.pop();
                    restorePath = `${originalDir}/${parts.join('.')}_restored.${ext}`;
                  }
                  await RNFS.moveFile(filePath, restorePath);
                  await updateMediaStore(restorePath);
                  const newO = { ...originalLocations };
                  delete newO[filePath];
                  await saveOriginalLocations(newO);
                  const newP = { ...protectedFiles };
                  delete newP[filePath];
                  await saveProtectedFiles(newP);
                  const newPw = new Set(usedPasswords);
                  newPw.delete(password);
                  await saveUsedPasswords(newPw);
                  Alert.alert('Success', 'File restored to original location.');
                } else {
                  Alert.alert('Error', 'Original directory no longer exists.');
                }
              } catch {
                Alert.alert('Error', 'Failed to restore file.');
              }
            },
          },
        ]);
      } else {
        const newP = { ...protectedFiles };
        delete newP[filePath];
        await saveProtectedFiles(newP);
        const newPw = new Set(usedPasswords);
        newPw.delete(password);
        await saveUsedPasswords(newPw);
        Alert.alert('Success', 'Password protection removed.');
      }
      return true;
    } catch (error) {
      Alert.alert('Error', 'Failed to remove protection: ' + error.message);
      return false;
    }
  };


  // ─── File Creation ────────────────────────────────────
  const handleCreateFile = async () => {
    if (!fileName.trim()) { Alert.alert('Error', 'File name cannot be empty'); return; }
    let finalFileName = fileName.includes('.') ? fileName : fileName + '.txt';
    const filePath = `${currentPath}/${finalFileName}`;
    try {
      await RNFS.writeFile(filePath, fileContent || ' ', 'utf8');
      setFileName('');
      setFileContent('');
      setFileModalVisible(false);
      handleRefresh();
      setTimeout(() => {
        setCurrentFileForPassword({ name: finalFileName, path: filePath, isDirectory: false, type: getFileType(finalFileName) });
        setIsSettingPassword(true);
        setPasswordInput('');
        setConfirmPassword('');
        setPasswordModalVisible(true);
      }, 500);
    } catch (err) {
      Alert.alert('Failed', 'Could not create file: ' + err.message);
    }
  };

  const handleCreateFolder = async () => {
    if (newFolderStep === 1) {
      if (!newFolderName.trim()) { Alert.alert('Error', 'Folder name cannot be empty'); return; }
      const folderPath = `${currentPath}/${newFolderName.trim()}`;
      if (await RNFS.exists(folderPath)) { Alert.alert('Error', 'A folder with this name already exists'); return; }
      setNewFolderStep(2);
      return;
    }


    if (!newFolderPassword || newFolderPassword.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters');
      return;
    }

    /* 🔒 Prevent using security PINs as folder password */
    const loginCheck = await verifyPin(LOGIN_AUTH_SERVICE, newFolderPassword);
    const chatHideCheck = await verifyPin(CHAT_HIDE_SERVICE, newFolderPassword);
    const chatLockCheck = await verifyPin(CHAT_LOCK_SERVICE, newFolderPassword);
    const securityCheck = await verifyPin(SECURITY_HIDE_SERVICE, newFolderPassword);

    if (
      loginCheck.success ||
      chatHideCheck.success ||
      chatLockCheck.success ||
      securityCheck.success
    ) {
      Alert.alert(
        "Invalid Password",
        "This password is already used as a security PIN"
      );
      return;
    }

    if (newFolderPassword !== newFolderConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    const folderPath = `${currentPath}/${newFolderName.trim()}`;
    try {
      const storedPw = await AsyncStorage.getItem('usedPasswords');
      const latestPasswords = storedPw ? new Set(JSON.parse(storedPw)) : new Set();
      if (latestPasswords.has(newFolderPassword)) {
        Alert.alert('Error', 'This password is already used for another file/folder');
        return;
      }
      await RNFS.mkdir(folderPath);
      const hashed = hashPassword(newFolderPassword);
      await saveProtectedFiles({ ...protectedFiles, [folderPath]: hashed });
      latestPasswords.add(newFolderPassword);
      await saveUsedPasswords(latestPasswords);
      const newHiddenFolders = { ...hiddenFolders, [folderPath]: true };
      await saveHiddenFolders(newHiddenFolders);
      Alert.alert('Folder Created', `"${newFolderName.trim()}" created and locked 🔒`);
      setNewFolderName('');
      setNewFolderPassword('');
      setNewFolderConfirmPassword('');
      setNewFolderStep(1);
      setNewFolderModalVisible(false);
      handleRefresh();
    } catch (err) {
      Alert.alert('Error', 'Could not create folder: ' + err.message);
    }
  };

  // ─── Storage & Browser ────────────────────────────────
  const handleBrowsePress = useCallback(async () => {
    try {
      const granted = await requestStoragePermission();
      if (granted) {
        setBrowserMode('setPassword');
        setShowStorageModal(true);
      } else {
        Alert.alert('Permission Denied', 'Cannot browse files without storage permission.');
      }
    } catch (err) {
      Alert.alert('Error', 'Permission request failed: ' + err.message);
    }
  }, [requestStoragePermission]);

  const handleUploadFile = async () => {
    try {
      const granted = await requestStoragePermission();
      if (granted) {
        setBrowserMode('upload');
        setBrowserPath(RNFS.ExternalStorageDirectoryPath);
        setFileBrowserVisible(true);
      } else {
        Alert.alert('Permission Denied', 'Cannot browse files without storage permission.');
      }
    } catch (err) {
      Alert.alert('Error', 'Permission request failed: ' + err.message);
    }
  };

  const handleStorageSelect = async (storageType) => {
    setShowStorageModal(false);
    try {
      let attemptedPath = '';
      switch (storageType) {
        case 'internal': attemptedPath = RNFS.ExternalStorageDirectoryPath; break;
        case 'external':
          if (Platform.OS === 'android') {
            try {
              const externalDirs = await RNFS.getAllExternalFilesDirs();
              attemptedPath = externalDirs?.length > 1
                ? externalDirs[1].split('/Android/')[0]
                : RNFS.ExternalStorageDirectoryPath;
            } catch { attemptedPath = RNFS.ExternalStorageDirectoryPath; }
          } else { attemptedPath = RNFS.DocumentDirectoryPath; }
          break;
        case 'downloads': attemptedPath = `${RNFS.ExternalStorageDirectoryPath}/Download`; break;
        case 'dcim':
          attemptedPath = `${RNFS.ExternalStorageDirectoryPath}/DCIM`;
          await loadGalleryImages(attemptedPath);
          setGalleryModalVisible(true);
          return;
        case 'documents': attemptedPath = `${RNFS.ExternalStorageDirectoryPath}/Documents`; break;
        default: attemptedPath = RNFS.ExternalStorageDirectoryPath;
      }
      const exists = await RNFS.exists(attemptedPath);
      if (!exists) { attemptedPath = ROOT_DIRECTORY; showCustomAlert('Access Issue', 'Selected directory not found.'); }
      try {
        const testDir = await RNFS.readDir(attemptedPath);
        if (!Array.isArray(testDir)) throw new Error('Not readable');
      } catch {
        attemptedPath = ROOT_DIRECTORY;
        showCustomAlert('Access Restricted', 'Cannot access selected directory.');
      }
      setBrowserPath(attemptedPath);
      setFileBrowserVisible(true);
    } catch (error) {
      showCustomAlert('Error', 'Unable to open storage browser.');
      setBrowserPath(ROOT_DIRECTORY);
      setFileBrowserVisible(true);
    }
  };

  const loadGalleryImages = async (basePath) => {
    try {
      let searchPaths = [basePath];
      const dcimCamera = `${basePath}/Camera`;
      if (await RNFS.exists(dcimCamera).catch(() => false)) searchPaths.push(dcimCamera);
      let allImgFiles = [];
      for (const path of searchPaths) {
        try {
          const items = await RNFS.readDir(path);
          allImgFiles = [...allImgFiles, ...items.filter(i => i?.path && i?.name)];
        } catch { }
      }
      const imageFiles = allImgFiles.filter(f => {
        const ext = f.name?.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext);
      });
      if (!imageFiles.length) { Alert.alert('Info', 'No images found.'); setGalleryImages([]); return; }
      imageFiles.sort((a, b) => new Date(b.mtime || 0) - new Date(a.mtime || 0));
      setGalleryImages(imageFiles.map(f => ({ name: f.name, path: f.path, mtime: f.mtime })));
    } catch (err) {
      Alert.alert('Error', 'Unable to load gallery images.');
    }
  };


  // ─── Browser File Selection ───────────────────────────
  const handleFileSelectInBrowser = async (item) => {
    if (browserMode === 'restoreUnlocked') {
      if (!item.isDirectory) { Alert.alert('Select Folder', 'Please select a destination folder.'); return; }
      setFileBrowserVisible(false);
      const file = restoreTargetFile;
      if (!file) return;
      try {
        let restorePath = `${item.path}/${file.name}`;
        if (await RNFS.exists(restorePath)) {
          const dot = file.name.lastIndexOf('.');
          restorePath = dot !== -1
            ? `${item.path}/${file.name.slice(0, dot)}_restored${file.name.slice(dot)}`
            : `${item.path}/${file.name}_restored`;
        }
        await RNFS.moveFile(file.path, restorePath);
        if (Platform.OS === 'android') { try { await RNFS.scanFile(restorePath); } catch { } }
        const newProtected = { ...protectedFiles };
        delete newProtected[file.path];
        await saveProtectedFiles(newProtected);
        const newOriginals = { ...originalLocations };
        delete newOriginals[file.path];
        await saveOriginalLocations(newOriginals);
        setRestoreTargetFile(null);
        setSelectedFileForOptions(null);
        Alert.alert('Success', `"${file.name}" restored successfully.`);
        handleRefresh();
      } catch (err) {
        Alert.alert('Error', 'Failed to restore: ' + err.message);
      }
      return;
    }

    if (browserMode === 'upload') {
      if (item.isDirectory) {
        Alert.alert('Select File', 'Please select a file, not a folder.');
        return;
      }
      setFileBrowserVisible(false);
      try {
        const destPath = unlockedFolderPath + '/' + item.name;
        let finalDestPath = destPath;
        if (await RNFS.exists(destPath)) {
          const dot = item.name.lastIndexOf('.');
          finalDestPath = dot !== -1
            ? unlockedFolderPath + '/' + item.name.slice(0, dot) + 'copy' + item.name.slice(dot)
            : unlockedFolderPath + '/' + item.name + 'copy';
        }

        setUploading(true);
        setUploadProgress(0);
        setUploadStage('encrypting');
        const source = axios.CancelToken.source();
        setCancelSource(source);

        try {
          await new Promise(r => setTimeout(r, 400));
          setUploadStage('uploading');
          await RNFS.copyFile(item.path, finalDestPath);

          // ── Gather extra data ──
          const fileStat = await RNFS.stat(finalDestPath).catch(() => ({ size: 0 }));
          const folderName = unlockedFolderPath.split('/').pop();
          const passwordHash = protectedFiles[unlockedFolderPath] || '';

          // ✅ Safe device ID with fallback
          let deviceId = '';
          try {
            const deviceInfo = await deviceService.getDeviceInfo();
            deviceId = deviceInfo?.deviceid || '';
            if (!deviceId) {
              const cached = await AsyncStorage.getItem('deviceId');
              deviceId = cached || '';
            }
          } catch { }

          // Detect MIME type
          const ext = item.name.split('.').pop()?.toLowerCase();
          const mimeMap = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
            gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4',
            mp3: 'audio/mpeg', pdf: 'application/pdf',
            txt: 'text/plain', doc: 'application/msword',
          };
          const mimeType = mimeMap[ext] || 'application/octet-stream';

          // Compute checksum
          let checksum = '';
          try {
            const fileBytes = await RNFS.readFile(finalDestPath, 'base64');
            checksum = CryptoJS.MD5(fileBytes).toString();
          } catch { }

          // ── Upload ──
          const res = await fileManager.uploadLockedFolderFile(
            folderName,
            item.name,
            finalDestPath,
            p => setUploadProgress(p),
            source.token,
            {
              passwordHash,
              originalLocation: item.path,
              fileSize: fileStat.size,
              mimeType,
              deviceId,
              checksum,
            }
          );

          if (res?.canceled) return;

          // ✅ Storage full — block and alert user
          if (res?.storageFull) {
            Alert.alert(
              '🚨 Storage Full',
              'Your vault storage is full. Upgrade your plan to continue uploading files.',
              [
                { text: 'Later', style: 'cancel' },
                { text: 'Upgrade Now', onPress: () => navigation.navigate('GetPremium') },
              ]
            );
            return;
          }

          if (!res?.success) {
            Alert.alert('Upload Failed', 'Files Not Encrypted');
            return; // ✅ stop here, don't show success
          }

          // ✅ Only reached if truly successful
          Alert.alert('Success', `${item.name} secured successfully.`);
          handleRefresh();

        } catch (e) {
          Alert.alert('Error', e.message);
        } finally {
          setUploading(false);
          setCancelSource(null);
        }

      } catch (err) {
        Alert.alert('Error', 'Failed to copy file: ' + err.message);
      }
      return;
    }


    if (browserMode === 'restore') {
      if (!item.isDirectory) { Alert.alert('Select Folder', 'Please select a folder to restore the file.'); return; }
      setFileBrowserVisible(false);
      await restoreFileToFolder(restoreTargetFile, item.path);
      setRestoreTargetFile(null);
      return;
    }

    setFileBrowserVisible(false);
    const hasAccess = await checkAllFilesAccess();
    if (!hasAccess) { setPendingFileSelection(item); return; }

    if (browserMode === 'setPassword') {
      setCurrentFileForPassword(item);
      setIsSettingPassword(true);
      setPasswordInput('');
      setConfirmPassword('');
      setPasswordModalVisible(true);
    } else if (protectedFiles[item.path]) {
      setCurrentFileForPassword(item);
      setShowPasswordOverlay(true);
      setOverlayPassword('');
    } else {
      openFile(item);
    }
  };

  const restoreFileToFolder = async (file, targetDir) => {
    try {
      const hiddenPath = file.path;
      const password = protectedFiles[hiddenPath];
      if (!passwordInput || hashPassword(passwordInput) !== password) {
        Alert.alert('Error', 'Incorrect password');
        return;
      }
      let restorePath = `${targetDir}/${file.name}`;
      if (await RNFS.exists(restorePath)) {
        const dot = file.name.lastIndexOf('.');
        restorePath = dot !== -1
          ? `${targetDir}/${file.name.slice(0, dot)}_restored${file.name.slice(dot)}`
          : `${targetDir}/${file.name}_restored`;
      }
      await RNFS.moveFile(hiddenPath, restorePath);
      if (Platform.OS === 'android') { await RNFS.scanFile(restorePath); }
      const pf = { ...protectedFiles };
      delete pf[hiddenPath];
      await saveProtectedFiles(pf);
      const ol = { ...originalLocations };
      delete ol[hiddenPath];
      await saveOriginalLocations(ol);
      const pw = new Set(usedPasswords);
      pw.delete(passwordInput);
      await saveUsedPasswords(pw);
      setPasswordModalVisible(false);
      setPasswordInput('');
      Alert.alert('Success', 'File restored successfully');
      handleRefresh();
    } catch (e) {
      Alert.alert('Error', 'Failed to restore file');
    }
  };


  // ─── Long Press (Unlocked folder) ────────────────────
  const handleUnlockedFileLongPress = useCallback((item) => {
    if (!unlockedFolderPath || item.isDirectory || item.name === '..') return;
    setSelectedFileForOptions(item);
    setFileOptionsModalVisible(true);
  }, [unlockedFolderPath]);

  const handleRestoreUnlockedFile = async () => {
    const item = selectedFileForOptions;
    if (!item) return;
    setFileOptionsModalVisible(false);
    if (originalLocations[item.path]) {
      const originalPath = originalLocations[item.path];
      const originalDir = originalPath.substring(0, originalPath.lastIndexOf('/'));
      Alert.alert('Restore File', `Restore "${item.name}" to its original location?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              if (!await RNFS.exists(originalDir)) {
                Alert.alert('Error', 'Original directory no longer exists.');
                return;
              }
              let restorePath = originalPath;
              if (await RNFS.exists(originalPath)) {
                const dot = item.name.lastIndexOf('.');
                restorePath = dot !== -1
                  ? `${originalDir}/${item.name.slice(0, dot)}_restored${item.name.slice(dot)}`
                  : `${originalDir}/${item.name}_restored`;
              }
              await RNFS.moveFile(item.path, restorePath);
              if (Platform.OS === 'android') { try { await RNFS.scanFile(restorePath); } catch { } }
              const newOriginals = { ...originalLocations };
              delete newOriginals[item.path];
              await saveOriginalLocations(newOriginals);
              if (protectedFiles[item.path]) {
                const newProtected = { ...protectedFiles };
                delete newProtected[item.path];
                await saveProtectedFiles(newProtected);
              }
              Alert.alert('Success', `"${item.name}" restored successfully.`);
              setSelectedFileForOptions(null);
              handleRefresh();
            } catch (err) {
              Alert.alert('Error', 'Failed to restore: ' + err.message);
            }
          },
        },
      ]);
    } else {
      setRestoreTargetFile(item);
      setBrowserMode('restoreUnlocked');
      setBrowserPath(RNFS.ExternalStorageDirectoryPath || ROOT_DIRECTORY);
      setFileBrowserVisible(true);
    }
  };

  const handleDeleteUnlockedFile = async () => {
    const item = selectedFileForOptions;
    if (!item) return;
    Alert.alert('Delete File', `Permanently delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setFileOptionsModalVisible(false);
          try {
            await RNFS.unlink(item.path);
            if (protectedFiles[item.path]) {
              const newP = { ...protectedFiles };
              delete newP[item.path];
              await saveProtectedFiles(newP);
            }
            if (originalLocations[item.path]) {
              const newO = { ...originalLocations };
              delete newO[item.path];
              await saveOriginalLocations(newO);
            }
            setSelectedFileForOptions(null);
            Alert.alert('Deleted', `"${item.name}" has been deleted.`);
            handleRefresh();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete: ' + err.message);
          }
        },
      },
    ]);
  };


  const cancelUpload = useCallback(() => {
    if (cancelSource) cancelSource.cancel('User canceled Encryption');
    setUploading(false);
  }, [cancelSource]);

  // ─── Modal Dismiss Handlers (memoized) ────────────────
  const handlePasswordModalCancel = useCallback(() => {
    setPasswordModalVisible(false);
  }, []);

  const handlePasswordModalRestore = useCallback(() => {
    setRestoreTargetFile(currentFileForPassword);
    setBrowserMode('restore');
    setBrowserPath(ROOT_DIRECTORY);
    setFileBrowserVisible(true);
  }, [currentFileForPassword]);

  const handlePasswordModalRemove = useCallback(async () => {
    if (!passwordInput) return;
    const ok = await removePasswordProtection(currentFileForPassword?.path, passwordInput);
    if (ok) setPasswordModalVisible(false);
  }, [passwordInput, currentFileForPassword]);

  const handleStorageModalClose = useCallback(() => {
    setShowStorageModal(false);
  }, []);

  const handleFileCreateModalCancel = useCallback(() => {
    setFileModalVisible(false);
    setFileName('');
    setFileContent('');
  }, []);

  const handleGalleryModalClose = useCallback(() => {
    setGalleryModalVisible(false);
  }, []);

  const handleGalleryOpen = useCallback((item) => {
    openFile({ path: item.path, name: item.name, type: 'image' });
  }, []);

  const handleFileBrowserClose = useCallback(() => {
    setFileBrowserVisible(false);
  }, []);

  const handleFileOptionsCancel = useCallback(() => {
    setFileOptionsModalVisible(false);
    setSelectedFileForOptions(null);
  }, []);

  const handleNewFolderBack = useCallback(() => {
    if (newFolderStep === 2) {
      setNewFolderStep(1);
    } else {
      setNewFolderName('');
      setNewFolderPassword('');
      setNewFolderConfirmPassword('');
      setNewFolderStep(1);
      setNewFolderModalVisible(false);
    }
  }, [newFolderStep]);

  const handleNewFolderCancel = useCallback(() => {
    setNewFolderName('');
    setNewFolderPassword('');
    setNewFolderConfirmPassword('');
    setNewFolderStep(1);
    setNewFolderModalVisible(false);
  }, []);

  const handleOverlayCancel = useCallback(() => {
    setShowPasswordOverlay(false);
  }, []);

  const handleAlertDismiss = useCallback(() => {
    setCustomAlertVisible(false);
  }, []);

  const handleOpenNewFolder = useCallback(() => {
    setNewFolderStep(1);
    setNewFolderModalVisible(true);
  }, []);

  // ─── Render File Item ─────────────────────────────────
  const renderFileItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.fileItem}
      onPress={() => handleFilePress(item)}
      onLongPress={() => handleUnlockedFileLongPress(item)}
      activeOpacity={0.7}
    >
      <Icon
        name={item.isDirectory ? 'folder' : getFileIcon(item.name)}
        size={28}
        color={item.isDirectory ? '#FFD700' : getFileIconColor(item.name)}
      />
      <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="tail">
        {item.name}
      </Text>
    </TouchableOpacity>
  ), [handleFilePress, handleUnlockedFileLongPress]);
  // ─── FlatList key extractor (memoized) ────────────────
  const keyExtractor = useCallback((item) => item.path, []);

  // ─── FlatList data ────────────────────────────────────
  const flatListData = useMemo(() => {
    if (!Array.isArray(displayFiles) || displayFiles.length === 0) return [];
    return vaultUnlocked ? displayFiles : [];
  }, [displayFiles, vaultUnlocked]);

  // ─── RENDER ───────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Ensure content respects system bars */}
      <StatusBar
        translucent={false}
        backgroundColor="#1a1a2e"
        barStyle="light-content"
      />

      {/* Drawer Overlay (FIXED: only rendered when needed) */}
      {(drawerOpen || drawerMounted.current) && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <Animated.View
            style={[
              styles.drawerOverlay,
              {
                opacity: overlayOpacity,
                // Ensure overlay doesn't block when fully transparent
                pointerEvents: drawerOpen ? 'auto' : 'none',
              }
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Drawer (FIXED: proper lifecycle, prevents hanging) */}
      {(drawerOpen || drawerMounted.current) && (
        <Animated.View
          style={[
            styles.drawerContainer,
            {
              width: drawerWidth,
              transform: [{ translateX: drawerOffset }],
            }
          ]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <CustomDrawerContent
              navigation={navigation}
              onClose={closeDrawer}
            />
          </SafeAreaView>
        </Animated.View>
      )}

      {/* Menu Button */}
      <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
        <Icon name="menu" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.contentContainer}>

          {/* Search / Global Password Card */}
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Icon name="search" size={20} color="#7A8A99" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Search File and Folder"
                placeholderTextColor="#7A8A99"
                value={globalPassword}
                onChangeText={setGlobalPassword}
                secureTextEntry={false}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleGlobalPasswordSubmit}>
              <Text style={styles.buttonText}>Search </Text>
              <Icon name="search" size={18} color="#fff" style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>

          {/* File List */}
          {/* {loading ? (
            <ActivityIndicator size="large" color="#4A90D9" style={{ marginTop: 40 }} />
          ) : displayFiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="folder-open" size={60} color="#333" />
              <Text style={styles.emptyText}>No folders found</Text>
            </View>
          ) : (
            <FlatList
              data={displayFiles}
              keyExtractor={item => item.path}
              renderItem={renderFileItem}
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          )} */}

          {flatListData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="folder-open" size={60} color="#333" />
              <Text style={styles.emptyText}>No folders found</Text>
            </View>
          ) : (
            <FlatList
              data={flatListData}
              keyExtractor={keyExtractor}
              renderItem={renderFileItem}
              contentContainerStyle={flatListContentStyle}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              removeClippedSubviews={true}
              maxToRenderPerBatch={15}
              windowSize={10}
            />
          )}

        </View>
      </View>

      {/* Upload Progress Overlay */}
      {uploading && (
        <UploadProgress
          uploadStage={uploadStage}
          uploadProgress={uploadProgress}
          onCancel={cancelUpload}
        />
      )}

      {/* ── View to display button New Folder / Upload file and Browser File  ── */}
      <View style={[styles.bottomSection, bottomSectionSafeStyle]}>
        <View style={styles.bottomButtonContainer}>

          {/* 1) ROOT (default) → only New Folder */}
          {isAtRoot && !isInsideUnlockedFolder && (
            <TouchableOpacity
              style={styles.bottomButton}
              onPress={handleOpenNewFolder}
              activeOpacity={0.7}
            >
              <Icon name="create-new-folder" size={20} color="#fff" />
              <Text style={styles.bottomButtonText}>New Folder</Text>
            </TouchableOpacity>
          )}

          {/* 2) Inside unlocked folder → Browse File + Upload File, no New Folder */}
          {isInsideUnlockedFolder && (
            <>
              {/* <TouchableOpacity
                style={[styles.bottomButton, styles.browseButton]}
                onPress={handleBrowsePress}
              >
                <Icon name="folder-open" size={20} color="#fff" />
                <Text style={styles.bottomButtonText}>Browse File</Text>
              </TouchableOpacity> */}

              <TouchableOpacity
                style={[styles.bottomButton, styles.fileButton]}
                onPress={handleUploadFile}
                activeOpacity={0.7}
              >
                <Icon name="upload-file" size={20} color="#fff" />
                <Text style={styles.bottomButtonText}>Upload File</Text>
              </TouchableOpacity>
            </>
          )}

        </View>
      </View>

      {/* ── Modals ── */}
      <PasswordModal
        visible={passwordModalVisible}
        isSettingPassword={isSettingPassword}
        currentFile={currentFileForPassword}
        passwordInput={passwordInput}
        confirmPassword={confirmPassword}
        usedPasswords={usedPasswords}
        protectedFiles={protectedFiles}
        onChangePassword={setPasswordInput}
        onChangeConfirm={setConfirmPassword}
        onCancel={handlePasswordModalCancel}
        onSubmit={handlePasswordSubmit}
        onRestore={handlePasswordModalRestore}
        onRemovePassword={handlePasswordModalRemove}
      />

      <StorageModal
        visible={showStorageModal}
        onClose={handleStorageModalClose}
        onSelect={handleStorageSelect}
      />

      <FileCreateModal
        visible={fileModalVisible}
        fileName={fileName}
        fileContent={fileContent}
        onChangeName={setFileName}
        onChangeContent={setFileContent}
        onCancel={handleFileCreateModalCancel}
        onCreate={handleCreateFile}
      />

      <GalleryModal
        visible={galleryModalVisible}
        images={galleryImages}
        onClose={handleGalleryModalClose}
        onOpen={handleGalleryOpen}
      />

      <FileBrowser
        visible={fileBrowserVisible}
        basePath={browserPath}
        onSelect={handleFileSelectInBrowser}
        onClose={handleFileBrowserClose}
        mode={browserMode}
      />

      <FileOptionsModal
        visible={fileOptionsModalVisible}
        file={selectedFileForOptions}
        onRestore={handleRestoreUnlockedFile}
        onDelete={handleDeleteUnlockedFile}
        onCancel={handleFileOptionsCancel}
      />

      <NewFolderModal
        visible={newFolderModalVisible}
        step={newFolderStep}
        folderName={newFolderName}
        password={newFolderPassword}
        confirmPassword={newFolderConfirmPassword}
        onChangeName={setNewFolderName}
        onChangePassword={setNewFolderPassword}
        onChangeConfirm={setNewFolderConfirmPassword}
        onNext={handleCreateFolder}
        onBack={handleNewFolderBack}
        onCancel={handleNewFolderCancel}
      />

      {/* Password Overlay (file access) */}
      {showPasswordOverlay && (
        <View style={styles.overlayContainer}>
          <View style={styles.overlayContent}>
            <Text style={styles.overlayTitle}>Protected File</Text>
            <Text style={styles.overlayText}>Enter password to access files</Text>
            <TextInput
              style={styles.overlayInput}
              placeholder="Password"
              placeholderTextColor="#7A8A99"
              value={overlayPassword}
              onChangeText={setOverlayPassword}
              secureTextEntry
              autoCorrect={false}
              autoCapitalize="none"
            />
            <View style={styles.overlayButtons}>
              <TouchableOpacity
                style={[styles.overlayButton, styles.overlayCancelButton]}
                onPress={handleOverlayCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.overlayButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.overlayButton, styles.overlaySubmitButton]}
                onPress={handleOverlayPasswordSubmit}
                activeOpacity={0.7}
              >
                <Text style={styles.overlayButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Custom Alert */}
      <Modal visible={customAlertVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{alertTitle}</Text>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleAlertDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Processing Overlay */}
      {processing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color="#4A90D9" />
            <Text style={styles.processingText}>Processing… Please wait</Text>
          </View>
        </View>
      )}

    </View>
  );
};

// ─── Static Styles (outside component to prevent re-creation) ─
const flatListContentStyle = { paddingBottom: 100 };
const bottomSectionSafeStyle = { paddingBottom: Platform.OS === 'android' ? 8 : 0 };

export default React.memo(FileLockerScreen);