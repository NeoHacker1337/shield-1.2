import CryptoJS from 'crypto-js';

// A fixed app-level salt — makes rainbow table attacks useless
// Change this to any random string unique to your app
const APP_SALT = 'shield_s3cur3_@pp_s@lt_2025';

/**
 * Hash a password or PIN using SHA-256 + app salt
 * @param {string} value — raw password or PIN
 * @returns {string} — hex hash string
 */
export const hashValue = (value) => {
  return CryptoJS.SHA256(value + APP_SALT).toString(CryptoJS.enc.Hex);
};

/**
 * Verify a raw value against a stored hash
 * @param {string} rawValue — what the user typed
 * @param {string} storedHash — what was saved in Keychain
 * @returns {boolean}
 */
export const verifyValue = (rawValue, storedHash) => {
  return hashValue(rawValue) === storedHash;
};
