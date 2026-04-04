import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native';
import styles from '../../../assets/FileLockerStyles';

const FileCreateModal = ({
  visible,
  fileName,
  fileContent,
  onChangeName,
  onChangeContent,
  onCancel,
  onCreate
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create New File</Text>

          <TextInput
            style={styles.passwordInput}
            placeholder="File Name"
            placeholderTextColor="#7A8A99"
            value={fileName}
            onChangeText={onChangeName}
          />

          <TextInput
            style={[styles.passwordInput, { height: 100 }]}
            placeholder="File Content (optional)"
            placeholderTextColor="#7A8A99"
            value={fileContent}
            onChangeText={onChangeContent}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={onCreate}
            >
              <Text style={styles.confirmButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default FileCreateModal;