// useKeyboard.js — only change: add Android safety check
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { Keyboard, Platform } from 'react-native';

const IS_IOS = Platform.OS === 'ios';

const KEYBOARD_SHOW_EVENT = IS_IOS ? 'keyboardWillShow' : 'keyboardDidShow';
const KEYBOARD_HIDE_EVENT = IS_IOS ? 'keyboardWillHide' : 'keyboardDidHide';
const KEYBOARD_CHANGE_FRAME_EVENT = 'keyboardWillChangeFrame';

const extractKeyboardHeight = (event) => {
  const height = event?.endCoordinates?.height;
  if (typeof height !== 'number' || isNaN(height) || height < 0) return 0;
  return height;
};

const useKeyboard = () => {
  const [keyboardState, setKeyboardState] = useState({
    keyboardHeight: 0,
    isKeyboardVisible: false,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleShow = (event) => {
      if (!mountedRef.current) return;
      const height = extractKeyboardHeight(event);

      // ✅ Guard: some Android devices fire show with height 0
      if (!IS_IOS && height === 0) return;

      setKeyboardState({
        keyboardHeight: height,
        isKeyboardVisible: true,
      });
    };

    const handleHide = () => {
      if (!mountedRef.current) return;
      setKeyboardState({
        keyboardHeight: 0,
        isKeyboardVisible: false,
      });
    };

    const handleFrameChange = (event) => {
      if (!mountedRef.current) return;
      const height = extractKeyboardHeight(event);

      setKeyboardState((prev) => {
        if (prev.keyboardHeight === height) return prev;
        return {
          keyboardHeight: height,
          isKeyboardVisible: height > 0,
        };
      });
    };

    const showSub = Keyboard.addListener(KEYBOARD_SHOW_EVENT, handleShow);
    const hideSub = Keyboard.addListener(KEYBOARD_HIDE_EVENT, handleHide);

    const frameSub = IS_IOS
      ? Keyboard.addListener(KEYBOARD_CHANGE_FRAME_EVENT, handleFrameChange)
      : null;

    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub?.remove();
    };
  }, []);

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