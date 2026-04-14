// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/ContactsModal.js               ║
// ╚══════════════════════════════════════════════════════════════╝

import React, { useCallback, memo } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import baseStyles from '../../assets/ChatSystemStyles';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const SEARCH_MAX_LENGTH = 100;
const AVATAR_FALLBACK_CHAR = '?';

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Safely extracts avatar character from a contact name.
 * @param {string} name
 * @returns {string} Single uppercase character or fallback
 */
const getAvatarChar = (name) => {
  const char = name?.trim()?.charAt(0)?.toUpperCase();
  return char || AVATAR_FALLBACK_CHAR;
};

/**
 * Generates a safe FlatList key for a contact item.
 * Falls back to email or stringified index if id is missing.
 *
 * @param {object} item
 * @param {number} index
 * @returns {string}
 */
const contactKeyExtractor = (item, index) => {
  if (item?.id != null) return String(item.id);
  if (item?.email) return item.email;
  return `contact_${index}`;
};

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

/**
 * ContactItem
 * Renders a single contact row.
 * Extracted as a memoized component so FlatList can skip
 * re-rendering unchanged items during search.
 *
 * Note: isOnline is derived from item data — not Math.random().
 * Until real presence API is available, isOnline is always false.
 */
const ContactItem = memo(({ item, onSelect }) => {
  const name = item?.name?.trim() || 'Unknown';

  // ✅ No Math.random() — isOnline from item data or false until real API
  // TODO: Replace with real presence data when backend supports it
  const isOnline = item?.is_online === true;

  const avatarChar = getAvatarChar(name);

  return (
    <TouchableOpacity
      style={baseStyles.modalContactItem}
      onPress={() => onSelect?.(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        item?.is_current_user
          ? `${name} (You) — Start personal chat`
          : `Start chat with ${name}`
      }
    >
      {/* Avatar */}
      <View style={baseStyles.avatarContainer}>
        <View
          style={[
            baseStyles.contactAvatar,
            isOnline && baseStyles.onlineAvatar,
          ]}
        >
          <Text style={baseStyles.avatarText}>{avatarChar}</Text>
        </View>
        {isOnline && <View style={baseStyles.onlineIndicator} />}
      </View>

      {/* Contact info */}
      <View style={baseStyles.modalContactInfo}>
        <Text style={baseStyles.modalContactName} numberOfLines={1}>
          {name}
          {item?.is_current_user ? ' (You)' : ''}
        </Text>

        {!!item?.email && (
          <Text style={baseStyles.modalContactEmail} numberOfLines={1}>
            {item.email}
          </Text>
        )}

        {item?.is_current_user && (
          <Text style={baseStyles.personalNoteText}>
            Start a personal chat
          </Text>
        )}

        {isOnline && !item?.is_current_user && (
          <Text style={baseStyles.onlineText}>Online</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

/**
 * EmptyState
 * Shown when contact list is empty (no results or no contacts at all).
 */
const EmptyState = memo(({ isSearching, onViewAllInvitations }) => (
  <View style={baseStyles.modalEmptyState}>
    <Icon name="people-outline" size={64} color="#ccc" />
    <Text style={baseStyles.emptyStateText}>
      {isSearching ? 'No contacts found' : 'No contacts found'}
    </Text>
    <Text style={baseStyles.emptyStateSubtext}>
      {isSearching
        ? 'Try a different search term'
        : 'Sync contacts to start chatting'}
    </Text>

    {/* ✅ onViewAllInvitations button — was received but never rendered */}
    {typeof onViewAllInvitations === 'function' && !isSearching && (
      <TouchableOpacity
        style={localStyles.invitationsButton}
        onPress={onViewAllInvitations}
        accessibilityRole="button"
        accessibilityLabel="View all invitations"
      >
        <Text style={localStyles.invitationsButtonText}>
          View Invitations
        </Text>
      </TouchableOpacity>
    )}
  </View>
));

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

/**
 * ContactsModal
 *
 * Full-screen modal for selecting a contact to start a new chat.
 * Shows a searchable list of contacts with online status indicators.
 *
 * @param {object} props
 * @param {boolean} props.visible               - Controls modal visibility
 * @param {function} [props.onClose]            - Called to close the modal
 * @param {object[]} [props.contacts]           - Array of contact objects
 * @param {boolean} [props.contactsLoading]     - Shows loading spinner when true
 * @param {string} [props.searchQuery]          - Current search query
 * @param {function} [props.onSearch]           - Called with new search query
 * @param {function} [props.onSelectContact]    - Called with selected contact object
 * @param {function} [props.onViewAllInvitations] - Called to open invitations view
 */
const ContactsModal = ({
  visible,
  onClose,
  contacts = [],
  contactsLoading = false,
  searchQuery = '',
  onSearch,
  onSelectContact,
  onViewAllInvitations,
}) => {
  // ✅ Stable renderItem — extracted to memoized ContactItem
  // renderItem just passes props to ContactItem — no recreation on parent render
  const renderItem = useCallback(
    ({ item }) => (
      <ContactItem item={item} onSelect={onSelectContact} />
    ),
    [onSelectContact]
  );

  const renderEmpty = useCallback(
    () => (
      <EmptyState
        isSearching={!!searchQuery}
        onViewAllInvitations={onViewAllInvitations}
      />
    ),
    [searchQuery, onViewAllInvitations]
  );

  const handleSearch = useCallback(
    (text) => {
      onSearch?.(text);
    },
    [onSearch]
  );

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}           // ✅ Explicit — no ambiguity
      onRequestClose={handleClose}  // ✅ Safe handler
      statusBarTranslucent          // ✅ Full-screen on Android
    >
      <View style={baseStyles.modalContent}>

        {/* Header */}
        <View style={baseStyles.modalHeader}>
          <Text style={baseStyles.modalTitle}>New Chat</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={baseStyles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close contacts modal"
          >
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Search input */}
        <View style={baseStyles.searchContainer}>
          <Icon
            name="search"
            size={20}
            color="#999"
            style={baseStyles.searchIcon}
            accessibilityElementsHidden
          />
          <TextInput
            style={baseStyles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
            maxLength={SEARCH_MAX_LENGTH}  // ✅ Prevent overflow
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search contacts"
          />
          {/* Clear search button */}
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearch('')}
              style={localStyles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon name="close" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Loading state */}
        {contactsLoading ? (
          <View style={baseStyles.modalLoadingContainer}>
            <ActivityIndicator size="large" color="#075E54" />
            <Text style={baseStyles.loadingText}>Loading contacts...</Text>
          </View>
        ) : (
          <FlatList
            data={contacts}
            renderItem={renderItem}
            keyExtractor={contactKeyExtractor}  // ✅ Safe extractor
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled" // ✅ Single tap to select while keyboard open
            ListEmptyComponent={renderEmpty}
            removeClippedSubviews
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}

      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────
// LOCAL STYLES
// ─────────────────────────────────────────────────────────────────
const localStyles = StyleSheet.create({
  clearButton: {
    padding: 4,
    marginRight: 4,
  },
  invitationsButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#075E54',
    borderRadius: 20,
  },
  invitationsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default memo(ContactsModal);