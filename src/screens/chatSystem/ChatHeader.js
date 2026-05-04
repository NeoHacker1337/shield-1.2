// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/ChatHeader.js                  ║
// ╚══════════════════════════════════════════════════════════════╝

import React, { useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import baseStyles from '../../assets/ChatSystemStyles';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const SEARCH_MAX_LENGTH = 100;

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// Extracted for clarity and individual memoization
// ─────────────────────────────────────────────────────────────────

/**
 * SelectionHeader
 * Shown when one or more chat items are selected.
 */
const SelectionHeader = memo(({
  selectedCount,
  onClose,
  onPin,
  onMute,
  onArchive,
  onDotMenu,
}) => (
  <View style={baseStyles.selectionHeader}>
    <TouchableOpacity
      onPress={() => onClose?.()}
      style={baseStyles.headerIconBtn}
      accessibilityRole="button"
      accessibilityLabel="Clear selection"
    >
      <Icon name="close" size={24} color="#fff" />
    </TouchableOpacity>

    <Text style={baseStyles.selectionCount}>
      {selectedCount ?? 0}
    </Text>

    <View style={baseStyles.selectionActions}>
      <TouchableOpacity
        onPress={() => onPin?.()}
        style={baseStyles.headerIconBtn}
        accessibilityRole="button"
        accessibilityLabel="Pin selected chats"
      >
        <Icon name="push-pin" size={22} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onMute?.()}
        style={baseStyles.headerIconBtn}
        accessibilityRole="button"
        accessibilityLabel="Mute selected chats"
      >
        <Icon name="volume-off" size={22} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onArchive?.()}
        style={baseStyles.headerIconBtn}
        accessibilityRole="button"
        accessibilityLabel="Archive selected chats"
      >
        <Icon name="archive" size={22} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onDotMenu?.()}
        style={baseStyles.headerIconBtn}
        accessibilityRole="button"
        accessibilityLabel="More options"
      >
        <Icon name="more-vert" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
));

// ─────────────────────────────────────────────────────────────────

/**
 * SearchHeader
 * Shown when search mode is active.
 * Uses a ref to focus the input programmatically when mode activates,
 * avoiding the keyboard flash caused by autoFocus on mount/unmount.
 */
const SearchHeader = memo(({
  searchQuery = '',
  onSearchChange,
  onSearchClose,
}) => {
  const inputRef = useRef(null);

  // ✅ Programmatic focus — avoids autoFocus keyboard flash
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // ✅ Memoized clear handler — stable reference
  const handleClear = useCallback(() => {
    onSearchChange?.('');
    inputRef.current?.focus();
  }, [onSearchChange]);

  const handleChange = useCallback(
    (text) => {
      onSearchChange?.(text);
    },
    [onSearchChange]
  );

  return (
    <View style={styles.searchHeader}>
      <TouchableOpacity
        onPress={() => onSearchClose?.()}
        style={baseStyles.headerIconBtn}
        accessibilityRole="button"
        accessibilityLabel="Close search"
      >
        <Icon name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <TextInput
        ref={inputRef}
        style={styles.searchInput}
        placeholder="Search chats..."
        placeholderTextColor="rgba(255,255,255,0.7)"
        value={searchQuery}
        onChangeText={handleChange}
        returnKeyType="search"
        maxLength={SEARCH_MAX_LENGTH}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="Search chats input"
        // ✅ No autoFocus — handled programmatically via ref
      />

      {/* ✅ Safe length check — searchQuery has default '' */}
      {searchQuery.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          style={baseStyles.headerIconBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Icon name="close" size={22} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────

/**
 * NormalHeader
 * Default header with title, search icon, and options menu.
 */
const NormalHeader = memo(({ title, onSearchOpen, onNormalMenu }) => (
  <View style={baseStyles.headerBar}>
    <Text style={baseStyles.headerTitle}>{title}</Text>
    <View style={baseStyles.headerActions}>
      <TouchableOpacity
        style={baseStyles.headerIconBtn}
        onPress={() => onSearchOpen?.()}
        accessibilityRole="button"
        accessibilityLabel="Open search"
      >
        <Icon name="search" size={24} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={baseStyles.headerIconBtn}
        onPress={() => onNormalMenu?.()}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
      >
        <Icon name="more-vert" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
));

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

/**
 * ChatHeader
 *
 * Renders one of three header layouts based on current mode:
 * 1. SelectionHeader — when one or more chats are selected
 * 2. SearchHeader    — when search mode is active
 * 3. NormalHeader    — default state
 *
 * Priority (if multiple modes somehow active): selection > search > normal
 *
 * @param {object} props
 * @param {string} [props.title]            - Normal header title (default: 'Chats')
 * @param {function} [props.onNormalMenu]   - Three-dot menu in normal mode
 * @param {boolean} [props.searchMode]      - Activates search header
 * @param {string} [props.searchQuery]      - Current search query string
 * @param {function} [props.onSearchChange] - Called with new query string
 * @param {function} [props.onSearchOpen]   - Called to open search mode
 * @param {function} [props.onSearchClose]  - Called to close search mode
 * @param {boolean} [props.selectionMode]   - Activates selection header
 * @param {number} [props.selectedCount]    - Number of selected items
 * @param {function} [props.onClose]        - Clears selection
 * @param {function} [props.onPin]          - Pins selected chats
 * @param {function} [props.onMute]         - Mutes selected chats
 * @param {function} [props.onArchive]      - Archives selected chats
 * @param {function} [props.onDotMenu]      - Three-dot menu in selection mode
 */
const ChatHeader = ({
  // Normal header
  title = 'Chats',
  onNormalMenu,
  // Search
  searchMode = false,
  searchQuery = '',
  onSearchChange,
  onSearchOpen,
  onSearchClose,
  // Selection
  selectionMode = false,
  selectedCount = 0,
  onClose,
  onPin,
  onMute,
  onArchive,
  onDotMenu,
}) => {
  // ✅ Document priority: selection > search > normal
  if (selectionMode) {
    return (
      <SelectionHeader
        selectedCount={selectedCount}
        onClose={onClose}
        onPin={onPin}
        onMute={onMute}
        onArchive={onArchive}
        onDotMenu={onDotMenu}
      />
    );
  }

  if (searchMode) {
    return (
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearchClose={onSearchClose}
      />
    );
  }

  return (
    <NormalHeader
      title={title}
      onSearchOpen={onSearchOpen}
      onNormalMenu={onNormalMenu}
    />
  );
};

// ─────────────────────────────────────────────────────────────────
// STYLES — defined before component, using StyleSheet.create
// ─────────────────────────────────────────────────────────────────

/**
 * Local styles for search header elements.
 * Base/shared styles remain in ChatSystemStyles.
 */
const styles = StyleSheet.create({
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54',
    paddingHorizontal: 4,
    paddingVertical: 8,
    elevation: 4,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

export default memo(ChatHeader);
