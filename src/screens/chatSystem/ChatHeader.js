import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/ChatSystemStyles';

const ChatHeader = ({
  // normal header
  onNormalMenu,
  // search
  searchMode,
  searchQuery,
  onSearchChange,
  onSearchOpen,
  onSearchClose,
  // selection header
  selectionMode,
  selectedCount,
  onClose,
  onPin,
  onMute,
  onArchive,
  onDotMenu,
}) => {

  // ── Selection mode header ─────────────────────────────────────────────
  if (selectionMode) {
    return (
      <View style={styles.selectionHeader}>
        <TouchableOpacity onPress={onClose} style={styles.headerIconBtn}>
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.selectionCount}>{selectedCount}</Text>
        <View style={styles.selectionActions}>
          <TouchableOpacity onPress={onPin} style={styles.headerIconBtn}>
            <Icon name="push-pin" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onMute} style={styles.headerIconBtn}>
            <Icon name="volume-off" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onArchive} style={styles.headerIconBtn}>
            <Icon name="archive" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDotMenu} style={styles.headerIconBtn}>
            <Icon name="more-vert" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Search mode header ────────────────────────────────────────────────
  if (searchMode) {
    return (
      <View style={searchHeaderStyle}>
        <TouchableOpacity onPress={onSearchClose} style={styles.headerIconBtn}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TextInput
          style={searchInputStyle}
          placeholder="Search chats..."
          placeholderTextColor="rgba(255,255,255,0.7)"
          value={searchQuery}
          onChangeText={onSearchChange}
          autoFocus={true}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchChange('')}
            style={styles.headerIconBtn}
          >
            <Icon name="close" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── Normal header ─────────────────────────────────────────────────────
  return (
    <View style={styles.headerBar}>
      <Text style={styles.headerTitle}>Chats</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={onSearchOpen}>
          <Icon name="search" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn} onPress={onNormalMenu}>
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const searchHeaderStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#075E54',
  paddingHorizontal: 4,
  paddingVertical: 8,
  elevation: 4,
};

const searchInputStyle = {
  flex: 1,
  fontSize: 16,
  color: '#fff',
  paddingHorizontal: 8,
  paddingVertical: 4,
};

export default ChatHeader;
