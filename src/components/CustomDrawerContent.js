import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CommonActions } from '@react-navigation/native';
import authService from '../services/AuthService';

const CustomDrawerContent = (props) => {
  const { navigation } = props;

  const drawerItems = [
  { label: 'Get Premium', icon: 'star', screen: 'GetPremium' }, 
  { label: 'Profile', icon: 'person', screen: 'Profile' },
  { label: 'Settings', icon: 'settings', screen: 'Settings' },
  { label: 'Feedback', icon: 'feedback', screen: 'Feedback' },
  { label: 'About Us', icon: 'info', screen: 'AboutUs' },
];


  // navigation that automatically closes drawer
  const handleItemPress = (screen) => {
    navigation.navigate(screen);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Timeout protection
              const logoutPromise = authService.logout();
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Logout timed out')), 3000)
              );

              await Promise.race([logoutPromise, timeoutPromise]);
            } catch (error) {
              console.log('Logout warning (proceeding anyway):', error.message);
            }

            // Navigate to login screen
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'PasswordEntry' }],
              })
            );
          },
        },
      ]
    );
  };

  const logoImage = require('../assets/shield-logo.png');
  const currentYear = new Date().getFullYear();

  return (
    <SafeAreaView style={styles.drawerContent}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
        <Text style={styles.drawerTitle}>Shield Security</Text>
      </View>

      <View style={styles.divider} />

      {/* Drawer Items */}
      <FlatList
        data={drawerItems}
        keyExtractor={(item) => item.label}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.drawerItem}
            onPress={() => handleItemPress(item.screen)}
          >
            <Icon
              name={item.icon}
              size={24}
              color="#FFFFFF"
              style={styles.drawerIcon}
            />
            <Text style={styles.drawerItemText}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.divider} />

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.drawerItem, styles.logoutItem]}
        onPress={handleLogout}
      >
        <Icon
          name="logout"
          size={24}
          color="#FF5252"
          style={styles.drawerIcon}
        />
        <Text style={[styles.drawerItemText, styles.logoutText]}>Logout</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.drawerFooter}>
        <Text style={styles.versionText}>v1.2.0</Text>
        <Text style={styles.copyrightText}>
          © {currentYear} Shield Security
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default CustomDrawerContent;

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  drawerHeader: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 10,
  },
  logo: {
    width: 50,
    height: 50,
  },
  drawerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  drawerIcon: {
    marginRight: 15,
  },
  drawerItemText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  logoutItem: {
    marginTop: 10,
  },
  logoutText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: 'bold',
  },
  drawerFooter: {
    padding: 20,
    alignItems: 'center',
  },
  versionText: {
    color: '#9E9E9E',
    fontSize: 12,
  },
  copyrightText: {
    color: '#9E9E9E',
    fontSize: 12,
    marginTop: 5,
  },
});
