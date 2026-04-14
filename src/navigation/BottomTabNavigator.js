/**
 * BottomTabNavigator.js
 *
 * Renders the main bottom tab bar with a prominent center Scan button.
 * Chat and Security tabs are conditionally excluded from the navigator
 * entirely when hidden — this prevents navigation.navigate() bypasses.
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import SettingsScreen   from '../screens/Dashboard/SettingScreen';
import SecurityScreen   from '../screens/Dashboard/SecurityScreen';
import FileLockerScreen from '../screens/Dashboard/FileLockerScreen';
import ChatSystemScreen from '../screens/Dashboard/ChatSystemScreen';
import ScanScreen       from '../screens/Dashboard/ScanScreen'; // 👈 create this screen

import { useChatVisibility }     from '../context/ChatVisibilityContext';
import { useSecurityVisibility } from '../context/SecurityVisibilityContext';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TAB_BAR_BASE_HEIGHT = 56;

// Scan button dimensions
const SCAN_BUTTON_SIZE   = 62;
const SCAN_BUTTON_OFFSET = 20; // how far it floats above the tab bar

// ─────────────────────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// SCAN BUTTON COMPONENT
// Rendered as a custom tabBarButton so it floats above the tab bar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ScanTabButton
 *
 * Custom tab bar button that renders as a raised circular button
 * floating above the tab bar — matching the reference image style.
 *
 * @param {object} props - Passed automatically by React Navigation
 */
const ScanTabButton = ({ onPress, accessibilityState }) => {
  const isActive = accessibilityState?.selected;

  return (
    <View style={scanStyles.wrapper}>
      <TouchableOpacity
        style={[
          scanStyles.button,
          isActive && scanStyles.buttonActive,
        ]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Scan tab"
      >
        {/* Outer ring — matches the reference image border effect */}
        <View style={scanStyles.outerRing}>
          <Icon
            name="crop-free"
            size={30}
            color="#FFFFFF"
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATOR
// ─────────────────────────────────────────────────────────────────────────────

const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { chatHidden }     = useChatVisibility();
  const { securityHidden } = useSecurityVisibility();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'FileLocker') iconName = 'lock';
          else if (route.name === 'Chat')     iconName = 'chat';
          else if (route.name === 'Security') iconName = 'security';
          else if (route.name === 'Settings') iconName = 'settings';
          else if (route.name === 'Scan')     iconName = 'crop-free';

          return <Icon name={iconName} size={size} color={color} />;
        },

        // ── Original colors preserved exactly ──
        tabBarActiveTintColor:   '#2196F3',
        tabBarInactiveTintColor: 'gray',

        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth:  1,
          borderTopColor:  '#f0f0f0',
          // Extra height so the floating scan button doesn't get clipped
          height:        TAB_BAR_BASE_HEIGHT + insets.bottom + SCAN_BUTTON_OFFSET,
          paddingBottom: insets.bottom,
          paddingTop:    5,
        },

        tabBarLabelStyle: {
          fontSize:     12,
          marginBottom: 5,
        },

        headerShown: false,
      })}
    >

      {/* ── FileLocker (always visible — LEFT side) ─────────────────── */}
      <Tab.Screen
        name="FileLocker"
        component={FileLockerScreen}
        options={{
          tabBarLabel:              'Files',
          tabBarAccessibilityLabel: 'Files tab',
        }}
      />

      {/* ── Chat (conditionally registered — left of center) ─────────────
          When hidden, the remaining tabs redistribute automatically
          around the Scan center button.
      ──────────────────────────────────────────────────────────────── */}
      {!chatHidden && (
        <Tab.Screen
          name="Chat"
          component={ChatSystemScreen}
          options={{
            tabBarLabel:              'Connect',
            tabBarAccessibilityLabel: 'Connect tab',
          }}
        />
      )}

      {/* ── SCAN (always visible — always CENTER) ────────────────────────
          Uses a custom tabBarButton to render the floating circular button.
          tabBarLabel is empty string — the button is self-explanatory
          and the label would look odd under the elevated button.
          tabBarIcon is also hidden since ScanTabButton renders its own icon.
      ──────────────────────────────────────────────────────────────── */}
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel:              '',
          tabBarAccessibilityLabel: 'Scan tab',
          // Hide the default icon — ScanTabButton renders its own
          tabBarIcon:               () => null,
          // Replace the entire button with our custom floating component
          tabBarButton:             (props) => <ScanTabButton {...props} />,
        }}
      />

      {/* ── Security (conditionally registered — right of center) ────────
          Same pattern as Chat — completely excluded when hidden.
      ──────────────────────────────────────────────────────────────── */}
      {!securityHidden && (
        <Tab.Screen
          name="Security"
          component={SecurityScreen}
          options={{
            tabBarLabel:              'Security',
            tabBarAccessibilityLabel: 'Security tab',
          }}
        />
      )}

      {/* ── Settings (always visible — RIGHT side) ───────────────────── */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel:              'Settings',
          tabBarAccessibilityLabel: 'Settings tab',
        }}
      />

    </Tab.Navigator>
  );
};

export default BottomTabNavigator;

// ─────────────────────────────────────────────────────────────────────────────
// SCAN BUTTON STYLES
// ─────────────────────────────────────────────────────────────────────────────

const scanStyles = StyleSheet.create({

  /**
   * Outer wrapper — fills the tab slot and lifts the button above the bar.
   * `justifyContent: 'flex-end'` aligns upward relative to the tab bar top.
   */
  wrapper: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'flex-end',
    // Lift the button above the tab bar line
    bottom:         SCAN_BUTTON_OFFSET,
  },

  /**
   * The circular elevated button.
   * Shadow matches the reference image's drop shadow effect.
   */
  button: {
    width:           SCAN_BUTTON_SIZE,
    height:          SCAN_BUTTON_SIZE,
    borderRadius:    SCAN_BUTTON_SIZE / 2,
    backgroundColor: '#2196F3',           // matches tabBarActiveTintColor
    alignItems:      'center',
    justifyContent:  'center',
    // iOS shadow
    shadowColor:     '#2196F3',
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.4,
    shadowRadius:    10,
    // Android shadow
    elevation:       10,
  },

  /**
   * Active state — slightly deeper shadow when tab is selected.
   */
  buttonActive: {
    shadowOpacity: 0.6,
    elevation:     14,
  },

  /**
   * Inner ring border effect — replicates the white border
   * visible around the button in the reference image.
   */
  outerRing: {
    width:           SCAN_BUTTON_SIZE - 6,
    height:          SCAN_BUTTON_SIZE - 6,
    borderRadius:    (SCAN_BUTTON_SIZE - 6) / 2,
    borderWidth:     2,
    borderColor:     'rgba(255, 255, 255, 0.5)',
    alignItems:      'center',
    justifyContent:  'center',
  },

});