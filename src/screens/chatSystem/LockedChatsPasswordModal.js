import React from 'react';
import {
  Modal, SafeAreaView, View, Text, TouchableOpacity,
  StatusBar, Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/ChatSystemStyles';

const LockedChatsPasswordModal = ({
  visible, onClose, pinInput, setPinInput,
  pinError, shakeAnim, onConfirm,
}) => {
  const renderKeypad = () => (
    <View style={styles.lockKeypadContainer}>
      {[['1','2','3'],['4','5','6'],['7','8','9']].map((row, ri) => (
        <View key={ri} style={styles.lockKeypadRow}>
          {row.map(k => (
            <TouchableOpacity
              key={k}
              style={styles.lockKeypadBtn}
              activeOpacity={0.6}
              onPress={() => pinInput.length < 6 && setPinInput(pinInput + k)}
            >
              <Text style={styles.lockKeypadBtnText}>{k}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <View style={styles.lockKeypadRow}>
        <View style={[styles.lockKeypadBtn, { backgroundColor: 'transparent', elevation: 0 }]} />
        <TouchableOpacity
          style={styles.lockKeypadBtn}
          activeOpacity={0.6}
          onPress={() => pinInput.length < 6 && setPinInput(pinInput + '0')}
        >
          <Text style={styles.lockKeypadBtnText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.lockKeypadBtn, { backgroundColor: 'transparent', elevation: 0 }]}
          activeOpacity={0.6}
          onPress={() => setPinInput(pinInput.slice(0, -1))}
        >
          <Icon name="backspace" size={26} color="#075E54" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.lockPinScreen}>
        <StatusBar backgroundColor="#075E54" barStyle="light-content" />

        {/* Header */}
        <View style={styles.lockPinHeader}>
          <TouchableOpacity onPress={onClose} style={styles.lockPinBackBtn}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.lockPinHeaderTitle}>Locked Chats</Text>
        </View>

        {/* Body */}
        <View style={styles.lockPinBody}>

          {/* Icon + Title */}
          <View style={styles.lockPinIconWrap}>
            <View style={styles.lockPinIconCircle}>
              <Icon name="lock" size={48} color="#075E54" />
            </View>
            <Text style={styles.lockPinRoomName}>View Locked Chats</Text>
            <Text style={styles.lockPinInstruction}>
              Enter your 6-digit Chat Lock PIN to access your locked chats
            </Text>
          </View>

          {/* PIN Dots */}
          <Animated.View
            style={[styles.lockPinDotsRow, { transform: [{ translateX: shakeAnim }] }]}
          >
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.lockPinDotNew,
                  pinInput.length > i && styles.lockPinDotFilled,
                ]}
              />
            ))}
          </Animated.View>

          {/* Error */}
          <Text style={styles.lockPinErrorText}>{pinError || ' '}</Text>

          {/* Keypad */}
          {renderKeypad()}

          {/* Confirm */}
          <TouchableOpacity
            style={[styles.lockPinConfirmBtn, pinInput.length < 6 && { opacity: 0.4 }]}
            onPress={onConfirm}
            disabled={pinInput.length < 6}
            activeOpacity={0.8}
          >
            <Icon name="lock-open" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.lockPinConfirmText}>Unlock &amp; View Chats</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default LockedChatsPasswordModal;
