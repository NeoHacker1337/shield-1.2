import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, Modal,
  TouchableWithoutFeedback, Alert, Animated,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Keychain from 'react-native-keychain';
import { verifyValue } from '../../services/HashService';
import styles from '../../assets/ChatSystemStyles';

const CHAT_LOCK_SERVICE = 'shield-chat-lock';

const LockedChatsScreen = ({ navigation, route }) => {
  const {
    lockedRooms: initialLockedRooms = [],  // ← renamed to initial
    roomMeta = {},
    localRoomNames = {},
    currentUser = null,
    onUnlockRoom,
  } = route.params || {};

  // ── Local state — removes room instantly when unlocked ──────────────────
  const [localLockedRooms, setLocalLockedRooms] = useState(initialLockedRooms);


  // ── Options menu ────────────────────────────────────────────────────────
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);



  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts), now = new Date();
    const diff = Math.ceil(Math.abs(now - d) / 86400000);
    if (diff === 1) return 'Today';
    if (diff === 2) return 'Yesterday';
    if (diff <= 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const shake = () => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // ── Single tap → open chat WITHOUT unlocking ──────────────────────────────
  const handleOpenChat = (item) => {
    const displayName = localRoomNames[item.id] || item.name || 'Unnamed Chat';
    navigation.navigate('ChatScreen', {
      chatRoom: item,
      currentUser,
      contactName: displayName,
    });
    // ← NO onUnlockRoom call here — chat stays locked
  };

  // ── Long press → show options menu ───────────────────────────────────────
  const handleLongPress = (item) => {
    setSelectedRoom(item);
    setShowOptionsMenu(true);
  };

  // ── Options menu: Unlock pressed → ask PIN ────────────────────────────────
  // const handleUnlockPress = () => {
  //   setShowOptionsMenu(false);
  //   setPinInput('');
  //   setPinError('');
  //   setShowPinModal(true);
  // };

  // ── Options menu: Unlock pressed → skip PIN, unlock directly ─────────────
  const handleUnlockPress = () => {
    setShowOptionsMenu(false);

    // ✅ Directly unlock — no PIN needed, user already authenticated to reach this screen
    setLocalLockedRooms(prev => prev.filter(r => r.id !== selectedRoom.id));

    if (onUnlockRoom) onUnlockRoom(selectedRoom.id);

    Alert.alert('Unlocked 🔓', `"${localRoomNames[selectedRoom?.id] || selectedRoom?.name}" has been unlocked.`);
    setSelectedRoom(null);
  };



  // ── Render each locked chat row ───────────────────────────────────────────
  const renderItem = ({ item, index }) => {
    const displayName = localRoomNames[item.id] || item.name || 'Unnamed Chat';
    const unread = item.unread_count || 0;

    return (
      <TouchableOpacity
        style={[styles.chatItem, index === 0 && styles.firstChatItem]}
        activeOpacity={0.7}
        onPress={() => handleOpenChat(item)}        // ← open only, no unlock
        onLongPress={() => handleLongPress(item)}   // ← show options
        delayLongPress={250}
      >
        {/* Avatar with lock badge */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={lockBadgeStyle}>
            <Icon name="lock" size={11} color="#fff" />
          </View>
        </View>

        {/* Chat info */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.messageTime}>{formatTime(item.last_message?.created_at)}</Text>
          </View>
          <View style={styles.lastMessageContainer}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              🔒 Messages locked
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.headerIconBtn, { marginRight: 8 }]}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Locked chats</Text>
      </View>

      {/* Info banner */}
      <View style={infoBannerStyle}>
        <Icon name="info-outline" size={16} color="#075E54" style={{ marginRight: 6 }} />
        <Text style={infoBannerTextStyle}>
          Tap to open • Long press to unlock a chat
        </Text>
      </View>

      <FlatList
        data={localLockedRooms}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Icon name="lock-open" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No Locked Chats</Text>
            <Text style={styles.emptyStateSubtext}>
              Lock a chat from the main screen to protect it
            </Text>
          </View>
        )}
      />

      {/* ── Long press options menu ─────────────────────────────────────── */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowOptionsMenu(false)}>
          <View style={styles.menuModalOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.menuModalContent}>

                {/* Room name title */}
                <View style={optionsTitleStyle}>
                  <Icon name="lock" size={16} color="#E91E63" style={{ marginRight: 6 }} />
                  <Text style={optionsTitleTextStyle} numberOfLines={1}>
                    {localRoomNames[selectedRoom?.id] || selectedRoom?.name || 'Chat'}
                  </Text>
                </View>

                {/* Open Chat */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setShowOptionsMenu(false); handleOpenChat(selectedRoom); }}
                >
                  <Icon name="chat" size={20} color="#075E54" />
                  <Text style={styles.menuItemText}>Open Chat</Text>
                </TouchableOpacity>

                {/* Unlock Chat */}
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomWidth: 0 }]}
                  onPress={handleUnlockPress}
                >
                  <Icon name="lock-open" size={20} color="#E91E63" />
                  <Text style={[styles.menuItemText, { color: '#E91E63' }]}>
                    Unlock Chat
                  </Text>
                </TouchableOpacity>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>



    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────
const lockBadgeStyle = {
  position: 'absolute', bottom: 0, right: 0,
  width: 18, height: 18, borderRadius: 9,
  backgroundColor: '#E91E63',
  justifyContent: 'center', alignItems: 'center',
  borderWidth: 1.5, borderColor: '#fff',
};

const infoBannerStyle = {
  flexDirection: 'row', alignItems: 'center',
  backgroundColor: '#e8f5e9',
  paddingHorizontal: 16, paddingVertical: 10,
  borderBottomWidth: 0.5, borderBottomColor: '#c8e6c9',
};

const infoBannerTextStyle = { fontSize: 13, color: '#075E54', flex: 1 };

const optionsTitleStyle = {
  flexDirection: 'row', alignItems: 'center',
  paddingHorizontal: 16, paddingVertical: 12,
  borderBottomWidth: 0.5, borderBottomColor: '#eee',
};

const optionsTitleTextStyle = {
  fontSize: 15, fontWeight: '600', color: '#333', flex: 1,
};

export default LockedChatsScreen;
