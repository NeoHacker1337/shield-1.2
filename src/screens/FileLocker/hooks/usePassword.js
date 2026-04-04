import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePassword = () => {
  const [protectedFiles, setProtectedFiles] = useState({});
  const [usedPasswords, setUsedPasswords] = useState(new Set());
  const [originalLocations, setOriginalLocations] = useState({});

  const loadProtectedFiles = async () => {
    try {
      const stored = await AsyncStorage.getItem('protectedFiles');
      if (stored) setProtectedFiles(JSON.parse(stored));
    } catch {}
  };

  const saveProtectedFiles = async (newProtected) => {
    try {
      await AsyncStorage.setItem('protectedFiles', JSON.stringify(newProtected));
      setProtectedFiles(newProtected);
    } catch {
      throw new Error('Failed to save password settings');
    }
  };

  const loadUsedPasswords = async () => {
    try {
      const stored = await AsyncStorage.getItem('usedPasswords');
      if (stored) setUsedPasswords(new Set(JSON.parse(stored)));
    } catch {}
  };

  const saveUsedPasswords = async (passwordsSet) => {
    try {
      await AsyncStorage.setItem('usedPasswords', JSON.stringify(Array.from(passwordsSet)));
      setUsedPasswords(passwordsSet);
    } catch {}
  };

  const loadOriginalLocations = async () => {
    try {
      const stored = await AsyncStorage.getItem('originalLocations');
      if (stored) setOriginalLocations(JSON.parse(stored));
    } catch {}
  };

  const saveOriginalLocations = async (newLocations) => {
    try {
      await AsyncStorage.setItem('originalLocations', JSON.stringify(newLocations));
      setOriginalLocations(newLocations);
    } catch {}
  };

  return {
    protectedFiles, usedPasswords, originalLocations,
    loadProtectedFiles, saveProtectedFiles,
    loadUsedPasswords, saveUsedPasswords,
    loadOriginalLocations, saveOriginalLocations,
  };
};
