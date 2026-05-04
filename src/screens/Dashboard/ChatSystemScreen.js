import React from 'react';
import { View, FlatList, TouchableOpacity, StatusBar, RefreshControl, Alert, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/ChatSystemStyles';

import useChatSystem from './../chatSystem/useChatSystem';
import ChatHeader from './../chatSystem/ChatHeader';
import ChatRoomItem from './../chatSystem/ChatRoomItem';
import ContactsModal from './../chatSystem/ContactsModal';
import SelectionDotMenu from './../chatSystem/SelectionDotMenu';
import HeaderDotMenu from './../chatSystem/HeaderDotMenu';
import LockPinModal from './../chatSystem/LockPinModal';
import LockedChatsPasswordModal from './../chatSystem/LockedChatsPasswordModal';

const ChatSystemScreen = ({ navigation }) => {
  const h = useChatSystem(navigation);

  if (h.loading && !h.refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }




  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar translucent={false} backgroundColor="#075E54" barStyle="light-content" />

      <View style={styles.container}>

      <ChatHeader
        // normal
        onNormalMenu={() => h.setShowMenuModal(true)}
        // search
        searchMode={h.searchMode}
        searchQuery={h.searchQuery}
        onSearchChange={h.handleChatSearch}
        onSearchOpen={h.openSearch}
        onSearchClose={h.closeSearch}
        // selection
        selectionMode={h.selectionMode}
        selectedCount={h.selectedRooms.size}
        onClose={h.exitSelection}
        onPin={h.onSelectionPin}
        onMute={h.onSelectionMute}
        onArchive={h.onSelectionArchive}
        onDotMenu={() => h.setShowSelectionDotMenu(true)}
      />


      <FlatList
        data={h.filteredRooms}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <ChatRoomItem
            item={item}
            index={index}
            selectionMode={h.selectionMode}
            selectedRooms={h.selectedRooms}
            roomMeta={h.roomMeta}
            displayName={h.getDisplayNameFromChatRoom(item, h.currentUser)}
            displayNameMeta={h.contactDisplayNames?.[item.id]}
            localRoomNames={h.localRoomNames}
            formatMessageTime={h.formatMessageTime}
            onPress={() => h.selectionMode ? h.toggleRoomSelection(item.id) : h.openChat(item)}
            onLongPress={() => h.handleLongPress(item)}
          />
        )}

        ListHeaderComponent={() => {

          const lockedRooms = h.sortedRooms.filter(r => h.roomMeta?.[r.id]?.locked);
          const lockedCount = lockedRooms.length;

          // Must be searching
          if (!h.searchMode) return null;

          // PIN must be verified
          if (!h.showLockedChats) return null;

          // Must have locked chats
          if (lockedCount === 0) return null;

          return (
            <TouchableOpacity
              style={styles.lockedChatsRow}
              activeOpacity={0.7}
              onPress={() => {

                navigation.navigate('LockedChats', {
                  lockedRooms,
                  roomMeta: h.roomMeta,
                  localRoomNames: h.localRoomNames,
                  currentUser: h.currentUser,
                  onUnlockRoom: (roomId) => h.toggleMeta(roomId, 'locked'),
                });

              }}
            >
              <View style={styles.lockedChatsIcon}>
                <Icon name="lock" size={26} color="#075E54" />
              </View>

              <Text style={styles.lockedChatsText}>
                Locked chats ({lockedCount})
              </Text>

              <Icon name="chevron-right" size={22} color="#aaa" />
            </TouchableOpacity>
          );
        }}

        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            {h.searchMode ? (
              <>
                <Icon name="search-off" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>No results found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Try searching a different name or message
                </Text>
              </>
            ) : (
              <>
                <Icon name="chat-bubble-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>No Chats Found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start a conversation by tapping the + button below
                </Text>
              </>
            )}
          </View>
        )}
        refreshControl={
          !h.searchMode
            ? <RefreshControl refreshing={h.refreshing} onRefresh={h.onRefresh} colors={['#075E54']} />
            : undefined
        }
      />

      {/* FAB — hide in search and selection mode */}
      {!h.selectionMode && !h.searchMode && (
        <TouchableOpacity style={styles.fab} onPress={h.handleFabPress} activeOpacity={0.8}>
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}


      <SelectionDotMenu
        visible={h.showSelectionDotMenu}
        onClose={() => h.setShowSelectionDotMenu(false)}
        roomMeta={h.roomMeta}
        selectedRooms={h.selectedRooms}
        onViewContact={h.onSelectionViewContact}
        onLockChat={h.onSelectionLockChat}
        onFavorite={h.onSelectionFavorite}
        onClearChat={h.onSelectionClearChat}
        onBlock={h.onSelectionBlock}
        onDelete={h.onSelectionDelete}
      />

      <HeaderDotMenu
        visible={h.showMenuModal}
        onClose={() => h.setShowMenuModal(false)}
        syncingContacts={h.syncingContacts}
        onSyncContacts={h.handleSyncContacts}
        onInvite={h.handleInviteForChat}
        onViewAllInvitations={() => navigation.navigate('AllInvitations')}
      />

      <LockPinModal
        visible={h.showLockPinModal}
        onClose={() => { h.setShowLockPinModal(false); h.setLockPinInput(''); h.setLockPinError(''); h.exitSelection(); }}
        lockTargetRoom={h.lockTargetRoom}
        roomMeta={h.roomMeta}
        localRoomNames={h.localRoomNames}
        lockPinInput={h.lockPinInput}
        setLockPinInput={h.setLockPinInput}
        lockPinError={h.lockPinError}
        lockShakeAnim={h.lockShakeAnim}
        onConfirm={h.confirmLockPin}
      />

      <ContactsModal
        visible={h.showContactsModal}
        onClose={() => h.setShowContactsModal(false)}
        contacts={h.filteredContacts}
        contactsLoading={h.contactsLoading}
        searchQuery={h.searchQuery}
        onSearch={h.handleSearchContacts}
        onSelectContact={h.handleSelectContact}
      />

      <LockedChatsPasswordModal
        visible={h.showLockedChatsModal}
        onClose={() => {
          h.setShowLockedChatsModal(false);
          h.setLockedChatsPinInput('');
          h.setLockedChatsPinError('');
        }}
        pinInput={h.lockedChatsPinInput}
        setPinInput={h.setLockedChatsPinInput}
        pinError={h.lockedChatsPinError}
        shakeAnim={h.lockedChatsShakeAnim}
        onConfirm={h.confirmLockedChatsPin}
      />

      </View>
    </SafeAreaView>
  );
};

export default ChatSystemScreen;
