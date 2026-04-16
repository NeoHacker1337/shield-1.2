import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CommonActions } from '@react-navigation/native';
import authService from '../services/AuthService';
import { Colors, Fonts, Spacing, Radii } from '../assets/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL CONSTANTS
// Defined outside the component so they are never recreated on re-render.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Static drawer navigation items.
 * Add/remove entries here — the list renders automatically.
 *
 * To re-enable Get Premium, uncomment the first entry.
 */
const DRAWER_ITEMS = [
  { label: 'Profile', icon: 'person', screen: 'Profile' },
  { label: 'Referral', icon: 'qr-code', screen: 'ReferralQrScreen' },
  { label: 'Share Profile', icon: 'share', screen: 'ShareProfileScreen' },
  { label: 'Settings', icon: 'settings', screen: 'Settings' },
  { label: 'Feedback', icon: 'feedback', screen: 'Feedback' },
  { label: 'About Us', icon: 'info', screen: 'AboutUs' },
];

/**
 * Logo resolved once at module load — `require` is a bundle-time operation
 * but the assignment still runs on every render if placed inside the component.
 */
const LOGO_IMAGE = require('../assets/shield-logo.png');

/**
 * Copyright year — computed once, not on every render.
 */
const CURRENT_YEAR = new Date().getFullYear();

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CustomDrawerContent
 *
 * Rendered inside the animated drawer panels of SecurityScreen,
 * SettingsScreen, DashboardScreen, etc.
 *
 * Props:
 *   navigation  — React Navigation prop for screen transitions
 *   onClose     — Callback to close the parent's animated drawer.
 *                 MUST be called before navigating so the drawer
 *                 animation completes cleanly.
 */
