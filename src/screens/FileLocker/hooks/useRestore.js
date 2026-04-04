import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import fileManager from '../../../services/fileManager';
import deviceService from '../../../services/deviceService';

export const useRestore = () => {
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [totalFiles, setTotalFiles] = useState(0);
  const [restoredCount, setRestoredCount] = useState(0);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const startRestore = useCallback(async () => {
    try {
      setRestoring(true);
      setStatus('running');
      setProgress(0);
      setRestoredCount(0);
      setErrorMessage('');

      // ── Step 1: Get device ID ──
      let deviceId = '';
      try {
        const info = await deviceService.getDeviceInfo();
        deviceId = info?.deviceid || await AsyncStorage.getItem('deviceId') || '';
      } catch { }

      // ── Step 2: Fetch file list from server ──
      const listRes = await fileManager.getRestoreList();

      if (!listRes.success) {
        if (listRes.code === 'NO_BACKUP') {
          // ✅ Friendly empty state — not a crash
          setStatus('no_backup');
          return { success: false, code: 'NO_BACKUP', message: 'You have not created any backup yet.' };
        }
        throw new Error(listRes.error || 'Could not fetch file list from server');
      }

      const files = listRes.data || [];
      if (files.length === 0) {
        setStatus('done');
        return { success: true, message: 'No backed up files found on server.' };
      }

      setTotalFiles(files.length);

      // ── Step 3: Load existing AsyncStorage maps ──
      // Using exact same keys as FileLockerScreen
      const storedProtected = await AsyncStorage.getItem('protectedFiles');
      const storedHidden = await AsyncStorage.getItem('hiddenFolders');
      const storedOriginals = await AsyncStorage.getItem('originalLocations');
      const storedPasswords = await AsyncStorage.getItem('usedPasswords');

      const newProtected = storedProtected ? JSON.parse(storedProtected) : {};
      const newOriginals = storedOriginals ? JSON.parse(storedOriginals) : {};
      const newPasswords = new Set(storedPasswords ? JSON.parse(storedPasswords) : []);

      // hiddenFolders — normalize array → object (same as FileLockerScreen init)
      let newHidden = {};
      if (storedHidden) {
        const parsed = JSON.parse(storedHidden);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => { newHidden[p] = true; });
        } else {
          newHidden = { ...parsed };
        }
      }

      const processedFolders = new Set();
      let restored = 0;

      // ── Step 4: Process each file from server ──
      for (const file of files) {
        try {
          setCurrentFile(file.file_name);

          // ─────────────────────────────────────────────
          // mobile_file_path = '/data/user/0/com.shield/files/King/images.jpeg'
          // folderPath       = '/data/user/0/com.shield/files/King'
          // destPath         = '/data/user/0/com.shield/files/King/images.jpeg'
          // ─────────────────────────────────────────────
          const destPath = file.mobile_file_path;
          const folderPath = destPath.substring(0, destPath.lastIndexOf('/'));

          // ────────────────────────────────────────────────────────
          // 4a. Create folder — mirrors handleCreateFolder exactly
          // ────────────────────────────────────────────────────────
          const folderExists = await RNFS.exists(folderPath);
          if (!folderExists) {
            await RNFS.mkdir(folderPath);
            console.log('📁 Folder created:', folderPath);
          }

          // ────────────────────────────────────────────────────────
          // 4b. Protect folder with password_hash — mirrors:
          //   const hashed = hashPassword(newFolderPassword)
          //   await saveProtectedFiles({ ...protectedFiles, [folderPath]: hashed })
          //   newHiddenFolders[folderPath] = true
          // ────────────────────────────────────────────────────────
          if (file.password_hash && !processedFolders.has(folderPath)) {
            // ✅ password_hash IS the result of hashPassword(password)
            // So store it directly — FileLockerScreen will match it
            newProtected[folderPath] = file.password_hash;

            // ✅ Hide folder — same as handleCreateFolder
            newHidden[folderPath] = true;

            processedFolders.add(folderPath);
            console.log('🔒 Folder protected:', folderPath);
          }

          // ────────────────────────────────────────────────────────
          // 4c. Download file into destPath — mirrors RNFS.moveFile/copyFile
          //     in handleFileSelectInBrowser
          // ────────────────────────────────────────────────────────
          // ✅ Skip if file already exists
          const fileAlreadyExists = await RNFS.exists(destPath);
          if (fileAlreadyExists) {
            console.log('⏭️ Skipping (already exists):', file.file_name);
            restored++;
            setRestoredCount(restored);
            setProgress(Math.min(99, Math.round((restored / files.length) * 100)));
            continue;
          }

          // Download only if not exists
          const dlRes = await fileManager.downloadRestoreFileByUrl(
            file.file_url,
            destPath,
            (p) => {
              const overall = Math.round(((restored + p / 100) / files.length) * 100);
              setProgress(Math.min(99, overall));
            }
          );

          if (!dlRes.success) {
            console.warn('❌ Failed to download:', file.file_name, dlRes.error);
            continue;
          }

          console.log('✅ Downloaded:', file.file_name);
          restored++;
          setRestoredCount(restored);
          setProgress(Math.min(99, Math.round((restored / files.length) * 100)));


          // ────────────────────────────────────────────────────────
          // 4d. Save original location — mirrors saveOriginalLocations
          //   { ...originalLocations, [destPath]: originalPath }
          // ────────────────────────────────────────────────────────
          if (file.original_location) {
            newOriginals[destPath] = file.original_location;
          }

          restored++;
          setRestoredCount(restored);
          setProgress(Math.min(99, Math.round((restored / files.length) * 100)));

        } catch (fileErr) {
          console.warn(`Error restoring ${file.file_name}:`, fileErr.message);
        }
      }

      // ── Step 5: Save all maps — same keys FileLockerScreen uses ──
      await AsyncStorage.multiSet([
        ['protectedFiles', JSON.stringify(newProtected)],
        ['hiddenFolders', JSON.stringify(newHidden)],
        ['originalLocations', JSON.stringify(newOriginals)],
        ['usedPasswords', JSON.stringify([...newPasswords])],
      ]);

      // ✅ Verify logs
      console.log('💾 protectedFiles:', JSON.stringify(newProtected));
      console.log('💾 hiddenFolders:', JSON.stringify(newHidden));
      console.log('💾 originalLocations:', JSON.stringify(newOriginals));

      // ── Step 6: Notify server ──
      await fileManager.markRestoreComplete(restored, deviceId);

      // ── Step 7: Save restore timestamp ──
      const now = new Date().toISOString();
      await AsyncStorage.setItem('lastRestoreTime', now);

      setProgress(100);
      setStatus('done');

      return { success: true, count: restored };

    } catch (e) {
      setStatus('error');
      setErrorMessage(e.message || 'Restore failed');
      console.error('❌ Restore error:', e.message);
      return { success: false, error: e.message };
    } finally {
      setRestoring(false);
      setCurrentFile('');
    }
  }, []);

  const resetRestore = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setRestoredCount(0);
    setCurrentFile('');
    setErrorMessage('');
  }, []);

  return {
    restoring,
    progress,
    currentFile,
    totalFiles,
    restoredCount,
    status,
    errorMessage,
    startRestore,
    resetRestore,
  };
};
