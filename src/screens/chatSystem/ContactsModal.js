import React from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/ChatSystemStyles';

const ContactsModal = ({ visible, onClose, contacts, contactsLoading, searchQuery, onSearch, onSelectContact , onViewAllInvitations  }) => {
  const renderItem = ({ item }) => {
    const name   = item.name || 'Unknown';
    const isOnline = Math.random() > 0.5;
    return (
      <TouchableOpacity style={styles.modalContactItem} onPress={() => onSelectContact(item)} activeOpacity={0.7}>
        <View style={styles.avatarContainer}>
          <View style={[styles.contactAvatar, isOnline && styles.onlineAvatar]}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.modalContactInfo}>
          <Text style={styles.modalContactName}>{name}{item.is_current_user && ' (You)'}</Text>
          {item.email ? <Text style={styles.modalContactEmail}>{item.email}</Text> : null}
          {item.is_current_user && <Text style={styles.personalNoteText}>Start a personal chat</Text>}
          {isOnline && !item.is_current_user && <Text style={styles.onlineText}>Online</Text>}
        </View>
      </TouchableOpacity>
      
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Chat</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Search contacts..." placeholderTextColor="#999" value={searchQuery} onChangeText={onSearch} />
        </View>
        {contactsLoading ? (
          <View style={styles.modalLoadingContainer}>
            <ActivityIndicator size="large" color="#075E54" />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : (
          <FlatList
            data={contacts}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.modalEmptyState}>
                <Icon name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>{searchQuery ? 'No contacts found' : 'No Contacts Found'}</Text>
                <Text style={styles.emptyStateSubtext}>{searchQuery ? 'Try a different term' : 'Sync contacts to start chatting'}</Text>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
};

export default ContactsModal;
