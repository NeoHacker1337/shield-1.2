import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';

import styles from '../assets/GetPremiumStyles';
import { activateLicense } from '../services/licenseService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GetPremiumScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [licenseInput, setLicenseInput] = useState('');

  // login-based plan/license details
  const [freeUserFeatures, setFreeUserFeatures] = useState([]);
  const [userLicenseDetails, setUserLicenseDetails] = useState(null);
  const [licenseStatus, setLicenseStatus] = useState('');
  const [licenseExpiresAt, setLicenseExpiresAt] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const loadStoredPlanDetails = async () => {
    try {
      const rows = await AsyncStorage.multiGet([
        'free_user_features',
        'user_license',
        'license_status',
        'license_expires_at',
      ]);

      const map = Object.fromEntries(rows);
      const freeUserStr = map.free_user_features;
      const userLicenseStr = map.user_license;

      setFreeUserFeatures(freeUserStr ? JSON.parse(freeUserStr) : []);
      setUserLicenseDetails(userLicenseStr ? JSON.parse(userLicenseStr) : null);
      setLicenseStatus(map.license_status || '');
      setLicenseExpiresAt(map.license_expires_at || '');
    } catch (e) {
      console.log('🔥 [GetPremiumScreen] loadStoredPlanDetails FAILED:', e?.message);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [fadeAnim, slideAnim, scaleAnim, glowAnim]);

  useEffect(() => {
    loadStoredPlanDetails();
  }, []);

  const formatIsoToYmdHms = (iso) => {
    if (!iso || typeof iso !== 'string') return '—';
    return iso.substring(0, 19).replace('T', ' ');
  };

  const submitLicense = async () => {
    if (!licenseInput.trim()) {
      Alert.alert('Validation', 'Please enter a valid license key');
      return;
    }

    try {
      setLoading(true);

      const trimmedKey = licenseInput.trim();
      await AsyncStorage.setItem('LICENSE_KEY', trimmedKey);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('User not found in storage');
      }

      const { id: userId } = JSON.parse(userData);
      const deviceId = DeviceInfo.getUniqueIdSync();
      const deviceName = await DeviceInfo.getDeviceName();

      const result = await activateLicense({
        license_key: trimmedKey,
        device_id: deviceId,
        device_name: deviceName,
        user_id: userId,
      });

      await AsyncStorage.multiSet([
        ['IS_PREMIUM', 'true'],
        ['LICENSE_TYPE', result?.license_type || ''],
        [
          'LICENSE_EXPIRES_AT',
          result?.expires_at ? String(result.expires_at) : '',
        ],
      ]);

      setModalVisible(false);
      setLicenseInput('');

      Alert.alert('Success 🎉', 'Your license has been activated successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
      ]);
    } catch (error) {
      console.error('🔥 [GetPremiumScreen] Activation FAILED');
      console.error('🔥 MESSAGE:', error.message);
      console.error('🔥 STACK:', error.stack);
      Alert.alert('Activation Failed', error?.message || 'Something went wrong');
    } finally {
      setLoading(false);
      console.log('🔚 [GetPremiumScreen] submitLicense END');
    }
  };

  const premiumBenefits = [
    {
      icon: 'block',
      color: '#4CAF50',
      title: 'Ad-Free Experience',
      subtitle: 'Enjoy uninterrupted usage',
    },
    {
      icon: 'security',
      color: '#2196F3',
      title: 'Advanced Security',
      subtitle: 'Military-grade encryption',
    },
    {
      icon: 'cloud-upload',
      color: '#FF9800',
      title: 'Unlimited Storage',
      subtitle: 'Store files without limits',
    },
    {
      icon: 'support-agent',
      color: '#E91E63',
      title: 'Priority Support',
      subtitle: '24/7 dedicated assistance',
    },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Platform.OS === 'android' ? insets.top : 0,
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <LinearGradient
        colors={['#020617', '#020617', '#020617']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.85}
            disabled={loading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              name={Platform.OS === 'ios' ? 'arrow-back-ios' : 'arrow-back'}
              size={20}
              color="#E5E7EB"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Get Premium</Text>
        </View>

        {/* CONTENT */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            {/* Premium Icon */}
            <View style={styles.iconContainer}>
              <Animated.View
                style={[
                  styles.glowEffect,
                  {
                    opacity: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.25, 0.9],
                    }),
                    transform: [
                      {
                        scale: glowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.06],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.iconBackground}>
                <Icon name="workspace-premium" size={40} color="#FACC15" />
              </View>
            </View>

            {/* Title + Subtitle */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>
                Unlock <Text style={styles.titleAccent}>Premium</Text> Features
              </Text>
              <Text style={styles.description}>
                Elevate your Shield Security experience with enterprise-grade
                protection, priority support, and powerful productivity tools
                designed for professionals.
              </Text>
            </View>

            {/* LICENSE DETAILS CARD */}
            {(licenseStatus || licenseExpiresAt || userLicenseDetails) ? (
              <View style={styles.licenseCard}>
                <View style={styles.sectionHeaderRow}>
                  <Icon
                    name="verified-user"
                    size={20}
                    color="#4ADE80"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.featureTitle}>License Details</Text>
                </View>

                <View style={styles.licenseRow}>
                  <Text style={styles.licenseLabel}>Status</Text>
                  <Text style={styles.licenseValue}>
                    {licenseStatus || '—'}
                  </Text>
                </View>

                <View style={styles.licenseRow}>
                  <Text style={styles.licenseLabel}>Expires at</Text>
                  <Text style={styles.licenseValue}>
                    {licenseExpiresAt || '—'}
                  </Text>
                </View>

                <View style={styles.licenseDivider} />

                <Text style={styles.licenseSectionTitle}>License</Text>

                <View style={styles.licenseRow}>
                  <Text style={styles.licenseLabel}>Key</Text>
                  <Text
                    style={[styles.licenseValue, styles.licenseMonoValue]}
                    numberOfLines={1}
                  >
                    {userLicenseDetails?.license?.license_key || '—'}
                  </Text>
                </View>

                <View style={styles.licenseRow}>
                  <Text style={styles.licenseLabel}>Type</Text>
                  <Text style={styles.licenseValue}>
                    {userLicenseDetails?.license?.type || '—'}
                  </Text>
                </View>

                <View style={styles.licenseRow}>
                  <Text style={styles.licenseLabel}>Max devices</Text>
                  <Text style={styles.licenseValue}>
                    {userLicenseDetails?.license?.max_devices != null
                      ? String(userLicenseDetails?.license?.max_devices)
                      : '—'}
                  </Text>
                </View>

                <View style={styles.licenseRow}>
                  <Text style={styles.licenseLabel}>Device</Text>
                  <Text style={styles.licenseValue}>
                    {userLicenseDetails?.device_name || '—'}
                  </Text>
                </View>

                <View style={styles.licenseRow}>
                  <Text style={styles.licenseLabel}>Activated at</Text>
                  <Text style={styles.licenseValue}>
                    {formatIsoToYmdHms(userLicenseDetails?.activated_at)}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* PREMIUM BENEFITS */}
            <View style={styles.featureContainer}>
              <View style={styles.sectionHeaderRow}>
                <Icon
                  name="stars"
                  size={20}
                  color="#FACC15"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.featureTitle}>Premium Benefits</Text>
              </View>

              {premiumBenefits.map((item, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Icon
                      name={item.icon}
                      size={22}
                      color={item.color}
                    />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureText}>{item.title}</Text>
                    <Text style={styles.featureSubtext}>{item.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* FREE USER FEATURES */}
            {Array.isArray(freeUserFeatures) && freeUserFeatures.length > 0 ? (
              <View style={styles.freeFeaturesContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Icon
                    name="lock-open"
                    size={18}
                    color="#38BDF8"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.featureTitle}>Free User Features</Text>
                </View>

                {freeUserFeatures.map((f, idx) => (
                  <View key={idx} style={styles.freeFeatureItem}>
                    <Text style={styles.freeFeatureText}>
                      {f?.feature_key} ({f?.slug})
                    </Text>
                    <Text style={styles.freeFeatureMeta}>
                      {f?.is_toggle
                        ? `enabled: ${String(f?.enabled)}`
                        : `limit: ${String(f?.limit)}`}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* CTA BUTTON */}
            <View style={styles.premiumButton}>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                activeOpacity={0.9}
                disabled={loading}
              >
                <LinearGradient
                  colors={
                    loading
                      ? ['#1E293B', '#0F172A']
                      : ['#FACC15', '#FBBF24']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.premiumButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#111827" />
                  ) : (
                    <>
                      <Icon
                        name="workspace-premium"
                        size={20}
                        color="#111827"
                        style={styles.premiumButtonIcon}
                      />
                      <Text style={styles.premiumButtonText}>
                        Upgrade Now
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <Text style={styles.ctaText}>
              Join thousands of premium users who trust Shield Security for
              secure and distraction-free protection.
            </Text>
          </Animated.View>
        </ScrollView>
      </LinearGradient>

      {/* LICENSE MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            console.log('🟣 [DEBUG] Modal overlay touched');
          }}
        >
          <View style={modalStyles.overlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={modalStyles.keyboardView}
            >
              <TouchableWithoutFeedback>
                <View style={modalStyles.modalContainer}>
                  <Icon
                    name="vpn-key"
                    size={26}
                    color="#FACC15"
                    style={modalStyles.modalIcon}
                  />
                  <Text style={modalStyles.modalTitle}>Enter License Key</Text>
                  <Text style={modalStyles.modalDescription}>
                    Paste the license key you received after purchase to
                    activate Shield Security Premium on this device.
                  </Text>

                  <TextInput
                    style={modalStyles.input}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    placeholderTextColor="rgba(148, 163, 184, 0.7)"
                    value={licenseInput}
                    onChangeText={setLicenseInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!loading}
                  />

                  {/* DEBUG BUTTON (kept as-is) */}
                  <TouchableOpacity
                    style={modalStyles.debugButton}
                    onPress={() => {
                      console.log('🧨 [UI] Activate button PRESSED');
                      Alert.alert('DEBUG', 'Button Pressed!');
                      submitLicense();
                    }}
                    disabled={loading}
                  >
                    <Text style={modalStyles.debugText}>DEBUG ACTIVATE</Text>
                  </TouchableOpacity>

                  <View style={modalStyles.actionsRow}>
                    <TouchableOpacity
                      style={modalStyles.submitButton}
                      onPress={submitLicense}
                      disabled={loading}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={
                          loading
                            ? ['#1E293B', '#0F172A']
                            : ['#4ADE80', '#22C55E']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={modalStyles.submitGradient}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#0F172A" />
                        ) : (
                          <Text style={modalStyles.submitText}>
                            Activate License
                          </Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={modalStyles.cancelButton}
                      onPress={() => {
                        console.log('❌ [UI] Cancel button pressed');
                        setModalVisible(false);
                      }}
                      disabled={loading}
                    >
                      <Text style={modalStyles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default GetPremiumScreen;

/* ---------- Modal Styles (UI only) ---------- */

const modalStyles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#020617',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  modalIcon: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    color: '#E5E7EB',
    marginBottom: 6,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#020617',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#E5E7EB',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.6)',
    fontSize: 14,
    letterSpacing: 1.1,
  },
  debugButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  debugText: {
    fontSize: 11,
    color: '#F97316',
  },
  actionsRow: {
    marginTop: 10,
  },
  submitButton: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 999,
  },
  submitText: {
    color: '#022C22',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
};
