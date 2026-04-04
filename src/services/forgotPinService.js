/**
 * forgotPinService.js
 *
 * Place this file at:
 *   src/services/forgotPinService.js
 *
 * This service handles the full "Forgot PIN" reset flow for all 4
 * shield services. It bridges:
 *   - pinService.js        → savePin()       for 3 services
 *   - AuthService.js       → setPasscode()   for LOGIN_AUTH_SERVICE
 *   - securityQuestionService.js → question fetch + answer verify
 */

import Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  savePin,
  LOGIN_AUTH_SERVICE,
  CHAT_HIDE_SERVICE,
  CHAT_LOCK_SERVICE,
  SECURITY_HIDE_SERVICE,
} from './pinService';

import authService from './AuthService';
import * as securityQuestionService from './securityQuestionService';

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */

/**
 * AsyncStorage key used to track how many failed reset attempts
 * have been made in the current session. Reset on success.
 */
const RESET_ATTEMPTS_KEY = 'forgot_pin_reset_attempts';

/** Max failed security-question attempts before a cooldown is set */
const MAX_VERIFY_ATTEMPTS = 5;

/** Cooldown in milliseconds after max failed attempts (10 minutes) */
const COOLDOWN_DURATION = 10 * 60 * 1000;

/** AsyncStorage key that stores the cooldown expiry timestamp */
const RESET_COOLDOWN_KEY = 'forgot_pin_cooldown_until';

/* ─────────────────────────────────────────────────────────────
   SERVICE LABEL MAP
   Returns a human-readable name for each shield service constant.
───────────────────────────────────────────────────────────── */

/**
 * Returns a human-readable label for the given service key.
 *
 * @param {string} service - One of the 4 shield service constants
 * @returns {string} Label shown in the UI
 *
 * @example
 * getPinServiceLabel(LOGIN_AUTH_SERVICE)  // → 'Login Passcode'
 * getPinServiceLabel(CHAT_LOCK_SERVICE)   // → 'Chat Lock PIN'
 */
export const getPinServiceLabel = (service) => {
  switch (service) {
    case LOGIN_AUTH_SERVICE:
      return 'Login Passcode';
    case CHAT_HIDE_SERVICE:
      return 'Chat Hide PIN';
    case CHAT_LOCK_SERVICE:
      return 'Chat Lock PIN';
    case SECURITY_HIDE_SERVICE:
      return 'Security Hide PIN';
    default:
      return 'PIN';
  }
};

/* ─────────────────────────────────────────────────────────────
   VALIDATION
───────────────────────────────────────────────────────────── */

/**
 * Checks whether the given service string is one of the 4 valid
 * shield service constants.
 *
 * @param {string} service
 * @returns {boolean}
 */
export const isValidService = (service) => {
  return [
    LOGIN_AUTH_SERVICE,
    CHAT_HIDE_SERVICE,
    CHAT_LOCK_SERVICE,
    SECURITY_HIDE_SERVICE,
  ].includes(service);
};

/**
 * Validates a candidate PIN.
 *   - Must be exactly 6 characters
 *   - Must contain only digits (0-9)
 *   - Must not be all the same digit (e.g. 000000, 111111)
 *   - Must not be a simple sequence (e.g. 123456, 654321)
 *
 * @param {string} pin
 * @returns {{ valid: boolean, error: string | null }}
 */
export const validatePin = (pin) => {
  if (!pin || typeof pin !== 'string') {
    return { valid: false, error: 'PIN must be a 6-digit number.' };
  }

  if (!/^\d{6}$/.test(pin)) {
    return { valid: false, error: 'PIN must be exactly 6 digits.' };
  }

  // Reject all-same digits: 000000, 111111, ..., 999999
  if (/^(\d)\1{5}$/.test(pin)) {
    return { valid: false, error: 'PIN is too simple. Avoid repeated digits.' };
  }

  // Reject ascending/descending sequences
  const WEAK_PINS = ['123456', '654321', '012345', '543210', '234567', '765432'];
  if (WEAK_PINS.includes(pin)) {
    return { valid: false, error: 'PIN is too simple. Avoid sequential digits.' };
  }

  return { valid: true, error: null };
};

/* ─────────────────────────────────────────────────────────────
   COOLDOWN HELPERS
   Brute-force protection: after MAX_VERIFY_ATTEMPTS wrong
   answers the reset flow is locked for COOLDOWN_DURATION.
───────────────────────────────────────────────────────────── */

