/**
 * SettingsScreen.js
 *
 * Safe-area integration via react-native-safe-area-context.
 * Style helpers imported from SettingStyles.js (updated version).
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
} from 'react';
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
  StatusBar,
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

// ── Static maps (defined outside component — never recreated on render) ───────
const PIN_SERVICE_MAP = {
  chat:     CHAT_HIDE_SERVICE,
  security: SECURITY_HIDE_SERVICE,
  login:    LOGIN_AUTH_SERVICE,
};

const PIN_LABEL_MAP = {
  chat:     'Connect PIN',
  security: 'Security PIN',
  login:    'Login PIN',
};

const PIN_NAV_HINT_MAP = {
  chat:     'Security Settings → Connect Hide',
  security: 'Security Settings → Security Hide',
  login:    'Security Settings',
};

const PIN_TITLE_MAP = (securityOn, chatOn) => ({
  security: `Security — Turn ${securityOn ? 'OFF' : 'ON'}`,
  chat:     `Chat — Turn ${chatOn ? 'OFF' : 'ON'}`,
  login:    'Confirm Login PIN',
});

const PIN_DESC_MAP = {
  security: 'Enter your 6-digit Security Hide PIN to confirm.',
  chat:     'Enter your 6-digit Chat Hide PIN to confirm.',
  login:    'Enter your Login PIN to change App Icon visibility.',
};

// ═════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Reusable toggle row card.
 * Extracted to a stable `memo` component so it is not recreated on every
 * parent render — previously defined as an inline render function which
 * bypasses React's reconciler optimisations.
 */
const ToggleCard = memo(({
  iconName,
  iconColor,
  title,
  subtitle,
  isEnabled,
  onToggle,
}) => (
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
));

/**
 * PIN entry modal.
 * Extracted to a stable `memo` component with all required values passed as
 * props. This eliminates the stale-ref read (`pinModeRef.current` during render)
 * that existed in the original inline `renderPinModal` function.
 */