const CustomDrawerContent = ({ navigation, onClose }) => {

  // ── Handlers ───────────────────────────────────────────────────────────────

  /**
   * Navigate to a drawer item's screen.
   *
   * Bug fix: previously never called onClose(), leaving the animated
   * drawer open after navigation.
   *
   * useCallback: stable reference — not strictly required here but
   * prevents unnecessary re-creation if parent passes it as a dep.
   */
  const handleItemPress = useCallback(async (screen) => {
    if (onClose) onClose();

    // ✅ Special handling for Referral
    if (screen === 'ReferralQrScreen') {
      try {
        const localData = await AsyncStorage.getItem('referral_data');
        let referralLink = '';

        if (localData) {
          const parsed = JSON.parse(localData);
          referralLink =
            parsed?.referral_link ||
            parsed?.referralLink ||
            parsed?.link ||
            '';
        }

        navigation.navigate('ReferralQrScreen', {
          referralLink,
        });

        return;
      } catch (error) {
        console.error('❌ Drawer referral load error:', error.message);
      }
    }

    // default navigation
    navigation.navigate(screen);

  }, [navigation, onClose]);

  /**
   * Show logout confirmation alert.
   *
   * Bug fixes:
   *   1. onClose() now called so drawer closes before/during logout.
   *   2. navigation.dispatch wrapped in try/finally so it always fires
   *      even if authService.logout() throws beyond the timeout.
   *   3. Logout logic extracted into a named async function for clarity.
   */
  const handleLogout = useCallback(() => {
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
            // Close drawer immediately so it doesn't linger during logout
            if (onClose) onClose();

            try {
              // Race logout against a 3-second timeout
              const logoutPromise = authService.logout();
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Logout timed out')), 3000),
              );
              await Promise.race([logoutPromise, timeoutPromise]);
            } catch (error) {
              // Non-fatal — log and proceed to login screen regardless
              console.warn('[CustomDrawerContent] Logout warning (proceeding anyway):', error.message);
            } finally {
              // Always navigate to login — even if logout service fails
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'PasswordEntry' }],
                }),
              );
            }
          },
        },
      ],
    );
  }, [navigation, onClose]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    /*
      Bug fix: previously used <SafeAreaView> which double-applied safe-area
      padding on top of the getDrawerInsets(insets) already applied by each
      parent screen's drawerInnerContent wrapper.

      Using plain <View> here — safe-area is the parent's responsibility,
      keeping this component portable and free of assumptions about its context.
    */
    <View style={styles.drawerContent}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.drawerHeader}>
        <Image
          source={LOGO_IMAGE}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Shield Security logo"
        />
        <Text style={styles.drawerTitle}>Shield Security</Text>
      </View>

      <View style={styles.divider} />

      {/* ── Nav Items ──────────────────────────────────────────────────────
          Bug fix: replaced FlatList with View + map().
          FlatList adds virtualization overhead that is harmful (not helpful)
          for a static list of 4 items that all fit on screen at once.
      ─────────────────────────────────────────────────────────────────── */}
      <View>
        {DRAWER_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={`${item.screen}-${index}`}
            style={styles.drawerItem}
            onPress={() => handleItemPress(item.screen)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Navigate to ${item.label}`}
          >
            <Icon
              name={item.icon}
              size={24}
              color={Colors.textPrimary}
              style={styles.drawerIcon}
            />
            <Text style={styles.drawerItemText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.divider} />

      {/* ── Logout Button ──────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.drawerItem, styles.logoutItem]}
        onPress={handleLogout}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Logout of Shield Security"
      >
        <Icon
          name="logout"
          size={24}
          color={Colors.danger}
          style={styles.drawerIcon}
        />
        <Text style={[styles.drawerItemText, styles.logoutText]}>Logout</Text>
      </TouchableOpacity>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <View style={styles.drawerFooter}>
        <Text style={styles.versionText}>v1.2.1</Text>
        <Text style={styles.copyrightText}>
          © {CURRENT_YEAR} Shield Security
        </Text>
      </View>

    </View>
  );
};

export default CustomDrawerContent;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// All raw color/size values replaced with theme tokens for consistency
// with SecurityScreen, SettingsScreen, and the shared design system.
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  drawerContent: {
    flex: 1,
    backgroundColor: Colors.backgroundInput,   // was: '#1E1E1E'
  },

  drawerHeader: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,                 // was: 20
    paddingTop: Spacing.sm,                 // was: 10
  },

  logo: {
    width: 50,
    height: 50,
  },

  drawerTitle: {
    color: Colors.textPrimary,            // was: '#FFFFFF'
    fontSize: Fonts.size.xxl,               // was: 24
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
    marginTop: Spacing.sm,                   // was: 10
  },

  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,       // was: '#333'
    marginVertical: Spacing.sm,              // was: 10
  },

  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md - Spacing.xs, // 12 — between sm(8) and md(16)
    paddingHorizontal: Spacing.lg,             // was: 20
  },

  drawerIcon: {
    marginRight: Spacing.md - Spacing.xs,      // 12 — consistent with paddingV
  },

  drawerItemText: {
    color: Colors.textPrimary,            // was: '#FFFFFF'
    fontSize: Fonts.size.md,                // was: 16
    fontFamily: Fonts.family.primary,
  },

  logoutItem: {
    marginTop: Spacing.sm,                    // was: 10
  },

  logoutText: {
    color: Colors.danger,                // was: '#FF5252'
    fontSize: Fonts.size.md,               // was: 16
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
  },

  drawerFooter: {
    padding: Spacing.lg,                   // was: 20
    alignItems: 'center',
  },

  versionText: {
    color: Colors.textSecondary,         // was: '#9E9E9E'
    fontSize: Fonts.size.xs,               // was: 12
    fontFamily: Fonts.family.primary,
  },

  copyrightText: {
    color: Colors.textSecondary,         // was: '#9E9E9E'
    fontSize: Fonts.size.xs,               // was: 12
    fontFamily: Fonts.family.primary,
    marginTop: Spacing.xs + 1,              // was: 5
  },
});