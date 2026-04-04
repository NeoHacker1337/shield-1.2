import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  Keyboard,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { verifyActivationKey, persistActivationStatus } from '../services/activationService'; // ✅ patched
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ActivationScreen = ({ navigation }) => {
  const [activationKey, setActivationKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState('');

  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    setTimeout(() => {
      inputRef.current?.focus();
    }, 700);
  }, []);

  const handleKeyChange = (text) => {
    const cleanText = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    if (cleanText.length <= 20) {
      setActivationKey(cleanText);
      setError('');
    }
  };

  const handleGoToLogin = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await AuthService.logout();
      }
    } catch (error) {
      console.error('Failed to logout before going to login screen', error);
    } finally {
      navigation.reset({
        index: 0,
        routes: [{ name: 'PasswordEntry' }],
      });
    }
  };

  const handleActivate = async () => {
    Keyboard.dismiss();

    if (activationKey.length !== 20) {
      setError('Please enter a complete 20-character activation key');
      return;
    }

    setIsActivating(true);
    setError('');

    try {
      const result = await verifyActivationKey(activationKey);

      if (result.success) {
        // ✅ STORE ACTIVATION FLAG LOCALLY
        await persistActivationStatus();

        Alert.alert(
          'Activation Successful! 🎉',
          'Your Shield account has been activated.',
          [
            {
              text: 'Enter Shield',
              onPress: () => {
                // ✅ ANDROID-15 SAFE NAVIGATION
                setTimeout(() => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }],
                  });
                }, 80);
              },
            },
          ],
          { cancelable: false }
        );
      }

    } catch (error) {
      setError(error.message || 'Invalid activation key');
      setActivationKey('');
      inputRef.current?.focus();
    } finally {
      setIsActivating(false);
    }
  };

  const handleContactSupport = () => {
    navigation.navigate('SupportDetails');
  };

  const isKeyComplete = activationKey.length === 20;

  const getFormattedKeyDisplay = () => {
    if (!activationKey) return '';
    return activationKey.match(/.{1,5}/g)?.join('-') || activationKey;
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <LinearGradient
        colors={['#0a0a0a', '#0f1419', '#0a0a0a']}
        style={styles.container}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
                <LinearGradient
                  colors={['#00ff88', '#00ccff']}
                  style={styles.iconGradient}
                >
                  <Icon name="security" size={48} color="#000000" />
                </LinearGradient>
              </Animated.View>

              <Text style={styles.title}>SYSTEM ACTIVATION</Text>

              <View style={styles.statusBar}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>ACTIVATION REQUIRED</Text>
              </View>

              <Text style={styles.subtitle}>
                Please enter your unique 20-character activation key to proceed
              </Text>
            </View>

            <View style={styles.keyContainer}>
              <Text style={styles.label}>ACTIVATION KEY</Text>

              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.keyInput,
                    isKeyComplete && styles.keyInputComplete,
                  ]}
                  value={activationKey}
                  onChangeText={handleKeyChange}
                  maxLength={20}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  keyboardType="default"
                  editable={!isActivating}
                  placeholder="ENTER 20-CHARACTER KEY"
                  placeholderTextColor="rgba(0, 255, 136, 0.3)"
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={handleActivate}
                />

                <View style={styles.counterContainer}>
                  <Text style={[
                    styles.counterText,
                    isKeyComplete && styles.counterTextComplete,
                  ]}>
                    {activationKey.length} / 20
                  </Text>
                </View>

                {isKeyComplete && (
                  <View style={styles.checkIconContainer}>
                    <Icon name="check-circle" size={24} color="#00ff88" />
                  </View>
                )}
              </View>

              {activationKey.length > 0 && (
                <View style={styles.formattedDisplayContainer}>
                  <Text style={styles.formattedDisplayText}>
                    {getFormattedKeyDisplay()}
                  </Text>
                </View>
              )}

              <View style={styles.infoContainer}>
                <Icon name="info-outline" size={16} color="rgba(0, 204, 255, 0.6)" />
                <Text style={styles.infoText}>
                  20 alphanumeric characters (e.g., 7PBQDDYRSVJHAOHUEUQJ)
                </Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Icon name="error-outline" size={20} color="#ff4757" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.activateButton,
                (!isKeyComplete || isActivating) && styles.buttonDisabled,
              ]}
              onPress={handleActivate}
              disabled={!isKeyComplete || isActivating}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isActivating
                    ? ['#4a5568', '#2d3748']
                    : ['#00ff88', '#00ccff']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Icon
                  name={isActivating ? 'hourglass-empty' : 'check-circle'}
                  size={20}
                  color="#000000"
                />
                <Text style={styles.buttonText}>
                  {isActivating ? 'ACTIVATING...' : 'ACTIVATE SHIELD'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportButton}
              onPress={handleContactSupport}
              activeOpacity={0.7}
            >
              <Icon name="support-agent" size={18} color="#00ccff" />
              <Text style={styles.supportText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleGoToLogin}
              activeOpacity={0.8}
            >
              <Icon name="logout" size={16} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.logoutButtonText}>
                SWITCH ACCOUNT / LOGIN AGAIN
              </Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Icon name="lightbulb-outline" size={20} color="#ffa502" />
              <Text style={styles.infoBoxText}>
                Your activation key was sent to your registered email after purchase.
                Check your spam folder if you can't find it.
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>SHIELD</Text>
              <Text style={styles.footerSubtext}>
                SECURED BY MILITARY-GRADE ENCRYPTION
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  header: { alignItems: 'center', marginBottom: 40 },
  iconContainer: { marginBottom: 20 },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 2,
    textShadowColor: '#00ff88',
    textShadowRadius: 10,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.3)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4757',
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ff4757',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  keyContainer: { marginBottom: 30 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00ccff',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  inputWrapper: { position: 'relative', marginBottom: 12 },
  keyInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingRight: 80,
    fontSize: 16,
    fontWeight: '700',
    color: '#00ff88',
    letterSpacing: 2,
  },
  keyInputComplete: {
    borderColor: '#00ff88',
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
  },
  counterContainer: {
    position: 'absolute',
    right: 50,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(0, 204, 255, 0.6)',
    letterSpacing: 1,
  },
  counterTextComplete: { color: '#00ff88' },
  checkIconContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  formattedDisplayContainer: {
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  formattedDisplayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ccff',
    textAlign: 'center',
    letterSpacing: 2,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  infoText: {
    fontSize: 11,
    color: 'rgba(0, 204, 255, 0.6)',
    marginLeft: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff4757',
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    color: '#ff4757',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
  },
  activateButton: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 10,
    letterSpacing: 2,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 30,
  },
  supportText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ccff',
    marginLeft: 8,
    letterSpacing: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 165, 2, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 2, 0.3)',
    marginBottom: 30,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 12,
    lineHeight: 18,
  },
  footer: { alignItems: 'center', marginTop: 20 },
  footerText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00ff88',
    letterSpacing: 3,
    marginBottom: 6,
  },
  footerSubtext: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1.5,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  logoutButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1.2,
    marginLeft: 6,
  },
});

export default ActivationScreen;
