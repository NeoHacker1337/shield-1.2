import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import styles from '../../../assets/FileLockerStyles';

const FileOptionsModal = ({ visible, file, onRestore, onDelete, onCancel }) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>File Options</Text>
        <Text style={styles.modalFileName} numberOfLines={1}>{file?.name}</Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={onRestore}>
            <Text style={styles.confirmButtonText}>Restore</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onDelete}>
            <Text style={styles.cancelButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.removePasswordButton} onPress={onCancel}>
          <Text style={styles.removePasswordText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default FileOptionsModal;
