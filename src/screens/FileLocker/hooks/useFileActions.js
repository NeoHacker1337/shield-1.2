import RNFS from 'react-native-fs';
import { Alert, Platform } from 'react-native';
import { HIDDEN_FILES_DIR, getFileType, getParentDirectory } from '../../../utils/fileHelpers';
import { hashPassword, encryptFile, decryptFile } from '../../../services/cryptoService';
import fileManager from '../../../services/fileManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useFileActions = ({
  protectedFiles, usedPasswords, originalLocations,
  saveProtectedFiles, saveUsedPasswords, saveOriginalLocations,
  handleRefresh, navigation,
}) => {

  const lockFile = async ({ file, password, confirmPass }) => {
    if (!password || password.length < 4) throw new Error('Password must be at least 4 characters.');
    if (password !== confirmPass) throw new Error('Passwords do not match.');

    const storedPw = await AsyncStorage.getItem('usedPasswords');
    const latest = storedPw ? new Set(JSON.parse(storedPw)) : new Set();
    if (latest.has(password)) throw new Error('This password is already used for another file.');

    const originalPath = file.path;
    const originalName = file.name;
    if (!await RNFS.exists(originalPath)) throw new Error('Original file not found');

    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const stealthName = `.shield.${uniqueId}.${originalName}`;
    const destPath = `${HIDDEN_FILES_DIR}/${stealthName}`;

    if (!await RNFS.exists(HIDDEN_FILES_DIR)) {
      await RNFS.mkdir(HIDDEN_FILES_DIR);
      await RNFS.writeFile(`${HIDDEN_FILES_DIR}/.nomedia`, '', 'utf8');
    }

    await encryptFile(originalPath, destPath, password);
    await RNFS.unlink(originalPath);

    await saveOriginalLocations({ ...originalLocations, [destPath]: originalPath });
    const hashed = hashPassword(password);
    await saveProtectedFiles({ ...protectedFiles, [destPath]: hashed });
    latest.add(password);
    await saveUsedPasswords(latest);

    try {
      let content;
      try { content = await RNFS.readFile(destPath, 'utf8'); } catch { content = 'Encrypted file'; }
      await fileManager.saveFilePassword(originalName, content, password);
    } catch {}
  };

  const unlockFile = async ({ file, password, onUnlocked }) => {
    const savedHash = protectedFiles[file.path];
    if (hashPassword(password) !== savedHash) throw new Error('Incorrect password');
    if (file.isDirectory) {
      onUnlocked(file.path, true);
    } else {
      const tempPath = `${RNFS.CachesDirectoryPath}/${file.name}`;
      await decryptFile(file.path, tempPath, password);
      onUnlocked({ ...file, path: tempPath, hiddenPath: file.path }, false);
    }
  };

  const deleteFile = async (filePath) => {
    await RNFS.unlink(filePath);
    const newProtected = { ...protectedFiles };
    delete newProtected[filePath];
    await saveProtectedFiles(newProtected);
    const newOriginals = { ...originalLocations };
    delete newOriginals[filePath];
    await saveOriginalLocations(newOriginals);
    handleRefresh();
  };

  const restoreFile = async (file, targetDir) => {
    let restorePath = `${targetDir}/${file.name}`;
    if (await RNFS.exists(restorePath)) {
      const dot = file.name.lastIndexOf('.');
      restorePath = dot !== -1
        ? `${targetDir}/${file.name.slice(0, dot)}_restored${file.name.slice(dot)}`
        : `${targetDir}/${file.name}_restored`;
    }
    await RNFS.moveFile(file.path, restorePath);
    if (Platform.OS === 'android') {
      try { await RNFS.scanFile(restorePath); } catch {}
    }
    const newProtected = { ...protectedFiles };
    delete newProtected[file.path];
    await saveProtectedFiles(newProtected);
    const newOriginals = { ...originalLocations };
    delete newOriginals[file.path];
    await saveOriginalLocations(newOriginals);
    handleRefresh();
  };

  const openFile = async (item) => {
    const { name, path } = item;
    const type = getFileType(name);
    let fileId = null;
    try {
      const stored = await AsyncStorage.getItem('fileServerIds');
      const map = stored ? JSON.parse(stored) : {};
      const entry = Object.entries(map).find(([k]) => k.toLowerCase() === name.toLowerCase());
      fileId = entry ? entry[1] : null;
    } catch {}

    navigation.navigate('FileViewer', {
      filePath: path,
      hiddenPath: item.hiddenPath || path,
      fileType: type,
      fileName: name,
      isProtected: !!protectedFiles[item.hiddenPath || item.path],
      passwordHash: protectedFiles[item.hiddenPath || item.path],
      fileId,
      onDelete: async (deletedPath, deletedPassword) => {
        const newP = { ...protectedFiles };
        delete newP[deletedPath];
        await AsyncStorage.setItem('protectedFiles', JSON.stringify(newP));
        const newPw = new Set(usedPasswords);
        newPw.delete(deletedPassword);
        await AsyncStorage.setItem('usedPasswords', JSON.stringify([...newPw]));
        handleRefresh();
      },
      onSave: async () => true,
    });
  };

  return { lockFile, unlockFile, deleteFile, restoreFile, openFile };
};
