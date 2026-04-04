// src/services/fileManager.js
import axios from 'axios';
import { BASE_URL } from '../utils/config';
import RNFS from 'react-native-fs';
import authService from './AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FileManagerService {
  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 15000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Attach token before every request
    this.api.interceptors.request.use(async (config) => {
      try {
        const token = await authService.getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch (_) { }
      return config;
    });


    // Add response interceptor for better error logging
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('🔴 API Error Details:', {
          status: error.response?.status,
          message: error.response?.data?.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Save file and password to backend and map serverId
   * ONLY saves locally if API call succeeds
   */
  async saveFilePassword(fileName, fileContent, password, localPath, userId = null) {

    try {
      const payload = {
        file_name: fileName,
        file_content: fileContent,
        password,
        user_id: userId,
      };

      // 🔹 API call - This must succeed before local storage

      const response = await this.api.post('/v1/save-file-password', payload);

      // ✅ VALIDATION: Check if API returned success status
      const apiSuccess = response?.data?.success === true;
      const statusOk = response?.status >= 200 && response?.status < 300;


      if (!apiSuccess || !statusOk) {
        console.warn('⚠️ API returned failure status. NOT storing file locally.');
        return {
          success: false,
          error: response?.data?.message || 'API returned failure status',
        };
      }

      // 🔹 Extract the file ID from API response
      const fileId = response?.data?.data?.id || null;

      if (!fileId) {
        console.warn('⚠️ Missing fileId in API response. NOT storing locally.');
        return {
          success: false,
          error: 'Missing file ID in response',
        };
      }


      try {
        // 🔹 Retrieve existing mappings
        const existing = await AsyncStorage.getItem('fileServerIds');
        const fileServerIds = existing ? JSON.parse(existing) : {};

        // 🔹 Store mapping as { "fileName": fileId }
        fileServerIds[fileName] = fileId;

        // 🔹 Save back to AsyncStorage
        await AsyncStorage.setItem('fileServerIds', JSON.stringify(fileServerIds));


      } catch (storageError) {
        console.error('❌ Failed to store file mapping locally:', storageError);
        // Don't fail the whole operation if local storage fails
        // but log it clearly
      }

      return {
        success: true,
        data: response.data?.data,
        message: response.data?.message || 'File saved successfully',
      };

    } catch (error) {
      console.error('❌ Error saving file (catch block):', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to save file',
      };
    }
  }

  /**
   * Update existing file on the server
   */
  async updateFilePassword(fileId, fileName, fileContent, password) {
    try {
      if (!fileId) return { success: false, error: 'Missing file ID. Cannot update.' };

      const payload = { file_name: fileName, file_content: fileContent, password };
      const response = await this.api.post(`/v1/update-file-password/${fileId}`, payload);

      const apiSuccess = response?.data?.success === true;

      if (apiSuccess) {
        return {
          success: true,
          data: response.data?.data,
          message: response.data?.message,
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Failed to update file'
      };

    } catch (error) {
      console.error('❌ Update error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to update file',
      };
    }
  }

  async canSaveFilePassword(fileName, userId = null) {
    try {
      const payload = {
        filename: fileName,
        filecontent: '',
        password: '',
        userid: userId,
        check_only: true,
      };

      const response = await this.api.post('v1/save-file-password', payload);

      const allowed =
        response?.data?.data?.allowed === true ||
        response?.data?.allowed === true ||
        response?.data?.success === true;

      return {
        success: true,
        allowed,
        message: response?.data?.message || '',
        data: response?.data?.data,
      };
    } catch (error) {
      return {
        success: false,
        allowed: false,
        message: error?.response?.data?.message || error.message || 'Request failed',
      };
    }
  }

  async deleteFile(id) {
    try {
      if (!id) return { success: false, error: 'Missing ID' };
      const response = await this.api.delete(`/v1/delete-file/${id}`);
      return {
        success: true,
        message: response.data?.message || 'File deleted successfully',
      };
    } catch (error) {
      console.error('❌ Delete error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to delete file',
      };
    }
  }

  // async uploadLockedFolderFile(folderName, fileName, filePath, onProgress, cancelToken) {
  //   try {
  //     const uri = filePath.startsWith('file://')
  //       ? filePath
  //       : 'file://' + filePath;

  //     const form = new FormData();
  //     form.append('folder_name', folderName);
  //     form.append('file_name', fileName);
  //     form.append('mobile_file_path', filePath);

  //     form.append('file', {
  //       uri,
  //       name: fileName,
  //       type: 'application/octet-stream',
  //     });

  //     const res = await this.api.post(
  //       '/v1/upload-locked-folder-file',
  //       form,
  //       {
  //         headers: { 'Content-Type': 'multipart/form-data' },
  //         onUploadProgress: (p) => {
  //           let percent = 0;

  //           if (p.total) {
  //             percent = Math.round((p.loaded * 100) / p.total);
  //           }

  //           // clamp between 0–100
  //           percent = Math.min(100, Math.max(0, percent));

  //           onProgress?.(percent);
  //         },
  //         cancelToken,
  //         timeout: 0,
  //       }
  //     );

  //     return { success: true, data: res.data };

  //   } catch (e) {
  //     if (axios.isCancel(e)) {
  //       return { success: false, canceled: true };
  //     }
  //     return { success: false };
  //   }
  // }

  async uploadLockedFolderFile(folderName, fileName, filePath, onProgress, cancelToken, extraData = {}) {
    try {
      const uri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
      const form = new FormData();

      // ✅ Fixed keys — match Laravel validation exactly
      form.append('folder_name', folderName);
      form.append('file_name', fileName);
      form.append('mobile_file_path', filePath);
      form.append('file', { uri, name: fileName, type: extraData.mimeType || 'application/octet-stream' });

      // ── New fields ──
      form.append('password_hash', extraData.passwordHash || '');
      form.append('original_location', extraData.originalLocation || '');
      form.append('file_size', String(extraData.fileSize || 0));
      form.append('file_mime_type', extraData.mimeType || 'application/octet-stream');
      form.append('is_folder', '0');
      form.append('backup_status', 'backed_up');
      form.append('device_id', extraData.deviceId || '');
      form.append('backed_up_at', new Date().toISOString());
      form.append('checksum', extraData.checksum || '');

      const res = await this.api.post(
        'v1/upload-locked-folder-file',
        form,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (p) => {
            let percent = p.total ? Math.round((p.loaded * 100) / p.total) : 0;
            onProgress?.(Math.min(100, Math.max(0, percent)));
          },
          cancelToken,
          timeout: 0,
        }
      );
      return { success: true, data: res.data };
    } catch (e) {
      if (axios.isCancel(e)) return { success: false, canceled: true };

      // ✅ Step 4 — detect storage full
      if (e.response?.status === 403 && e.response?.data?.storage_full) {
        return {
          success: false,
          storageFull: true,
          error: e.response.data.message || 'Storage full. Please upgrade your plan.',
        };
      }

      return { success: false, error: e.response?.data?.message || 'Upload failed' };
    }
  }

  // GET backup status
  async getBackupStatus() {
    try {
      const res = await this.api.post('v1/vault/backup/status');
      return { success: true, data: res.data?.data };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || 'Failed' };
    }
  }

  // POST mark files as backed up
  async markFilesBackedUp(fileIds = [], deviceId = '') {
    try {
      const res = await this.api.post('v1/vault/backup/mark-backed-up', {
        file_ids: fileIds,
        device_id: deviceId,
      });
      return { success: true, message: res.data?.message };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || 'Failed' };
    }
  }

  // POST save backup schedule
  async saveBackupSchedule(schedule) {
    try {
      const res = await this.api.post('v1/vault/backup/schedule', { schedule });
      return {
        success: true,
        schedule: res.data?.schedule,
        nextBackupAt: res.data?.next_backup_at,
      };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || 'Failed' };
    }
  }


  // GET file list from server
 async getRestoreList() {
    try {
        const res = await this.api.get('v1/vault/restore/list');
        return {
            success: true,
            data:    res.data?.data ?? [],
            count:   res.data?.count ?? 0,
            code:    null,
        };
    } catch (e) {
        return {
            success: false,
            code:    e.response?.data?.code ?? null,   // ✅ captures NO_BACKUP
            error:   e.response?.data?.message || 'Failed to load restore list.',
        };
    }
}


  async downloadRestoreFileByUrl(fileUrl, destPath, onProgress) {
    try {


      const parentDir = destPath.substring(0, destPath.lastIndexOf('/'));
      if (!(await RNFS.exists(parentDir))) await RNFS.mkdir(parentDir);

      const result = await RNFS.downloadFile({
        fromUrl: fileUrl,   // ✅ full URL from server
        toFile: destPath,
        progressDivider: 1,
        begin: (r) => console.log('📥 Content-Length:', r.contentLength),
        progress: (p) => {
          if (p.contentLength > 0) {
            onProgress?.(Math.round((p.bytesWritten / p.contentLength) * 100));
          }
        },
      }).promise;



      if (result.statusCode === 200) return { success: true };

      const body = await RNFS.readFile(destPath, 'utf8').catch(() => 'unreadable');

      await RNFS.unlink(destPath).catch(() => { });
      return { success: false, error: `HTTP ${result.statusCode}: ${body}` };

    } catch (e) {
      console.error('❌ Download exception:', e.message);
      return { success: false, error: e.message };
    }
  }

  // POST mark restore complete
  async markRestoreComplete(restoredCount = 0, deviceId = '') {
    try {
      const res = await this.api.post('v1/vault/restore/complete', {
        restored_count: restoredCount,
        device_id: deviceId,
      });
      return { success: true, data: res.data };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || 'Failed' };
    }
  }


  // OTP — Send
  async sendRestoreOtp() {
    try {

      const res = await this.api.post('v1/restore/otp/send');

      return { success: true, email: res.data?.email, message: res.data?.message };
    } catch (e) {
      console.error('📧 OTP error status:', e.response?.status);
      console.error('📧 OTP error data:', JSON.stringify(e.response?.data));
      return { success: false, error: e.response?.data?.message || 'Failed to send OTP' };
    }
  }


  // OTP — Verify
  async verifyRestoreOtp(otp) {
    try {
      const res = await this.api.post('v1/restore/otp/verify', { otp });
      return { success: true, message: res.data?.message };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || 'Invalid OTP' };
    }
  }

  // GET storage info
  async getStorageInfo() {
    try {
      const res = await this.api.get('v1/storage/info');

      return { success: true, data: res.data?.data };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || 'Failed to load storage info' };
    }
  }

  // GET all storage plans
  async getStoragePlans() {
    try {
      const res = await this.api.get('v1/storage/plans');

      return { success: true, data: res.data?.data };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || 'Failed to load plans' };
    }
  }


  async submitUpgradeRequest(planId, userNote = '') {
    try {
      const res = await this.api.post('/v1/upgrade-requests/request', {
        plan_id: planId,
        user_note: userNote,
      });

      return {
        success: true,
        data: res.data?.data,
        message: res.data?.message,
      };
    } catch (e) {
      return {
        success: false,
        error: e.response?.data?.message || 'Failed to submit request',
      };
    }
  }
}

export default new FileManagerService();
