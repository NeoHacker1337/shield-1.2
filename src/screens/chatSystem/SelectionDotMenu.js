import React from 'react';
import { Modal, View, TouchableOpacity, Text, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/ChatSystemStyles';

const SelectionDotMenu = ({ visible, onClose, roomMeta, selectedRooms, onViewContact, onLockChat, onFavorite, onClearChat, onBlock, onDelete }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.menuModalOverlay}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.menuModalContent}>

            <TouchableOpacity style={styles.menuItem} onPress={onViewContact}>
              <Icon name="person" size={20} color="#075E54" />
              <Text style={styles.menuItemText}>View Contact</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={onLockChat}>
              <Icon name={selectedRooms.size === 1 && roomMeta[[...selectedRooms][0]]?.locked ? 'lock-open' : 'lock'} size={20} color="#E91E63" />
              <Text style={styles.menuItemText}>
                {selectedRooms.size === 1 && roomMeta[[...selectedRooms][0]]?.locked ? 'Unlock Chat' : 'Lock Chat'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={onFavorite}>
              <Icon name={[...selectedRooms].every(id => roomMeta[id]?.favorite) ? 'star' : 'star-border'} size={20} color="#FFC107" />
              <Text style={styles.menuItemText}>
                {[...selectedRooms].every(id => roomMeta[id]?.favorite) ? 'Remove from Favorites' : 'Add to Favorites'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={onClearChat}>
              <Icon name="cleaning-services" size={20} color="#FF9800" />
              <Text style={styles.menuItemText}>Clear Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={onBlock}>
              <Icon name="block" size={20} color="#F44336" />
              <Text style={[styles.menuItemText, { color: '#F44336' }]}>
                {[...selectedRooms].every(id => roomMeta[id]?.blocked) ? 'Unblock' : 'Block'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={onDelete}>
              <Icon name="delete" size={20} color="#E53935" />
              <Text style={[styles.menuItemText, { color: '#E53935' }]}>Delete</Text>
            </TouchableOpacity>

          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

export default SelectionDotMenu;
