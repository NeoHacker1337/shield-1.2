/**
 * PinModal.js
 * src/screens/securityFeatures/PinModal.js
 *
 * "Forgot PIN?" button sits directly below the Cancel button.
 * Service is passed as a prop — each caller passes its own service constant.
 * ForgotPinModal is NOT rendered here (lives at SecurityScreen level).
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
} from 'react-native';

import styles from '../../assets/SecurityScreenStyles';
import NumericKeypad from './NumericKeypad';
import PasscodeDots from './PasscodeDots';
import { Colors, Fonts, Spacing } from '../../assets/theme';

const PinModal = ({
  visible = false,
  onClose = () => { },
  onForgotPin = () => { },   // (service) => void
  service = null,       // e.g. CHAT_HIDE_SERVICE, LOGIN_AUTH_SERVICE …
  title = '',
  description = '',
  shakeAnim,
  errorText = '',
  currentValue = '',
  onInput = () => { },
  onSubmit = () => { },
  pinMode = 'set',
  step = 0,
  modalAnim,

}) => {

  /* ── Safe fallback animated values ── */
  const [_shakeAnim] = useState(() => new Animated.Value(0));
  const [_modalAnim] = useState(() => new Animated.Value(1));
  const safeShakeAnim = shakeAnim || _shakeAnim;
  const safeModalAnim = modalAnim || _modalAnim;

  /* ── Submit label ── */
  const submitLabel = () => {
    if (pinMode === 'set' && step === 0) return 'Next';
    if (pinMode === 'change' && step < 2) return 'Next';
    if (pinMode === 'remove') return 'Remove';
    return 'Confirm';
  };

  const handleInput = useCallback((value) => {
    if (typeof onInput === 'function') onInput(value);
  }, [onInput]);

  /* ── Forgot PIN — passes the correct service back to parent ── */
  const handleForgotPin = useCallback(() => {
    onForgotPin(service);
  }, [onForgotPin, service]);

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={() => { }}>
        <View style={styles.modalOverlay}>

          <Animated.View
            style={[
              styles.passcodeModalContent,
              {
                opacity: safeModalAnim,
                transform: [
                  {
                    scale: safeModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.85, 1],
                    }),
                  },
                ],
              },
            ]}
          >

            {/* ── Title ── */}
            <Text style={styles.modalTitle}>{title}</Text>

            {/* ── Description ── */}
            {!!description && (
              <Text style={styles.modalDescription}>{description}</Text>
            )}

            {/* ── PIN dots ── */}
            <PasscodeDots
              value={currentValue}
              shakeAnim={safeShakeAnim}
            />

            {/* ── Error ── */}
            {!!errorText && (
              <Text style={styles.errorText}>{errorText}</Text>
            )}

            {/* ── Keypad ── */}
            <NumericKeypad
              currentValue={currentValue}
              onInput={handleInput}
            />

            {/*
              ════════════════════════════════════════
              BUTTON SECTION
              Layout:
                ┌──────────────────────────┐
                │  [Cancel]   [Confirm]    │  ← side by side (only Confirm when 6 digits)
                └──────────────────────────┘
                ┌──────────────────────────┐
                │      Forgot PIN?         │  ← full-width, below Cancel
                └──────────────────────────┘
              ════════════════════════════════════════
            */}
            <View style={pinModalStyles.buttonSection}>

              {/* Row: Cancel + optional Confirm */}
              <View style={pinModalStyles.buttonRow}>

                <TouchableOpacity
                  style={[pinModalStyles.cancelBtn]}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={pinModalStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                {currentValue.length === 6 && (
                  <TouchableOpacity
                    style={[pinModalStyles.confirmBtn]}
                    onPress={onSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={pinModalStyles.confirmBtnText}>
                      {submitLabel()}
                    </Text>
                  </TouchableOpacity>
                )}

              </View>

              {/* ── Forgot PIN? — directly below Cancel ── */}
              <TouchableOpacity
                style={pinModalStyles.forgotBtn}
                onPress={handleForgotPin}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}
              >
                <Text style={pinModalStyles.forgotBtnText}>
                  Forgot PIN?
                </Text>
              </TouchableOpacity>

            </View>

          </Animated.View>

        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

/* ─────────────────────────────────────────────────────────────
   LOCAL STYLES — uses Shield theme tokens
───────────────────────────────────────────────────────────── */
const pinModalStyles = StyleSheet.create({

  /* Wraps the entire button section (row + forgot link) */
  buttonSection: {
    width: '100%',
    marginTop: Spacing.sm,
  },

  /* Cancel + Confirm side by side */
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,                    // 8px gap between buttons
  },

  /* ── Cancel ── */
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 4,    // ~12px → min 44px height
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundInput,   // #1B263B
    borderWidth: 1,
    borderColor: Colors.borderLight,           // rgba(255,255,255,0.1)
    minHeight: 48,
  },

  cancelBtnText: {
    color: Colors.textSecondary,               // #B0BEC5
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.md,                   // 16
    fontWeight: Fonts.weight.medium,           // '600'
  },

  /* ── Confirm ── */
  confirmBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,           // #42A5F5
    borderWidth: 1,
    borderColor: 'rgba(66,165,245,0.5)',
    minHeight: 48,
  },

  confirmBtnText: {
    color: Colors.textPrimary,                 // #FFFFFF
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,             // '700'
  },

  /* ── Forgot PIN? — directly below Cancel ── */
  forgotBtn: {
    // Aligned to the left side to sit under the Cancel button
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,                     // 8px gap from button row
    paddingVertical: 6,
    paddingHorizontal: 4,
  },

  forgotBtnText: {
    color: Colors.primary,                     // #42A5F5
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,                   // 14
    fontWeight: Fonts.weight.medium,           // '600'
    letterSpacing: 0.2,
  },

});

export default PinModal;