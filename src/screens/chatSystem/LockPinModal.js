import React, { useCallback } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/ChatSystemStyles';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_PIN_LENGTH = 6;
const BRAND_COLOR = '#075E54';
const KEYPAD_ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];

// ─── Keypad Sub-Component ─────────────────────────────────────────────────────
const Keypad = ({ pinInput, onDigitPress, onBackspacePress }) => (
  <View style={styles.lockKeypadContainer}>
    {KEYPAD_ROWS.map((row) => (
      <View key={row[0]} style={styles.lockKeypadRow}>
        {row.map((digit) => (
          <TouchableOpacity
            key={digit}
            style={styles.lockKeypadBtn}
            activeOpacity={0.6}
            onPress={() => onDigitPress(digit)}
            disabled={pinInput.length >= MAX_PIN_LENGTH}
          >
            <Text style={styles.lockKeypadBtnText}>{digit}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ))}

    {/* Bottom row: empty spacer | 0 | backspace */}
    <View style={styles.lockKeypadRow}>
      {/* Spacer — intentionally empty to align '0' to center */}
      <View style={styles.lockKeypadBtnSpacer} />

      <TouchableOpacity
        style={styles.lockKeypadBtn}
        activeOpacity={0.6}
        onPress={() => onDigitPress('0')}
        disabled={pinInput.length >= MAX_PIN_LENGTH}
      >
        <Text style={styles.lockKeypadBtnText}>0</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.lockKeypadBtnIcon}
        activeOpacity={0.6}
        onPress={onBackspacePress}
        disabled={pinInput.length === 0}
      >
        <Icon name="backspace" size={26} color={BRAND_COLOR} />
      </TouchableOpacity>
    </View>
  </View>
);

Keypad.propTypes = {
  pinInput: PropTypes.string.isRequired,
  onDigitPress: PropTypes.func.isRequired,
  onBackspacePress: PropTypes.func.isRequired,
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LockPinModal = ({
  visible,
  onClose,
  lockTargetRoom,
  roomMeta,
  localRoomNames,
  lockPinInput,
  setLockPinInput,
  lockPinError,
  lockShakeAnim,
  onConfirm,
}) => {
  // Safely derive locked state — guard against undefined roomMeta or lockTargetRoom
  const roomId = lockTargetRoom?.id;
  const isLocked = roomId != null && roomMeta != null
    ? Boolean(roomMeta[roomId]?.locked)
    : false;

  const roomDisplayName =
    (roomId != null && localRoomNames?.[roomId]) ||
    lockTargetRoom?.name ||
    'Chat';

  // ── Memoized handlers ──────────────────────────────────────────────────────
  const handleDigitPress = useCallback(
    (digit) => {
      if (lockPinInput.length < MAX_PIN_LENGTH) {
        setLockPinInput(lockPinInput + digit);
      }
    },
    [lockPinInput, setLockPinInput],
  );

  const handleBackspacePress = useCallback(() => {
    setLockPinInput(lockPinInput.slice(0, -1));
  }, [lockPinInput, setLockPinInput]);

  const isConfirmDisabled = lockPinInput.length < MAX_PIN_LENGTH;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.lockPinScreen}>
        <StatusBar backgroundColor={BRAND_COLOR} barStyle="light-content" />

        {/* ── Header ── */}
        <View style={styles.lockPinHeader}>
          <TouchableOpacity onPress={onClose} style={styles.lockPinBackBtn}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.lockPinHeaderTitle}>
            {isLocked ? 'Unlock Chat' : 'Lock Chat'}
          </Text>
        </View>

        {/* ── Body ── */}
        <View style={styles.lockPinBody}>

          {/* Icon + room name + instruction */}
          <View style={styles.lockPinIconWrap}>
            <View style={styles.lockPinIconCircle}>
              <Icon
                name={isLocked ? 'lock-open' : 'lock'}
                size={48}
                color={BRAND_COLOR}
              />
            </View>
            <Text style={styles.lockPinRoomName} numberOfLines={1}>
              {roomDisplayName}
            </Text>
            <Text style={styles.lockPinInstruction}>
              {isLocked
                ? 'Enter your PIN to unlock this chat'
                : 'Enter your PIN to lock this chat'}
            </Text>
          </View>

          {/* PIN dot indicators */}
          <Animated.View
            style={[
              styles.lockPinDotsRow,
              { transform: [{ translateX: lockShakeAnim }] },
            ]}
          >
            {[...Array(MAX_PIN_LENGTH)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.lockPinDotNew,
                  lockPinInput.length > i && styles.lockPinDotFilled,
                ]}
              />
            ))}
          </Animated.View>

          {/*
           * Renders a single space when there is no error to preserve
           * layout height and prevent UI shifting on error appearance.
           */}
          <Text style={styles.lockPinErrorText}>
            {lockPinError || ' '}
          </Text>

          {/* Keypad */}
          <Keypad
            pinInput={lockPinInput}
            onDigitPress={handleDigitPress}
            onBackspacePress={handleBackspacePress}
          />

          {/* Confirm button */}
          <TouchableOpacity
            style={[
              styles.lockPinConfirmBtn,
              isConfirmDisabled && { opacity: 0.4 },
            ]}
            onPress={onConfirm}
            disabled={isConfirmDisabled}
            activeOpacity={0.8}
          >
            <Icon
              name={isLocked ? 'lock-open' : 'lock'}
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.lockPinConfirmText}>
              {isLocked ? 'Unlock Chat' : 'Lock Chat'}
            </Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ─── PropTypes ────────────────────────────────────────────────────────────────
LockPinModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  lockTargetRoom: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
  }),
  roomMeta: PropTypes.objectOf(
    PropTypes.shape({
      locked: PropTypes.bool,
    }),
  ),
  localRoomNames: PropTypes.objectOf(PropTypes.string),
  lockPinInput: PropTypes.string.isRequired,
  setLockPinInput: PropTypes.func.isRequired,
  lockPinError: PropTypes.string,
  lockShakeAnim: PropTypes.instanceOf(Animated.Value).isRequired,
  onConfirm: PropTypes.func.isRequired,
};

LockPinModal.defaultProps = {
  lockTargetRoom: null,
  roomMeta: {},
  localRoomNames: {},
  lockPinError: '',
};

export default LockPinModal;