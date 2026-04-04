import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import styles from '../../../assets/FileLockerStyles';

const PasswordModal = ({
  visible,
  isSettingPassword,
  currentFile,
  passwordInput,
  confirmPassword,
  usedPasswords,
  protectedFiles,
  onChangePassword,
  onChangeConfirm,
  onCancel,
  onSubmit,
  onRestore,
  onRemovePassword
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {isSettingPassword ? 'Set Password' : 'Enter Password'}
          </Text>

          {currentFile && (
            <Text style={styles.modalFileName}>{currentFile.name}</Text>
          )}

          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#7A8A99"
            value={passwordInput}
            onChangeText={onChangePassword}
            secureTextEntry
            autoFocus
          />

          {isSettingPassword && (
            <>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm Password"
                placeholderTextColor="#7A8A99"
                value={confirmPassword}
                onChangeText={onChangeConfirm}
                secureTextEntry
              />
              {usedPasswords?.has(passwordInput) && (
                <Text style={styles.passwordUsedText}></Text>
              )}
            </>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={onSubmit}
            >
              <Text style={styles.confirmButtonText}>
                {isSettingPassword ? 'Set Password' : 'Unlock'}
              </Text>
            </TouchableOpacity>
          </View>

          {!isSettingPassword && protectedFiles?.[currentFile?.path] && (
            <TouchableOpacity style={styles.restoreButton} onPress={onRestore}>
              <Text style={styles.restoreButtonText}>Restore File</Text>
            </TouchableOpacity>
          )}

          {!isSettingPassword && protectedFiles?.[currentFile?.path] && (
            <TouchableOpacity
              style={styles.removePasswordButton}
              onPress={onRemovePassword}
            >
              <Text style={styles.removePasswordText}>Remove Password</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default PasswordModal;