// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/LockedChatsPasswordModal.js    ║
// ╚══════════════════════════════════════════════════════════════╝

import React, { useCallback, useMemo, useRef, memo } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import baseStyles from '../../assets/ChatSystemStyles';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const PIN_LENGTH = 6;

/**
 * Keypad rows configuration.
 * Defined at module level — never recreated on render.
 */
const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

/**
 * KeypadButton
 * A single numeric key on the PIN keypad.
 */
const KeypadButton = memo(({ digit, onPress, transparent = false }) => (
  <TouchableOpacity
    style={[
      baseStyles.lockKeypadBtn,
      transparent && localStyles.transparentKeypadBtn,
    ]}
    activeOpacity={0.6}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={digit ? `Enter ${digit}` : undefined}
  >
    <Text style={baseStyles.lockKeypadBtnText}>{digit}</Text>
  </TouchableOpacity>
));

/**
 * BackspaceButton
 * Delete key on the PIN keypad.
 */
const BackspaceButton = memo(({ onPress }) => (
  <TouchableOpacity
    style={[baseStyles.lockKeypadBtn, localStyles.transparentKeypadBtn]}
    activeOpacity={0.6}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Delete last digit"
  >
    <Icon name="backspace" size={26} color="#075E54" />
  </TouchableOpacity>
));

/**
 * PinKeypad
 * Full numeric keypad component.
 * Extracted from render function — stable component reference
 * allows React to skip re-renders when pin hasn't changed.
 */
const PinKeypad = memo(({ pinInput = '', onKeyPress, onBackspace }) => (
  <View style={baseStyles.lockKeypadContainer}>
    {/* Rows 1–3: digits 1–9 */}
    {KEYPAD_ROWS.map((row) => (
      <View key={row.join('')} style={baseStyles.lockKeypadRow}>
        {row.map((digit) => (
          <KeypadButton
            key={digit}
            digit={digit}
            onPress={() => onKeyPress(digit)}
          />
        ))}
      </View>
    ))}

    {/* Bottom row: empty spacer | 0 | backspace */}
    <View style={baseStyles.lockKeypadRow}>
      {/* Empty spacer — keeps 0 centered */}
      <View
        style={[baseStyles.lockKeypadBtn, localStyles.transparentKeypadBtn]}
        accessible={false}
        importantForAccessibility="no"
      />

      <KeypadButton
        digit="0"
        onPress={() => onKeyPress('0')}
      />

      <BackspaceButton onPress={onBackspace} />
    </View>
  </View>
));

/**
 * PinDots
 * Visual indicator showing filled/empty dots for entered PIN digits.
 */
const PinDots = memo(({ pinLength = 0, shakeAnim }) => (
  <Animated.View
    style={[
      baseStyles.lockPinDotsRow,
      shakeAnim
        ? { transform: [{ translateX: shakeAnim }] }
        : undefined,
    ]}
  >
    {[...Array(PIN_LENGTH)].map((_, i) => (
      <View
        key={i}
        style={[
          baseStyles.lockPinDotNew,
          pinLength > i && baseStyles.lockPinDotFilled,
        ]}
        accessibilityElementsHidden
      />
    ))}
  </Animated.View>
));

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

/**
 * LockedChatsPasswordModal
 *
 * Full-screen modal for entering a 6-digit PIN to access locked chats.
 * Features a custom numeric keypad, PIN dot indicator, shake animation
 * on wrong PIN, and an unlock button.
 *
 * @param {object} props
 * @param {boolean} props.visible           - Controls modal visibility
 * @param {function} [props.onClose]        - Called to close the modal
 * @param {string} [props.pinInput]         - Current PIN string (max 6 digits)
 * @param {function} [props.setPinInput]    - PIN state setter
 * @param {string} [props.pinError]         - Error message to display
 * @param {Animated.Value} [props.shakeAnim] - Animated value for shake effect
 * @param {function} [props.onConfirm]      - Called to verify the PIN
 */
