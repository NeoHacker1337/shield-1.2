import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  Image
} from 'react-native';

import * as Keychain from 'react-native-keychain';
import SInfo from 'react-native-sensitive-info';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BASE_URL, DEFAULT_HEADERS, API_TIMEOUT } from '../../utils/config';
import { getUniqueId, getDeviceName, getModel, getBrand } from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Define fetchWithTimeout to handle timeouts and network errors
const fetchWithTimeout = async (resource, options = {}, timeout = API_TIMEOUT) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
};

const SetPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  const referralInputRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const REGISTER_URL = `${BASE_URL}/v1/register`;


  const getDeviceNameDynamic = async () => {
    try {
      // Try to get user-set device name first
      const deviceName = await getDeviceName();
      if (deviceName && deviceName !== 'unknown') {
        return deviceName;
      }

      // Fallback: Use brand + model
      const brand = await getBrand();
      const model = await getModel();
      return `${brand} ${model}`;
    } catch (error) {
      console.error('Error getting device name:', error);
      return 'Shield Device'; // Ultimate fallback
    }
  };


  const submitRegistration = async (deviceId, deviceName) => {
    const payload = {
      email,
      password,
      password_confirmation: confirmPassword,
      device_id: deviceId,
      device_name: deviceName,
      app_version: '1.0',
      referral_code: referralCode || null,
    };

    try {
      const res = await fetchWithTimeout(REGISTER_URL, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(payload),
      }, API_TIMEOUT);

      let responseData;
      try {
        responseData = await res.json();
      } catch (parseError) {
        const errorText = await res.text();
        return {
          success: false,
          error: `Registration failed: ${res.status} - ${errorText}`,
          isNetworkError: true
        };
      }

      if (!res.ok || (responseData.success !== undefined && responseData.success === false)) {
        let errorMessages = [];
        if (responseData.message) {
          errorMessages.push(responseData.message);
        }

        if (responseData.errors) {
          Object.keys(responseData.errors).forEach(field => {
            if (Array.isArray(responseData.errors[field])) {
              errorMessages = errorMessages.concat(responseData.errors[field]);
            } else {
              errorMessages.push(responseData.errors[field]);
            }
          });
        }

        if (errorMessages.length === 0) {
          errorMessages.push(`Registration failed with status: ${res.status}`);
        }

        const fullErrorMessage = errorMessages.join('\n');
        const isEmailTakenError = fullErrorMessage.toLowerCase().includes('email has already been taken') ||
          (fullErrorMessage.toLowerCase().includes('email') &&
            fullErrorMessage.toLowerCase().includes('already'));

        return {
          success: false,
          error: fullErrorMessage,
          isEmailTakenError,
          isNetworkError: false
        };
      }

      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      console.error('Network/Setup error:', error.message);
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
          success: false,
          error: 'Request timed out. Please check your connection and try again.',
          isNetworkError: true
        };
      } else if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        return {
          success: false,
          error: 'Unable to connect to server. Please check your internet connection.',
          isNetworkError: true
        };
      }

      return {
        success: false,
        error: error.message || 'Registration failed. Please try again.',
        isNetworkError: true
      };
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    setEmailValid(validateEmail(text));
    if (registrationError) {
      setRegistrationError('');
    }
  };

  const calculatePasswordStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 6) strength += 25;
    if (pwd.length >= 8) strength += 25;
    if (/[A-Z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd)) strength += 25;
    return strength;
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    const strength = calculatePasswordStrength(text);
    setPasswordStrength(strength);
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
  };

  // ✅ ADD THIS FUNCTION
  const handleReferralCodeChange = (text) => {
    const upperCaseCode = text.toUpperCase(); // Auto-convert to uppercase
    setReferralCode(upperCaseCode);

    // Reset validation state when user types
    if (upperCaseCode.length === 0) {
      setReferralValid(null);
    } else if (upperCaseCode.length === 8) {
      // Optional: You can validate the referral code here
      validateReferralCode(upperCaseCode);
    }
  };


  // ✅ ADD THIS VALIDATION FUNCTION (OPTIONAL)
  const validateReferralCode = async (code) => {
    if (!code || code.length === 0) {
      setReferralValid(null);
      return;
    }

    try {
      const response = await fetchWithTimeout(`${BASE_URL}/v1/validate-referral`, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ referral_code: code }),
      }, API_TIMEOUT);

      const data = await response.json();

      if (data.success && data.data.valid) {
        setReferralValid(true);
      } else {
        setReferralValid(false);
      }
    } catch (error) {
      console.warn('Referral validation failed:', error);
      setReferralValid(null); // Don't block registration if validation fails
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength < 25) return '#ff4757';
    if (passwordStrength < 50) return '#ffa502';
    if (passwordStrength < 75) return '#ffdd59';
    return '#00ff88';
  };

  const getStrengthText = () => {
    if (passwordStrength < 25) return 'WEAK';
    if (passwordStrength < 50) return 'FAIR';
    if (passwordStrength < 75) return 'GOOD';
    return 'STRONG';
  };

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const storePassword = async (pwd) => {
    try {
      await Keychain.setGenericPassword(
        'shield-user',
        pwd,
        {
          service: 'shield-auth',
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
        }
      );

      try {
        await SInfo.setItem(
          'shield-password',
          pwd,
          {
            sharedPreferencesName: 'shieldSharedPrefs',
            keychainService: 'shieldKeychain'
          }
        );
      } catch (sInfoError) {
        console.warn('SInfo storage failed (non-critical):', sInfoError);
      }

      return true;
    } catch (error) {
      console.error('Password storage failed:', error);
      Alert.alert('Error', 'Failed to store password securely');
      return false;
    }
  };

  const handlePasswordSetup = async () => {
    if (!emailValid) {
      setRegistrationError('Please enter a valid email address');
      shakeAnimation();
      return;
    }

    if (password.length < 6) {
      setRegistrationError('Password must be at least 6 characters');
      shakeAnimation();
      return;
    }

    if (password !== confirmPassword) {
      setRegistrationError('Password confirmation does not match');
      shakeAnimation();
      return;
    }

    const deviceId = await getUniqueId();
    const deviceName = await getDeviceNameDynamic();

    setIsLoading(true);
    setRegistrationError('');

    try {
      const registrationResult = await submitRegistration(deviceId, deviceName);

      // ✅ DEBUG: See what the API actually returns
      console.log('🔍 Full Registration Response:', JSON.stringify(registrationResult, null, 2));

      if (!registrationResult.success) {
        setRegistrationError(registrationResult.error);
        shakeAnimation();
        setIsLoading(false);
        return;
      }

      const responseData = registrationResult.data;


      // ✅ FLEXIBLE: Handle multiple possible structures
      const apiData = responseData.data || responseData;

      // ✅ Extract user and token (try multiple locations)
      let user = apiData.user || apiData;
      let token = apiData.token || responseData.token;


      // ✅ VALIDATE: Make sure we have what we need
      if (!token) {
        throw new Error('No token received from server. Please contact support.');
      }

      if (!user || !user.id) {
        throw new Error('No user data received from server. Please try again.');
      }

      // ✅ STORE: Auth token
      await AsyncStorage.setItem('auth_token', token);


      // ✅ STORE: User data
      await AsyncStorage.setItem('user_data', JSON.stringify(user));


      // ✅ STORE: Email
      await SInfo.setItem(
        'shield-email',
        email,
        {
          sharedPreferencesName: 'shieldSharedPrefs',
          keychainService: 'shieldKeychain'
        }
      );
      console.log('✅ Stored shield-email');

      // ✅ STORE: Password
      const stored = await storePassword(password);
      if (stored) {
        const creds = await Keychain.getGenericPassword({
          service: 'shield-auth'
        });
        if (creds && creds.password === password) {
          console.log('✅ All data stored successfully! Navigating...');
          navigation.navigate('SecurityQuestions');
        } else {
          Alert.alert('Error', 'Storage verification failed');
        }
      }
    } catch (error) {
      console.error('❌ Setup error:', error);
      setRegistrationError(error.message || 'An unexpected error occurred. Please try again.');
      shakeAnimation();
    } finally {
      setIsLoading(false);
    }
  };


  const handleLoginNavigation = () => {
    navigation.navigate('PasswordEntry');
  };

  const isFormValid = emailValid && password.length >= 6 && password === confirmPassword;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#16213e']}
        style={styles.wrapper}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />



        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={styles.logoWrapper}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#00ff88', '#00ccff']}
                style={styles.logoGradient}
              >
                <Image
                  source={require('../../assets/shield-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </LinearGradient>
            </View>
          </View>
          {/* Main Card */}
          <Animated.View style={[styles.loginCard, { transform: [{ translateX: shakeAnim }] }]}>



            {/* Title */}
            <Text style={styles.title}>CREATE ACCOUNT</Text>

            {/* Status Bar */}
            <LinearGradient
              colors={['rgba(0, 255, 136, 0.1)', 'rgba(0, 204, 255, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBar}
            >
              <Text style={styles.statusText}>SECURE REGISTRATION PROTOCOL</Text>
            </LinearGradient>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              Enter your details to create a secure Shield account
            </Text>

            {/* Email Input */}
            <TouchableOpacity onPress={() => emailInputRef.current?.focus()} activeOpacity={1}>
              <View style={styles.inputContainer}>
                <Icon name="email" size={20} color="#00ff88" style={styles.inputIcon} />
                <TextInput
                  ref={emailInputRef}
                  style={styles.input}
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholder="ENTER EMAIL"
                  placeholderTextColor="rgba(0, 255, 136, 0.4)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
                {email.length > 0 && (
                  <Icon
                    name={emailValid ? 'check-circle' : 'error'}
                    size={20}
                    color={emailValid ? '#00ff88' : '#ff4757'}
                    style={styles.statusIcon}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* Password Input */}
            <TouchableOpacity onPress={() => passwordInputRef.current?.focus()} activeOpacity={1}>
              <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#00ff88" style={styles.inputIcon} />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder="ENTER PASSWORD"
                  placeholderTextColor="rgba(0, 255, 136, 0.4)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#00ccff"
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>



            {/* Password Strength */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${passwordStrength}%`,
                        backgroundColor: getStrengthColor(),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
                  {getStrengthText()}
                </Text>
              </View>
            )}

            {/* Confirm Password Input */}
            <TouchableOpacity onPress={() => confirmPasswordInputRef.current?.focus()} activeOpacity={1}>
              <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#00ff88" style={styles.inputIcon} />
                <TextInput
                  ref={confirmPasswordInputRef}
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder="CONFIRM PASSWORD"
                  placeholderTextColor="rgba(0, 255, 136, 0.4)"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handlePasswordSetup}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#00ccff"
                  />
                </TouchableOpacity>
                {confirmPassword.length > 0 && (
                  <Icon
                    name={password === confirmPassword ? 'check-circle' : 'error'}
                    size={20}
                    color={password === confirmPassword ? '#00ff88' : '#ff4757'}
                    style={styles.matchIcon}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* Error Display */}
            {registrationError ? (
              <View style={styles.errorContainer}>
                <Icon name="error-outline" size={16} color="#ff4757" />
                <Text style={styles.errorText}>
                  {registrationError.toUpperCase()}
                </Text>
              </View>
            ) : null}

            {/* ✅ ADD REFERRAL CODE INPUT HERE */}
            <TouchableOpacity onPress={() => referralInputRef.current?.focus()} activeOpacity={1}>
              <View style={styles.inputContainer}>
                <Icon name="card-giftcard" size={20} color="#00ccff" style={styles.inputIcon} />
                <TextInput
                  ref={referralInputRef}
                  style={[styles.input, { color: '#00ccff' }]}
                  placeholder="REFERRAL CODE (OPTIONAL)"
                  placeholderTextColor="rgba(0, 204, 255, 0.4)"
                  value={referralCode}
                  onChangeText={handleReferralCodeChange}
                  autoCapitalize="characters"
                  maxLength={10}
                  returnKeyType="done"
                />
                {referralCode.length > 0 && (
                  <Icon
                    name={
                      referralValid === true
                        ? 'check-circle'
                        : referralValid === false
                          ? 'cancel'
                          : 'info'
                    }
                    size={20}
                    color={
                      referralValid === true
                        ? '#00ff88'
                        : referralValid === false
                          ? '#ff4757'
                          : '#00ccff'
                    }
                    style={styles.statusIcon}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* Show referral status message */}
            {referralValid === true && (
              <View style={styles.successContainer}>
                <Icon name="check-circle" size={16} color="#00ff88" />
                <Text style={styles.successText}>VALID REFERRAL CODE!</Text>
              </View>
            )}

            {referralValid === false && (
              <View style={styles.warningContainer}>
                <Icon name="info" size={16} color="#ffa502" />
                <Text style={styles.warningText}>REFERRAL CODE NOT FOUND (OPTIONAL)</Text>
              </View>
            )}

            {/* Error Display - KEEP THIS AS IS */}
            {registrationError ? (
              <Animated.View style={[styles.errorContainer, { transform: [{ translateX: shakeAnim }] }]}>
                <Icon name="error" size={18} color="#ff4757" />
                <Text style={styles.errorText}>{registrationError.toUpperCase()}</Text>
              </Animated.View>
            ) : null}

            {/* Register Button */}
            <TouchableOpacity
              onPress={handlePasswordSetup}
              disabled={!isFormValid || isLoading}
              activeOpacity={0.8}
              style={[styles.loginButton, (!isFormValid || isLoading) && styles.buttonDisabled]}
            >
              <LinearGradient
                colors={['#00ff88', '#00ccff', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                <Icon name="person-add" size={20} color="#0a0a0a" />
                <Text style={styles.loginButtonText}>
                  {isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLoginNavigation}
              style={styles.recoveryButton}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Icon name="login" size={16} color="#00ccff" />
              <Text style={styles.recoveryText}>ALREADY HAVE AN ACCOUNT? LOGIN</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>SHIELD</Text>
            <Text style={styles.footerSubtitle}>
              QUANTUM ENCRYPTED | ZERO TRUST ARCHITECTURE
            </Text>
          </View>

          {/* Extra spacing for keyboard */}
          <View style={{ height: 50 }} />
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = {
  container: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  loginCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#00ff88',
    textShadowRadius: 10,
  },
  statusBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 15,
  },
  statusText: {
    color: '#00ff88',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 56,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#00ff88',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusIcon: {
    marginLeft: 10,
  },
  eyeButton: {
    padding: 5,
    marginLeft: 5,
  },
  matchIcon: {
    position: 'absolute',
    right: 50,
  },
  strengthContainer: {
    marginBottom: 15,
  },
  strengthBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 5,
  },
  strengthFill: {
    height: '100%',
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4757',
    marginBottom: 15,
  },
  errorText: {
    color: '#ff4757',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loginButtonText: {
    color: '#0a0a0a',
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 10,
    letterSpacing: 1.5,
  },
  recoveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: 10,
  },
  recoveryText: {
    color: '#00ccff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#00ff88',
    marginBottom: 5,
    letterSpacing: 2,
  },
  footerSubtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1.5,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  logoContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  logo: { width: 80, height: 80 },
  cyberCard: {
    width: '100%',
    maxWidth: 380,
    position: 'relative',
  },
};

export default SetPasswordScreen;