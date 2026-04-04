import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../../assets/FileLockerStyles';

const StorageModal = ({ visible, onClose, onSelect }) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.storageModalContent}>
          <Text style={styles.storageModalTitle}>Select Storage</Text>
          <Text style={styles.storageModalSubtitle}>
            Choose where to browse for files
          </Text>

          <ScrollView style={styles.storageOptionsContainer}>
            {[
              ['internal', 'storage', '#42A5F5', 'Internal Storage'],
              ['external', 'sd-storage', '#4CAF50', 'External Storage'],
              ['downloads', 'file-download', '#FF9800', 'Downloads'],
              ['dcim', 'camera-alt', '#E91E63', 'Camera (DCIM)'],
              ['documents', 'description', '#9C27B0', 'Documents'],
            ].map(([key, icon, color, label]) => (
              <TouchableOpacity
                key={key}
                style={styles.storageOptionEnhanced}
                onPress={() => onSelect(key)}
              >
                <View style={styles.storageOptionIcon}>
                  <Icon name={icon} size={24} color={color} />
                </View>
                <View style={styles.storageOptionContent}>
                  <Text style={styles.storageOptionTitle}>{label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default StorageModal;