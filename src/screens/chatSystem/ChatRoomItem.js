import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/ChatSystemStyles';

const ChatRoomItem = ({ item, index, selectionMode, selectedRooms, roomMeta, localRoomNames, onPress, onLongPress, formatMessageTime }) => {
  const displayName = localRoomNames[item.id] || item.name || 'Unnamed Chat';
  const meta        = roomMeta[item.id] || {};
  const isSelected  = selectedRooms.has(item.id);
  const isOnline    = Math.random() > 0.5;
  const unreadCount = item.unread_count || 0;

  return (
    <TouchableOpacity
      style={[styles.chatItem, index === 0 && styles.firstChatItem, isSelected && styles.chatItemSelected, meta.blocked && { opacity: 0.5 }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      delayLongPress={250}
    >
      <View style={styles.avatarContainer}>
        {isSelected ? (
          <View style={styles.selectedTick}><Icon name="check" size={22} color="#fff" /></View>
        ) : (
          <View style={[styles.avatarPlaceholder, isOnline && styles.onlineAvatar]}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {!isSelected && isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {meta.pinned   && <Icon name="push-pin"   size={13} color="#075E54" style={{ marginRight: 4 }} />}
            {meta.muted    && <Icon name="volume-off" size={13} color="#999"    style={{ marginRight: 4 }} />}
            {meta.archived && <Icon name="archive"    size={13} color="#999"    style={{ marginRight: 4 }} />}
            {meta.locked   && <Icon name="lock"       size={13} color="#E91E63" style={{ marginRight: 4 }} />}
            {meta.favorite && <Icon name="star"       size={13} color="#FFC107" style={{ marginRight: 4 }} />}
            {meta.blocked  && <Icon name="block"      size={13} color="#F44336" style={{ marginRight: 4 }} />}
            <Text style={styles.chatName} numberOfLines={1}>{displayName}</Text>
          </View>
          <Text style={styles.messageTime}>{formatMessageTime(item.last_message?.created_at)}</Text>
        </View>
        <View style={styles.lastMessageContainer}>
          <Text style={[styles.lastMessage, unreadCount > 0 && styles.unreadMessage]} numberOfLines={1}>
            {meta.locked ? '🔒 Messages locked' : (item.last_message?.content || 'No messages yet')}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(ChatRoomItem);
