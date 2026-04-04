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

  console.log("---- VERIFY PIN ----");
  console.log("Service:", service);
  console.log("Entered PIN:", enteredPin);

  try {

    const creds = await Keychain.getGenericPassword({ service });

    console.log("Stored credentials:", creds);

    if (!creds) {

      console.log("❌ No PIN stored for this service");

      return {
        success: false
      };

    }

    if (creds.password === enteredPin) {

      console.log("✅ PIN MATCHED");

      return {
        success: true
      };

    }

    console.log("❌ PIN DOES NOT MATCH");

    return {
      success: false
    };

  } catch (error) {

    console.log("🚨 verifyPin error:", error);

    return {
      success: false
    };

  }

};


// export const verifyPin = async (service, enteredPin) => {

//   try {

//     const lockTime = await AsyncStorage.getItem(`${service}_lock`);

//     if (lockTime && Date.now() < Number(lockTime)) {
//       return {
//         success: false,
//         locked: true,
//         remaining: Math.floor((Number(lockTime) - Date.now()) / 1000)
//       };
//     }

//     const creds = await Keychain.getGenericPassword({ service });

//     if (!creds) {
//       return { success: false };
//     }

//     if (creds.password === enteredPin) {

//       await AsyncStorage.removeItem(`${service}_attempts`);

//       return { success: true };

//     }

//     let attempts =
//       Number(await AsyncStorage.getItem(`${service}_attempts`)) || 0;

//     attempts++;

//     await AsyncStorage.setItem(`${service}_attempts`, String(attempts));

//     if (attempts >= MAX_ATTEMPTS) {

//       const lockUntil = Date.now() + LOCK_TIME;

//       await AsyncStorage.setItem(`${service}_lock`, String(lockUntil));

//       return {
//         success: false,
//         locked: true,
//         remaining: LOCK_TIME / 1000
//       };

//     }

//     return {
//       success: false,
//       attemptsLeft: MAX_ATTEMPTS - attempts
//     };

//   } catch (e) {

//     console.log("verifyPin error:", e);

//     return { success: false };

//   }

// };

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


/* ---------------- BIOMETRIC AUTH ---------------- */

export const biometricUnlock = async () => {

  const rnBiometrics = new ReactNativeBiometrics();

  const { available } = await rnBiometrics.isSensorAvailable();

  if (!available) return false;

  const result = await rnBiometrics.simplePrompt({
    promptMessage: 'Authenticate to unlock'
  });

  return result.success;

};
