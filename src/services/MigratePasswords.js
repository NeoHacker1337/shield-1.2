import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashValue } from './HashService';

const SERVICES = ['shield-auth', 'shield-chat-hide', 'shield-chat-lock'];
const MIGRATION_KEY = 'shield_hash_migration_v1_done';

export const migrateToHashedPasswords = async () => {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_KEY);
    if (done === 'true') return; // already migrated

    for (const service of SERVICES) {
      const creds = await Keychain.getGenericPassword({ service });
      if (creds && creds.password && creds.password.length < 64) {
        // length < 64 means it's plain text, not a SHA-256 hash
        const hashed = hashValue(creds.password);
        await Keychain.setGenericPassword(creds.username, hashed, { service });
      }
    }

    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  } catch (e) {
    console.error('Password migration failed:', e);
  }
};
