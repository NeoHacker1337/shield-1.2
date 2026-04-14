// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/Features/useKeyboard.js        ║
// ╚══════════════════════════════════════════════════════════════╝

import { useState, useEffect, useRef, useCallback } from 'react';
import { Keyboard, Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────
// MODULE-LEVEL CONSTANTS
// Platform.OS never changes at runtime — compute once
// ─────────────────────────────────────────────────────────────────
const IS_IOS = Platform.OS === 'ios';

/**
 * Event names for keyboard show/hide per platform.
 * iOS uses "Will" events for smoother animations that track
 * the keyboard frame in real time.
 * Android uses "Did" events as "Will" events are not available.
 */
const KEYBOARD_SHOW_EVENT = IS_IOS ? 'keyboardWillShow' : 'keyboardDidShow';
const KEYBOARD_HIDE_EVENT = IS_IOS ? 'keyboardWillHide' : 'keyboardDidHide';

/**
 * iOS-only event fired when keyboard changes height
 * (e.g. emoji ↔ regular keyboard, QuickType bar toggle).
 * Not available on Android.
 */
const KEYBOARD_CHANGE_FRAME_EVENT = 'keyboardWillChangeFrame';

// ─────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────

/**
 * Safely extracts keyboard height from a Keyboard event.
 * Returns 0 for missing, non-numeric, or negative values.
 *
 * @param {object} event - Keyboard event from Keyboard.addListener
 * @returns {number} Height in logical pixels (>= 0)
 */
const extractKeyboardHeight = (event) => {
  const height = event?.endCoordinates?.height;
  if (typeof height !== 'number' || isNaN(height) || height < 0) return 0;
  return height;
};

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

/**
 * useKeyboard
 *
 * Tracks keyboard visibility and height across iOS and Android.
 *
 * Features:
 * - Mounted ref guard — no state updates after unmount
 * - Single state object — atomic updates, single re-render per event
 * - iOS: handles keyboardWillChangeFrame for height transitions
 * - Safe height extraction (guards NaN, negative, undefined)
 * - Platform event names computed once at module level
 * - Exposes dismissKeyboard helper for convenience
 *
 * @returns {{
 *   keyboardHeight: number,
 *   isKeyboardVisible: boolean,
 *   dismissKeyboard: function
 * }}
 */
const useKeyboard = () => {
  /**
   * Single state object — both values updated atomically in one setState call.
   * Prevents the two-render issue from separate setKeyboardHeight +
   * setIsKeyboardVisible calls.
   */
  const [keyboardState, setKeyboardState] = useState({
    keyboardHeight: 0,
    isKeyboardVisible: false,
  });

  const mountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // ── Show handler ──────────────────────────────────────────────
    const handleShow = (event) => {
      if (!mountedRef.current) return;
      const height = extractKeyboardHeight(event);
      setKeyboardState({
        keyboardHeight: height,
        isKeyboardVisible: true,
      });
    };

    // ── Hide handler ──────────────────────────────────────────────
    const handleHide = () => {
      if (!mountedRef.current) return;
      setKeyboardState({
        keyboardHeight: 0,
        isKeyboardVisible: false,
      });
    };

    // ── Frame change handler (iOS only) ───────────────────────────
    // Fires when keyboard changes height without hide/show cycle
    // e.g. switching between emoji and regular keyboard
    const handleFrameChange = (event) => {
      if (!mountedRef.current) return;
      const height = extractKeyboardHeight(event);

      setKeyboardState((prev) => {
        // Only update if height actually changed
        if (prev.keyboardHeight === height) return prev;
        return {
          keyboardHeight: height,
          isKeyboardVisible: height > 0,
        };
      });
    };

    // ── Subscribe ─────────────────────────────────────────────────
    const showSub = Keyboard.addListener(KEYBOARD_SHOW_EVENT, handleShow);
    const hideSub = Keyboard.addListener(KEYBOARD_HIDE_EVENT, handleHide);

    // iOS-only: track keyboard frame changes (emoji keyboard, QuickType, etc.)
    const frameSub = IS_IOS
      ? Keyboard.addListener(KEYBOARD_CHANGE_FRAME_EVENT, handleFrameChange)
      : null;

    // ── Cleanup ───────────────────────────────────────────────────
    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub?.remove();
    };
  }, []); // ✅ Empty deps — all handlers use mountedRef, no stale closures

  // ── Dismiss helper ───────────────────────────────────────────────
  /**
   * Dismisses the keyboard programmatically.
   * Memoized — stable reference across renders.
   */
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return {
    keyboardHeight: keyboardState.keyboardHeight,
    isKeyboardVisible: keyboardState.isKeyboardVisible,
    dismissKeyboard,
  };
};

export default useKeyboard;