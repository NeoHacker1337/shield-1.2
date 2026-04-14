/**
 * SecurityScreen.js
 *
 * Displays security feature cards (login password, chat hide/lock, security hide).
 * Each feature card opens a PIN modal to set / change / remove its PIN.
 *
 * Safe-area integration via react-native-safe-area-context.
 * Style helpers imported from SecurityScreenStyles.js (updated version).
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  BackHandler,
  TouchableWithoutFeedback,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CustomDrawerContent from '../../components/CustomDrawerContent';
import { Colors } from '../../assets/theme';
import styles, {
  DRAWER_WIDTH,
  getContentTopPadding,
  getContentBottomPadding,
  getMenuButtonTopOffset,
  getDrawerInsets,
} from '../../assets/SecurityScreenStyles';

import ForgotPinModal from '../securityFeatures/ForgotPinModal';
import AuthService from '../../services/AuthService';
import { checkAndRequestCallPermission } from '../../utils/permissions';

/* PIN SERVICE */
import {
  savePin,
  verifyPin,
  removePin,
  hasPin,
  LOGIN_AUTH_SERVICE,
  CHAT_HIDE_SERVICE,
  CHAT_LOCK_SERVICE,
  SECURITY_HIDE_SERVICE,
} from '../../services/pinService';

/* FEATURES */
import LoginPasswordFeature from '../securityFeatures/LoginPasswordFeature';
import PasscodeFeature from '../securityFeatures/PasscodeFeature';
import ChatHideFeature from '../securityFeatures/ChatHideFeature';
import ChatLockFeature from '../securityFeatures/ChatLockFeature';
import SecurityHideFeature from '../securityFeatures/SecurityHideFeature';

/* MODALS */
import PinModal from '../securityFeatures/PinModal';
import PasswordModal from '../securityFeatures/PasswordModal';
import EmailOtpPasswordModal from '../securityFeatures/EmailOtpPasswordModal';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a feature key to its Keychain service identifier.
 * Single source of truth — used in openModal, handlePinSubmit, handleBackPress.
 */
const FEATURE_SERVICE_MAP = {
  passcode: LOGIN_AUTH_SERVICE,
  chatHide: CHAT_HIDE_SERVICE,
  chatLock: CHAT_LOCK_SERVICE,
  securityHide: SECURITY_HIDE_SERVICE,
};

