import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import * as Keychain from 'react-native-keychain';
import SInfo from 'react-native-sensitive-info';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BASE_URL, DEFAULT_HEADERS, API_TIMEOUT } from '../../utils/config';
import styles from '../../assets/PasswordRecoveryStyles';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Define fetchWithTimeout to handle timeouts and network errors
const fetchWithTimeout = async (resource, options = {}, timeout = API_TIMEOUT) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
};

const PasswordRecoveryScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1: Email/Security, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [securityQuestions, setSecurityQuestions] = useState([]);
  const [securityAnswer1, setSecurityAnswer1] = useState('');
  const [securityAnswer2, setSecurityAnswer2] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryMethod, setRecoveryMethod] = useState('email'); // 'email' or 'security'
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // API URLs
  const EMAIL_RECOVERY_URL = `${BASE_URL}/v1/password-recovery/email/initiate`;
  const SECURITY_RECOVERY_URL = `${BASE_URL}/v1/password-recovery/security/initiate`;
  const SECURITY_QUESTIONS_URL = `${BASE_URL}/v1/password-recovery/security-questions`;
  const VERIFY_OTP_URL = `${BASE_URL}/v1/password-recovery/verify-otp`;
  const RESET_PASSWORD_URL = `${BASE_URL}/v1/password-recovery/reset-password`;
  const RESEND_OTP_URL = `${BASE_URL}/v1/password-recovery/resend-otp`;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleApiError = (error, defaultMessage) => {
    let errorMessage = defaultMessage;
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    Alert.alert('Error', errorMessage);
  };

  const loadSecurityQuestions = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address first.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTimeout(SECURITY_QUESTIONS_URL, {
        method: 'GET',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load security questions');
      }

      setSecurityQuestions(Object.values(data.data.questions));
    } catch (error) {
      console.error('Security questions error:', error);
      handleApiError(error, 'Failed to load security questions. Please use email recovery.');
      setRecoveryMethod('email'); // Fallback to email
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRecovery = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTimeout(EMAIL_RECOVERY_URL, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        let errorMessages = [];
        if (data.message) errorMessages.push(data.message);
        if (data.errors) {
          Object.values(data.errors).forEach(errArray => {
            errorMessages = errorMessages.concat(errArray);
          });
        }
        throw new Error(errorMessages.join('\n') || 'Failed to send recovery email');
      }

      setUserId(data.data.user_id);
      Alert.alert(
        'OTP Sent',
        'A 6-digit OTP has been sent to your email address. Please check your inbox.',
        [{ text: 'OK', onPress: () => setStep(2) }]
      );

    } catch (error) {
      console.error('Email recovery error:', error);
      handleApiError(error, 'Failed to send recovery email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityRecovery = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    if (!securityAnswer1.trim() || !securityAnswer2.trim()) {
      Alert.alert('Error', 'Please provide answers to both security questions.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTimeout(SECURITY_RECOVERY_URL, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          answer_1: securityAnswer1.trim(),
          answer_2: securityAnswer2.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        let errorMessages = [];
        if (data.message) errorMessages.push(data.message);
        if (data.errors) {
          Object.values(data.errors).forEach(errArray => {
            errorMessages = errorMessages.concat(errArray);
          });
        }
        throw new Error(errorMessages.join('\n') || 'Security verification failed');
      }

      setUserId(data.data.user_id);
      Alert.alert(
        'Security Verified',
        'Security questions verified successfully! Please proceed with the OTP verification.',
        [{ text: 'OK', onPress: () => setStep(2) }]
      );

    } catch (error) {
      console.error('Security recovery error:', error);
      handleApiError(error, 'Failed to verify security questions. Please check your answers.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp.trim() || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP.');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'Session expired. Please start over.');
      setStep(1);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTimeout(VERIFY_OTP_URL, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          user_id: userId,
          otp: otp.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'OTP verification failed');
      }

      Alert.alert(
        'OTP Verified',
        'OTP verified successfully! Please set your new password.',
        [{ text: 'OK', onPress: () => setStep(3) }]
      );

    } catch (error) {
      console.error('OTP verification error:', error);
      handleApiError(error, 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'Session expired. Please start over.');
      setStep(1);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTimeout(RESET_PASSWORD_URL, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          user_id: userId,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        let errorMessages = [];
        if (data.message) errorMessages.push(data.message);
        if (data.errors) {
          Object.values(data.errors).forEach(errArray => {
            errorMessages = errorMessages.concat(errArray);
          });
        }
        throw new Error(errorMessages.join('\n') || 'Password reset failed');
      }

      // Update local password storage
      try {
        await Keychain.setGenericPassword('shield-user', newPassword, {
          service: 'shield-auth',
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
        });

        await SInfo.setItem('shield-password', newPassword, {
          sharedPreferencesName: 'shieldSharedPrefs',
          keychainService: 'shieldKeychain'
        });
      } catch (storageError) {
        console.warn('Local password storage failed:', storageError);
      }

      Alert.alert(
        'Success',
        'Password has been reset successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('PasswordEntry') }]
      );

    } catch (error) {
      console.error('Password reset error:', error);
      handleApiError(error, 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!userId) {
      Alert.alert('Error', 'Session expired. Please start over.');
      setStep(1);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTimeout(RESEND_OTP_URL, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to resend OTP');
      }

      Alert.alert('OTP Sent', 'A new OTP has been sent to your email address.');

    } catch (error) {
      console.error('Resend OTP error:', error);
      handleApiError(error, 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.card}>
      <Text style={styles.title}>Password Recovery</Text>
      <Text style={styles.subtitle}>Choose your recovery method</Text>

      {/* Email Input */}
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email address"
        placeholderTextColor="#B0BEC5"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Recovery Method Selection */}
      <View style={styles.methodContainer}>
        <TouchableOpacity
          style={[
            styles.methodButton,
            recoveryMethod === 'email' && styles.methodButtonActive,
          ]}
          onPress={() => setRecoveryMethod('email')}
          activeOpacity={0.7}
        >
          <Icon 
            name="email" 
            size={24} 
            color={recoveryMethod === 'email' ? '#42A5F5' : '#B0BEC5'} 
          />
          <Text style={[
            styles.methodText,
            recoveryMethod === 'email' && styles.methodTextActive,
          ]}>
            Email Recovery
          </Text>
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={[
            styles.methodButton,
            recoveryMethod === 'security' && styles.methodButtonActive,
          ]}
          onPress={() => {
            setRecoveryMethod('security');
            if (email.trim() && email.includes('@')) {
              loadSecurityQuestions();
            }
          }}
          activeOpacity={0.7}
        >
          <Icon 
            name="security" 
            size={24} 
            color={recoveryMethod === 'security' ? '#42A5F5' : '#B0BEC5'} 
          />
          <Text style={[
            styles.methodText,
            recoveryMethod === 'security' && styles.methodTextActive,
          ]}>
            Security Questions
          </Text>
        </TouchableOpacity> */}
      </View>

      {/* Email Recovery Form */}
      {recoveryMethod === 'email' && (
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleEmailRecovery}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Sending...' : 'Send OTP'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Security Questions Form */}
      {recoveryMethod === 'security' && securityQuestions.length > 0 && (
        <>
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>{securityQuestions[0]}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={securityAnswer1}
            onChangeText={setSecurityAnswer1}
            placeholder="Enter your answer"
            placeholderTextColor="#B0BEC5"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>{securityQuestions[1]}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={securityAnswer2}
            onChangeText={setSecurityAnswer2}
            placeholder="Enter your answer"
            placeholderTextColor="#B0BEC5"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSecurityRecovery}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Verifying...' : 'Verify Answers'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {recoveryMethod === 'security' && securityQuestions.length === 0 && (
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={loadSecurityQuestions}
          disabled={isLoading || !email.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Load Security Questions'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.card}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to your {recoveryMethod === 'email' ? 'email' : 'registered method'}
      </Text>

      <TextInput
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
        placeholder="000000"
        placeholderTextColor="#B0BEC5"
        keyboardType="numeric"
        maxLength={6}
        textAlign="center"
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={verifyOTP}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Verifying...' : 'Verify OTP'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={resendOTP}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Text style={styles.resendText}>
          {isLoading ? 'Sending...' : 'Resend OTP'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.card}>
      <Text style={styles.title}>Set New Password</Text>
      <Text style={styles.subtitle}>Create a new secure password for your account</Text>

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New Password"
          placeholderTextColor="#B0BEC5"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Icon 
            name={showPassword ? 'visibility-off' : 'visibility'} 
            size={24} 
            color="#B0BEC5" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm Password"
          placeholderTextColor="#B0BEC5"
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Icon 
            name={showConfirmPassword ? 'visibility-off' : 'visibility'} 
            size={24} 
            color="#B0BEC5" 
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={resetPassword}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Updating...' : 'Reset Password'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Icon name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Recovery</Text>
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              {[1, 2, 3].map((stepNumber) => (
                <View key={stepNumber} style={styles.progressStep}>
                  <View style={[
                    styles.progressDot,
                    step >= stepNumber && styles.progressDotActive
                  ]}>
                    <Text style={[
                      styles.progressText,
                      step >= stepNumber && styles.progressTextActive
                    ]}>
                      {stepNumber}
                    </Text>
                  </View>
                  {stepNumber < 3 && (
                    <View style={[
                      styles.progressLine,
                      step > stepNumber && styles.progressLineActive
                    ]} />
                  )}
                </View>
              ))}
            </View>

            {/* Render current step */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}; 
export default PasswordRecoveryScreen;
