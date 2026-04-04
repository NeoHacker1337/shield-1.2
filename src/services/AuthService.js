import CryptoJS from 'crypto-js';
import * as Keychain from 'react-native-keychain';
import SInfo from 'react-native-sensitive-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../utils/config';
import deviceService from './deviceService';

const AUTH_SERVICE = 'shield-auth';
const PASSCODE_AUTH_SERVICE = 'shield-passcode';

const CREDS_STORAGE_KEY = 'encrypted_creds';
const CREDS_SECRET_KEY = 'SHIELD_LOCAL_SECRET';

const FIXED_SALT = CryptoJS.enc.Hex.parse('a1b2c3d4e5f60708');
const FIXED_IV = CryptoJS.enc.Hex.parse('0102030405060708');

const FREE_USER_KEY = 'free_user_features';
const USER_LICENSE_KEY = 'user_license';
const LICENSE_STATUS_KEY = 'license_status';
const LICENSE_EXPIRES_AT_KEY = 'license_expires_at';
const ACTIVATION_SCREEN_STATUS_KEY = 'activation_screen_status';

class AuthService {
  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: { Accept: 'application/json' },
    });

    this.api.interceptors.request.use(
      async (config) => {
        const token = await this.getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error?.response?.status === 401) {
          try { await this.logout(); } catch { }
        }
        return Promise.reject(error);
      }
    );
  }

  deriveKey(secret) {
    return CryptoJS.PBKDF2(secret, FIXED_SALT, {
      keySize: 256 / 32,
      iterations: 1000,
    });
  }

  encryptWithKey(text, secret) {
    const key = this.deriveKey(secret);
    return CryptoJS.AES.encrypt(text, key, {
      iv: FIXED_IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();
  }

  decryptWithKey(cipherText, secret) {
    const key = this.deriveKey(secret);
    const decrypted = CryptoJS.AES.decrypt(cipherText, key, {
      iv: FIXED_IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  encrypt(text) {
    return this.encryptWithKey(text, CREDS_SECRET_KEY);
  }

  decrypt(cipherText) {
    return this.decryptWithKey(cipherText, CREDS_SECRET_KEY);
  }

  async storeEncryptedCredentials(email, password) {
    try {
      const payload = JSON.stringify({
        email: this.encrypt(email),
        password: this.encrypt(password),
      });

      await SInfo.setItem(CREDS_STORAGE_KEY, payload, {
        sharedPreferencesName: 'shieldSharedPrefs',
        keychainService: 'shieldKeychain',
      });
    } catch (error) {
      console.error('❌ Failed to store encrypted credentials:', error);
    }
  }

  async getEncryptedCredentials() {
    try {
      const data = await SInfo.getItem(CREDS_STORAGE_KEY, {
        sharedPreferencesName: 'shieldSharedPrefs',
        keychainService: 'shieldKeychain',
      });

      if (!data) return null;

      const parsed = JSON.parse(data);
      const email = this.decrypt(parsed.email);
      const password = this.decrypt(parsed.password);

      if (!email || !password) return null;
      return { email, password };
    } catch (error) {
      console.error('❌ Failed to load encrypted credentials:', error);
      return null;
    }
  }

  async setPasscode(passcode) {
    try {
      let creds = await this.getEncryptedCredentials();

      if (!creds) {
        const loginCreds = await Keychain.getGenericPassword({
          service: AUTH_SERVICE,
        });

        if (!loginCreds?.username || !loginCreds?.password) {
          throw new Error('No stored login credentials found');
        }

        creds = {
          email: loginCreds.username,
          password: loginCreds.password,
        };

        await this.storeEncryptedCredentials(creds.email, creds.password);
      }

      const payload = JSON.stringify(creds);
      const encrypted = this.encryptWithKey(payload, passcode);

      await SInfo.setItem('shield-passcode-bundle', encrypted, {
        sharedPreferencesName: 'shieldSharedPrefs',
        keychainService: 'shieldKeychain',
      });

      await Keychain.setGenericPassword('passcode', passcode, {
        service: PASSCODE_AUTH_SERVICE,
        accessControl:
          Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
        authenticatePrompt: 'Authenticate to save passcode',
      });

      return true;
    } catch (error) {
      console.error('🔥 [setPasscode] FAILURE:', error.message);
      throw error;
    }
  }

  async verifyPasscode(passcode) {
    try {
      const encrypted = await SInfo.getItem('shield-passcode-bundle', {
        sharedPreferencesName: 'shieldSharedPrefs',
        keychainService: 'shieldKeychain',
      });

      if (!encrypted) return false;
      const decrypted = this.decryptWithKey(encrypted, passcode);
      if (!decrypted) return false;

      JSON.parse(decrypted);
      return true;
    } catch {
      return false;
    }
  }

  async removePasscode() {
    try {
      await SInfo.deleteItem('shield-passcode-bundle', {
        sharedPreferencesName: 'shieldSharedPrefs',
        keychainService: 'shieldKeychain',
      });

      await Keychain.resetGenericPassword({
        service: PASSCODE_AUTH_SERVICE,
      });

      await AsyncStorage.removeItem('passcode_enabled');

      return true;
    } catch (error) {
      console.error('❌ [removePasscode] FAILED:', error);
      throw error;
    }
  }

  extractAuthExtras(payload) {
    const freeUser = Array.isArray(payload?.freeUser) ? payload.freeUser : [];
    const userLicense = payload?.userLicense ?? null;
    const status = payload?.status ?? null;
    const expiresAt = payload?.expires_at ?? null;

    const activationScreenStatus =
      payload?.activationScreenStatus ??
      payload?.activation_screen_status ??
      null;

    return { freeUser, userLicense, status, expiresAt, activationScreenStatus };
  }

  async persistAuthExtras(extras) {
    const {
      freeUser,
      userLicense,
      status,
      expiresAt,
      activationScreenStatus,
    } = extras;

    await AsyncStorage.multiSet([
      [FREE_USER_KEY, JSON.stringify(freeUser)],
      [USER_LICENSE_KEY, JSON.stringify(userLicense)],
      [LICENSE_STATUS_KEY, status ? String(status) : ''],
      [LICENSE_EXPIRES_AT_KEY, expiresAt ? String(expiresAt) : ''],
      ...(activationScreenStatus !== null &&
        activationScreenStatus !== undefined
        ? [[ACTIVATION_SCREEN_STATUS_KEY, String(activationScreenStatus)]]
        : []),
    ]);
  }

  async loginWithPasscode(passcode, deviceId) {
    try {
      let creds = await this.getEncryptedCredentials();

      if (!creds) {
        const loginCreds = await Keychain.getGenericPassword({
          service: AUTH_SERVICE,
        });

        if (!loginCreds?.username || !loginCreds?.password) {
          throw new Error('No stored credentials found');
        }

        creds = {
          email: loginCreds.username,
          password: loginCreds.password,
        };

        await this.storeEncryptedCredentials(creds.email, creds.password);
      }

      const encrypted = await SInfo.getItem('shield-passcode-bundle', {
        sharedPreferencesName: 'shieldSharedPrefs',
        keychainService: 'shieldKeychain',
      });

      if (!encrypted) {
        throw new Error('Passcode not set on this device');
      }

      const decrypted = this.decryptWithKey(encrypted, passcode);
      if (!decrypted) throw new Error('Invalid passcode');

      const { email } = JSON.parse(decrypted);

      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', creds.password);
      formData.append('device_id', deviceId);

      const response = await this.api.post('/v1/login', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });




      if (!response?.data?.data) {
        throw new Error('Invalid login response from server');
      }

      const payload = response.data.data;

      await this.persistAuthExtras(this.extractAuthExtras(payload));

      const { token, user } = payload;

      await this.setBackupRestoreEnabled(
        user?.is_backup_restore_enabled === 1
      );

      await this.setStorageDataEnabled(
        user?.is_storage_data_enabled === 1
      );

      await AsyncStorage.multiSet([
        ['auth_token', token],
        ['user_data', JSON.stringify(user)],
      ]);

      await Keychain.setGenericPassword(email, token, {
        service: AUTH_SERVICE,
      });

      const roleSlug = user?.role?.slug || 'standard';
      const canAccessChat = roleSlug === 'premium';

      await AsyncStorage.multiSet([
        ['user_role', roleSlug],
        ['can_access_chat', canAccessChat ? 'true' : 'false'],
      ]);

      deviceService.sendDeviceDetails(user.id).catch(() => { });

      return { token, user };
    } catch (error) {
      console.error('❌ [loginWithPasscode] FAILED:', error.message);
      throw error;
    }
  }

  async login(email, password, deviceId) {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('device_id', deviceId);

    const response = await this.api.post('/v1/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });


    if (!response?.data?.data) {
      throw new Error('Invalid login response from server');
    }

    const payload = response.data.data;
    await this.persistAuthExtras(this.extractAuthExtras(payload));

    const { token, user } = payload;

    await this.setBackupRestoreEnabled(
      user?.is_backup_restore_enabled === 1
    );

    await this.setStorageDataEnabled(
      user?.is_storage_data_enabled === 1
    );

    await AsyncStorage.multiSet([
      ['auth_token', token],
      ['user_data', JSON.stringify(user)],
    ]);

    await Keychain.setGenericPassword(email, token, {
      service: AUTH_SERVICE,
    });

    await this.storeEncryptedCredentials(email, password);

    deviceService.sendDeviceDetails(user.id).catch(() => { });

    return { token, user };
  }

  async logout() {
    try {
      await this.api.post('/v1/logout');
    } catch { }

    await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    await this.clearCredentials();
  }

  async getToken() {
    return await AsyncStorage.getItem('auth_token');
  }

  async getCurrentUser() {
    const userData = await AsyncStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  async clearCredentials() {
    await Keychain.resetGenericPassword({ service: AUTH_SERVICE });
  }

  async hasPasscode() {
    const credentials = await Keychain.getGenericPassword({
      service: PASSCODE_AUTH_SERVICE,
    });
    return !!credentials;
  }

  async getFreeUserFeatures() {
    const s = await AsyncStorage.getItem('free_user_features');
    return s ? JSON.parse(s) : [];
  }

  async getUserLicense() {
    const s = await AsyncStorage.getItem('user_license');
    return s ? JSON.parse(s) : null;
  }

  async setBackupRestoreEnabled(value) {
    await AsyncStorage.setItem(
      'is_backup_restore_enabled',
      JSON.stringify(value)
    );
  }

  async setStorageDataEnabled(value) {
    await AsyncStorage.setItem(
      'is_storage_data_enabled',
      JSON.stringify(value)
    );
  }

  async changePassword({ email, password, otp }) {
    try {
      const payload = {
        email,
        password,
        otp
      };

      const response = await this.api.post('/v1/change-password', payload);

      return response.data;

    } catch (error) {
      console.error('❌ CHANGE PASSWORD ERROR:', error?.response?.data || error.message);

      throw error?.response?.data || {
        success: false,
        message: 'Failed to change password',
      };
    }
  }
}

const authService = new AuthService();
export default authService;
