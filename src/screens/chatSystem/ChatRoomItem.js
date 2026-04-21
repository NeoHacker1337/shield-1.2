// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/ChatRoomItem.js                ║
// ╚══════════════════════════════════════════════════════════════╝

import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import baseStyles from '../../assets/ChatSystemStyles';
import { getMessagePreview } from './Features/ChatHelpers';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const LONG_PRESS_DELAY = 250;
const MAX_UNREAD_DISPLAY = 99;
const UNREAD_OVERFLOW_LABEL = '99+';

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

/**
 * AvatarView
 * Shows either a selection checkmark or the avatar with online indicator.
 */
const AvatarView = memo(({ isSelected, isOnline, avatarChar }) => (
  <View style={baseStyles.avatarContainer}>
    {isSelected ? (
      <View style={baseStyles.selectedTick}>
        <Icon name="check" size={22} color="#fff" />
      </View>
    ) : (
      <View
        style={[
          baseStyles.avatarPlaceholder,
          isOnline && baseStyles.onlineAvatar,
        ]}
      >
        <Text style={baseStyles.avatarText}>{avatarChar}</Text>
      </View>
    )}
    {!isSelected && isOnline && (
      <View style={baseStyles.onlineIndicator} />
    )}
  </View>
));

/**
 * MetaIconsRow
 * Renders status indicator icons (pinned, muted, archived, etc.)
 * followed by the chat display name.
 */
const MetaIconsRow = memo(({ meta, displayName, notInPhonebook }) => (
  <View style={localStyles.metaRow}>
    {!!meta.pinned && (
      <Icon
        name="push-pin"
        size={13}
        color="#075E54"
        style={localStyles.metaIcon}
        accessibilityElementsHidden
      />
    )}
    {!!meta.muted && (
      <Icon
        name="volume-off"
        size={13}
        color="#999"
        style={localStyles.metaIcon}
        accessibilityElementsHidden
      />
    )}
    {!!meta.archived && (
      <Icon
        name="archive"
        size={13}
        color="#999"
        style={localStyles.metaIcon}
        accessibilityElementsHidden
      />
    )}
    {!!meta.locked && (
      <Icon
        name="lock"
        size={13}
        color="#E91E63"
        style={localStyles.metaIcon}
        accessibilityElementsHidden
      />
    )}
    {!!meta.favorite && (
      <Icon
        name="star"
        size={13}
        color="#FFC107"
        style={localStyles.metaIcon}
        accessibilityElementsHidden
      />
    )}
    {!!meta.blocked && (
      <Icon
        name="block"
        size={13}
        color="#F44336"
        style={localStyles.metaIcon}
        accessibilityElementsHidden
      />
    )}

    {/* Name + "Not in phonebook" label */}
    <View style={localStyles.nameColumn}>
      <Text style={baseStyles.chatName} numberOfLines={1}>
        {displayName}
      </Text>
      {notInPhonebook && (
        <Text style={localStyles.notInPhonebookLabel}>
          Not in phonebook
        </Text>
      )}
    </View>

  </View>
));

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

/**
 * ChatRoomItem
 *
 * Renders a single chat room row in the chat list.
 * Supports normal, selection, and search modes.
 *
 * @param {object} props
 * @param {object} props.item                - Chat room data object
 * @param {number} [props.index]             - Row index in FlatList
 * @param {boolean} [props.selectionMode]    - Whether selection mode is active
 * @param {Set} [props.selectedRooms]        - Set of selected room IDs
 * @param {object} [props.roomMeta]          - Map of room ID → meta flags
 * @param {object} [props.localRoomNames]    - Map of room ID → local contact name
 * @param {string} [props.displayName]       - Resolved display name from parent
 * @param {object} [props.displayNameMeta]   - { name, fromPhonebook, label? } from authService
 * @param {boolean} [props.isOnline]         - Online status of the other participant
 * @param {function} [props.onPress]         - Called on tap
 * @param {function} [props.onLongPress]     - Called on long press
 * @param {function} [props.formatMessageTime] - Formats timestamp to display string
 */
