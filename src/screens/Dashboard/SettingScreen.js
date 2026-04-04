import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  BackHandler,
  Dimensions,
  Easing,
  ScrollView,
  Alert,
  Modal,
  PermissionsAndroid,
  NativeModules,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CustomDrawerContent from '../../components/CustomDrawerContent';
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import styles from '../../assets/SettingStyles';
import { useChatVisibility } from '../../context/ChatVisibilityContext';
import { useSecurityVisibility } from '../../context/SecurityVisibilityContext';
const { width: screenWidth } = Dimensions.get('window');
 

// ── Keychain service key ──────────────────────────────────────────────────────
const CHAT_HIDE_SERVICE = 'shield-chat-hide';

const SECURITY_HIDE_SERVICE = 'shield-security-hide';

export const LOGIN_AUTH_SERVICE = 'shield-passcode';

const SettingsScreen = ({ navigation }) => {

  // ── UI state ──────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState(true);
  
  const [userRole, setUserRole] = useState('standard');

  // ── Chat Hide ─────────────────────────────────────────────────────────────
  const { chatHidden: chatHideEnabled, setChatHidden: setChatHideEnabled } = useChatVisibility();

  const { securityHidden: securityHideEnabled, setSecurityHidden: setSecurityHideEnabled } = useSecurityVisibility();
  const [quickLoginModalVisible, setQuickLoginModalVisible] = useState(false);
 
 

  // ── PIN modal ─────────────────────────────────────────────────────────────
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const pinShakeAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const [pinMode, setPinMode] = useState(null);
  // ── Animations ────────────────────────────────────────────────────────────
  const isMountedRef = useRef(true);
  const drawerWidth = screenWidth * 0.75;
  const drawerOffset = useRef(new Animated.Value(-drawerWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [backupEnabled, setBackupEnabled] = useState(false);
  const [storageEnabled, setStorageEnabled] = useState(false);

  // ══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const loadSettingsFlags = async () => {
      try {
        const backup = await AsyncStorage.getItem('is_backup_restore_enabled');
        const storage = await AsyncStorage.getItem('is_storage_data_enabled');

        setBackupEnabled(backup ? JSON.parse(backup) : false);
        setStorageEnabled(storage ? JSON.parse(storage) : false);

      } catch (e) {
        console.log('Error loading flags:', e);
      }
    };

    loadSettingsFlags();
  }, []);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
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
      } catch { setUserRole('standard'); }
    };
    loadUserRole();
  }, []);

    
  // Entry animation + back handler
  useEffect(() => {
    requestCallPhonePermission();
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
     
    return () => {
      backHandler.remove();
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      drawerOffset.stopAnimation();
      overlayOpacity.stopAnimation();
    };
  }, []);

  // Drawer animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(drawerOffset, {
        toValue: drawerOpen ? 0 : -drawerWidth,
        duration: 300, useNativeDriver: true, easing: Easing.inOut(Easing.ease),
      }),
      Animated.timing(overlayOpacity, {
        toValue: drawerOpen ? 0.7 : 0, duration: 300, useNativeDriver: true,
      }),
    ]).start();
  }, [drawerOpen]);

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const handleBackPress = () => {
    if (drawerOpen) { setDrawerOpen(false); return true; }
    if (pinModalVisible) { closePinModal(); return true; }
    return false;
  };

  const requestCallPhonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE, {
          title: 'App Call Phone Permission',
          message: 'App needs access to your call phone feature.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });
      } catch { }
    }
  };

  
  const openSecurityPinModal = async () => {

    try {

      const creds = await Keychain.getGenericPassword({
        service: SECURITY_HIDE_SERVICE
      });

      if (!creds) {
        Alert.alert(
          'Security PIN Not Set',
          'Please go to Security Settings → Security Hide and set a PIN first.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Security', onPress: () => navigation.navigate('Security') },
          ]
        );
        return;
      }

      setPinValue('');
      setPinError('');
      setPinModalVisible(true);

    } catch {
      Alert.alert('Error', 'Unable to verify Security PIN.');
    }

  };

  // ── PIN modal (Chat Hide only) ─────────────────────────────────────────────
  const openPinModal = async () => {
    try {
      const creds = await Keychain.getGenericPassword({ service: CHAT_HIDE_SERVICE });
      if (!creds) {
        Alert.alert(
          'Connect PIN Not Set',
          `You haven't set a Connect PIN yet.\n\nPlease go to Security Settings → Connect Hide and set a 6-digit PIN first.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Security', onPress: () => navigation.navigate('Security') },
          ]
        );
        return;
      }
      setPinValue('');
      setPinError('');
      setPinModalVisible(true);
      Animated.timing(modalAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } catch {
      Alert.alert('Error', 'Could not verify PIN status. Please try again.');
    }
  };

  const closePinModal = () => {
    setPinModalVisible(false);
    setPinValue('');
    setPinError('');
    Animated.timing(modalAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const shakePinAnim = () => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(pinShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
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

    try {

      const creds = await Keychain.getGenericPassword({
        service:
          pinMode === 'security'
            ? SECURITY_HIDE_SERVICE
            : pinMode === 'chat'
              ? CHAT_HIDE_SERVICE
              : LOGIN_AUTH_SERVICE
      });

      if (!creds || pinValue !== creds.password) {
        setPinError('Incorrect PIN. Please try again.');
        setPinValue('');
        shakePinAnim();
        return;
      }

      if (pinMode === 'chat') {

        const newVal = !chatHideEnabled;
        await setChatHideEnabled(newVal);

      }

      if (pinMode === 'security') {

        const newVal = !securityHideEnabled;
        await setSecurityHideEnabled(newVal);

      }
 
      closePinModal();

    } catch {

      setPinError('Failed to verify PIN. Please try again.');
      shakePinAnim();

    }

  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  const renderToggleCard = ({ iconName, iconColor, title, subtitle, isEnabled, onToggle }) => (
    <TouchableOpacity style={styles.securityCard} onPress={onToggle} activeOpacity={0.85}>
      <Icon name={iconName} size={26} color={iconColor} />
      <View style={styles.securityText}>
        <View style={{ flex: 1 }}>
          <Text style={styles.securityTitle}>{title}</Text>
          {subtitle ? <Text style={inlineStyles.subtitle}>{subtitle}</Text> : null}
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

  const renderPinModal = () => (
    <Modal visible={pinModalVisible} transparent animationType="fade" onRequestClose={closePinModal}>
      <TouchableWithoutFeedback onPress={() => { }}>
        <View style={pinModalStyles.overlay}>
          <Animated.View style={[pinModalStyles.container, { transform: [{ translateX: pinShakeAnim }] }]}>

            <Text style={pinModalStyles.title}>
              {pinMode === 'security'
                ? `Security — Turn ${securityHideEnabled ? 'OFF' : 'ON'}`
                : pinMode === 'chat'
                  ? `Chat — Turn ${chatHideEnabled ? 'OFF' : 'ON'}`
                  : `Confirm Login PIN`}
            </Text>
            <Text style={pinModalStyles.description}>
              {pinMode === 'security'
                ? 'Enter your 6-digit Security Hide PIN to confirm.'
                : pinMode === 'chat'
                  ? 'Enter your 6-digit Chat Hide PIN to confirm.'
                  : 'Enter your Login PIN to change App Icon visibility.'}
            </Text>

            {/* Dots */}
            <View style={pinModalStyles.dotsRow}>
              {[...Array(6)].map((_, i) => (
                <View
                  key={i}
                  style={[pinModalStyles.dot, pinValue.length > i && pinModalStyles.dotFilled]}
                />
              ))}
            </View>

            {pinError ? <Text style={pinModalStyles.errorText}>{pinError}</Text> : null}

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
                    >
                      <Text style={pinModalStyles.keyText}>{key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              <View style={pinModalStyles.keyRow}>
                {/* Empty placeholder */}
                <View style={[pinModalStyles.keyBtn, { backgroundColor: 'transparent', borderColor: 'transparent' }]} />
                <TouchableOpacity
                  style={pinModalStyles.keyBtn}
                  onPress={() => handlePinKeyPress('0')}
                  activeOpacity={0.7}
                >
                  <Text style={pinModalStyles.keyText}>0</Text>
                </TouchableOpacity>
                {/* Backspace */}
                <TouchableOpacity
                  style={[pinModalStyles.keyBtn, { backgroundColor: 'transparent', borderColor: 'transparent' }]}
                  onPress={() => handlePinKeyPress('backspace')}
                  activeOpacity={0.7}
                >
                  <Icon name="backspace" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Buttons */}
            {/* Buttons */}
            <View style={pinModalStyles.btnRow}>
              <TouchableOpacity onPress={closePinModal} style={pinModalStyles.cancelBtn}>
                <Text style={pinModalStyles.btnText}>Cancel</Text>
              </TouchableOpacity>

              {pinValue.length === 6 && (
                <TouchableOpacity onPress={handlePinConfirm} style={pinModalStyles.confirmBtn}>
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
            >
              <Text style={pinModalStyles.forgotPinText}>Forgot PIN?</Text>
            </TouchableOpacity>

          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

 

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
          <Animated.View style={[styles.drawerOverlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>
      )}

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawerContainer,
          { width: drawerWidth, transform: [{ translateX: drawerOffset }] },
        ]}
      >
        <CustomDrawerContent navigation={navigation} onClose={() => setDrawerOpen(false)} />
      </Animated.View>

      {/* Main Content */}
      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Menu button */}
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.menuButton} activeOpacity={0.8}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Settings</Text>

        {/* ── Security & Privacy ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>
          <View style={styles.securityCards}>

            {/* Notifications */}
            {renderToggleCard({
              iconName: 'notifications',
              iconColor: '#42A5F5',
              title: 'Notifications',
              isEnabled: notifications,
              onToggle: () => setNotifications(prev => !prev),
            })}

           


            {/* Security Hide */}
            {renderToggleCard({
              iconName: 'security',   // represents security section
              iconColor: '#FF9800',
              title: 'Security',
              isEnabled: securityHideEnabled,
              onToggle: () => {
                setPinMode('security');
                openSecurityPinModal();
              },
            })}

            {/* Chat Hide */}
            {renderToggleCard({
              iconName: 'hub',   // represents chat feature
              iconColor: '#FF9800',
              title: 'Connect',
              isEnabled: chatHideEnabled,
              onToggle: () => {
                setPinMode('chat');
                openPinModal();
              },
            })}
          </View>
        </View>

        {/* ── Data & Storage Section ── */}
        <View style={styles.section}>
          {/* <Text style={styles.sectionTitle}>Data & Storage</Text> */}
          <View style={styles.securityCards}>

            {/* Backup and Restore */}
            {backupEnabled && (
              <TouchableOpacity
                style={styles.securityCard}
                onPress={() => navigation.navigate('Restore')}
                activeOpacity={0.85}
              >
                <Icon name="cloud-download" size={26} color="#4A90D9" />
                <View style={styles.securityText}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.securityTitle}>Backup & Restore</Text>
                    <Text style={inlineStyles.subtitle}>
                      Download your vault files to this device
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={22} color="#555" />
                </View>
              </TouchableOpacity>
            )}

            {/* Storage and Data */}
            {storageEnabled && (
              <TouchableOpacity
                style={styles.securityCard}
                onPress={() => navigation.navigate('StorageData')}
                activeOpacity={0.85}
              >
                <Icon name="storage" size={26} color="#FF9800" />
                <View style={styles.securityText}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.securityTitle}>Storage & Data</Text>
                    <Text style={inlineStyles.subtitle}>
                      Manage app storage and cached data
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={22} color="#555" />
                </View>
              </TouchableOpacity>
            )}

          </View>
        </View>


      </ScrollView>

      {/* PIN Modal */}
      {renderPinModal()}
    </View>
  );
};

// ── Inline styles ─────────────────────────────────────────────────────────────
const inlineStyles = {
  subtitle: {
    color: '#9BA3B2',
    fontSize: 12,
    marginTop: 2,
  },
  unavailableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  unavailableTitle: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
  unavailableSubtitle: {
    color: '#444',
    fontSize: 12,
    marginTop: 2,
  },
};

const pinModalStyles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1E2433',
    borderRadius: 20,
    padding: 24,
    width: '88%',
    maxWidth: 360,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    color: '#9BA3B2',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 14,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6C63FF',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#6C63FF',
  },
  errorText: {
    color: '#EF5350',
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(239,83,80,0.15)',
    padding: 8,
    borderRadius: 8,
  },
  keypad: {
    alignItems: 'center',
    marginTop: 8,
  },
  keyRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  keyBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2A3145',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A4460',
  },
  keyText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#9BA3B2',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#6C63FF',
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  forgotPinBtn: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  forgotPinText: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
};

export default SettingsScreen;
