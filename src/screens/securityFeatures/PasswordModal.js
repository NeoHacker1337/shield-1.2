import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  TextInput
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/SecurityScreenStyles';

const PasswordModal = ({
  visible,
  mode,
  modalAnim,
  currentPassword,
  newPassword,
  confirmPassword,
  showCurrentPassword,
  showNewPassword,
  showConfirmPassword,
  setCurrentPassword,
  setNewPassword,
  setConfirmPassword,
  toggleCurrentPassword,
  toggleNewPassword,
  toggleConfirmPassword,
  error,
  onSubmit,
  onClose,
  title,
  description
}) => {

  const renderInput = (
    placeholder,
    value,
    onChangeText,
    showPassword,
    toggleShow,
    autoFocus = false
  ) => (
    <View style={styles.passwordInputContainer}>
      <TextInput
        style={styles.passwordInput}
        placeholder={placeholder}
        placeholderTextColor="#7A8A99"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={50}
      />

      <TouchableOpacity
        style={styles.passwordToggle}
        onPress={toggleShow}
        activeOpacity={0.7}
      >
        <Icon
          name={showPassword ? 'visibility-off' : 'visibility'}
          size={20}
          color="#7A8A99"
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >

      <TouchableWithoutFeedback onPress={() => {}}>
        <View style={styles.modalOverlay}>

          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: modalAnim,
                transform: [
                  {
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1]
                    })
                  }
                ]
              }
            ]}
          >

            {/* Title */}
            <Text style={styles.modalTitle}>
              {title}
            </Text>

            {/* Description */}
            <Text style={styles.modalDescription}>
              {description}
            </Text>

            {/* Current Password */}
            {mode !== 'set' &&
              renderInput(
                'Current Password',
                currentPassword,
                setCurrentPassword,
                showCurrentPassword,
                toggleCurrentPassword,
                true
              )
            }

            {/* New Password */}
            {mode !== 'remove' && (
              <>
                {renderInput(
                  'New Password',
                  newPassword,
                  setNewPassword,
                  showNewPassword,
                  toggleNewPassword,
                  mode === 'set'
                )}

                {renderInput(
                  'Confirm Password',
                  confirmPassword,
                  setConfirmPassword,
                  showConfirmPassword,
                  toggleConfirmPassword
                )}
              </>
            )}

            {/* Error */}
            {error ? (
              <Text style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            {/* Buttons */}
            <View style={styles.modalButtons}>

              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={onSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>
                  {mode === 'remove' ? 'Remove' : 'Confirm'}
                </Text>
              </TouchableOpacity>

            </View>

          </Animated.View>

        </View>
      </TouchableWithoutFeedback>

    </Modal>
  );
};

export default PasswordModal;
 