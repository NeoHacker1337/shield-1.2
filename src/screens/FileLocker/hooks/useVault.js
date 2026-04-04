import { useState } from 'react';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import {
  formatFileSize,
  getFileType,
  getParentDirectory,
  ROOT_DIRECTORY,
} from '../../../utils/fileHelpers';

const { PermissionModule } = NativeModules;

export const useVault = () => {
  const [displayFiles, setDisplayFiles] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState(ROOT_DIRECTORY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hiddenFolders, setHiddenFolders] = useState({});
  const [storagePaths, setStoragePaths] = useState([]);

  const formatItem = (item) => ({
    name: item.name,
    path: item.path,
    isDirectory: item.isDirectory(),
    size: item.isFile() ? formatFileSize(item.size) : '',
    mtime: new Date(item.mtime).toLocaleDateString(),
    type: item.isDirectory() ? 'folder' : getFileType(item.name),
  });

  // const loadDirectory = async (path) => {
  //   try {
  //     console.log("📂 Loading path:", path);
  //     console.log(await RNFS.readDir(ROOT_DIRECTORY));
  //     const contents = await RNFS.readDir(path);
  //     setDisplayFiles(formatted);
  //     const formatted = contents.map(item => ({
  //       name: item.name,
  //       path: item.path,
  //       isDirectory: item.isDirectory(),
  //       size: item.isFile() ? formatFileSize(item.size) : '',
  //       mtime: new Date(item.mtime).toLocaleDateString(),
  //       type: item.isDirectory() ? 'folder' : getFileType(item.name),
  //     }));

  //     console.log("✅ FILES:", formatted);

  //     if (path !== ROOT_DIRECTORY) {
  //       formatted.unshift({
  //         name: '..',
  //         path: getParentDirectory(path),
  //         isDirectory: true,
  //         type: 'folder-back',
  //       });
  //     }

  //     setDisplayFiles(formatted);
  //     setCurrentPath(path);

  //   } catch (err) {
  //     console.log("❌ loadDirectory ERROR:", err);
  //     setDisplayFiles([]);
  //   } finally {
  //     setRefreshing(false);
  //   }
  // };
const loadDirectory = async (path) => {
  try {
    console.log('📂 Loading path:', path);

    const contents = await RNFS.readDir(path);

    let formatted = contents.map((item) => ({
      name: item.name,
      path: item.path,
      isDirectory: item.isDirectory(),
      size: item.isFile() ? formatFileSize(item.size) : '',
      mtime: new Date(item.mtime).toLocaleDateString(),
      type: item.isDirectory() ? 'folder' : getFileType(item.name),
    }));

    console.log('✅ FILES:', formatted);

    // 🔒 HIDDEN BY DEFAULT:
    // At ROOT_DIRECTORY → show nothing (empty list).
    // Files/folders only appear after handleGlobalPasswordSubmit
    // unlocks a specific folder (non-root path).
    if (path === ROOT_DIRECTORY) {
      formatted = [];
    }

    // Add ".." back-navigation only inside a sub-folder
    if (path !== ROOT_DIRECTORY) {
      formatted.unshift({
        name: '..',
        path: getParentDirectory(path),
        isDirectory: true,
        type: 'folder-back',
      });
    }

    setDisplayFiles(formatted);
    setCurrentPath(path);

  } catch (err) {
    console.log('❌ loadDirectory ERROR:', err);
    setDisplayFiles([]);
  } finally {
    setRefreshing(false);
  }
};
  // const loadDirectory = async (
  //   path,
  //   unlockedPath,
  //   freshHidden,
  //   freshProtected
  // ) => {
  //   // Permission guard for Android 11+
  //   if (Platform.OS === 'android' && Platform.Version >= 30) {
  //     try {
  //       const granted = await PermissionModule.hasManageExternalStorage();
  //       if (!granted) {
  //         setDisplayFiles([]);
  //         setLoading(false);   // FIX
  //         return;
  //       }
  //     } catch {
  //       setDisplayFiles([]);
  //       setLoading(false);     // FIX
  //       return;
  //     }
  //   }

  //   let hiddenToUse =
  //     freshHidden !== undefined && freshHidden !== null
  //       ? freshHidden
  //       : hiddenFolders;
  //   let protectedToUse =
  //     freshProtected !== undefined && freshProtected !== null
  //       ? freshProtected
  //       : {};

  //   // Normalize hiddenFolders if it was stored as an array
  //   if (Array.isArray(hiddenToUse)) {
  //     const obj = {};
  //     hiddenToUse.forEach((p) => {
  //       obj[p] = true;
  //     });
  //     hiddenToUse = obj;
  //   }

  //   // At absolute root, we do not treat anything as "inside unlocked folder"
  //   if (path === ROOT_DIRECTORY) unlockedPath = null;


  //   try {

  //     setLoading(true);

  //     const contents = await RNFS.readDir(path);
  //     setAllFiles(contents.map(formatItem));

  //     const isUnlocked =
  //       unlockedPath &&
  //       (path === unlockedPath || path.startsWith(unlockedPath + '/'));

  //     // If inside an unlocked folder → show files + folders
  //     // Else (normal/root) → only show top-level folders
  //     let formatted = isUnlocked
  //       ? contents
  //         .map(formatItem)
  //         .sort((a, b) => {
  //           if (a.isDirectory && !b.isDirectory) return -1;
  //           if (!a.isDirectory && b.isDirectory) return 1;
  //           return a.name.localeCompare(b.name);
  //         })
  //       : contents
  //         .filter((i) => i.isDirectory())
  //         .map(formatItem)
  //         .sort((a, b) => a.name.localeCompare(b.name));

  //     // Apply hidden/protected filters
  //     formatted = formatted.filter((item) => {


  //       if (item.name === '..') return true;
  //       if (
  //         ['datastore', '.filelocker_hidden', '.shield_vault'].includes(
  //           item.name.toLowerCase()
  //         )
  //       )
  //         return false;
  //       if (item.name.startsWith('.')) return false;
  //       if (item.isDirectory && protectedToUse[item.path]) return false;
  //       if (hiddenToUse[item.path]) return false;
  //       return true;
  //     });

  //     // 🔒 IMPORTANT RULE:
  //     // If we are at ROOT_DIRECTORY and we are NOT in an unlocked folder,
  //     // do not show any folders at all (empty screen).
  //     if (path === ROOT_DIRECTORY && !unlockedPath) {
  //       formatted = [];
  //     }

  //     // Add ".." only when not at root
  //     if (path !== ROOT_DIRECTORY) {
  //       formatted.unshift({
  //         name: '..',
  //         path: getParentDirectory(path),
  //         isDirectory: true,
  //         type: 'folder-back',
  //       });
  //     }

  //     setDisplayFiles(formatted);
  //     setCurrentPath(path);
  //   } catch (err) {
  //     console.error('loadDirectory error:', err);
  //     setDisplayFiles([]);
  //     setAllFiles([]);
  //   } finally {
  //     setLoading(false);
  //     setRefreshing(false);
  //   }
  // };

  const saveHiddenFolders = async (newHidden) => {
    try {
      await AsyncStorage.setItem('hiddenFolders', JSON.stringify(newHidden));
      setHiddenFolders(newHidden);
    } catch {
      // silent
    }
  };

  const loadHiddenFolders = async () => {
    try {
      const stored = await AsyncStorage.getItem('hiddenFolders');
      if (stored) {
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const obj = {};
          parsed.forEach((p) => {
            obj[p] = true;
          });
          parsed = obj;
          await AsyncStorage.setItem('hiddenFolders', JSON.stringify(obj));
        }
        setHiddenFolders(parsed);
        return parsed;
      }
      setHiddenFolders({});
      return {};
    } catch {
      setHiddenFolders({});
      return {};
    }
  };

  const getStoragePaths = async () => {
    try {
      let paths = [RNFS.ExternalStorageDirectoryPath];
      if (Platform.OS === 'android') {
        try {
          const ext = await RNFS.getAllExternalFilesDirs();
          if (ext?.length > 0) {
            const roots = ext.map((d) => d.replace(/\/Android\/.*/, ''));
            paths = [...new Set([...paths, ...roots])];
          }
        } catch {
          // ignore
        }
      }
      setStoragePaths(paths);
    } catch {
      // ignore
    }
  };

  return {
    displayFiles,
    allFiles,
    currentPath,
    loading,
    refreshing,
    hiddenFolders,
    storagePaths,
    loadDirectory,
    saveHiddenFolders,
    loadHiddenFolders,
    getStoragePaths,
    setRefreshing,
    setHiddenFolders,

  };
};
