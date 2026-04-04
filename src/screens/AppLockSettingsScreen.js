import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  Switch 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/AppLockSettingsStyles';
import Theme, { Colors, Fonts, Spacing } from '../../assets/theme';

const AppLockSettingsScreen = () => {
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = React.useState(true);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lock Method</Text>

          <TouchableOpacity style={styles.optionItem}>
            <Icon name="fingerprint" size={24} color={Colors.success} />
            <Text style={styles.optionText}>Biometric Lock</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: Colors.borderLight, true: Colors.success }}
              thumbColor={biometricEnabled ? Colors.textPrimary : '#f4f3f4'}
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionItem}>
            <Icon name="lock" size={24} color={Colors.primary} />
            <Text style={styles.optionText}>PIN Lock</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionItem}>
            <Icon name="pattern" size={24} color={Colors.warning} />
            <Text style={styles.optionText}>Pattern Lock</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auto-Lock Settings</Text>

          <TouchableOpacity style={styles.optionItem}>
            <Icon name="timer" size={24} color={Colors.danger} />
            <Text style={styles.optionText}>Auto-Lock Timer</Text>
            <Switch
              value={autoLockEnabled}
              onValueChange={setAutoLockEnabled}
              trackColor={{ false: Colors.borderLight, true: Colors.success }}
              thumbColor={autoLockEnabled ? Colors.textPrimary : '#f4f3f4'}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default AppLockSettingsScreen;
