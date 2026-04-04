// src/screens/SecuritySettingsScreen.js
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../assets/SecuritySettingsStyles';

const SecuritySettingsScreen = () => {
  const settingsOptions = [
    {
      title: 'App Lock',
      subtitle: 'Secure your apps with PIN, Pattern, or Biometric',
      icon: 'lock',
      onPress: () => console.log('App Lock pressed'),
    },
    {
      title: 'Privacy Scanner',
      subtitle: 'Scan for privacy risks and vulnerabilities',
      icon: 'search',
      onPress: () => console.log('Privacy Scanner pressed'),
    },
    {
      title: 'Permissions Monitor',
      subtitle: 'Monitor app permission usage',
      icon: 'security',
      onPress: () => console.log('Permissions Monitor pressed'),
    },
    {
      title: 'Auto-Lock Timer',
      subtitle: 'Set automatic lock timeout',
      icon: 'timer',
      onPress: () => console.log('Auto-Lock Timer pressed'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Icon name="security" size={48} color="#4CAF50" />
          <Text style={styles.headerTitle}>Security Settings</Text>
          <Text style={styles.headerSubtitle}>
            Configure your security preferences
          </Text>
        </View>

        <View style={styles.settingsContainer}>
          {settingsOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.settingItem}
              onPress={option.onPress}
            >
              <View style={styles.settingIcon}>
                <Icon name={option.icon} size={24} color="#FFFFFF" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{option.title}</Text>
                <Text style={styles.settingSubtitle}>{option.subtitle}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#9E9E9E" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default SecuritySettingsScreen;
