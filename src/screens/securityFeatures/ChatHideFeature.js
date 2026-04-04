import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/SecurityScreenStyles';

const ChatHideFeature = ({
  hasChatHidePin,
  openChatHideModal,
}) => {

  return (
    <View style={styles.card}>

      {/* Header */}
      <View style={styles.cardHeader}>
        <Icon name="visibility-off" size={24} color="#FF9800" />
        <Text style={styles.cardTitle}>
          Chat Hide
        </Text>
      </View>

      {/* Description */}
      <Text style={styles.cardDescription}>
        {hasChatHidePin
          ? 'Your chats button are hidden and protected with a 6-digit PIN.'
          : 'Set a 6-digit PIN to hide sensitive chats from the main chat list.'}
      </Text>

      {/* Status */}
      <View style={styles.passwordStatus}>
        <Icon
          name={hasChatHidePin ? 'check-circle' : 'cancel'}
          size={18}
          color={hasChatHidePin ? '#4CAF50' : '#EF5350'}
        />

        <Text
          style={[
            styles.statusText,
            { color: hasChatHidePin ? '#4CAF50' : '#EF5350' },
          ]}
        >
          {hasChatHidePin
            ? 'Chat Hide Active'
            : 'Chat Hide Not Set'}
        </Text>
      </View>

      {/* Actions */}
      {!hasChatHidePin ? (
        <TouchableOpacity
          style={[styles.cardButton, { backgroundColor: '#FF9800' }]}
          onPress={() => openChatHideModal('set')}
          activeOpacity={0.8}
        >
          <Icon name="visibility-off" size={20} color="#fff" />
          <Text style={styles.cardButtonText}>
            Set Chat Hide PIN
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.cardActions}>

          <TouchableOpacity
            style={[styles.cardActionButton, styles.changeButton]}
            onPress={() => openChatHideModal('change')}
            activeOpacity={0.8}
          >
            <Icon name="edit" size={18} color="#fff" />
            <Text style={styles.cardActionButtonText}>
              Change
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardActionButton, styles.removeButton]}
            onPress={() => openChatHideModal('remove')}
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

export default ChatHideFeature;
 