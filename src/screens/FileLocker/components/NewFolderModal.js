import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native';
import styles from '../../../assets/FileLockerStyles';

const NewFolderModal = ({
  visible, step, folderName, password, confirmPassword,
  onChangeName, onChangePassword, onChangeConfirm,
  onNext, onBack, onCancel,
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        {step === 1 ? (
          <>
            <Text style={styles.modalTitle}>New Folder</Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Folder Name"
              placeholderTextColor="#7A8A99"
              value={folderName}
              onChangeText={onChangeName}
              autoFocus
            />
          </>
        ) : (
          <>
            <Text style={styles.modalTitle}>Protect Folder</Text>
            <Text style={styles.modalFileName}>Set a password for "{folderName}"</Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#7A8A99"
              value={password}
              onChangeText={onChangePassword}
              secureTextEntry
              autoFocus
            />
            {password.length > 0 && (
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm Password"
                placeholderTextColor="#7A8A99"
                value={confirmPassword}
                onChangeText={onChangeConfirm}
                secureTextEntry
              />
            )}
          </>
        )}
        <View style={styles.modalButtons}>
          <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onBack}>
            <Text style={styles.cancelButtonText}>{step === 2 ? 'Back' : 'Cancel'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={onNext}>
            <Text style={styles.confirmButtonText}>{step === 1 ? 'Next →' : 'Create Folder'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default NewFolderModal;
