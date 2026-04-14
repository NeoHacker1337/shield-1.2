import React from 'react';
import { Modal, View, TouchableOpacity, Text, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/ChatSystemStyles';

const HeaderDotMenu = ({ visible, onClose, syncingContacts, onSyncContacts, onInvite, onViewAllInvitations }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.menuModalOverlay}>
        <TouchableWithoutFeedback onPress={() => { }}>
          <View style={styles.menuModalContent}>

            {/* Sync Contacts */}
            <TouchableOpacity style={styles.menuItem} onPress={onSyncContacts}>
              {syncingContacts
                ? <ActivityIndicator size="small" color="#075E54" />
                : <Icon name="sync" size={20} color="#333" />}
              <Text style={styles.menuItemText}>
                {syncingContacts ? 'Syncing...' : 'Sync Contacts'}
              </Text>
            </TouchableOpacity>

            {/* Invite for Chat */}
            <TouchableOpacity style={styles.menuItem} onPress={onInvite}>
              <Icon name="person-add" size={20} color="#333" />
              <Text style={styles.menuItemText}>Invite for Chat</Text>
            </TouchableOpacity>

            {/* ✅ NEW: View All Invitations */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={onViewAllInvitations}
            >
              <Icon name="mail-outline" size={20} color="#333" />
              <Text style={styles.menuItemText}>View All Invitations</Text>
            </TouchableOpacity>

          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

export default HeaderDotMenu;
