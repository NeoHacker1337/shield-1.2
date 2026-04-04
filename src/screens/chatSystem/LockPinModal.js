import React from 'react';
import { Modal, SafeAreaView, View, Text, TouchableOpacity, StatusBar, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/ChatSystemStyles';

const LockPinModal = ({ visible, onClose, lockTargetRoom, roomMeta, localRoomNames, lockPinInput, setLockPinInput, lockPinError, lockShakeAnim, onConfirm }) => {
  const isLocked = roomMeta[lockTargetRoom?.id]?.locked;

  const renderKeypad = () => (
    <View style={styles.lockKeypadContainer}>
      {[['1','2','3'],['4','5','6'],['7','8','9']].map((row, ri) => (
        <View key={ri} style={styles.lockKeypadRow}>
          {row.map(k => (
            <TouchableOpacity key={k} style={styles.lockKeypadBtn} activeOpacity={0.6}
              onPress={() => lockPinInput.length < 6 && setLockPinInput(lockPinInput + k)}>
              <Text style={styles.lockKeypadBtnText}>{k}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <View style={styles.lockKeypadRow}>
        <View style={[styles.lockKeypadBtn, { backgroundColor: 'transparent', elevation: 0 }]} />
        <TouchableOpacity style={styles.lockKeypadBtn} activeOpacity={0.6}
          onPress={() => lockPinInput.length < 6 && setLockPinInput(lockPinInput + '0')}>
          <Text style={styles.lockKeypadBtnText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.lockKeypadBtn, { backgroundColor: 'transparent', elevation: 0 }]} activeOpacity={0.6}
          onPress={() => setLockPinInput(lockPinInput.slice(0, -1))}>
          <Icon name="backspace" size={26} color="#075E54" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.lockPinScreen}>
        <StatusBar backgroundColor="#075E54" barStyle="light-content" />

        <View style={styles.lockPinHeader}>
          <TouchableOpacity onPress={onClose} style={styles.lockPinBackBtn}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.lockPinHeaderTitle}>{isLocked ? 'Unlock Chat' : 'Lock Chat'}</Text>
        </View>

        <View style={styles.lockPinBody}>
          <View style={styles.lockPinIconWrap}>
            <View style={styles.lockPinIconCircle}>
              <Icon name={isLocked ? 'lock-open' : 'lock'} size={48} color="#075E54" />
            </View>
            <Text style={styles.lockPinRoomName} numberOfLines={1}>
              {localRoomNames[lockTargetRoom?.id] || lockTargetRoom?.name || 'Chat'}
            </Text>
            <Text style={styles.lockPinInstruction}>
              {isLocked ? 'Enter your PIN to unlock this chat' : 'Enter your PIN to lock this chat'}
            </Text>
          </View>

          <Animated.View style={[styles.lockPinDotsRow, { transform: [{ translateX: lockShakeAnim }] }]}>
            {[...Array(6)].map((_, i) => (
              <View key={i} style={[styles.lockPinDotNew, lockPinInput.length > i && styles.lockPinDotFilled]} />
            ))}
          </Animated.View>

          <Text style={styles.lockPinErrorText}>{lockPinError || ' '}</Text>

          {renderKeypad()}

          <TouchableOpacity
            style={[styles.lockPinConfirmBtn, lockPinInput.length < 6 && { opacity: 0.4 }]}
            onPress={onConfirm}
            disabled={lockPinInput.length < 6}
            activeOpacity={0.8}
          >
            <Icon name={isLocked ? 'lock-open' : 'lock'} size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.lockPinConfirmText}>{isLocked ? 'Unlock Chat' : 'Lock Chat'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default LockPinModal;