/**
 * Checks whether the reset flow is currently in a cooldown period.
 *
 * @returns {Promise<{ locked: boolean, remainingMs: number }>}
 */
export const checkResetCooldown = async () => {
  try {
    const cooldownUntil = await AsyncStorage.getItem(RESET_COOLDOWN_KEY);
    if (!cooldownUntil) return { locked: false, remainingMs: 0 };

    const remaining = Number(cooldownUntil) - Date.now();
    if (remaining > 0) {
      return { locked: true, remainingMs: remaining };
    }

    // Cooldown expired — clear it
    await AsyncStorage.multiRemove([RESET_COOLDOWN_KEY, RESET_ATTEMPTS_KEY]);
    return { locked: false, remainingMs: 0 };
  } catch {
    return { locked: false, remainingMs: 0 };
  }
};

/**
 * Increments the failed-attempt counter. If MAX_VERIFY_ATTEMPTS is
 * reached, sets a cooldown and returns locked = true.
 *
 * @returns {Promise<{ locked: boolean, attemptsLeft: number }>}
 */
const incrementFailedAttempt = async () => {
  try {
    const current = Number(await AsyncStorage.getItem(RESET_ATTEMPTS_KEY)) || 0;
    const updated = current + 1;
    await AsyncStorage.setItem(RESET_ATTEMPTS_KEY, String(updated));

    if (updated >= MAX_VERIFY_ATTEMPTS) {
      const lockUntil = Date.now() + COOLDOWN_DURATION;
      await AsyncStorage.setItem(RESET_COOLDOWN_KEY, String(lockUntil));
      return { locked: true, attemptsLeft: 0 };
    }

    return { locked: false, attemptsLeft: MAX_VERIFY_ATTEMPTS - updated };
  } catch {
    return { locked: false, attemptsLeft: MAX_VERIFY_ATTEMPTS - 1 };
  }
};

/** Clears the failed-attempt counter and any active cooldown. */
const clearFailedAttempts = async () => {
  try {
    await AsyncStorage.multiRemove([RESET_ATTEMPTS_KEY, RESET_COOLDOWN_KEY]);
  } catch {
    // Silently ignore
  }
};

/* ─────────────────────────────────────────────────────────────
   SECURITY QUESTION HELPERS
   Wraps securityQuestionService with a consistent API so that
   if the underlying method names ever change you only update here.
───────────────────────────────────────────────────────────── */

/**
 * Fetches the stored security question string.
 *
 * Tries the most common method names from securityQuestionService
 * in priority order so this works even if the service evolves.
 *
 * @returns {Promise<string | null>}
 *   Resolves to the question text, or null if none is stored.
 */
export const getSecurityQuestion = async () => {
  try {
    if (typeof securityQuestionService.getSecurityQuestions === 'function') {
      const response = await securityQuestionService.getSecurityQuestions();

      // ✅ API structure: { success, data: [...] }
      if (response?.data?.length > 0) {
        return response.data; // 🔥 return full array (id + question)
      }

      if (Array.isArray(response) && response.length > 0) {
        return response;
      }
    }

    return [];
  } catch (error) {
    console.error('[forgotPinService] getSecurityQuestion error:', error);
    return [];
  }
};

/**
 * Verifies the user's answer against the stored security answer.
 *
 * Normalises the input (trim + lowercase) before comparing.
 * Increments the brute-force counter on failure.
 *
 * @param {string} answer - The raw answer text typed by the user
 * @returns {Promise<{
 *   valid: boolean,
 *   locked?: boolean,
 *   attemptsLeft?: number,
 *   error?: string
 * }>}
 */
