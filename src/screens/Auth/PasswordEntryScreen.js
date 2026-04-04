import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ScrollView, KeyboardAvoidingView, Platform, Animated, Dimensions,
  BackHandler, StatusBar, Image, Keyboard
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { getUniqueId } from 'react-native-device-info';
import * as Keychain from 'react-native-keychain';

import AuthService from '../../services/AuthService';
import { handleApiError } from '../../utils/errorHandler';
import styles from '../../assets/PasswordEntryStyles';
import deviceService from '../../services/deviceService';
import { checkActivationStatus } from '../../services/activationService';

import ForgotPinModal from '../securityFeatures/ForgotPinModal';
import { LOGIN_AUTH_SERVICE } from '../../services/pinService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PASSCODE_AUTH_SERVICE = 'shield-passcode';

const PasswordEntryScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [isCheckingPasscode, setIsCheckingPasscode] = useState(true);

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [forgotPinVisible, setForgotPinVisible] = useState(false);

  useEffect(() => {
    checkPasscodeStatus();
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const logDevice = async () => {
      if (deviceService.logDeviceInfo) {
        await deviceService.logDeviceInfo();
      }
    };
    logDevice();
  }, []);

  const checkPasscodeStatus = async () => {
    try {
      setIsCheckingPasscode(true);
      const passcodeCredentials = await Keychain.getGenericPassword({
        service: PASSCODE_AUTH_SERVICE,
      });
      setHasPasscode(!!passcodeCredentials);
    } catch {
      setHasPasscode(false);
    } finally {
      setIsCheckingPasscode(false);
    }
  };

  const shakeAnimation = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const verifyPasscode = async (enteredPasscode) => {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: PASSCODE_AUTH_SERVICE,
      });
      return credentials && credentials.password === enteredPasscode;
    } catch {
      return false;
    }
  };

  /**
   * SAFE NAVIGATION AFTER STORAGE WRITES (Android 15 fix)
   */
  const safeNavigateAfterLogin = async () => {
    const isActivated = await checkActivationStatus();

    setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: isActivated ? 'MainTabs' : 'Activation' }],
      });
    }, 80);
  };

  const handleLogin = useCallback(async () => {
    setIsLoading(true);
    setError('');
    Keyboard.dismiss();

    try {
      if (hasPasscode) {
        // PASSCODE LOGIN
        if (!password.trim()) {
          setError('Passcode is required.');
          shakeAnimation();
          return;
        }

        const isValidPasscode = await verifyPasscode(password);
        if (!isValidPasscode) {
          const newAttempts = wrongAttempts + 1;

          setWrongAttempts(newAttempts);
          setError('Invalid passcode. Please try again.');
          setPassword('');
          shakeAnimation();

          // ✅ Show Forgot PIN after 3 attempts
          if (newAttempts >= 3) {
            setShowForgotPin(true);
          }

          return;
        }

        // ✅ SUCCESS
        setWrongAttempts(0);
        setShowForgotPin(false);

        let deviceId = 'unknown_device';
        try {
          const id = await getUniqueId();
          if (id) deviceId = id;
        } catch { }

        const { user, token } = await AuthService.loginWithPasscode(password, deviceId);

        if (!user || !token) {
          throw new Error('Session refresh failed');
        }

        try {
          await deviceService.sendDeviceDetails(user.id);
        } catch { }

        await safeNavigateAfterLogin();   // ✅ patched
      } else {
        // NORMAL LOGIN
        if (!email.trim() || !password.trim()) {
          setError('Both email and password are required.');
          shakeAnimation();
          return;
        }

        let deviceId = 'unknown_device';
        try {
          const id = await getUniqueId();
          if (id) deviceId = id;
        } catch { }

        const { user, token } = await AuthService.login(email, password, deviceId);

        if (!user || !token) {
          throw new Error('Login failed. Invalid response from server.');
        }

        await safeNavigateAfterLogin();   // ✅ patched
      }
    } catch (apiError) {
      setPassword('');
      const errorMessage = hasPasscode
        ? apiError?.message || 'Authentication failed. Please try again.'
        : handleApiError(apiError);
      setError(errorMessage);
      shakeAnimation();
    } finally {
      setIsLoading(false);
    }
  }, [email, password, navigation, shakeAnimation, hasPasscode]);

  const handleForgotPassword = () => {
    navigation.navigate('PasswordRecovery');
  };

  const handleRegistration = () => {
    navigation.navigate('SetPassword');
  };

  if (isCheckingPasscode) {
    return (
      <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']} style={styles.wrapper}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>INITIALIZING SECURITY PROTOCOL...</Text>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']} style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" translucent />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.innerContainer, { transform: [{ translateX: shakeAnim }] }]}>

            <View style={styles.logoWrapper}>
              <View style={styles.logoContainer}>
                <LinearGradient colors={['#00ff88', '#00ccff']} style={styles.logoGradient}>
                  <Image
                    source={require('../../assets/shield-logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </View>
            </View>

            <View style={styles.cyberCard}>
              <View style={styles.cardBorder} />
              <View style={styles.cardGradient}>

                <Text style={styles.cyberTitle}>
                  SHIELD <Text style={styles.titleGradient}>ACCESS</Text>
                </Text>

                <View style={styles.statusBar}>
                  <View style={styles.statusIndicator} />
                  <Text style={styles.statusText}>
                    {hasPasscode ? 'PASSCODE AUTHENTICATION MODE' : 'SECURE CONNECTION ESTABLISHED'}
                  </Text>
                </View>

                <Text style={styles.cyberSubtitle}>
                  {hasPasscode
                    ? 'Enter your 6-digit passcode to proceed'
                    : 'Enter authentication credentials to proceed'}
                </Text>

                {!hasPasscode && (
                  <TouchableOpacity onPress={() => emailInputRef.current?.focus()} activeOpacity={1}>
                    <View style={styles.inputWrapper}>
                      <View style={[styles.inputBorder, error && styles.inputError]} />
                      <TextInput
                        ref={emailInputRef}
                        style={[styles.cyberInput, error && { color: '#ff4757' }]}
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          if (error) setError('');
                        }}
                        placeholder="ENTER EMAIL"
                        placeholderTextColor="rgba(0, 255, 136, 0.4)"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isLoading}
                        returnKeyType="next"
                        onSubmitEditing={() => passwordInputRef.current?.focus()}
                      />
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => passwordInputRef.current?.focus()} activeOpacity={1}>
                  <View style={styles.inputWrapper}>
                    <View style={[styles.inputBorder, error && styles.inputError]} />
                    <TextInput
                      ref={passwordInputRef}
                      style={[styles.cyberInput, error && { color: '#ff4757' }]}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (error) setError('');
                      }}
                      placeholder={hasPasscode ? 'ENTER PASSCODE' : 'ENTER PASSWORD'}
                      placeholderTextColor="rgba(0, 255, 136, 0.4)"
                      secureTextEntry
                      editable={!isLoading}
                      onSubmitEditing={handleLogin}
                      keyboardType={hasPasscode ? 'numeric' : 'default'}
                      maxLength={hasPasscode ? 6 : undefined}
                    />
                  </View>
                </TouchableOpacity>

                {error ? (
                  <View style={styles.errorPanel}>
                    <Icon name="error-outline" size={16} color="#ff4757" />
                    <Text style={styles.errorText}>
                      ACCESS DENIED: {error.toUpperCase()}
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.cyberButton, isLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#00ff88', '#00ccff']} style={styles.buttonGradient}>
                    <Icon
                      name={isLoading ? 'hourglass-empty' : 'lock-open'}
                      size={20}
                      color="#000000"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.cyberButtonText}>
                      {isLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {hasPasscode && showForgotPin && (
                  <TouchableOpacity
                    onPress={() => setForgotPinVisible(true)}
                    style={{ marginTop: 14, alignItems: 'center' }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: '#00ccff', fontWeight: '600' }}>
                      Forgot PIN?
                    </Text>
                  </TouchableOpacity>
                )}

                {!hasPasscode && (
                  <TouchableOpacity
                    onPress={handleRegistration}
                    style={styles.registrationButton}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['rgba(139, 92, 246, 0.2)', 'rgba(255, 0, 128, 0.2)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.registrationButtonGradient}
                    >
                      <Icon name="person-add" size={20} color="#8b5cf6" />
                      <Text style={styles.registrationButtonText}>CREATE NEW ACCOUNT</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {!hasPasscode && (
                  <TouchableOpacity
                    style={styles.recoveryButton}
                    onPress={handleForgotPassword}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.recoveryText}>RECOVERY PROTOCOL</Text>
                  </TouchableOpacity>
                )}

              </View>
            </View>

            <View style={styles.cyberFooter}>
              <View style={styles.footerGrid} />
              <Text style={styles.footerTitle}>SHIELD</Text>
              <Text style={styles.footerSubtext}>
                {hasPasscode
                  ? 'PASSCODE PROTECTED | BIOMETRIC READY'
                  : 'QUANTUM ENCRYPTED | ZERO TRUST ARCHITECTURE'}
              </Text>
              <View style={styles.footerIndicators}>
                <View style={styles.indicator} />
                <View style={styles.indicator} />
                <View style={styles.indicator} />
              </View>



            </View>

            <View style={styles.extraSpacing} />
          </Animated.View>
        </ScrollView>

        {/* ✅ STEP 5: Forgot PIN Modal */}
        <ForgotPinModal
          visible={forgotPinVisible}
          service={LOGIN_AUTH_SERVICE}
          onClose={() => setForgotPinVisible(false)}
          onSuccess={() => {
            setForgotPinVisible(false);
            setWrongAttempts(0);
            setShowForgotPin(false);
          }}
        />

      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default PasswordEntryScreen;
