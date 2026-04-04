// contactSyncService.js

import { PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

// ✅ Use the shared axios instance from chatService
import { api } from './chatService';

class ContactSyncService {
  /**
   * Request permission to access contacts
   */
  async requestContactsPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'This app needs access to your contacts to sync them.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Permission request error:', err);
        return false;
      }
    } else {
      // iOS permission is handled automatically by react-native-contacts
      return true;
    }
  }

  /**
   * Get all contacts from phone and extract emails
   */
  async getPhoneContactEmails() {
    try {
      const hasPermission = await this.requestContactsPermission();

      if (!hasPermission) {
        throw new Error('Contacts permission denied');
      }

      // Get all contacts from phone
      const contacts = await Contacts.getAll();

      // Extract emails from contacts
      const emails = [];
      const emailSet = new Set(); // To avoid duplicates

      contacts.forEach((contact) => {
        if (contact.emailAddresses && contact.emailAddresses.length > 0) {
          contact.emailAddresses.forEach((emailObj) => {
            const email = emailObj.email?.trim().toLowerCase();
            if (email && this.isValidEmail(email) && !emailSet.has(email)) {
              emails.push(email);
              emailSet.add(email);
            }
          });
        }
      });
 
      return emails;
    } catch (error) {
      console.error('Error getting phone contacts:', error);
      throw error;
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sync contacts with server
   * @param {Array<string>} emails - Array of email addresses
   */
  async syncContacts(emails = null) {
    try {
      let emailsToSync = emails;

      // If no emails provided, get them from phone contacts
      if (!emailsToSync || emailsToSync.length === 0) {
        emailsToSync = await this.getPhoneContactEmails();
      }

      // If still no emails, return early
      if (!emailsToSync || emailsToSync.length === 0) {
        return {
          success: false,
          message: 'No email addresses found in contacts',
          data: null,
        };
      }

      // ✅ Use shared axios client instead of apiClient
      const response = await api.post('/v1/sync-contacts', {
        emails: emailsToSync,
      });

      return {
        success: true,
        message: response.data?.message || 'Contacts synced successfully',
        data: response.data?.data || null,
        synced_count: response.data?.synced_count || 0,
        total_sent: emailsToSync.length,
      };
    } catch (error) {
      console.error('Contact sync error:', error);

      if (error.response?.data) {
        throw new Error(
          error.response.data.message || 'Failed to sync contacts',
        );
      }

      throw error;
    }
  }

  /**
   * Sync contacts with progress callback
   * Useful for showing progress to users
   */
  async syncContactsWithProgress(onProgress) {
    try {
      // Step 1: Request permission
      onProgress?.({ step: 1, total: 3, message: 'Requesting permission...' });
      const hasPermission = await this.requestContactsPermission();

      if (!hasPermission) {
        throw new Error('Contacts permission denied');
      }

      // Step 2: Get contacts
      onProgress?.({ step: 2, total: 3, message: 'Reading contacts...' });
      const emails = await this.getPhoneContactEmails();

      // Step 3: Sync with server
      onProgress?.({ step: 3, total: 3, message: 'Syncing with server...' });
      const result = await this.syncContacts(emails);

      return result;
    } catch (error) {
      console.error('Contact sync with progress error:', error);
      throw error;
    }
  }
}

export default new ContactSyncService();
