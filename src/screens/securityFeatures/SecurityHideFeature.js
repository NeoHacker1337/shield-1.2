import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/SecurityScreenStyles';

const SecurityHideFeature = ({
  hasSecurityHidePin,
  openSecurityHideModal,
}) => {

  return (
    <View style={styles.card}>

      {/* Header */}
      <View style={styles.cardHeader}>
        <Icon name="security" size={24} color="#009688" />
        <Text style={styles.cardTitle}>
          Security Hide
        </Text>
      </View>

      {/* Description */}
      <Text style={styles.cardDescription}>
        {hasSecurityHidePin
          ? 'Security Hide protection is active.'
          : 'Hide sensitive security settings using a 6-digit PIN.'}
      </Text>

      {/* Status */}
      <View style={styles.passwordStatus}>
        <Icon
          name={hasSecurityHidePin ? 'check-circle' : 'cancel'}
          size={18}
          color={hasSecurityHidePin ? '#4CAF50' : '#EF5350'}
        />

        <Text
          style={[
            styles.statusText,
            { color: hasSecurityHidePin ? '#4CAF50' : '#EF5350' },
          ]}
        >
          {hasSecurityHidePin
            ? 'Security Hide Active'
            : 'Not Enabled'}
        </Text>
      </View>

      {/* Actions */}
      {!hasSecurityHidePin ? (
        <TouchableOpacity
          style={[styles.cardButton, { backgroundColor: '#009688' }]}
          onPress={() => openSecurityHideModal('set')}
          activeOpacity={0.8}
        >
          <Icon name="security" size={20} color="#fff" />
          <Text style={styles.cardButtonText}>
            Set Security Hide PIN
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.cardActions}>

          <TouchableOpacity
            style={[styles.cardActionButton, styles.changeButton]}
            onPress={() => openSecurityHideModal('change')}
            activeOpacity={0.8}
          >
            <Icon name="edit" size={18} color="#fff" />
            <Text style={styles.cardActionButtonText}>
              Change
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardActionButton, styles.removeButton]}
            onPress={() => openSecurityHideModal('remove')}
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

export default SecurityHideFeature;
 