export const verifySecurityAnswer = async (answers = []) => {
  // answers = [{ question_id: 1, answer: "abc" }, ...]

  if (!Array.isArray(answers) || answers.length === 0) {
    return { valid: false, error: 'Answers are required.' };
  }

  // validate each answer
  for (let item of answers) {
    if (!item?.answer || !item.answer.trim()) {
      return { valid: false, error: 'All answers are required.' };
    }
    if (!item?.question_id) {
      return { valid: false, error: 'Invalid question reference.' };
    }
  }

  const cooldown = await checkResetCooldown();
  if (cooldown.locked) {
    const mins = Math.ceil(cooldown.remainingMs / 60000);
    return {
      valid: false,
      locked: true,
      error: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`,
    };
  }

  try {
    let isValid = false;

    if (typeof securityQuestionService.verifySecurityAnswers === 'function') {

      // ✅ IMPORTANT FIX: correct payload format
      const payload = {
        answers: answers.map(item => ({
          question_id: item.question_id,
          answer: item.answer.trim()
        }))
      };

      console.log("FINAL PAYLOAD:", payload);

      const response = await securityQuestionService.verifySecurityAnswers(payload);

      isValid = response?.success || response?.valid || false;

    } else {
      return {
        valid: false,
        error: 'Security question service is not properly configured.',
      };
    }

    if (isValid) {
      await clearFailedAttempts();
      return { valid: true };
    }

    const { locked, attemptsLeft } = await incrementFailedAttempt();

    if (locked) {
      return {
        valid: false,
        locked: true,
        error: 'Too many failed attempts. Reset locked for 10 minutes.',
      };
    }

    return {
      valid: false,
      attemptsLeft,
      error: `Incorrect answer. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
    };

  } catch (error) {
    console.error('[forgotPinService] verifySecurityAnswer error:', error);
    return { valid: false, error: 'Verification failed. Please try again.' };
  }
};


/* ─────────────────────────────────────────────────────────────
   CORE RESET FUNCTIONS
───────────────────────────────────────────────────────────── */

/**
 * Resets the PIN for a given service WITHOUT re-verifying the
 * security answer. Call this only AFTER identity has already
 * been confirmed via verifySecurityAnswer().
 *
 * Routes to the correct underlying service:
 *   - LOGIN_AUTH_SERVICE  → authService.setPasscode(newPin)
 *   - All others          → savePin(service, newPin)
 *
 * @param {string} service  - One of the 4 shield service constants
 * @param {string} newPin   - The new 6-digit PIN string
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export const forceResetPin = async (service, newPin) => {
  // Guard: valid service?
  if (!isValidService(service)) {
    return { success: false, error: `Unknown service: ${service}` };
  }

  // Guard: valid PIN?
  const { valid, error: pinError } = validatePin(newPin);
  if (!valid) {
    return { success: false, error: pinError };
  }

  try {
    if (service === LOGIN_AUTH_SERVICE) {
      // AuthService.setPasscode re-encrypts stored credentials with the
      // new passcode — it's the correct way to change the login PIN.
      await authService.setPasscode(newPin);
    } else {
      // All other services use the simple keychain savePin wrapper
      await savePin(service, newPin);
    }

    // Clear any leftover lockout state for this service
    await AsyncStorage.multiRemove([
      `${service}_attempts`,
      `${service}_lock`,
    ]);

    return { success: true };

  } catch (error) {
    console.error(`[forgotPinService] forceResetPin(${service}) error:`, error);
    return {
      success: false,
      error: error?.message || 'Failed to save new PIN. Please try again.',
    };
  }
};

/**
 * Full one-call reset flow:
 *   1. Verifies the security answer
 *   2. On success, resets the PIN for the given service
 *
 * Use this if you want a single async call instead of the two-step
 * approach used by ForgotPinModal.
 *
 * @param {string} service
 * @param {string} answer   - User's security question answer (raw text)
 * @param {string} newPin   - New 6-digit PIN
 * @returns {Promise<{
 *   success: boolean,
 *   locked?: boolean,
 *   attemptsLeft?: number,
 *   error?: string
 * }>}
 *
 * @example
 * const result = await verifyAndResetPin(CHAT_LOCK_SERVICE, 'myAnswer', '482910');
 * if (result.success) { ... }
 */
export const verifyAndResetPin = async (service, answer, newPin) => {
  // Step 1 — verify identity
  const verifyResult = await verifySecurityAnswer(answer);
  if (!verifyResult.valid) return verifyResult;

  // Step 2 — reset PIN
  const resetResult = await forceResetPin(service, newPin);
  return resetResult;
};

/* ─────────────────────────────────────────────────────────────
   UTILITY EXPORTS
   Expose the service constants re-exported from pinService so
   callers only need to import from forgotPinService.
───────────────────────────────────────────────────────────── */

export {
  LOGIN_AUTH_SERVICE,
  CHAT_HIDE_SERVICE,
  CHAT_LOCK_SERVICE,
  SECURITY_HIDE_SERVICE,
};