// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/HeaderDotMenu.js               ║
// ╚══════════════════════════════════════════════════════════════╝

import React, { useCallback, memo } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import baseStyles from '../../assets/ChatSystemStyles';

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENT: MenuItem
// Extracted for clarity and individual memoization
// ─────────────────────────────────────────────────────────────────

/**
 * MenuItem
 * A single row in the dropdown menu.
 *
 * @param {object} props
 * @param {string} props.iconName         - MaterialIcons icon name
 * @param {string} props.label            - Display label
 * @param {function} [props.onPress]      - Press handler
 * @param {boolean} [props.disabled]      - Disables the button
 * @param {boolean} [props.loading]       - Shows spinner instead of icon
 * @param {boolean} [props.isLast]        - Removes bottom border on last item
 * @param {string} [props.accessibilityLabel] - Screen reader label
 */
const MenuItem = memo(({
  iconName,
  label,
  onPress,
  disabled = false,
  loading = false,
  isLast = false,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    style={[
      baseStyles.menuItem,
      isLast && localStyles.lastMenuItem,
      disabled && localStyles.disabledMenuItem,
    ]}
    onPress={() => onPress?.()}
    disabled={disabled}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel || label}
    accessibilityState={{ disabled }}
  >
    {loading ? (
      <ActivityIndicator
        size="small"
        color="#075E54"
        accessibilityElementsHidden
      />
    ) : (
      <Icon
        name={iconName}
        size={20}
        color={disabled ? '#ccc' : '#333'}
        accessibilityElementsHidden
      />
    )}
    <Text
      style={[
        baseStyles.menuItemText,
        disabled && localStyles.disabledMenuItemText,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
));

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

/**
 * HeaderDotMenu
 *
 * Dropdown menu shown when the three-dot (⋮) button is pressed
 * in the chat list header.
 *
 * Menu items:
 * - Sync Contacts    — triggers contact sync, shows spinner while active
 * - Invite for Chat  — opens invite flow
 * - View All Invitations — opens invitations list
 *
 * @param {object} props
 * @param {boolean} props.visible                - Controls modal visibility
 * @param {function} [props.onClose]             - Called to close the menu
 * @param {boolean} [props.syncingContacts]      - Shows spinner on sync item when true
 * @param {function} [props.onSyncContacts]      - Called to trigger contact sync
 * @param {function} [props.onInvite]            - Called to open invite flow
 * @param {function} [props.onViewAllInvitations] - Called to open invitations
 */
const HeaderDotMenu = ({
  visible,
  onClose,
  syncingContacts = false,
  onSyncContacts,
  onInvite,
  onViewAllInvitations,
}) => {
  // ── Safe close handler ───────────────────────────────────────────
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  /**
   * Wraps an action handler to close the menu first,
   * then execute the action after a short delay.
   * Gives immediate visual feedback (menu closes) before
   * any heavy action runs.
   *
   * @param {function} action
   * @returns {function}
   */
  const handleMenuAction = useCallback(
    (action) => () => {
      handleClose();
      if (typeof action === 'function') {
        // Small delay lets close animation start before action
        setTimeout(action, 50);
      }
    },
    [handleClose]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}    // ✅ Safe handler for Android back button
      statusBarTranslucent            // ✅ Full coverage on Android
    >
      {/* ✅ Pressable overlay — more reliable than TouchableWithoutFeedback */}
      <Pressable
        style={localStyles.overlay}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Close menu"
      >
        {/* ✅ Inner View stops propagation via responder — not empty onPress */}
        <View
          style={localStyles.menuContent}
          onStartShouldSetResponder={() => true}
        >
          {/* Sync Contacts */}
          <MenuItem
            iconName="sync"
            label={syncingContacts ? 'Syncing...' : 'Sync Contacts'}
            onPress={handleMenuAction(onSyncContacts)}
            // ✅ Disable while syncing to prevent concurrent operations
            disabled={!!syncingContacts}
            loading={!!syncingContacts}
            accessibilityLabel={
              syncingContacts
                ? 'Syncing contacts, please wait'
                : 'Sync contacts'
            }
          />

          {/* Invite for Chat */}
          <MenuItem
            iconName="person-add"
            label="Invite for Chat"
            onPress={handleMenuAction(onInvite)}
            accessibilityLabel="Invite someone to chat"
          />

          {/* View All Invitations */}
          <MenuItem
            iconName="mail-outline"
            label="View All Invitations"
            onPress={handleMenuAction(onViewAllInvitations)}
            isLast   // ✅ Removes bottom border via prop — not inline style
            accessibilityLabel="View all chat invitations"
          />
        </View>
      </Pressable>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────
// LOCAL STYLES
// ─────────────────────────────────────────────────────────────────
const localStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuContent: {
    // Position in top-right corner (WhatsApp-style dropdown)
    position: 'absolute',
    top: 56,         // Below the header bar
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  lastMenuItem: {
    borderBottomWidth: 0,  // ✅ Extracted from inline style
  },
  disabledMenuItem: {
    opacity: 0.5,
  },
  disabledMenuItemText: {
    color: '#999',
  },
});

export default memo(HeaderDotMenu);