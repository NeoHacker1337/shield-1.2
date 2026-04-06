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


  const loadDirectory = async (path) => {
    try {

      const contents = await RNFS.readDir(path);

      let formatted = contents.map((item) => ({
        name: item.name,
        path: item.path,
        isDirectory: item.isDirectory(),
        size: item.isFile() ? formatFileSize(item.size) : '',
        mtime: new Date(item.mtime).toLocaleDateString(),
        type: item.isDirectory() ? 'folder' : getFileType(item.name),
      }));


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
