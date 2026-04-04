import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/SecurityScreenStyles';

const LoginPasswordFeature = ({ openPasswordModal }) => {

  return (
    <View style={styles.card}>

      {/* Header */}
      <View style={styles.cardHeader}>
        <Icon name="lock" size={24} color="#6C63FF" />
        <Text style={styles.cardTitle}>
          Login Password
        </Text>
      </View>

      {/* Description */}
      <Text style={styles.cardDescription}>
        Securely update your login password via email OTP.
      </Text>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.cardButton, { marginTop: 18 }]}
        onPress={() => openPasswordModal()}
        activeOpacity={0.85}
      >
        <Icon name="edit" size={20} color="#fff" />
        <Text style={styles.cardButtonText}>
          Change Password
        </Text>
      </TouchableOpacity>

    </View>
  );
};

export default LoginPasswordFeature;