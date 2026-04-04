import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fileManager from '../../../services/fileManager';
import deviceService from '../../../services/deviceService';

export const useBackup = () => {
  const [backing,       setBacking]       = useState(false);
  const [backupStats,   setBackupStats]   = useState(null);
  const [progress,      setProgress]      = useState(0);
  const [status,        setStatus]        = useState('idle'); // idle | running | done | error
  const [errorMessage,  setErrorMessage]  = useState('');

  // ── Load backup stats from server ──
  const loadBackupStatus = useCallback(async () => {
    try {
      const res = await fileManager.getBackupStatus();
      if (res.success) {
        setBackupStats(res.data);
        if (res.data?.last_backed_up_at) {
          await AsyncStorage.setItem('lastBackupTime', res.data.last_backed_up_at);
        }
      }
      return res;
    } catch {
      return { success: false };
    }
  }, []);

  // ── Trigger full backup ──
  const startBackup = useCallback(async () => {
    try {
      setBacking(true);
      setStatus('running');
      setProgress(0);
      setErrorMessage('');

      // Step 1 — Get device ID
      let deviceId = '';
      try {
        const info = await deviceService.getDeviceInfo();
        deviceId = info?.deviceid || '';
        if (!deviceId) {
          deviceId = await AsyncStorage.getItem('deviceId') || '';
        }
      } catch {}

      setProgress(30);

      // Step 2 — Verify server connection
      const statusRes = await fileManager.getBackupStatus();
      if (!statusRes.success) throw new Error('Could not connect to server');

      setProgress(60);

      // Step 3 — Mark ALL user files as backed_up on server
      // Empty array = server marks all files for this user
      const markRes = await fileManager.markFilesBackedUp([], deviceId);
      if (!markRes.success) throw new Error('Failed to mark files as backed up');

      setProgress(100);
      setStatus('done');

      // Save last backup time locally
      const now = new Date().toISOString();
      await AsyncStorage.setItem('lastBackupTime', now);

      return { success: true, count: markRes.count };
    } catch (e) {
      setStatus('error');
      setErrorMessage(e.message || 'Backup failed');
      return { success: false, error: e.message };
    } finally {
      setBacking(false);
    }
  }, []);

  // ── Save schedule to server + locally ──
  const saveSchedule = useCallback(async (schedule) => {
    try {
      const res = await fileManager.saveBackupSchedule(schedule);
      if (res.success) {
        await AsyncStorage.setItem('backupSchedule', schedule);
      } else {
        // Save locally even if server fails
        await AsyncStorage.setItem('backupSchedule', schedule);
      }
      return res;
    } catch {
      await AsyncStorage.setItem('backupSchedule', schedule);
      return { success: false };
    }
  }, []);

  const resetBackup = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setErrorMessage('');
  }, []);

  return {
    backing,
    status,
    progress,
    backupStats,
    errorMessage,
    startBackup,
    loadBackupStatus,
    saveSchedule,
    resetBackup,
  };
};
