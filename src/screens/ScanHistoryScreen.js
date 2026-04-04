import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/ScanHistoryStyles';
const ScanHistoryScreen = () => {
  const scanHistory = [
    {
      date: '2025-06-19',
      time: '14:30',
      result: 'Clean',
      appsScanned: 45,
      threatsFound: 0,
    },
    {
      date: '2025-06-18',
      time: '09:15',
      result: 'Warning',
      appsScanned: 44,
      threatsFound: 2,
    },
    {
      date: '2025-06-17',
      time: '16:45',
      result: 'Clean',
      appsScanned: 43,
      threatsFound: 0,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scan History</Text>
          <Text style={styles.headerSubtitle}>
            View your security scan results
          </Text>
        </View>

        <View style={styles.historyContainer}>
          {scanHistory.map((scan, index) => (
            <TouchableOpacity key={index} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Icon 
                  name={scan.result === 'Clean' ? 'check-circle' : 'warning'} 
                  size={24} 
                  color={scan.result === 'Clean' ? '#4CAF50' : '#FF9800'} 
                />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyDate}>{scan.date} at {scan.time}</Text>
                <Text style={styles.historyResult}>
                  Result: {scan.result} • {scan.appsScanned} apps scanned
                </Text>
                {scan.threatsFound > 0 && (
                  <Text style={styles.threatsFound}>
                    {scan.threatsFound} threats found
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default ScanHistoryScreen;
