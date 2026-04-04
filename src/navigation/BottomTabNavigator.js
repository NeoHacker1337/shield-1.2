import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import SettingsScreen from '../screens/Dashboard/SettingScreen';
import SecurityScreen from '../screens/Dashboard/SecurityScreen';
import FileLockerScreen from '../screens/Dashboard/FileLockerScreen';
import ChatSystemScreen from '../screens/Dashboard/ChatSystemScreen';

import { useChatVisibility } from '../context/ChatVisibilityContext'; // adjust path
import { useSecurityVisibility } from '../context/SecurityVisibilityContext';
const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { chatHidden } = useChatVisibility();
  const { securityHidden } = useSecurityVisibility();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'FileLocker') iconName = 'lock';
          else if (route.name === 'Chat') iconName = 'chat';
          else if (route.name === 'Security') iconName = 'security';
          else if (route.name === 'Settings') iconName = 'settings';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 5,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="FileLocker" component={FileLockerScreen} />

      <Tab.Screen
        name="Chat"
        component={ChatSystemScreen}
        options={{
          tabBarItemStyle: chatHidden ? { display: 'none' } : {},
          tabBarButton: chatHidden ? () => null : undefined,
        }}
      />

      <Tab.Screen
        name="Security"
        component={SecurityScreen}
        options={{
          tabBarItemStyle: securityHidden ? { display: 'none' } : {},
          tabBarButton: securityHidden ? () => null : undefined,
        }}
      />

      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
});

export default BottomTabNavigator;