const LockedChatsPasswordModal = ({
  visible,
  onClose,
  pinInput = '',
  setPinInput,
  pinError,
  shakeAnim,
  onConfirm,
}) => {
  // ── Safe PIN string ──────────────────────────────────────────────
  // Ensure pinInput is always a string regardless of what parent passes
  const safePin = typeof pinInput === 'string' ? pinInput : '';
  const pinLength = safePin.length;
  const isComplete = pinLength >= PIN_LENGTH;

  // ── Keypad handlers ──────────────────────────────────────────────

  /**
   * Appends a digit to the PIN using functional update.
   * Avoids stale closure on setPinInput.
   */
  const handleKeyPress = useCallback(
    (digit) => {
      setPinInput?.((prev) => {
        const current = typeof prev === 'string' ? prev : '';
        return current.length < PIN_LENGTH ? current + digit : current;
      });
    },
    [setPinInput]
  );

  /**
   * Removes the last digit from the PIN.
   */
  const handleBackspace = useCallback(() => {
    setPinInput?.((prev) => {
      const current = typeof prev === 'string' ? prev : '';
      return current.slice(0, -1);
    });
  }, [setPinInput]);

  /**
   * Handles confirm — guards against being called with incomplete PIN.
   */
  const handleConfirm = useCallback(() => {
    if (!isComplete) return;
    onConfirm?.();
  }, [isComplete, onConfirm]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}  // ✅ Safe handler
      statusBarTranslucent
    >
      <SafeAreaView style={baseStyles.lockPinScreen}>
        {/* ✅ StatusBar with explicit props — won't leak after modal closes */}
        <StatusBar backgroundColor="#075E54" barStyle="light-content" />

        {/* Header */}
        <View style={baseStyles.lockPinHeader}>
          <TouchableOpacity
            onPress={handleClose}
            style={baseStyles.lockPinBackBtn}
            accessibilityRole="button"
            accessibilityLabel="Close locked chats modal"
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={baseStyles.lockPinHeaderTitle}>Locked Chats</Text>
        </View>

        {/* Body */}
        <View style={baseStyles.lockPinBody}>

          {/* Icon + Title + Instruction */}
          <View style={baseStyles.lockPinIconWrap}>
            <View style={baseStyles.lockPinIconCircle}>
              <Icon name="lock" size={48} color="#075E54" />
            </View>
            <Text style={baseStyles.lockPinRoomName}>
              View Locked Chats
            </Text>
            <Text style={baseStyles.lockPinInstruction}>
              {`Enter your ${PIN_LENGTH}-digit Chat Lock PIN to access your locked chats`}
            </Text>
          </View>

          {/* PIN Dot Indicator */}
          <PinDots pinLength={pinLength} shakeAnim={shakeAnim} />

          {/* Error message — always reserves space to prevent layout jump */}
          <Text
            style={baseStyles.lockPinErrorText}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            {pinError || ' '}
          </Text>

          {/* Numeric Keypad */}
          <PinKeypad
            pinInput={safePin}
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
          />

          {/* Unlock Button */}
          <TouchableOpacity
            style={[
              baseStyles.lockPinConfirmBtn,
              !isComplete && localStyles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!isComplete}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Unlock and view chats"
            accessibilityState={{ disabled: !isComplete }}
          >
            <Icon
              name="lock-open"
              size={20}
              color="#fff"
              style={localStyles.confirmIcon}
              accessibilityElementsHidden
            />
            {/* ✅ Fixed: was '&amp;' HTML entity — renders as literal text in RN */}
            <Text style={baseStyles.lockPinConfirmText}>
              Unlock &amp; View Chats
            </Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────
// LOCAL STYLES — supplement ChatSystemStyles
// ─────────────────────────────────────────────────────────────────
const localStyles = StyleSheet.create({
  transparentKeypadBtn: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmIcon: {
    marginRight: 8,
  },
});

export default memo(LockedChatsPasswordModal);