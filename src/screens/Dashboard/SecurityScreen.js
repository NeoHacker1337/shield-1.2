import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  BackHandler,
  Dimensions,
  TouchableWithoutFeedback,
  Easing
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';

import CustomDrawerContent from '../../components/CustomDrawerContent';
import styles from '../../assets/SecurityScreenStyles';
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
  SECURITY_HIDE_SERVICE
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
const { width: screenWidth } = Dimensions.get('window');

const SecurityScreen = ({ navigation }) => {

  /* ---------------- DRAWER STATE ---------------- */

  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawerWidth = screenWidth * 0.75;
  const drawerOffset = useRef(new Animated.Value(-drawerWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  /* ---------------- STATE ---------------- */

  const [hasPasscode, setHasPasscode] = useState(false);
  const [hasChatHidePin, setHasChatHidePin] = useState(false);
  const [hasChatLockPin, setHasChatLockPin] = useState(false);
  const [hasSecurityHidePin, setHasSecurityHidePin] = useState(false);

  const [passcodeModalVisible, setPasscodeModalVisible] = useState(false);
  const [chatHideModalVisible, setChatHideModalVisible] = useState(false);
  const [chatLockModalVisible, setChatLockModalVisible] = useState(false);
  const [securityHideModalVisible, setSecurityHideModalVisible] = useState(false);

  const [mode, setMode] = useState('set');

  const [pinValue, setPinValue] = useState('');
  const [pinStep, setPinStep] = useState(1);
  const [firstPin, setFirstPin] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  const [pinError, setPinError] = useState('');
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotService, setForgotService] = useState(null);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  /* ---------------- LIFECYCLE ---------------- */

  useEffect(() => {

    checkPins();
    checkAndRequestCallPermission();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => backHandler.remove();

  }, []);

  /* ---------------- DRAWER ANIMATION ---------------- */

  useEffect(() => {

    Animated.parallel([
      Animated.timing(drawerOffset, {
        toValue: drawerOpen ? 0 : -drawerWidth,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease)
      }),
      Animated.timing(overlayOpacity, {
        toValue: drawerOpen ? 0.7 : 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();

  }, [drawerOpen]);

  /* ---------------- CHECK PIN EXISTENCE ---------------- */

  const checkPins = async () => {

    setHasPasscode(await AuthService.hasPasscode());
    setHasChatHidePin(await hasPin(CHAT_HIDE_SERVICE));
    setHasChatLockPin(await hasPin(CHAT_LOCK_SERVICE));
    setHasSecurityHidePin(await hasPin(SECURITY_HIDE_SERVICE));

  };

  /* ---------------- BACK HANDLER ---------------- */

  const handleBackPress = () => {

    if (drawerOpen) {
      setDrawerOpen(false);
      return true;
    }

    if (passcodeModalVisible) {
      setPasscodeModalVisible(false);
      return true;
    }

    if (chatHideModalVisible) {
      setChatHideModalVisible(false);
      return true;
    }

    if (chatLockModalVisible) {
      setChatLockModalVisible(false);
      return true;
    }

    if (securityHideModalVisible) {
      setSecurityHideModalVisible(false);
      return true;
    }

    return false;
  };

  /* ---------------- OPEN MODALS ---------------- */

  const openModal = (feature, modalMode) => {

    setMode(modalMode);
    setPinValue('');
    setFirstPin('');
    setPinStep(1);
    setPinError('');

    modalAnim.setValue(0);

    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true
    }).start();

    if (feature === 'passcode') setPasscodeModalVisible(true);
    if (feature === 'chatHide') setChatHideModalVisible(true);
    if (feature === 'chatLock') setChatLockModalVisible(true);
    if (feature === 'securityHide') setSecurityHideModalVisible(true);

  };

  /* ---------------- CLOSE ALL MODALS ---------------- */

  const closeAllModals = () => {
    setPasscodeModalVisible(false);
    setChatHideModalVisible(false);
    setChatLockModalVisible(false);
    setSecurityHideModalVisible(false);
    setPinValue('');
    setFirstPin('');
    setPinStep(1);
    setPinError('');
  };

  /* ---------------- PIN SUBMIT ---------------- */

  const handlePinSubmit = async () => {

    if (pinValue.length !== 6) return;

    let service = null;

    if (passcodeModalVisible) service = LOGIN_AUTH_SERVICE;
    if (chatHideModalVisible) service = CHAT_HIDE_SERVICE;
    if (chatLockModalVisible) service = CHAT_LOCK_SERVICE;
    if (securityHideModalVisible) service = SECURITY_HIDE_SERVICE;

    if (!service) return;

    /* ---- SET MODE ---- */
    if (mode === 'set') {

      if (pinStep === 1) {
        setFirstPin(pinValue);
        setPinValue('');
        setPinStep(2);
        return;
      }

      if (pinStep === 2) {

        if (pinValue !== firstPin) {
          setPinValue('');
          setFirstPin('');
          setPinStep(1);
          setPinError('PINs do not match. Please try again.');
          return;
        }

        if (service === LOGIN_AUTH_SERVICE) {
          await AuthService.setPasscode(pinValue);
        } else {
          await savePin(service, pinValue);
        }

        await checkPins();
        closeAllModals();
      }

      return;
    }

    /* ---- CHANGE MODE ---- */
    if (mode === 'change') {

      if (pinStep === 1) {
        setFirstPin(pinValue);
        setPinValue('');
        setPinStep(2);
        return;
      }

      if (pinStep === 2) {

        if (pinValue !== firstPin) {
          setPinValue('');
          setFirstPin('');
          setPinStep(1);
          setPinError('PINs do not match. Please try again.');
          return;
        }

        if (service === LOGIN_AUTH_SERVICE) {
          await AuthService.setPasscode(pinValue);
        } else {
          await savePin(service, pinValue);
        }

        await checkPins();
        closeAllModals();
      }

      return;
    }

    /* ---- REMOVE MODE ---- */
    if (mode === 'remove') {

      let isValid = false;

      if (service === LOGIN_AUTH_SERVICE) {
        isValid = await AuthService.verifyPasscode(pinValue);
      } else {
        const verifyResult = await verifyPin(service, pinValue);
        isValid = verifyResult.success;   // ← fix: extract boolean from object
      }

      if (!isValid) {
        setPinValue('');
        setPinError('Incorrect PIN. Please try again.');
        return;   // ← stay in modal, don't remove
      }

      setPinError('');

      if (service === LOGIN_AUTH_SERVICE) {
        await AuthService.removePasscode();
      } else {
        await removePin(service);
      }

      await checkPins();
      closeAllModals();

      return;
    }

  };

  /* ── ✅ PATCH: Forgot PIN handler (called by each PinModal) ── */
  const handleForgotPin = (svc) => {
    closeAllModals();                    // close the active PIN modal first
    setForgotService(svc);
    setForgotVisible(true);
  };

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.container}>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
          <Animated.View
            style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawerContainer,
          { width: drawerWidth, transform: [{ translateX: drawerOffset }] },
        ]}
      >
        <CustomDrawerContent
          navigation={navigation}
          onClose={() => setDrawerOpen(false)}
        />
      </Animated.View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.contentContainer}>

        {/* Menu Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setDrawerOpen(true)}
        >
          <Icon name="menu" size={26} color="#fff" />
        </TouchableOpacity>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >

          <Text style={styles.headerTitle}>
            Security Settings
          </Text>

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

          <ChatHideFeature
            hasChatHidePin={hasChatHidePin}
            openChatHideModal={(m) => openModal('chatHide', m)}
          />

          <ChatLockFeature
            hasChatLockPin={hasChatLockPin}
            openChatLockModal={(m) => openModal('chatLock', m)}
          />

          <SecurityHideFeature
            hasSecurityHidePin={hasSecurityHidePin}
            openSecurityHideModal={(m) => openModal('securityHide', m)}
          />

        </Animated.View>

      </ScrollView>

      <EmailOtpPasswordModal
        visible={emailModalVisible}
        onClose={() => setEmailModalVisible(false)}
      />

      {/* PASSCODE MODAL */}
      <PinModal
        visible={passcodeModalVisible}
        onClose={() => { setPasscodeModalVisible(false); setPinError(''); }}
        title={
          mode === 'remove'
            ? 'Enter Passcode to Remove'
            : pinStep === 1 ? 'Enter Passcode' : 'Confirm Passcode'
        }
        description="Enter your 6-digit passcode"
        modalAnim={modalAnim}
        currentValue={pinValue}
        onInput={setPinValue}
        onSubmit={handlePinSubmit}
        error={pinError}

        service={LOGIN_AUTH_SERVICE}
        onForgotPin={handleForgotPin}
        showForgotPin={mode === 'remove'}
      />

      {/* CHAT HIDE */}
      <PinModal
        visible={chatHideModalVisible}
        onClose={() => { setChatHideModalVisible(false); setPinError(''); }}
        title={
          mode === 'remove'
            ? 'Enter PIN to Remove Chat Hide'
            : pinStep === 1 ? 'Enter Chat Hide PIN' : 'Confirm Chat Hide PIN'
        }
        description="Enter your 6-digit PIN"
        modalAnim={modalAnim}
        currentValue={pinValue}
        onInput={setPinValue}
        onSubmit={handlePinSubmit}
        error={pinError}

        service={CHAT_HIDE_SERVICE}
        onForgotPin={handleForgotPin}
        showForgotPin={mode === 'remove'}
      />

      {/* CHAT LOCK */}
      <PinModal
        visible={chatLockModalVisible}
        onClose={() => { setChatLockModalVisible(false); setPinError(''); }}
        title={
          mode === 'remove'
            ? 'Enter PIN to Remove Chat Lock'
            : pinStep === 1 ? 'Enter Chat Lock PIN' : 'Confirm Chat Lock PIN'
        }
        description="Enter your 6-digit PIN"
        modalAnim={modalAnim}
        currentValue={pinValue}
        onInput={setPinValue}
        onSubmit={handlePinSubmit}
        error={pinError}

        service={CHAT_LOCK_SERVICE}
        onForgotPin={handleForgotPin}
        showForgotPin={mode === 'remove'}
      />

      {/* SECURITY HIDE */}
      <PinModal
        visible={securityHideModalVisible}
        onClose={() => { setSecurityHideModalVisible(false); setPinError(''); }}
        title={
          mode === 'remove'
            ? 'Enter PIN to Remove Security Hide'
            : pinStep === 1 ? 'Enter Security Hide PIN' : 'Confirm Security Hide PIN'
        }
        description="Enter your 6-digit PIN"
        modalAnim={modalAnim}
        currentValue={pinValue}
        onInput={setPinValue}
        onSubmit={handlePinSubmit}
        error={pinError}

        service={SECURITY_HIDE_SERVICE}
        onForgotPin={handleForgotPin}
        showForgotPin={mode === 'remove'}
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