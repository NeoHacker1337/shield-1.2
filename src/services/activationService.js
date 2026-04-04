import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, API_TIMEOUT, DEFAULT_HEADERS } from '../utils/config';
import { getUniqueId, getDeviceName } from 'react-native-device-info';

const ACTIVATION_SCREEN_STATUS_KEY = 'activation_screen_status';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT,
  headers: DEFAULT_HEADERS,
});

/**
 * Attach auth token if present
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {}
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Check activation status (single source of truth)
 */
export const checkActivationStatus = async () => {
  try {
    const status = await AsyncStorage.getItem(ACTIVATION_SCREEN_STATUS_KEY);
    return status === 'true';
  } catch {
    return false;
  }
};

/**
 * Verify activation key with backend
 * ⚠️ IMPORTANT:
 * This function DOES NOT write AsyncStorage.
 * Caller must persist activation flag after success.
 */
export const verifyActivationKey = async (activationKey) => {
  try {
    // 🔐 Sanitize key
    const cleanKey = activationKey?.replace(/[-\s]/g, '').toUpperCase();

    if (!cleanKey || !/^[A-Z0-9]{20}$/.test(cleanKey)) {
      throw new Error('Activation key must be exactly 20 alphanumeric characters');
    }

    // 🛡 Ultra-safe device info retrieval
    let deviceId = 'unknown_device';
    let deviceName = 'unknown_device';

    try {
      const id = await getUniqueId();
      if (id) deviceId = id;
    } catch {}

    try {
      const name = await getDeviceName();
      if (name) deviceName = name;
    } catch {}

    // 🚀 API call
    const response = await api.post('/v1/license/activate', {
      license_key: cleanKey,
      device_id: deviceId,
      device_name: deviceName,
    });

    const data = response?.data;

    if (!data) {
      throw new Error('Invalid server response');
    }

    if (data.activation_screen_status !== true) {
      throw new Error(data?.message || 'Activation failed');
    }

    // ✅ DO NOT WRITE STORAGE HERE (Android 15 safety)
    return {
      success: true,
      activation_screen_status: true,
      message: data?.message || 'Activation successful',
    };

  } catch (error) {
    console.error('🔥 [verifyActivationKey] ERROR:', error);

    if (error?.response) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Invalid activation key'
      );
    }

    throw new Error(error?.message || 'Activation failed');
  }
};

/**
 * Persist activation flag (SAFE SINGLE WRITE)
 * 👉 Call ONLY from UI after successful activation
 */
export const persistActivationStatus = async () => {
  try {
    await AsyncStorage.setItem(ACTIVATION_SCREEN_STATUS_KEY, 'true');
    return true;
  } catch (e) {
    console.error('Activation persist failed:', e);
    return false;
  }
};

/**
 * Clear activation
 */
export const clearActivationStatus = async () => {
  try {
    await AsyncStorage.removeItem(ACTIVATION_SCREEN_STATUS_KEY);
  } catch {}
};
