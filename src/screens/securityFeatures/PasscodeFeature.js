import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/SecurityScreenStyles';

const PasscodeFeature = ({
  hasPasscode,
  openPasscodeModal,
}) => {

  return (
    <View style={styles.card}>

      {/* Header */}
      <View style={styles.cardHeader}>
        <Icon name="dialpad" size={24} color="#6C63FF" />
        <Text style={styles.cardTitle}>
          Enable Quick Login
        </Text>
      </View>

      {/* Description */}
      <Text style={styles.cardDescription}>
        {hasPasscode
          ? 'Create a 6-digit passcode to skip the password and access your account instantly.'
          : 'Set up a 6-digit numeric passcode for quick and secure access.'}
      </Text>

      {/* Status */}
      <View style={styles.passwordStatus}>
        <Icon
          name={hasPasscode ? 'check-circle' : 'cancel'}
          size={18}
          color={hasPasscode ? '#4CAF50' : '#EF5350'}
        />

        <Text
          style={[
            styles.statusText,
            { color: hasPasscode ? '#4CAF50' : '#EF5350' },
          ]}
        >
          {hasPasscode
            ? '6-Digit Passcode Active'
            : 'No Passcode Set'}
        </Text>
      </View>

      {/* Actions */}
      {!hasPasscode ? (
        <TouchableOpacity
          style={[styles.cardButton, styles.passcodeButton]}
          onPress={() => openPasscodeModal('set')}
          activeOpacity={0.8}
        >
          <Icon name="add-circle" size={20} color="#fff" />
          <Text style={styles.cardButtonText}>
            Set 6-Digit Passcode
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.cardActions}>

          <TouchableOpacity
            style={[styles.cardActionButton, styles.changeButton]}
            onPress={() => openPasscodeModal('change')}
            activeOpacity={0.8}
          >
            <Icon name="edit" size={18} color="#fff" />
            <Text style={styles.cardActionButtonText}>
              Change
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardActionButton, styles.removeButton]}
            onPress={() => openPasscodeModal('remove')}
            activeOpacity={0.8}
          >
            <Icon name="delete" size={18} color="#fff" />
            <Text style={styles.cardActionButtonText}>
              Remove
            </Text>
          </TouchableOpacity>

        </View>
      )}

    </View>
  );
};

export default PasscodeFeature;
