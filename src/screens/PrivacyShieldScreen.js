import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../assets/PrivacyShieldStyles';

const PrivacyShieldScreen = () => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.statusCard}>
          <Icon name="shield" size={64} color="#4CAF50" />
          <Text style={styles.statusTitle}>Privacy Shield Active</Text>
          <Text style={styles.statusSubtitle}>
            Your privacy is protected
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="security" size={24} color="#FFFFFF" />
            <Text style={styles.actionText}>Quick Scan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="visibility-off" size={24} color="#FFFFFF" />
            <Text style={styles.actionText}>Hide Apps</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};
 

export default PrivacyShieldScreen;