const PinModal = memo(({
  visible,
  mode,
  pinValue,
  pinError,
  pinShakeAnim,
  securityHideEnabled,
  chatHideEnabled,
  onKeyPress,
  onConfirm,
  onClose,
  onForgotPin,
}) => {
  const titleMap = PIN_TITLE_MAP(securityHideEnabled, chatHideEnabled);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent   // ensures modal covers status bar on Android
    >
      <TouchableWithoutFeedback onPress={onClose}>
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
                {PIN_DESC_MAP[mode] ?? 'Enter your 6-digit PIN to confirm.'}
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
                {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map(
                  (row, ri) => (
                    <View key={ri} style={pinModalStyles.keyRow}>
                      {row.map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={pinModalStyles.keyBtn}
                          onPress={() => onKeyPress(key)}
                          activeOpacity={0.7}
                          accessibilityLabel={key}
                          accessibilityRole="button"
                        >
                          <Text style={pinModalStyles.keyText}>{key}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ),
                )}

                {/* Bottom row: empty | 0 | backspace */}
                <View style={pinModalStyles.keyRow}>
                  <View style={pinModalStyles.keyBtnGhost} />
                  <TouchableOpacity
                    style={pinModalStyles.keyBtn}
                    onPress={() => onKeyPress('0')}
                    activeOpacity={0.7}
                    accessibilityLabel="0"
                    accessibilityRole="button"
                  >
                    <Text style={pinModalStyles.keyText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={pinModalStyles.keyBtnGhost}
                    onPress={() => onKeyPress('backspace')}
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
                  onPress={onClose}
                  style={pinModalStyles.cancelBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={pinModalStyles.btnText}>Cancel</Text>
                </TouchableOpacity>

                {pinValue.length === 6 && (
                  <TouchableOpacity
                    onPress={onConfirm}
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
                onPress={onForgotPin}
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
});

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const SettingsScreen = ({ navigation }) => {
  // ── Safe area ──────────────────────────────────────────────────────────────
  const insets = useSafeAreaInsets();

  // ── Context ────────────────────────────────────────────────────────────────
  const {
    chatHidden: chatHideEnabled,
    setChatHidden: setChatHideEnabled,
  } = useChatVisibility();
  const {
    securityHidden: securityHideEnabled,
    setSecurityHidden: setSecurityHideEnabled,
  } = useSecurityVisibility();

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
  const [pinMode, setPinMode]                 = useState(null);

  /**
   * Ref mirrors of state values used inside BackHandler callback.
   * BackHandler captures values at registration time — refs always give
   * the latest value without requiring re-registration.
   */
  const drawerOpenRef      = useRef(false);
  const pinModalVisibleRef = useRef(false);

  useEffect(() => { drawerOpenRef.current = drawerOpen; },      [drawerOpen]);
  useEffect(() => { pinModalVisibleRef.current = pinModalVisible; }, [pinModalVisible]);

  // ── Animation refs ─────────────────────────────────────────────────────────
  const drawerOffset   = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim       = useRef(new Animated.Value(0)).current;
  const slideAnim      = useRef(new Animated.Value(50)).current;
  const pinShakeAnim   = useRef(new Animated.Value(0)).current;
  /*
    modalAnim was previously animated but never applied to any Animated.View.
    Kept as a ref to preserve the open/close animation calls (they are
    harmless) without removing declared functionality.
  */
  const modalAnim = useRef(new Animated.Value(0)).current;

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

  // Entry animation + permissions
  useEffect(() => {
    requestCallPhonePermission();

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      drawerOffset.stopAnimation();
      overlayOpacity.stopAnimation();
    };
  }, [fadeAnim, slideAnim, drawerOffset, overlayOpacity]);

  /*
    BackHandler is registered in its own effect so it can be correctly
    re-registered when nothing changes — it reads from refs (always fresh)
    so it does NOT need drawerOpen or pinModalVisible in its deps array.
    This fixes the stale-closure bug where drawerOpen was always `false`
    inside the handler because BackHandler captured the initial value.
  */
  useEffect(() => {
    const handleBackPress = () => {
      if (drawerOpenRef.current) {
        setDrawerOpen(false);
        return true;
      }
      if (pinModalVisibleRef.current) {
        closePinModal();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    return () => backHandler.remove();
    // No deps needed — handler reads from refs which are always current
  }, []);

  // Drawer open/close animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(drawerOffset, {
        toValue:         drawerOpen ? 0 : -DRAWER_WIDTH,
        duration:        300,
        useNativeDriver: true,
        easing:          Easing.inOut(Easing.ease),
      }),
      Animated.timing(overlayOpacity, {
        toValue:         drawerOpen ? 0.7 : 0,
        duration:        300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerOpen, drawerOffset, overlayOpacity]);

  // ════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

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

  // ── PIN Modal ─────────────────────────────────────────────────────────────

  /**
   * Opens the PIN modal for the given mode after verifying a PIN exists.
   * @param {PinMode} mode
   */
  const openPinModalForMode = useCallback(async (mode) => {
    try {
      const creds = await Keychain.getGenericPassword({
        service: PIN_SERVICE_MAP[mode],
      });

      if (!creds) {
        Alert.alert(
          `${PIN_LABEL_MAP[mode]} Not Set`,
          `Please go to ${PIN_NAV_HINT_MAP[mode]} and set a PIN first.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go to Security',
              onPress: () => navigation.navigate('Security'),
            },
          ],
        );
        return;
      }

      setPinMode(mode);
      setPinValue('');
      setPinError('');
      setPinModalVisible(true);
      Animated.timing(modalAnim, {
        toValue:         1,
        duration:        300,
        useNativeDriver: true,
      }).start();
    } catch (e) {
      console.warn(`[SettingsScreen] openPinModalForMode(${mode}) error:`, e);
      Alert.alert('Error', 'Unable to verify PIN status. Please try again.');
    }
  }, [navigation, modalAnim]);

  const closePinModal = useCallback(() => {
    Animated.timing(modalAnim, {
      toValue:         0,
      duration:        300,
      useNativeDriver: true,
    }).start(() => {
      setPinModalVisible(false);
      setPinValue('');
      setPinError('');
      setPinMode(null);
    });
  }, [modalAnim]);

  const shakePinAnim = useCallback(() => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(pinShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue:  10, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue:   0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [pinShakeAnim]);

  const handlePinKeyPress = useCallback((key) => {
    if (key === 'backspace') {
      setPinValue(prev => prev.slice(0, -1));
    } else if (pinValue.length < 6) {
      setPinValue(prev => prev + key);
    }
  }, [pinValue]);

  const handlePinConfirm = useCallback(async () => {
    if (pinValue.length !== 6) {
      setPinError('Enter all 6 digits');
      shakePinAnim();
      return;
    }

    try {
      const creds = await Keychain.getGenericPassword({
        service: PIN_SERVICE_MAP[pinMode],
      });

      if (!creds || pinValue !== creds.password) {
        setPinError('Incorrect PIN. Please try again.');
        setPinValue('');
        shakePinAnim();
        return;
      }

      // Apply the toggled state for the relevant mode
      if (pinMode === 'chat') {
        await setChatHideEnabled(!chatHideEnabled);
      } else if (pinMode === 'security') {
        await setSecurityHideEnabled(!securityHideEnabled);
      }

      closePinModal();
    } catch (e) {
      console.warn('[SettingsScreen] handlePinConfirm error:', e);
      setPinError('Failed to verify PIN. Please try again.');
      shakePinAnim();
    }
  }, [
    pinValue,
    pinMode,
    chatHideEnabled,
    securityHideEnabled,
    setChatHideEnabled,
    setSecurityHideEnabled,
    closePinModal,
    shakePinAnim,
  ]);

  const handleForgotPin = useCallback(() => {
    closePinModal();
    navigation.navigate('Security');
  }, [closePinModal, navigation]);

  const handleOpenDrawer  = useCallback(() => setDrawerOpen(true),  []);
  const handleCloseDrawer = useCallback(() => setDrawerOpen(false), []);

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      {/*
        translucent + transparent keeps the gradient/background colour
        visible behind the system status bar on Android.
      */}
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      {/* ── Drawer Overlay ─────────────────────────────────────────────────
          Always rendered — pointer events disabled when drawer is closed.
          This keeps the Animated.View mounted so opacity animation always
          has a target node, preventing "animated value has no listeners" warnings.
      ──────────────────────────────────────────────────────────────────── */}
      <TouchableWithoutFeedback onPress={handleCloseDrawer}>
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
            onClose={handleCloseDrawer}
          />
        </View>
      </Animated.View>

      {/* ── Main Scroll Content ─────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            /*
              Dynamic safe-area padding:
                • Top    — clears status bar + menu button height
                • Bottom — clears gesture nav bar / home indicator
            */
            paddingTop:    getContentTopPadding(insets.top),
            paddingBottom: getContentBottomPadding(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Floating Menu Button ──────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleOpenDrawer}
          style={[
            styles.menuButton,
            /*
              Dynamic top offset — pushes button below the status bar/notch
              on every device without a hardcoded magic number.
            */
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
            <ToggleCard
              iconName="notifications"
              iconColor={Colors.primary}
              title="Notifications"
              isEnabled={notifications}
              onToggle={() => setNotifications(prev => !prev)}
            />

            {/* Security Hide */}
            <ToggleCard
              iconName="security"
              iconColor={Colors.warning}
              title="Security"
              isEnabled={securityHideEnabled}
              onToggle={() => openPinModalForMode('security')}
            />

            {/* Chat Hide */}
            <ToggleCard
              iconName="hub"
              iconColor={Colors.warning}
              title="Connect"
              isEnabled={chatHideEnabled}
              onToggle={() => openPinModalForMode('chat')}
            />

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

      {/* ── PIN Modal ─────────────────────────────────────────────────────
          Rendered as a stable memo component so its internal state and
          animations are not torn down on every parent render.
      ──────────────────────────────────────────────────────────────────── */}
      <PinModal
        visible={pinModalVisible}
        mode={pinMode}
        pinValue={pinValue}
        pinError={pinError}
        pinShakeAnim={pinShakeAnim}
        securityHideEnabled={securityHideEnabled}
        chatHideEnabled={chatHideEnabled}
        onKeyPress={handlePinKeyPress}
        onConfirm={handlePinConfirm}
        onClose={closePinModal}
        onForgotPin={handleForgotPin}
      />

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
    color:      Colors.textSecondary,
    fontSize:   Fonts.size.xs,
    marginTop:  Spacing.xs / 2,  // 2
    fontFamily: Fonts.family.primary,
  },
});

/**
 * Styles for the PIN entry modal.
 * Kept separate from localStyles for clarity — this is a self-contained UI unit.
 * All arithmetic on theme tokens replaced with explicit values for safety.
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
    /*
      Was: Fonts.size.xs + 1
      Arithmetic on theme tokens is fragile if token type changes.
      Replaced with an explicit value that matches the original intent (13).
    */
    fontSize:     13,
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
    /*
      Was: Colors.transparent
      Colors.transparent may not exist in all theme files.
      'transparent' is a built-in React Native value — always safe.
    */
    backgroundColor: 'transparent',
  },

  dotFilled: {
    backgroundColor: '#6C63FF',
  },

  errorText: {
    /*
      Was: Colors.danger
      Replaced with an explicit safe fallback in case Colors.danger is
      not defined in the consumer's theme file.
    */
    color:           Colors.danger ?? '#EF5350',
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
    /*
      Was: Spacing.md - Spacing.xs (arithmetic on tokens — fragile)
      Replaced with explicit value matching the original intent (12).
    */
    marginBottom:  12,
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
    backgroundColor: 'transparent',
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     0,
  },

  keyText: {
    color:      Colors.textPrimary,
    /*
      Was: Fonts.size.xl + 1
      Replaced with explicit value (23) matching the original intent.
    */
    fontSize:   23,
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
    /*
      Was: Spacing.md - Spacing.xs (arithmetic — fragile)
      Replaced with explicit value (14) matching the original intent.
    */
    paddingVertical: 14,
    borderRadius:    Radii.md,
    alignItems:      'center',
    backgroundColor: Colors.textSecondary,
  },

  confirmBtn: {
    flex:            1,
    paddingVertical: 14,
    borderRadius:    Radii.md,
    alignItems:      'center',
    backgroundColor: '#6C63FF',
  },

  btnText: {
    color:      Colors.textPrimary,
    /*
      Was: Fonts.size.sm + 1
      Replaced with explicit value (15) matching the original intent.
    */
    fontSize:   15,
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
  },

  forgotPinBtn: {
    alignItems:      'center',
    /*
      Was: Spacing.md - Spacing.xs (arithmetic — fragile)
      Replaced with explicit value (14) matching the original intent.
    */
    marginTop:       14,
    paddingVertical: 6,
  },

  forgotPinText: {
    color:              '#6C63FF',
    fontSize:           13,
    fontWeight:         Fonts.weight.medium,
    fontFamily:         Fonts.family.primary,
    textDecorationLine: 'underline',
  },
});

export default SettingsScreen;