/** All modal visibility keys — used to drive handleBackPress generically. */
const MODAL_KEYS = ['passcode', 'chatHide', 'chatLock', 'securityHide'];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SecurityScreen = ({ navigation }) => {

  // ── Safe area ──────────────────────────────────────────────────────────────
  const insets = useSafeAreaInsets();

  // ── Mount guard (prevents setState after unmount in async handlers) ────────
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // ── Drawer state ───────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);

  /**
   * Ref mirror of drawerOpen — used in BackHandler to avoid stale closure.
   * BackHandler is registered once; without a ref it always sees the initial value.
   */
  const drawerOpenRef = useRef(false);
  useEffect(() => { drawerOpenRef.current = drawerOpen; }, [drawerOpen]);

  const drawerOffset = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // ── PIN existence state ────────────────────────────────────────────────────
  const [hasPasscode, setHasPasscode] = useState(false);
  const [hasChatHidePin, setHasChatHidePin] = useState(false);
  const [hasChatLockPin, setHasChatLockPin] = useState(false);
  const [hasSecurityHidePin, setHasSecurityHidePin] = useState(false);

  // ── Modal visibility state ─────────────────────────────────────────────────
  /**
   * Using an object instead of 4 separate booleans:
   *   - Easier to reset all at once
   *   - Drives handleBackPress generically (no stale-closure-prone if-chains)
   *   - Scales if more modals are added
   */
  const [modalVisible, setModalVisible] = useState({
    passcode: false,
    chatHide: false,
    chatLock: false,
    securityHide: false,
  });

  /**
   * Ref mirror of modalVisible — same stale-closure fix as drawerOpenRef.
   */
  const modalVisibleRef = useRef(modalVisible);
  useEffect(() => { modalVisibleRef.current = modalVisible; }, [modalVisible]);

  // ── PIN modal shared state ─────────────────────────────────────────────────
  const [mode, setMode] = useState('set');   // 'set' | 'change' | 'remove'
  const [pinValue, setPinValue] = useState('');
  const [pinStep, setPinStep] = useState(1);
  const [firstPin, setFirstPin] = useState('');
  const [pinError, setPinError] = useState('');

  // ── Forgot PIN state ───────────────────────────────────────────────────────
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotService, setForgotService] = useState(null);

  // ── Email OTP modal ────────────────────────────────────────────────────────
  const [emailModalVisible, setEmailModalVisible] = useState(false);

  // ── Entry animations ───────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Mount: permissions + PIN check + entry animation + back handler
  useEffect(() => {
    checkAndRequestCallPermission();
    checkPins();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

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
        toValue: drawerOpen ? 0 : -DRAWER_WIDTH,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
      Animated.timing(overlayOpacity, {
        toValue: drawerOpen ? 0.7 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerOpen]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Check PIN existence ───────────────────────────────────────────────────
  const checkPins = async () => {
    try {
      const [passcode, chatHide, chatLock, secHide] = await Promise.all([
        AuthService.hasPasscode(),
        hasPin(CHAT_HIDE_SERVICE),
        hasPin(CHAT_LOCK_SERVICE),
        hasPin(SECURITY_HIDE_SERVICE),
      ]);
      if (!isMountedRef.current) return;
      setHasPasscode(passcode);
      setHasChatHidePin(chatHide);
      setHasChatLockPin(chatLock);
      setHasSecurityHidePin(secHide);
    } catch (e) {
      console.warn('[SecurityScreen] checkPins error:', e);
    }
  };

  // ── Back handler (uses refs — no stale closure) ───────────────────────────
  /**
   * useCallback with empty deps: stable reference for BackHandler.
   * Reads current values via refs, never from closed-over state.
   */
  const handleBackPress = useCallback(() => {
    // Close drawer first if open
    if (drawerOpenRef.current) {
      setDrawerOpen(false);
      return true;
    }

    // Close whichever modal is currently open (data-driven, not if-chain)
    const openKey = MODAL_KEYS.find(k => modalVisibleRef.current[k]);
    if (openKey) {
      setModalVisible(prev => ({ ...prev, [openKey]: false }));
      setPinError('');
      return true;
    }

    return false;
  }, []);

  // ── Open a modal for a given feature + mode ───────────────────────────────
  /**
   * Replaced 4 sequential `if` statements with an object map lookup.
   *
   * @param {'passcode'|'chatHide'|'chatLock'|'securityHide'} feature
   * @param {'set'|'change'|'remove'} modalMode
   */
  const openModal = (feature, modalMode) => {
    setMode(modalMode);
    setPinValue('');
    setFirstPin('');
    setPinStep(1);
    setPinError('');

    // Stop any in-progress animation before resetting
    modalAnim.stopAnimation(() => {
      modalAnim.setValue(0);
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    setModalVisible(prev => ({ ...prev, [feature]: true }));
  };

  // ── Close all modals + reset shared PIN state ─────────────────────────────
  const closeAllModals = () => {
    setModalVisible({
      passcode: false,
      chatHide: false,
      chatLock: false,
      securityHide: false,
    });
    setPinValue('');
    setFirstPin('');
    setPinStep(1);
    setPinError('');
  };

  // ── PIN submit ────────────────────────────────────────────────────────────
  /**
   * Handles set / change / remove modes.
   *
   * Bug fix: `mode === 'set'` and `mode === 'change'` had 100% identical logic.
   * Merged into a single `['set', 'change'].includes(mode)` branch.
   */
  const handlePinSubmit = async () => {
    if (pinValue.length !== 6) return;

    // Derive active service from whichever modal is visible
    const activeKey = MODAL_KEYS.find(k => modalVisible[k]);
    const service = activeKey ? FEATURE_SERVICE_MAP[activeKey] : null;
    if (!service) return;

    try {
      // ── SET or CHANGE ────────────────────────────────────────────────────
      if (mode === 'set' || mode === 'change') {

        // Step 1: capture first entry
        if (pinStep === 1) {
          setFirstPin(pinValue);
          setPinValue('');
          setPinStep(2);
          return;
        }

        // Step 2: confirm entry
        if (pinValue !== firstPin) {
          setPinValue('');
          setFirstPin('');
          setPinStep(1);
          setPinError('PINs do not match. Please try again.');
          return;
        }

        // Confirmed — save
        if (service === LOGIN_AUTH_SERVICE) {
          await AuthService.setPasscode(pinValue);
        } else {
          await savePin(service, pinValue);
        }

        if (!isMountedRef.current) return;
        await checkPins();
        closeAllModals();
        return;
      }

      // ── REMOVE ──────────────────────────────────────────────────────────
      if (mode === 'remove') {
        let isValid = false;

        if (service === LOGIN_AUTH_SERVICE) {
          isValid = await AuthService.verifyPasscode(pinValue);
        } else {
          const verifyResult = await verifyPin(service, pinValue);
          isValid = verifyResult.success;   // extract boolean from object
        }

        if (!isValid) {
          if (!isMountedRef.current) return;
          setPinValue('');
          setPinError('Incorrect PIN. Please try again.');
          return;   // stay in modal, don't remove
        }

        setPinError('');

        if (service === LOGIN_AUTH_SERVICE) {
          await AuthService.removePasscode();
        } else {
          await removePin(service);
        }

        if (!isMountedRef.current) return;
        await checkPins();
        closeAllModals();
      }

    } catch (e) {
      console.warn('[SecurityScreen] handlePinSubmit error:', e);
      if (isMountedRef.current) {
        setPinError('An error occurred. Please try again.');
      }
    }
  };

  // ── Forgot PIN ────────────────────────────────────────────────────────────
  const handleForgotPin = (svc) => {
    closeAllModals();          // close the active PIN modal first
    setForgotService(svc);
    setForgotVisible(true);
  };

  // ── Modal close helper ────────────────────────────────────────────────────
  /**
   * Closes a single modal by key and resets PIN error.
   * Used inline in PinModal onClose props.
   */
  const closeSingleModal = (key) => {
    setModalVisible(prev => ({ ...prev, [key]: false }));
    setPinError('');
  };

  // ── PIN modal title helper ────────────────────────────────────────────────
  /**
   * Derives the modal title from mode + step + feature label.
   *
   * @param {string} featureLabel  e.g. 'Passcode', 'Chat Hide PIN'
   * @returns {string}
   */
  const getPinModalTitle = (featureLabel) => {
    if (mode === 'remove') return `Enter ${featureLabel} to Remove`;
    return pinStep === 1
      ? `Enter ${featureLabel}`
      : `Confirm ${featureLabel}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  /** Shared props passed to every PinModal instance */
  const sharedPinModalProps = {
    description: 'Enter your 6-digit PIN',
    modalAnim,
    currentValue: pinValue,
    onInput: setPinValue,
    onSubmit: handlePinSubmit,
    error: pinError,
    onForgotPin: handleForgotPin,
    showForgotPin: mode === 'remove',
  };

  return (
    <View style={styles.container}>

      {/* ── Drawer Overlay ───────────────────────────────────────────────────
          Always rendered — pointerEvents off when drawer is closed.
          Keeps Animated.Value mounted so opacity animation always has a target.
      ─────────────────────────────────────────────────────────────────────── */}
      <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
        <Animated.View
          style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
          pointerEvents={drawerOpen ? 'auto' : 'none'}
        />
      </TouchableWithoutFeedback>

      {/* ── Drawer Panel ─────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.drawerContainer,
          { transform: [{ translateX: drawerOffset }] },
        ]}
        accessibilityViewIsModal={drawerOpen}
      >
        {/*
          Apply getDrawerInsets() to the inner content view so the background
          fills edge-to-edge while content stays within safe areas.
        */}
        <View style={[styles.drawerInnerContent, getDrawerInsets(insets)]}>
          <CustomDrawerContent
            navigation={navigation}
            onClose={() => setDrawerOpen(false)}
          />
        </View>
      </Animated.View>

      {/* ── Main Scroll Content ───────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            // Dynamic safe-area padding — replaces hardcoded paddingTop/Bottom
            paddingTop: getContentTopPadding(insets.top),
            paddingBottom: getContentBottomPadding(insets.bottom),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Floating Menu Button ─────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.menuButton,
            // Dynamic top offset — replaces hardcoded top: 16
            { top: getMenuButtonTopOffset(insets.top) },
          ]}
          onPress={() => setDrawerOpen(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <Icon name="menu" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>

        {/* ── Animated content wrapper ──────────────────────────────────── */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={styles.headerTitle}>Security Settings</Text>

          {/* LOGIN PASSWORD */}
          <LoginPasswordFeature
            hasLoginPassword={hasPasscode}
            openPasswordModal={() => setEmailModalVisible(true)}
          />

          {/* PASSCODE LOGIN */}
          {/*           
          <PasscodeFeature
            hasPasscode={hasPasscode}
            openPasscodeModal={(m) => openModal('passcode', m)}
          /> */}

          {/* CHAT HIDE */}
          <ChatHideFeature
            hasChatHidePin={hasChatHidePin}
            openChatHideModal={(m) => openModal('chatHide', m)}
          />

          {/* CHAT LOCK */}
          <ChatLockFeature
            hasChatLockPin={hasChatLockPin}
            openChatLockModal={(m) => openModal('chatLock', m)}
          />

          {/* SECURITY HIDE */}
          <SecurityHideFeature
            hasSecurityHidePin={hasSecurityHidePin}
            openSecurityHideModal={(m) => openModal('securityHide', m)}
          />

        </Animated.View>
      </ScrollView>

      {/* ── Email OTP Modal ───────────────────────────────────────────────── */}
      <EmailOtpPasswordModal
        visible={emailModalVisible}
        onClose={() => setEmailModalVisible(false)}
      />

      {/* ── PIN Modals ────────────────────────────────────────────────────── */}

      {/* PASSCODE MODAL */}
      <PinModal
        {...sharedPinModalProps}
        visible={modalVisible.passcode}
        onClose={() => closeSingleModal('passcode')}
        title={getPinModalTitle('Passcode')}
        description="Enter your 6-digit passcode"
        service={LOGIN_AUTH_SERVICE}
      />

      {/* CHAT HIDE */}
      <PinModal
        {...sharedPinModalProps}
        visible={modalVisible.chatHide}
        onClose={() => closeSingleModal('chatHide')}
        title={getPinModalTitle('Chat Hide PIN')}
        service={CHAT_HIDE_SERVICE}
      />

      {/* CHAT LOCK */}
      <PinModal
        {...sharedPinModalProps}
        visible={modalVisible.chatLock}
        onClose={() => closeSingleModal('chatLock')}
        title={getPinModalTitle('Chat Lock PIN')}
        service={CHAT_LOCK_SERVICE}
      />

      {/* SECURITY HIDE */}
      <PinModal
        {...sharedPinModalProps}
        visible={modalVisible.securityHide}
        onClose={() => closeSingleModal('securityHide')}
        title={getPinModalTitle('Security Hide PIN')}
        service={SECURITY_HIDE_SERVICE}
      />

      {/* ✅ PATCH: ForgotPinModal — top-level, never nested inside another Modal */}
      <ForgotPinModal
        visible={forgotVisible}
        service={forgotService}
        onClose={() => setForgotVisible(false)}
        onSuccess={() => {
          setForgotVisible(false);
          checkPins();              // refresh PIN existence state after reset
        }}
      />

    </View>
  );
};

export default SecurityScreen;