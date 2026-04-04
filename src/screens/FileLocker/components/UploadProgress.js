import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const UploadProgress = ({ uploadStage, uploadProgress, onCancel }) => (
  <View style={styles.overlay}>
    <Text style={styles.label}>
      {uploadStage === 'encrypting' ? 'Encrypting data…' : 'Securing file…'}
    </Text>
    <View style={styles.barBg}>
      <View style={[styles.barFill, { width: `${uploadProgress}%` }]} />
    </View>
    <Text style={styles.percent}>{uploadProgress}%</Text>
    <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
      <Text style={styles.cancelText}>Cancel Encryption</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center',
    alignItems: 'center', zIndex: 9999,
  },
  label: { color: '#fff', fontSize: 16, marginBottom: 16 },
  barBg: { width: '70%', height: 8, backgroundColor: '#333', borderRadius: 4 },
  barFill: { height: 8, backgroundColor: '#4CAF50', borderRadius: 4 },
  percent: { color: '#fff', marginTop: 8 },
  cancelBtn: { marginTop: 20, padding: 10, backgroundColor: '#F44336', borderRadius: 8 },
  cancelText: { color: '#fff', fontWeight: '600' },
});

export default UploadProgress;
