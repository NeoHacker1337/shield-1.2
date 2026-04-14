/**
 * SettingsScreen.js
 *
 * Safe-area integration via react-native-safe-area-context.
 * Style helpers imported from SettingStyles.js (updated version).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  BackHandler,
  Easing,
  ScrollView,
  Alert,
  Modal,
  PermissionsAndroid,
  Vibration,
  StyleSheet,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomDrawerContent from '../../components/CustomDrawerContent';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles, {
  DRAWER_WIDTH,
  getContentTopPadding,
  getContentBottomPadding,
  getMenuButtonTopOffset,
  getDrawerInsets,
} from '../../assets/SettingStyles';
import { Colors, Fonts, Spacing, Radii } from '../../assets/theme';

import { useChatVisibility } from '../../context/ChatVisibilityContext';
import { useSecurityVisibility } from '../../context/SecurityVisibilityContext';

// ── Keychain service keys ─────────────────────────────────────────────────────
const CHAT_HIDE_SERVICE     = 'shield-chat-hide';
const SECURITY_HIDE_SERVICE = 'shield-security-hide';
export const LOGIN_AUTH_SERVICE = 'shield-passcode';

// ── PIN mode type ─────────────────────────────────────────────────────────────
/** @typedef {'chat' | 'security' | 'login'} PinMode */

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const SettingsScreen = ({ navigation }) => {
  // ── Safe area ──────────────────────────────────────────────────────────────
  const insets = useSafeAreaInsets();

  // ── Context ────────────────────────────────────────────────────────────────
  const { chatHidden: chatHideEnabled, setChatHidden: setChatHideEnabled }           = useChatVisibility();
  const { securityHidden: securityHideEnabled, setSecurityHidden: setSecurityHideEnabled } = useSecurityVisibility();

  // ── UI state ───────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [notifications, setNotifications]   = useState(true);
  const [userRole, setUserRole]             = useState('standard');
  const [backupEnabled, setBackupEnabled]   = useState(false);
  const [storageEnabled, setStorageEnabled] = useState(false);

  // ── PIN modal state ────────────────────────────────────────────────────────
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinValue, setPinValue]               = useState('');
  const [pinError, setPinError]               = useState('');
  /** @type {React.MutableRefObject<PinMode|null>} */
  const pinModeRef = useRef(null);

  /**
   * Ref mirror of pinModalVisible — used in the BackHandler callback to avoid
   * stale closure issues (BackHandler captures the value at registration time).
   */
  const pinModalVisibleRef = useRef(false);
  useEffect(() => { pinModalVisibleRef.current = pinModalVisible; }, [pinModalVisible]);

  // ── Animation refs ─────────────────────────────────────────────────────────
  const drawerOffset   = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim       = useRef(new Animated.Value(0)).current;
  const slideAnim      = useRef(new Animated.Value(50)).current;
  const pinShakeAnim   = useRef(new Animated.Value(0)).current;
  const modalAnim      = useRef(new Animated.Value(0)).current;

  // ════════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ════════════════════════════════════════════════════════════════════════════

  // Load persisted feature flags
  useEffect(() => {
    const loadSettingsFlags = async () => {
      try {
        const [backup, storage] = await Promise.all([
          AsyncStorage.getItem('is_backup_restore_enabled'),
          AsyncStorage.getItem('is_storage_data_enabled'),
        ]);
        setBackupEnabled(backup  ? JSON.parse(backup)  : false);
        setStorageEnabled(storage ? JSON.parse(storage) : false);
      } catch (e) {
        console.warn('[SettingsScreen] Error loading feature flags:', e);
      }
    };
    loadSettingsFlags();
  }, []);

  // Load user role
  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const role = await AsyncStorage.getItem('user_role');
        if (role) { setUserRole(role); return; }

        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          const parsed = JSON.parse(userData);
          setUserRole(parsed?.role?.slug || 'standard');
        }
      } catch (e) {
        console.warn('[SettingsScreen] Error loading user role:', e);
        setUserRole('standard');
      }
    };
    loadUserRole();
  }, []);

  // Entry animation + back handler + permissions
  useEffect(() => {
    requestCallPhonePermission();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    return () => {
      backHandler.remove();
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      drawerOffset.stopAnimation();
      overlayOpacity.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drawer open/close animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(drawerOffset, {
        toValue:        drawerOpen ? 0 : -DRAWER_WIDTH,
        duration:       300,
        useNativeDriver: true,
        easing:         Easing.inOut(Easing.ease),
      }),
      Animated.timing(overlayOpacity, {
        toValue:        drawerOpen ? 0.7 : 0,
        duration:       300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerOpen]);

  // ════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Uses refs to avoid stale-closure issues with BackHandler.
   * `drawerOpen` is read from state via setState callback — always fresh.
   */
  const handleBackPress = useCallback(() => {
    if (drawerOpen) {
      setDrawerOpen(false);
      return true;
    }
    if (pinModalVisibleRef.current) {
      closePinModal();
      return true;
    }
    return false;
  }, [drawerOpen]);

  const requestCallPhonePermission = async () => {
    if (Platform.OS !== 'android') return;
    try {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        {
          title:          'App Call Phone Permission',
          message:        'App needs access to your call phone feature.',
          buttonNeutral:  'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
    } catch (e) {
      console.warn('[SettingsScreen] CALL_PHONE permission error:', e);
    }
  };

  // ── PIN Modal (unified) ───────────────────────────────────────────────────

  /**
   * Opens the PIN modal for the given mode after verifying a PIN exists.
   *
   * @param {PinMode} mode
   */
  const openPinModalForMode = async (mode) => {
    const serviceMap = {
      chat:     CHAT_HIDE_SERVICE,
      security: SECURITY_HIDE_SERVICE,
      login:    LOGIN_AUTH_SERVICE,
    };

    const labelMap = {
      chat:     'Connect PIN',
      security: 'Security PIN',
      login:    'Login PIN',
    };

    const navHintMap = {
      chat:     'Security Settings → Connect Hide',
      security: 'Security Settings → Security Hide',
      login:    'Security Settings',
    };

    try {
      const creds = await Keychain.getGenericPassword({ service: serviceMap[mode] });

      if (!creds) {
        Alert.alert(
          `${labelMap[mode]} Not Set`,
          `Please go to ${navHintMap[mode]} and set a PIN first.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Security', onPress: () => navigation.navigate('Security') },
          ],
        );
        return;
      }

      pinModeRef.current = mode;
      setPinValue('');
      setPinError('');
      setPinModalVisible(true);
      Animated.timing(modalAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } catch (e) {
      console.warn(`[SettingsScreen] openPinModalForMode(${mode}) error:`, e);
      Alert.alert('Error', 'Unable to verify PIN status. Please try again.');
    }
  };

  const closePinModal = () => {
    Animated.timing(modalAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setPinModalVisible(false);
      setPinValue('');
      setPinError('');
      pinModeRef.current = null;
    });
  };

  const shakePinAnim = () => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(pinShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue:  10, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue:   0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePinKeyPress = (key) => {
    if (key === 'backspace') {
      setPinValue(prev => prev.slice(0, -1));
    } else if (pinValue.length < 6) {
      setPinValue(prev => prev + key);
    }
  };

  const handlePinConfirm = async () => {
    if (pinValue.length !== 6) {
      setPinError('Enter all 6 digits');
      shakePinAnim();
      return;
    }

    const serviceMap = {
      chat:     CHAT_HIDE_SERVICE,
      security: SECURITY_HIDE_SERVICE,
      login:    LOGIN_AUTH_SERVICE,
    };

    try {
      const service = serviceMap[pinModeRef.current];
      const creds   = await Keychain.getGenericPassword({ service });

      if (!creds || pinValue !== creds.password) {
        setPinError('Incorrect PIN. Please try again.');
        setPinValue('');
        shakePinAnim();
        return;
      }

      // Apply the toggled state for the relevant mode
      if (pinModeRef.current === 'chat') {
        await setChatHideEnabled(!chatHideEnabled);
      } else if (pinModeRef.current === 'security') {
        await setSecurityHideEnabled(!securityHideEnabled);
      }

      closePinModal();
    } catch (e) {
      console.warn('[SettingsScreen] handlePinConfirm error:', e);
      setPinError('Failed to verify PIN. Please try again.');
      shakePinAnim();
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Reusable toggle row card.
   */
  const renderToggleCard = ({ iconName, iconColor, title, subtitle, isEnabled, onToggle }) => (
    <TouchableOpacity
      style={styles.securityCard}
      onPress={onToggle}
      activeOpacity={0.85}
      accessibilityRole="switch"
      accessibilityState={{ checked: isEnabled }}
      accessibilityLabel={`${title} toggle, currently ${isEnabled ? 'on' : 'off'}`}
    >
      <Icon name={iconName} size={26} color={iconColor} />
      <View style={styles.securityText}>
        <View style={localStyles.cardTextBlock}>
          <Text style={styles.securityTitle}>{title}</Text>
          {subtitle ? (
            <Text style={localStyles.subtitle}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleText}>{isEnabled ? 'ON' : 'OFF'}</Text>
          <View style={[styles.toggleSwitch, isEnabled ? styles.toggleOn : styles.toggleOff]}>
            <View style={[styles.toggleKnob, isEnabled ? styles.knobOn : styles.knobOff]} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  /**
   * PIN input modal — handles chat, security, and login modes.
   *
   * Always rendered in the tree (visibility controlled by `visible` prop)
   * so the Modal's own animation has a stable mount to work with.
   */
  const renderPinModal = () => {
    const mode = pinModeRef.current;

    // Derive title and description from mode
    const titleMap = {
      security: `Security — Turn ${securityHideEnabled ? 'OFF' : 'ON'}`,
      chat:     `Chat — Turn ${chatHideEnabled ? 'OFF' : 'ON'}`,
      login:    'Confirm Login PIN',
    };
    const descMap = {
      security: 'Enter your 6-digit Security Hide PIN to confirm.',
      chat:     'Enter your 6-digit Chat Hide PIN to confirm.',
      login:    'Enter your Login PIN to change App Icon visibility.',
    };

    return (
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closePinModal}
        statusBarTranslucent   // ensures modal covers status bar on Android
      >
        <TouchableWithoutFeedback onPress={closePinModal}>
          <View style={pinModalStyles.overlay}>
            {/* Inner press does NOT propagate to TouchableWithoutFeedback */}
            <TouchableWithoutFeedback onPress={() => {}}>
              <Animated.View
                style={[
                  pinModalStyles.container,
                  { transform: [{ translateX: pinShakeAnim }] },
                ]}
              >
                {/* Title */}
                <Text style={pinModalStyles.title}>
                  {titleMap[mode] ?? 'Enter PIN'}
                </Text>

                {/* Description */}
                <Text style={pinModalStyles.description}>
                  {descMap[mode] ?? 'Enter your 6-digit PIN to confirm.'}
                </Text>

                {/* PIN dots */}
                <View style={pinModalStyles.dotsRow}>
                  {[...Array(6)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        pinModalStyles.dot,
                        pinValue.length > i && pinModalStyles.dotFilled,
                      ]}
                    />
                  ))}
                </View>

                {/* Error message */}
                {pinError ? (
                  <Text style={pinModalStyles.errorText}>{pinError}</Text>
                ) : null}

                {/* Keypad */}
                <View style={pinModalStyles.keypad}>
                  {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, ri) => (
                    <View key={ri} style={pinModalStyles.keyRow}>
                      {row.map(key => (
                        <TouchableOpacity
                          key={key}
                          style={pinModalStyles.keyBtn}
                          onPress={() => handlePinKeyPress(key)}
                          activeOpacity={0.7}
                          accessibilityLabel={key}
                          accessibilityRole="button"
                        >
                          <Text style={pinModalStyles.keyText}>{key}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}

                  {/* Bottom row: empty | 0 | backspace */}
                  <View style={pinModalStyles.keyRow}>
                    <View style={pinModalStyles.keyBtnGhost} />
                    <TouchableOpacity
                      style={pinModalStyles.keyBtn}
                      onPress={() => handlePinKeyPress('0')}
                      activeOpacity={0.7}
                      accessibilityLabel="0"
                      accessibilityRole="button"
                    >
                      <Text style={pinModalStyles.keyText}>0</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={pinModalStyles.keyBtnGhost}
                      onPress={() => handlePinKeyPress('backspace')}
                      activeOpacity={0.7}
                      accessibilityLabel="Backspace"
                      accessibilityRole="button"
                    >
                      <Icon name="backspace" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={pinModalStyles.btnRow}>
                  <TouchableOpacity
                    onPress={closePinModal}
                    style={pinModalStyles.cancelBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text style={pinModalStyles.btnText}>Cancel</Text>
                  </TouchableOpacity>

                  {pinValue.length === 6 && (
                    <TouchableOpacity
                      onPress={handlePinConfirm}
                      style={pinModalStyles.confirmBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Confirm PIN"
                    >
                      <Text style={pinModalStyles.btnText}>Confirm</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Forgot PIN */}
                <TouchableOpacity
                  onPress={() => {
                    closePinModal();
                    navigation.navigate('Security');
                  }}
                  style={pinModalStyles.forgotPinBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot PIN, go to Security settings"
                >
                  <Text style={pinModalStyles.forgotPinText}>Forgot PIN?</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>

      {/* ── Drawer Overlay ─────────────────────────────────────────────────
          Always rendered — pointer events disabled when drawer is closed.
          This keeps the Animated.View mounted so opacity animation always
          has a target node, preventing "animated value has no listeners" warnings.
      ──────────────────────────────────────────────────────────────────── */}
      <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
        <Animated.View
          style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
          pointerEvents={drawerOpen ? 'auto' : 'none'}
        />
      </TouchableWithoutFeedback>

      {/* ── Drawer Panel ────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.drawerContainer,
          { transform: [{ translateX: drawerOffset }] },
        ]}
        accessibilityViewIsModal={drawerOpen}
      >
        {/*
          Apply getDrawerInsets() to the *inner* content view so the
          background color fills edge-to-edge while content avoids safe areas.
        */}
        <View style={[styles.drawerInnerContent, getDrawerInsets(insets)]}>
          <CustomDrawerContent
            navigation={navigation}
            onClose={() => setDrawerOpen(false)}
          />
        </View>
      </Animated.View>

      {/* ── Main Scroll Content ─────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}                      // was styles.mainContent (removed)
        contentContainerStyle={[
          styles.contentContainer,
          {
            // Dynamic safe-area padding replaces hardcoded paddingTop/Bottom
            paddingTop:    getContentTopPadding(insets.top),
            paddingBottom: getContentBottomPadding(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Floating Menu Button ──────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          style={[
            styles.menuButton,
            // Dynamic top offset replaces hardcoded top: 16
            { top: getMenuButtonTopOffset(insets.top) },
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <Icon name="menu" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        {/* ── Page Title ───────────────────────────────────────────────── */}
        <Text style={styles.headerTitle}>Settings</Text>

        {/* ── Security & Privacy Section ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>
          <View style={styles.securityCards}>

            {/* Notifications */}
            {renderToggleCard({
              iconName:  'notifications',
              iconColor: Colors.primary,
              title:     'Notifications',
              isEnabled: notifications,
              onToggle:  () => setNotifications(prev => !prev),
            })}

            {/* Security Hide */}
            {renderToggleCard({
              iconName:  'security',
              iconColor: Colors.warning,
              title:     'Security',
              isEnabled: securityHideEnabled,
              onToggle:  () => openPinModalForMode('security'),
            })}

            {/* Chat Hide */}
            {renderToggleCard({
              iconName:  'hub',
              iconColor: Colors.warning,
              title:     'Connect',
              isEnabled: chatHideEnabled,
              onToggle:  () => openPinModalForMode('chat'),
            })}

          </View>
        </View>

        {/* ── Data & Storage Section ───────────────────────────────────── */}
        {(backupEnabled || storageEnabled) && (
          <View style={styles.section}>
            <View style={styles.securityCards}>

              {/* Backup & Restore */}
              {backupEnabled && (
                <TouchableOpacity
                  style={styles.securityCard}
                  onPress={() => navigation.navigate('Restore')}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Backup and Restore"
                >
                  <Icon name="cloud-download" size={26} color="#4A90D9" />
                  <View style={styles.securityText}>
                    <View style={localStyles.cardTextBlock}>
                      <Text style={styles.securityTitle}>Backup & Restore</Text>
                      <Text style={localStyles.subtitle}>
                        Download your vault files to this device
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={22} color={Colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Storage & Data */}
              {storageEnabled && (
                <TouchableOpacity
                  style={styles.securityCard}
                  onPress={() => navigation.navigate('StorageData')}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Storage and Data"
                >
                  <Icon name="storage" size={26} color={Colors.warning} />
                  <View style={styles.securityText}>
                    <View style={localStyles.cardTextBlock}>
                      <Text style={styles.securityTitle}>Storage & Data</Text>
                      <Text style={localStyles.subtitle}>
                        Manage app storage and cached data
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={22} color={Colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              )}

            </View>
          </View>
        )}

      </ScrollView>

      {/* ── PIN Modal ─────────────────────────────────────────────────── */}
      {renderPinModal()}

    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// LOCAL STYLES  (component-specific; not part of the shared design system)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Small styles used only within this file.
 * Using StyleSheet.create() for RN optimization (flattening + validation).
 * Theme tokens used throughout — no raw color values.
 */
const localStyles = StyleSheet.create({
  /** Text block inside a card (title + optional subtitle) */
  cardTextBlock: {
    flex: 1,
  },

  /** Muted secondary text beneath a card title */
  subtitle: {
    color:     Colors.textSecondary,
    fontSize:  Fonts.size.xs,
    marginTop: Spacing.xs / 2,   // 2
    fontFamily: Fonts.family.primary,
  },
});

/**
 * Styles for the PIN entry modal.
 * Kept separate from localStyles for clarity — this is a self-contained UI unit.
 */
const pinModalStyles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent:  'center',
    alignItems:      'center',
  },

  container: {
    backgroundColor: '#1E2433',
    borderRadius:    Radii.xl,
    padding:         Spacing.lg,
    width:           '88%',
    maxWidth:        360,
    shadowColor:     '#6C63FF',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.35,
    shadowRadius:    14,
    elevation:       12,
  },

  title: {
    color:        Colors.textPrimary,
    fontSize:     Fonts.size.lg,
    fontWeight:   Fonts.weight.bold,
    fontFamily:   Fonts.family.primary,
    textAlign:    'center',
    marginBottom: Spacing.xs,
  },

  description: {
    color:        Colors.textSecondary,
    fontSize:     Fonts.size.xs + 1,   // 13
    fontFamily:   Fonts.family.primary,
    textAlign:    'center',
    marginBottom: Spacing.xs,
    lineHeight:   20,
  },

  dotsRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
    gap:            14,
  },

  dot: {
    width:           16,
    height:          16,
    borderRadius:    8,
    borderWidth:     2,
    borderColor:     '#6C63FF',
    backgroundColor: Colors.transparent,
  },

  dotFilled: {
    backgroundColor: '#6C63FF',
  },

  errorText: {
    color:           Colors.danger,
    textAlign:       'center',
    marginBottom:    Spacing.sm,
    fontSize:        Fonts.size.xs,
    fontWeight:      Fonts.weight.medium,
    fontFamily:      Fonts.family.primary,
    backgroundColor: 'rgba(239, 83, 80, 0.15)',
    padding:         Spacing.sm,
    borderRadius:    Radii.sm,
  },

  keypad: {
    alignItems: 'center',
    marginTop:  Spacing.sm,
  },

  keyRow: {
    flexDirection: 'row',
    marginBottom:  Spacing.md - Spacing.xs,  // 12
    gap:           Spacing.md,
  },

  keyBtn: {
    width:           60,
    height:          60,
    borderRadius:    30,
    backgroundColor: '#2A3145',
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     '#3A4460',
  },

  /** Invisible placeholder / backspace button (same size, no background) */
  keyBtnGhost: {
    width:           60,
    height:          60,
    borderRadius:    30,
    backgroundColor: Colors.transparent,
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     0,
  },

  keyText: {
    color:      Colors.textPrimary,
    fontSize:   Fonts.size.xl + 1,   // 23 — one step above xl for keypad prominence
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
  },

  btnRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    gap:            Spacing.sm,
    marginTop:      Spacing.md,
  },

  cancelBtn: {
    flex:            1,
    paddingVertical: Spacing.md - Spacing.xs,  // 14
    borderRadius:    Radii.md,
    alignItems:      'center',
    backgroundColor: Colors.textSecondary,
  },

  confirmBtn: {
    flex:            1,
    paddingVertical: Spacing.md - Spacing.xs,  // 14
    borderRadius:    Radii.md,
    alignItems:      'center',
    backgroundColor: '#6C63FF',
  },

  btnText: {
    color:      Colors.textPrimary,
    fontSize:   Fonts.size.sm + 1,  // 15
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
  },

  forgotPinBtn: {
    alignItems:      'center',
    marginTop:       Spacing.md - Spacing.xs,  // 14
    paddingVertical: Spacing.xs + 2,           // 6
  },

  forgotPinText: {
    color:             '#6C63FF',
    fontSize:          Fonts.size.xs + 1,  // 13
    fontWeight:        Fonts.weight.medium,
    fontFamily:        Fonts.family.primary,
    textDecorationLine: 'underline',
  },
});

export default SettingsScreen;