const ChatRoomItem = ({
  item,
  index,
  selectionMode = false,
  selectedRooms,
  roomMeta,
  localRoomNames,
  displayName: displayNameProp,    // ← from ChatSystemScreen (getDisplayNameFromChatRoom)
  displayNameMeta,                 // ← from authService.getContactDisplayName
  isOnline = false,
  onPress,
  onLongPress,
  formatMessageTime,
}) => {
  // ── Safe access with fallback empty objects ───────────────────
  const safeLocalRoomNames = localRoomNames ?? {};
  const safeRoomMeta = roomMeta ?? {};

  // ── Display name resolution ───────────────────────────────────
  // Priority:
  // 1. Phonebook name (displayNameMeta.name, fromPhonebook: true)
  // 2. Server name   (displayNameMeta.name, fromPhonebook: false)
  // 3. displayNameProp passed from parent
  // 4. localRoomNames fallback
  // 5. item.name
  // 6. 'Unnamed Chat'
  const displayName =
    displayNameMeta?.name ||
    displayNameProp ||
    safeLocalRoomNames[item?.id] ||
    item?.name ||
    'Unnamed Chat';

  // True when number is NOT saved in device phonebook
  const notInPhonebook = displayNameMeta?.fromPhonebook === false;

  // ── Other derived values ──────────────────────────────────────
  const meta = safeRoomMeta[item?.id] ?? {};

  const isSelected =
    selectedRooms instanceof Set
      ? selectedRooms.has(item?.id)
      : false;

  const unreadCount = item?.unread_count ?? 0;

  const avatarChar = displayName.charAt(0).toUpperCase() || '?';

  const lastMessagePreview = useMemo(() => {
    if (meta.locked) return '🔒 Messages locked';
    return getMessagePreview(item?.last_message) || 'No messages yet';
  }, [meta.locked, item?.last_message]);

  const formattedTime = useMemo(() => {
    if (typeof formatMessageTime !== 'function') return '';
    return formatMessageTime(item?.last_message?.created_at) ?? '';
  }, [formatMessageTime, item?.last_message?.created_at]);

  const unreadLabel =
    unreadCount > MAX_UNREAD_DISPLAY
      ? UNREAD_OVERFLOW_LABEL
      : String(unreadCount);

  const containerStyle = useMemo(() => [
    baseStyles.chatItem,
    index === 0 && baseStyles.firstChatItem,
    isSelected && baseStyles.chatItemSelected,
    meta.blocked && localStyles.blockedItem,
  ], [index, isSelected, meta.blocked]);

  const accessibilityLabel = useMemo(() => {
    const parts = [`Chat with ${displayName}`];
    if (unreadCount > 0) parts.push(`${unreadCount} unread messages`);
    if (meta.muted) parts.push('muted');
    if (meta.pinned) parts.push('pinned');
    if (meta.blocked) parts.push('blocked');
    return parts.join(', ');
  }, [displayName, unreadCount, meta.muted, meta.pinned, meta.blocked]);

  // ────────────────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={() => onPress?.()}
      onLongPress={() => onLongPress?.()}
      activeOpacity={0.7}
      delayLongPress={LONG_PRESS_DELAY}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isSelected }}
    >
      {/* Avatar / Selection tick */}
      <AvatarView
        isSelected={isSelected}
        isOnline={isOnline}
        avatarChar={avatarChar}
      />

      {/* Chat info: name row + last message row */}
      <View style={baseStyles.chatInfo}>

        {/* Name row: meta icons + display name + timestamp */}
        <View style={baseStyles.chatHeader}>
          <MetaIconsRow
            meta={meta}
            displayName={displayName}
            notInPhonebook={notInPhonebook}
          />
          <Text style={baseStyles.messageTime}>{formattedTime}</Text>
        </View>

        {/* Last message row: preview + unread badge */}
        <View style={baseStyles.lastMessageContainer}>
          <Text
            style={[
              baseStyles.lastMessage,
              unreadCount > 0 && baseStyles.unreadMessage,
            ]}
            numberOfLines={1}
          >
            {lastMessagePreview}
          </Text>

          {unreadCount > 0 && (
            <View style={baseStyles.unreadBadge}>
              <Text style={baseStyles.unreadText}>{unreadLabel}</Text>
            </View>
          )}
        </View>

      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────
// LOCAL STYLES — supplement ChatSystemStyles
// ─────────────────────────────────────────────────────────────────
const localStyles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaIcon: {
    marginRight: 4,
  },
  blockedItem: {
    opacity: 0.5,
  },
  // Wraps the name + "Not in phonebook" label vertically
  nameColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  notInPhonebookLabel: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 1,
  },
});

export default memo(ChatRoomItem);