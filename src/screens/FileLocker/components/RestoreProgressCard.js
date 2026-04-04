import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const RestoreProgressCard = ({
  status, progress, currentFile,
  totalFiles, restoredCount, errorMessage,
}) => {
  if (status === 'idle') return null;

  return (
    <View style={styles.card}>

      {/* Running */}
      {status === 'running' && (
        <>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.title}>Restoring Files...</Text>
          <Text style={styles.subText}>
            {restoredCount} of {totalFiles} files
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>

          <Text style={styles.currentFile} numberOfLines={1}>
            📄 {currentFile}
          </Text>
        </>
      )}

      {/* Done */}
      {status === 'done' && (
        <>
          <Icon name="check-circle" size={60} color="#4CAF50" />
          <Text style={styles.title}>Restore Complete!</Text>
          <Text style={styles.subText}>
            {restoredCount} files restored successfully.
          </Text>
        </>
      )}

      {/* Error */}
      {status === 'error' && (
        <>
          <Icon name="error" size={60} color="#F44336" />
          <Text style={styles.title}>Restore Failed</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E2A38',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  subText: {
    color: '#7A8A99',
    fontSize: 14,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#2C3E50',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4A90D9',
    borderRadius: 4,
  },
  progressText: {
    color: '#4A90D9',
    fontWeight: 'bold',
    fontSize: 16,
  },
  currentFile: {
    color: '#7A8A99',
    fontSize: 12,
    maxWidth: '100%',
  },
  errorText: {
    color: '#F44336',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default RestoreProgressCard;
