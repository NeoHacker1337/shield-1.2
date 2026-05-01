import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../utils/config';

class DeviceService {
  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 15000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Attach Bearer token automatically
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('auth_token');
          if (token) config.headers.Authorization = `Bearer ${token}`;
        } catch {}
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Handle 401 globally
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            await AsyncStorage.multiRemove(['auth_token', 'user_data']);
          } catch {}
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * SAFE: Get IP address (Android 13+ / 15 safe)
   */
  async getIpAddress() {
    try {
      // Android: use external IP only (local IP deprecated & unsafe)
      if (Platform.OS === 'android') {
        try {
          const r = await axios.get('https://api.ipify.org?format=json', {
            timeout: 5000,
          });
          return r.data?.ip || null;
        } catch {
          return null;
        }
      }

      // iOS: local IP allowed
      try {
        const ip = await DeviceInfo.getIpAddress();
        if (ip && ip !== 'unknown' && ip !== '0.0.0.0') return ip;
      } catch {}

      return null;
    } catch {
      return null;
    }
  }

  /**
   * ANDROID-15 SAFE DEVICE INFO
   * Sequential native calls (no Promise.all)
   */
  async getDeviceInfo() {
    let deviceName = 'Unknown Device';
    let deviceId = 'unknown_device';
    let systemVersion = 'Unknown';
    let brand = 'Unknown';
    let model = 'Unknown';
    let appVersion = '1.0.0';
    let buildNumber = '1';
    let manufacturer = 'Unknown';

    try { const v = await DeviceInfo.getDeviceName(); if (v) deviceName = v; } catch {}
    try { const v = await DeviceInfo.getUniqueId(); if (v) deviceId = v; } catch {}
    try { const v = await DeviceInfo.getSystemVersion(); if (v) systemVersion = v; } catch {}
    try { const v = await DeviceInfo.getBrand(); if (v) brand = v; } catch {}
    try { const v = await DeviceInfo.getModel(); if (v) model = v; } catch {}
    try { const v = await DeviceInfo.getVersion(); if (v) appVersion = v; } catch {}
    try { const v = await DeviceInfo.getBuildNumber(); if (v) buildNumber = v; } catch {}
    try { const v = await DeviceInfo.getManufacturer(); if (v) manufacturer = v; } catch {}

    const ipAddress = await this.getIpAddress();
    const deviceOS = Platform.OS === 'ios' ? 'iOS' : 'Android';
    const deviceModel = `${manufacturer} ${model}`.trim();

    return {
      device_name: deviceName || deviceModel,
      device_model: deviceModel || model,
      device_os: deviceOS,
      device_os_version: systemVersion,
      app_version: `${appVersion} (${buildNumber})`,
      device_id: deviceId,
      ip_address: ipAddress,
    };
  }

  /**
   * Send device details to backend
   */
  async sendDeviceDetails(userId = null) {
    try {
      const token = await authService.getToken();
       
      const deviceInfo = await this.getDeviceInfo();
      const payload = { ...deviceInfo, user_id: userId };

      const response = await this.api.post('/v1/device-details', payload);

      return {
        success: true,
        data: response.data?.data || response.data,
        message: response.data?.message || 'Device details saved',
      };
    } catch (error) {
      console.error(
        '❌ sendDeviceDetails failed:',
        error?.response?.data || error?.message
      );
      return {
        success: false,
        error: error?.response?.data?.message || error?.message || 'Failed',
      };
    }
  }

  async updateDeviceDetails(userId) {
    return this.sendDeviceDetails(userId);
  }

  async isDeviceRegistered(deviceId) {
    try {
      const response = await this.api.get(
        `/v1/device-details/check/${deviceId}`
      );
      return response.data?.exists || false;
    } catch {
      return false;
    }
  }

  async getUserDevices(userId) {
    try {
      const response = await this.api.get(`/v1/users/${userId}/devices`);
      return {
        success: true,
        devices: response.data?.data || [],
      };
    } catch (error) {
      return {
        success: false,
        devices: [],
        error: error?.response?.data?.message || 'Failed',
      };
    }
  }

  async removeDevice(deviceId) {
    try {
      const response = await this.api.delete(
        `/v1/device-details/${deviceId}`
      );
      return {
        success: true,
        message: response.data?.message || 'Device removed',
      };
    } catch (error) {
      return {
        success: false,
        error: error?.response?.data?.message || 'Failed',
      };
    }
  }
}

export default new DeviceService();
