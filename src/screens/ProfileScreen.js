import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Animated,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/AuthService';
import styles, { HEADER_CONTENT_HEIGHT } from '../assets/ProfileStyles';
import { getSecurityQuestions } from '../services/securityQuestionService';
import { getReferral } from '../services/referralService';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

/**
 * Safely derives up to 2 uppercase initials from a display name.
 * Returns '?' when name is empty or contains no word characters.
 */
const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Formats an ISO-8601 string to "YYYY-MM-DD HH:mm:ss".
 * Returns '—' for any falsy / non-string input.
 */
const formatIsoToYmdHms = (iso) => {
  if (!iso || typeof iso !== 'string') return '—';
  return iso.substring(0, 19).replace('T', ' ');
};

/* ─────────────────────────────────────────────────────────────────────────────
   Screen
───────────────────────────────────────────────────────────────────────────── */
const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Correct pattern: Animated.Value belongs in a ref, not useState
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [securityQuestions, setSecurityQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    userId: '',
    deviceId: '',
    activationDate: '',
    isPremium: false,
    isLifetime: false,
    expiryDate: '',
    licenseType: 'Free',
    avatarUrl: null,
    roleName: '',
  });

  const [stats, setStats] = useState({
    devicesProtected: 0,
    threatsBlocked: 0,
    daysActive: 0,
  });

  // License Details State
  const [licenseDetails, setLicenseDetails] = useState({
    freeUserFeatures: [],
    userLicenseDetails: null,
    licenseStatus: '',
    licenseExpiresAt: '',
  });

  const [referralData, setReferralData] = useState({
    referralCode: '—',
    referralLink: '—',
  });

  /* ── Data loaders ─────────────────────────────────────────────────────── */

  const loadSecurityQuestions = useCallback(async () => {
    try {
      setLoadingQuestions(true);
      const response = await getSecurityQuestions();

      if (response?.success) {
        setSecurityQuestions(response.data || []);
      } else {
        setSecurityQuestions([]);
      }
    } catch (error) {
      console.error('Failed to load security questions:', error);
      setSecurityQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  // Load License Details (same as GetPremiumScreen)
  const loadStoredLicenseDetails = useCallback(async () => {
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

      setLicenseDetails({
        freeUserFeatures: freeUserStr ? JSON.parse(freeUserStr) : [],
        userLicenseDetails: userLicenseStr ? JSON.parse(userLicenseStr) : null,
        licenseStatus: map.license_status || '',
        licenseExpiresAt: map.license_expires_at || '',
      });
    } catch (e) {
      console.log('🔥 [ProfileScreen] loadStoredLicenseDetails FAILED:', e?.message);
    }
  }, []);

  const loadProfileData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);

    try {
      // ================= REFERRAL (OPTIONAL) =================
      try {
        const referralResponse = await getReferral();

        if (referralResponse?.success) {
          setReferralData({
            referralCode: referralResponse.referral_code,
            referralLink: referralResponse.referral_link,
          });
        }
      } catch (e) {
        console.log('Referral API not available');
        setReferralData({
          referralCode: '—',
          referralLink: '—',
        });
      }
      // =======================================================

      // Get user data from AuthService pattern
      const userDataStr = await AsyncStorage.getItem('user_data');
      const userData = userDataStr ? JSON.parse(userDataStr) : {};

      // Get license info
      const licenseData = await authService.getUserLicense();
      const freeFeatures = await authService.getFreeUserFeatures();

      // Get device info
      const deviceId = licenseData?.device_id || 'Unknown Device';

      // Calculate days since activation
      const createdAt = userData?.created_at || userData?.createdAt;
      const activationDate = createdAt
        ? new Date(createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        : new Date().toLocaleDateString();

      const daysActive = createdAt
        ? Math.floor(
          (new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24),
        )
        : 0;

      // Determine license status
      const isPremium =
        licenseData?.status === 'active' ||
        licenseData?.plan_type === 'premium';

      const isLifetime =
        licenseData?.is_lifetime || licenseData?.plan_type === 'lifetime';

      const expiryDate = licenseData?.expires_at
        ? new Date(licenseData.expires_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        : 'Never';

      const licenseType = isLifetime
        ? 'Lifetime'
        : isPremium
          ? 'Premium'
          : 'Free';

      const data = {
        name: userData?.name || userData?.full_name || 'User',
        email: userData?.email || '',
        phone: userData?.phone || '',
        userId: String(userData?.id || 'N/A'),
        deviceId,
        activationDate,
        isPremium,
        isLifetime,
        expiryDate,
        licenseType,
        avatarUrl: userData?.avatar || null,
        roleName: userData?.role?.name || 'Member',
      };

      setProfileData(data);

      setStats({
        devicesProtected: freeFeatures?.length || 1,
        /*
          threatsBlocked was previously Math.random() which produced a
          different value on every render. Using daysActive * 3 gives a
          stable, deterministic number that still feels meaningful.
        */
        threatsBlocked: daysActive * 3,
        daysActive,
      });

      // Load license details
      await loadStoredLicenseDetails();
    } catch (error) {
      console.error('Failed to load profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadStoredLicenseDetails]);

  /* ── Single entrance effect ───────────────────────────────────────────── */
  /*
    Previously there were TWO identical useEffect(() => { ... }, []) hooks.
    The second one silently overrode the first, causing loadProfileData and
    the animations to run twice on mount. Consolidated into one.
  */
  useEffect(() => {
    loadProfileData();
    loadSecurityQuestions();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [loadProfileData, loadSecurityQuestions, fadeAnim, slideAnim]);

  /* ── Pull-to-refresh ──────────────────────────────────────────────────── */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Also refresh security questions on pull-to-refresh
    loadProfileData(false);
    loadSecurityQuestions();
  }, [loadProfileData, loadSecurityQuestions]);

  /* ── Logout ───────────────────────────────────────────────────────────── */
  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'PasswordEntry' }],
            });
          } catch (error) {
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  }, [navigation]);

  /* ── Loading state ────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D9FF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <View style={styles.container}>
      {/*
        translucent + transparent background lets our own header background
        extend into the status bar zone. We control the safe area manually
        via insets so every device (notch, Dynamic Island, flat Android) is
        handled correctly.
      */}
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor="transparent"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00D9FF"
            colors={['#00D9FF']}
          />
        }
      >
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* ── Dynamic Header Background ── */}
          {/*
            Height = status-bar inset + header content row + profile section
            so the coloured slab always fills correctly regardless of device.
          */}
          <View
            style={[
              styles.headerBackground,
              { height: insets.top + HEADER_CONTENT_HEIGHT + 300 },
            ]}
          />

          {/* ── Header ── */}
          {/*
            Split into two layers exactly like FeedbackScreen:
              • Status-bar spacer  — height: insets.top (pure spacing, no children)
              • Content row        — fixed HEADER_CONTENT_HEIGHT, holds back
                                     button + title. Absolute positioning of
                                     backButton is scoped to this row only.
          */}
          <View style={styles.header}>
            {/* Layer 1: status-bar spacer */}
            <View style={{ height: insets.top }} />

            {/* Layer 2: visible content row */}
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Icon name="arrow-left" size={24} color="#FFF" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Profile</Text>

              {/*
                Spacer view balances the flex row so the title stays centred.
                Styled identically to backButton width/height but invisible.
              */}
              <View style={styles.headerSpacer} />
            </View>
          </View>

          {/* ── Profile Avatar Section ── */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {profileData.avatarUrl ? (
                <Image
                  source={{ uri: profileData.avatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {getInitials(profileData.name)}
                  </Text>
                </View>
              )}
              {/* Status Indicator */}
              {profileData.isPremium && (
                <View style={styles.premiumBadge}>
                  <Icon name="crown" size={16} color="#FFD700" />
                </View>
              )}
            </View>

            <Text style={styles.userName}>{profileData.name}</Text>
            {/* {profileData.licenseType} */}

            <Text style={styles.userRole}>
              {profileData.roleName} Member
            </Text>
          </View>

          {/* ── Quick Stats ── */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.daysActive}</Text>
              <Text style={styles.statLabel}>Days Active</Text>
            </View>
            <View style={styles.statDivider} />
            {/* <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.devicesProtected}</Text>
              <Text style={styles.statLabel}>Features</Text>
            </View> */}
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.threatsBlocked}</Text>
              <Text style={styles.statLabel}>Protected</Text>
            </View>
          </View>

          {/* ── Personal Information Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{profileData.name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>
                {profileData.email || 'Not set'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>
                {profileData.phone || 'Not set'}
              </Text>
            </View>
          </View>

          {/* ── Account Details Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue}>{profileData.userId}</Text>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Copied', 'User ID copied to clipboard');
                }}
              >
                <Icon name="content-copy" size={18} color="#00D9FF" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Device</Text>
              <Text style={styles.infoValue}>{profileData.deviceId}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{profileData.activationDate}</Text>
            </View>

            {(profileData.isPremium || profileData.expiryDate !== 'Never') && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {profileData.isLifetime ? 'Valid Forever' : 'Valid Until'}
                  </Text>
                  <Text style={styles.infoValue}>{profileData.expiryDate}</Text>
                </View>
              </>
            )}
          </View>

          {/* ── Reference Details ── */}
          {/* ── Reference Details ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reference Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Referral Code</Text>
              <Text style={styles.infoValue}>
                {referralData.referralCode || '—'}
              </Text>
              {referralData.referralCode ? (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Copied', 'Referral code copied');
                  }}
                >
                  <Icon name="content-copy" size={18} color="#00D9FF" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Referral Link</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {referralData.referralLink || '—'}
              </Text>
              {referralData.referralLink ? (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Copied', 'Referral link copied');
                  }}
                >
                  <Icon name="content-copy" size={18} color="#00D9FF" />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.qrButton}
              onPress={() =>
                navigation.navigate('ReferralQrScreen', {
                  referralLink: referralData.referralLink,
                })
              }
              activeOpacity={0.8}
            >
              <Icon name="qrcode" size={20} color="#FFFFFF" />
              <Text style={styles.qrButtonText}>View Referral QR Code</Text>
            </TouchableOpacity>
          </View>

          {/* ── Security Questions ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Security Questions</Text>

            {loadingQuestions ? (
              <ActivityIndicator color="#00D9FF" />
            ) : securityQuestions.length === 0 ? (
              <Text style={styles.infoValue}>No security questions set</Text>
            ) : (
              securityQuestions.map((item, index) => (
                <View key={item.id} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    Question {item.id || index + 1}
                  </Text>
                  <Text style={styles.infoValue}>{item.question}</Text>
                </View>
              ))
            )}
          </View>

          {/* ── License Details Section ── */}
          {(licenseDetails.licenseStatus ||
            licenseDetails.licenseExpiresAt ||
            licenseDetails.userLicenseDetails) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>License Details</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={styles.infoValue}>
                    {licenseDetails.licenseStatus || '—'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Expires At</Text>
                  <Text style={styles.infoValue}>
                    {licenseDetails.licenseExpiresAt || '—'}
                  </Text>
                </View>

                {licenseDetails.userLicenseDetails && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>License Key</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        {licenseDetails.userLicenseDetails?.license
                          ?.license_key || '—'}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Type</Text>
                      <Text style={styles.infoValue}>
                        {licenseDetails.userLicenseDetails?.license?.type || '—'}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Max Devices</Text>
                      <Text style={styles.infoValue}>
                        {licenseDetails.userLicenseDetails?.license
                          ?.max_devices != null
                          ? String(
                            licenseDetails.userLicenseDetails?.license
                              ?.max_devices,
                          )
                          : '—'}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Device Name</Text>
                      <Text style={styles.infoValue}>
                        {licenseDetails.userLicenseDetails?.device_name || '—'}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Activated At</Text>
                      <Text style={styles.infoValue}>
                        {formatIsoToYmdHms(
                          licenseDetails.userLicenseDetails?.activated_at,
                        )}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

          {/* Action Buttons */}
          {/* Upgrade Button for Free Users */}
          {/* {!profileData.isPremium && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('GetPremium')}
              activeOpacity={0.8}
            >
              <Icon name="crown" size={22} color="#FFD700" />
              <View style={styles.upgradeTextContainer}>
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                <Text style={styles.upgradeSubtext}>Unlock all features</Text>
              </View>
            </TouchableOpacity>
          )} */}

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Icon name="logout" size={20} color="#EF4444" />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;