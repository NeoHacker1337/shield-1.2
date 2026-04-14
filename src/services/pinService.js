import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOGIN_AUTH_SERVICE = 'shield-auth';
export const CHAT_HIDE_SERVICE = 'shield-chat-hide';
export const CHAT_LOCK_SERVICE = 'shield-chat-lock';
export const SECURITY_HIDE_SERVICE = 'shield-security-hide';

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 5 * 60 * 1000; // 5 minutes

/* ---------------- SAVE PIN ---------------- */

export const savePin = async (service, pin) => {

  await Keychain.setGenericPassword(
    'pin',
    pin,
    { service }
  );

  await AsyncStorage.removeItem(`${service}_attempts`);
  await AsyncStorage.removeItem(`${service}_lock`);
};


/* ---------------- VERIFY PIN ---------------- */

export const verifyPin = async (service, enteredPin) => {
  try {
    const creds = await Keychain.getGenericPassword({ service });
    if (!creds) {
      return {
        success: false
      };
    }
    if (creds.password === enteredPin) {
      return {
        success: true
      };
    }
    return {
      success: false
    };
  } catch (error) {
    return {
      success: false
    };
  }
};
 
/* ---------------- REMOVE PIN ---------------- */

export const removePin = async (service) => {
  await Keychain.resetGenericPassword({ service });
  await AsyncStorage.removeItem(`${service}_attempts`);
  await AsyncStorage.removeItem(`${service}_lock`);

};


/* ---------------- CHECK PIN ---------------- */

export const hasPin = async (service) => {
  const creds = await Keychain.getGenericPassword({ service });
  return !!creds;
};
 