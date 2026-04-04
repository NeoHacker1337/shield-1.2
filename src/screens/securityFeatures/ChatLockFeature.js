import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/SecurityScreenStyles';

const ChatLockFeature = ({
  hasChatLockPin,
  openChatLockModal,
}) => {

  return (
    <View style={styles.card}>

      {/* Header */}
      <View style={styles.cardHeader}>
        <Icon name="lock-outline" size={24} color="#E91E63" />
        <Text style={styles.cardTitle}>
          Chat (Create Secret Code)
        </Text>
      </View>

      {/* Description */}
      <Text style={styles.cardDescription}>
        {hasChatLockPin
          ? 'A secret code lets you find locked chats in the search bar and open them on some linked devices'
          : 'Set a 6-digit PIN to lock individual chats.'}
      </Text>

      {/* Status */}
      <View style={styles.passwordStatus}>
        <Icon
          name={hasChatLockPin ? 'check-circle' : 'cancel'}
          size={18}
          color={hasChatLockPin ? '#4CAF50' : '#EF5350'}
        />

        <Text
          style={[
            styles.statusText,
            { color: hasChatLockPin ? '#4CAF50' : '#EF5350' },
          ]}
        >
          {hasChatLockPin
            ? 'Chat Lock Active'
            : 'Chat Lock Not Set'}
        </Text>
      </View>

      {/* Actions */}
      {!hasChatLockPin ? (
        <TouchableOpacity
          style={[styles.cardButton, { backgroundColor: '#E91E63' }]}
          onPress={() => openChatLockModal('set')}
          activeOpacity={0.8}
        >
          <Icon name="lock-outline" size={20} color="#fff" />
          <Text style={styles.cardButtonText}>
            Set Chat Lock PIN
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.cardActions}>

          <TouchableOpacity
            style={[styles.cardActionButton, styles.changeButton]}
            onPress={() => openChatLockModal('change')}
            activeOpacity={0.8}
          >
            <Icon name="edit" size={18} color="#fff" />
            <Text style={styles.cardActionButtonText}>
              Change
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardActionButton, styles.removeButton]}
            onPress={() => openChatLockModal('remove')}
            activeOpacity={0.8}
          >
            <Icon name="delete" size={18} color="#fff" />
            <Text style={styles.cardActionButtonText}>
              Remove
            </Text>
          </TouchableOpacity>

        </View>
      )}

    </View>
  );
};

export default ChatLockFeature;
 
