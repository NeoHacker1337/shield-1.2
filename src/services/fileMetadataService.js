import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const METADATA_KEY = '@shield_file_metadata';
const HIDDEN_DIR = `${RNFS.DocumentDirectoryPath}/.shield_vault`;
import { hashPassword } from './cryptoService';

class FileMetadataService {
  constructor() {
    this.metadata = {};
    this.loadMetadata();
  }

  async initializeVault() {
    try {
      const exists = await RNFS.exists(HIDDEN_DIR);
      if (!exists) {
        await RNFS.mkdir(HIDDEN_DIR);
        // Create .nomedia to exclude from gallery
        await RNFS.writeFile(`${HIDDEN_DIR}/.nomedia`, '', 'utf8');
        console.log('🔒 Vault initialized at:', HIDDEN_DIR);
      }
    } catch (error) {
      console.error('Failed to initialize vault:', error);
      throw error;
    }
  }

  async loadMetadata() {
    try {
      const stored = await AsyncStorage.getItem(METADATA_KEY);
      this.metadata = stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load metadata:', error);
      this.metadata = {};
    }
  }

  async saveMetadata() {
    try {
      await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(this.metadata));
    } catch (error) {
      console.error('Failed to save metadata:', error);
      throw error;
    }
  }

  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  generateHiddenFilename(originalName) {
    const uniqueId = this.generateUniqueId();
    return `.shield.${uniqueId}.${originalName}`;
  }

  // async storeFileMapping(originalPath, hiddenPath, password, originalName, fileSize) {
  //   const fileId = this.generateUniqueId();

  //   this.metadata[hiddenPath] = {
  //     id: fileId,
  //     originalPath: originalPath,
  //     originalName: originalName,
  //     hiddenPath: hiddenPath,
  //     hiddenName: hiddenPath.split('/').pop(),
  //     password: password, // In production, hash this
  //     fileSize: fileSize,
  //     encryptedAt: new Date().toISOString(),
  //     lastAccessed: null,
  //     accessCount: 0
  //   };

  //   await this.saveMetadata();
  //   return fileId;
  // }

  async storeFileMapping(originalPath, hiddenPath, password, originalName, fileSize) {
    const fileId = this.generateUniqueId();

    this.metadata[hiddenPath] = {
      id: fileId,
      originalPath,
      originalName,
      hiddenPath,
      hiddenName: hiddenPath.split('/').pop(),
      passwordHash: hashPassword(password), // 🔐 HASHED
      fileSize,
      encryptedAt: new Date().toISOString(),
      lastAccessed: null,
      accessCount: 0,
    };

    await this.saveMetadata();
    return fileId;
  }

  async getFileMapping(hiddenPath) {
    return this.metadata[hiddenPath] || null;
  }

  // async getMappingByPassword(password) {
  //   return Object.values(this.metadata).find(
  //     file => file.password === password
  //   ) || null;
  // }
  async getMappingByPassword(password) {
    const hash = hashPassword(password);
    return Object.values(this.metadata).find(
      file => file.passwordHash === hash
    ) || null;
  }

  async removeFileMapping(hiddenPath) {
    if (this.metadata[hiddenPath]) {
      delete this.metadata[hiddenPath];
      await this.saveMetadata();
    }
  }

  async updateAccessLog(hiddenPath) {
    if (this.metadata[hiddenPath]) {
      this.metadata[hiddenPath].lastAccessed = new Date().toISOString();
      this.metadata[hiddenPath].accessCount += 1;
      await this.saveMetadata();
    }
  }

  getAllHiddenFiles() {
    return Object.values(this.metadata);
  }

  async clearAllMetadata() {
    this.metadata = {};
    await AsyncStorage.removeItem(METADATA_KEY);
  }
}

export default new FileMetadataService();