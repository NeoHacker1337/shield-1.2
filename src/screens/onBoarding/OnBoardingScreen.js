import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
  StatusBar,
  Image,
  Alert,
  Platform,
} from "react-native";

import LinearGradient from 'react-native-linear-gradient';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../../assets/OnBoardingStyles';

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const ONBOARDING_PERMS_DONE_KEY = 'shield_onboarding_permissions_done';

const OnBoardingScreen = ({ navigation }) => {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [currentPermissionIndex, setCurrentPermissionIndex] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState('');
  const scrollViewRef = useRef(null);

  // Optimized animation refs - reduced to essential ones only
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const logoImage = require("../../assets/shield-logo.png");

  // const permissionsToRequest = useMemo(() => [
  //   {
  //     permission: PERMISSIONS.ANDROID.CALL_PHONE,
  //     name: "Phone Access",
  //     description: "Required for emergency dialer functionality",
  //     icon: "📞",
  //     required: true
  //   },
  //   {
  //     permission: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
  //     name: "Storage Access",
  //     description: "Access files for app lock functionality",
  //     icon: "💾",
  //     required: true
  //   },
  //   {
  //     permission: PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
  //     name: "Storage Write",
  //     description: "Save encrypted data securely",
  //     icon: "📝",
  //     required: true
  //   },
  //   {
  //     permission: PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
  //     name: "Media Images",
  //     description: "Access images for security analysis",
  //     icon: "🖼️",
  //     required: true
  //   },
  //   {
  //     permission: PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
  //     name: "Media Videos",
  //     description: "Access videos for threat detection",
  //     icon: "🎥",
  //     required: true
  //   },
  //   {
  //     permission: PERMISSIONS.ANDROID.READ_MEDIA_AUDIO,
  //     name: "Media Audio",
  //     description: "Monitor audio for security threats",
  //     icon: "🎵",
  //     required: true
  //   },
  // ], []);

  const permissionsToRequest = useMemo(() => {
  if (Platform.OS !== 'android') {
    return [];
  }

  const list = [
    {
      permission: PERMISSIONS.ANDROID.CALL_PHONE,
      name: 'Phone Access',
      description: 'Required for emergency dialer functionality',
      required: true,
    },
    {
      permission: PERMISSIONS.ANDROID.CAMERA,
      name: 'Camera Access',
      description: 'Required for QR scanning and camera features',
      required: true,
    },
    {
      permission: PERMISSIONS.ANDROID.RECORD_AUDIO,
      name: 'Microphone Access',
      description: 'Required for secure audio call features',
      required: true,
    },
  ];

  if (Platform.Version >= 33) {
    // Android 13+: granular media permissions
    list.push(
      {
        permission: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
        name: 'Notifications',
        description: 'Required to receive message and call alerts',
        required: true,
      },
      {
        permission: PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
        name: 'Media Images',
        description: 'Access images for file locking and analysis',
        required: true,
      },
      {
        permission: PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
        name: 'Media Videos',
        description: 'Access videos for file locking',
        required: true,
      },
      {
        permission: PERMISSIONS.ANDROID.READ_MEDIA_AUDIO,
        name: 'Media Audio',
        description: 'Access audio for file locking',
        required: true,
      },
    );
  } else {
    // Older Android: classic external storage
    list.push(
      {
        permission: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
        name: 'Storage Read',
        description: 'Access files for app lock functionality',
        required: true,
      },
      {
        permission: PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
        name: 'Storage Write',
        description: 'Save encrypted data securely',
        required: true,
      },
    );
  }

  return list;
}, []);


  const slides = useMemo(() => [
    {
      id: 1,
      title: "QUANTUM\nENCRYPTION",
      subtitle: "MAXIMUM SECURITY PROTOCOL",
      description: "Military-grade 256-bit encryption with quantum-resistant algorithms protects your data from future threats",
      icon: "🛡️",
      primaryColor: "#00ff88",
      secondaryColor: "#00ccff",
      tertiaryColor: "#8b5cf6",
      features: ["QUANTUM SHIELD", "ZERO-TRUST ARCH", "BIOMETRIC LOCK"],
      codePattern: "010110100110",
    },
    {
      id: 2,
      title: "CYBER THREAT\nDETECTION",
      subtitle: "AI-POWERED MONITORING",
      description: "Advanced threat detection with machine learning algorithms monitors and neutralizes cyber attacks in real-time",
      icon: "⚡",
      primaryColor: "#ff0080",
      secondaryColor: "#00ccff",
      tertiaryColor: "#00ff88",
      features: ["NEURAL SCANNING", "THREAT ANALYSIS", "AUTO RESPONSE"],
      codePattern: "110100101101",
    },
    {
      id: 3,
      title: "DIGITAL\nFORTRESS",
      subtitle: "IMPENETRABLE DEFENSE",
      description: "Create an invisible digital fortress around your sensitive data with multi-layer security protocols",
      icon: "🔐",
      primaryColor: "#8b5cf6",
      secondaryColor: "#ff0080",
      tertiaryColor: "#00ff88",
      features: ["STEALTH MODE", "GHOST PROTOCOL", "SECURE VAULT"],
      codePattern: "101101001011",
    },
  ], []);
 
  
  useEffect(() => {
  let mounted = true;

  const requestAllPermissions = async () => {
    try {
      const alreadyHandled = await AsyncStorage.getItem(ONBOARDING_PERMS_DONE_KEY);
      if (alreadyHandled === 'true') {
        if (!mounted) return;
        setIsAppLoading(false);
        setShowWelcomeScreen(true);
        return;
      }

      setIsRequestingPermissions(true);

      const statusMap = {};

      for (const perm of permissionsToRequest) {
        if (!perm.permission) continue;

        let status = await check(perm.permission);

        if (status === RESULTS.DENIED || status === RESULTS.LIMITED) {
          status = await request(perm.permission);
        }

        statusMap[perm.permission] = status;
      }

      if (!mounted) return;

      setPermissionStatus(statusMap);

      // Optional: warn if any required permission is blocked
      const blockedRequired = permissionsToRequest.filter(
        p => p.required && (
          statusMap[p.permission] === RESULTS.BLOCKED ||
          statusMap[p.permission] === RESULTS.DENIED
        ),
      );
      if (blockedRequired.length > 0) {
        Alert.alert(
          'Permissions Required',
          `Please allow required permissions (${blockedRequired.map(p => p.name).join(', ')}) from Settings for full app functionality.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => openSettings() },
          ],
        );
      }

      await AsyncStorage.setItem(ONBOARDING_PERMS_DONE_KEY, 'true');
    } catch (e) {
      console.error('OnBoarding permission error', e);
    } finally {
      if (!mounted) return;
      setIsRequestingPermissions(false);
      setIsAppLoading(false);
      setShowWelcomeScreen(true);
    }
  };

  requestAllPermissions();

  return () => {
    mounted = false;
  };
}, [permissionsToRequest]);


  // Optimized handleNext with reduced animation complexity
  const handleNext = useCallback(async () => {
    if (currentSlide < slides.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * screenWidth,
        animated: true,
      });
    } else {
      try {
        await AsyncStorage.setItem('shield_onboarding_completed', 'true');
      } catch (e) {
        console.log('Failed to set onboarding flag', e);
      }

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => navigation.navigate('SetPassword'));
    }
  }, [currentSlide, slides.length, navigation, fadeAnim]);

  const currentSlideData = slides[currentSlide];

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Simplified Matrix Background Component
  const MatrixBackground = React.memo(() => (
    <View style={styles.matrixBackground}>
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={styles.matrixColumn}>
          {Array.from({ length: 15 }, (_, j) => (
            <Text key={j} style={styles.matrixChar}>
              {Math.random() > 0.5 ? '1' : '0'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  ));

  // Simplified Cyber Grid Component
  const CyberGrid = React.memo(() => (
    <View style={styles.cyberGrid}>
      {Array.from({ length: 4 }, (_, i) => (
        <View
          key={`h-${i}`}
          style={[
            styles.gridLineHorizontal,
            { top: `${(i + 1) * 20}%` }
          ]}
        />
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <View
          key={`v-${i}`}
          style={[
            styles.gridLineVertical,
            { left: `${(i + 1) * 25}%` }
          ]}
        />
      ))}
    </View>
  ));

  // Permission Request Screen (kept for visual consistency, but now skips instantly)
  if (isRequestingPermissions) {
    const progress = 100; // always complete when shown

    return (
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#16213e']}
        style={styles.wrapper}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <MatrixBackground />
        <CyberGrid />

        <View style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <Text style={styles.permissionIcon}>🔐</Text>
            <Text style={styles.permissionTitle}>SECURITY CLEARANCE</Text>
            <Text style={styles.permissionSubtitle}>SYSTEM ACCESS</Text>
            <Text style={styles.permissionDescription}>
              Configuring security protocols...
            </Text>

            <View style={styles.permissionProgressContainer}>
              <View style={styles.permissionProgressBar}>
                <LinearGradient
                  colors={['#00ff88', '#00ccff', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.permissionProgressFill,
                    { width: `${progress}%` }
                  ]}
                />
              </View>
              <Text style={styles.permissionProgressText}>
                {Math.round(progress)}% COMPLETE
              </Text>
            </View>

            <Text style={styles.permissionStatus}>Almost done...</Text>

            <View style={styles.permissionListContainer}>
              {permissionsToRequest.map((perm, index) => (
                <View key={index} style={styles.permissionListItem}>
                  <View
                    style={[
                      styles.permissionListDot,
                      { backgroundColor: '#00ff88' }
                    ]}
                  />
                  <Text style={styles.permissionListText}>{perm.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (isAppLoading) {
    return (
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#16213e']}
        style={styles.wrapper}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <MatrixBackground />
        <CyberGrid />

        <View style={styles.splashContainer}>
          <Animated.View style={[styles.splashLogoContainer]}>
            <Image
              source={logoImage}
              style={styles.splashLogoImage}
            />
          </Animated.View>

          <Text style={styles.splashTitle}>SHIELD</Text>
          <Text style={styles.splashSubtext}>QUANTUM SECURITY PROTOCOL</Text>
          <Text style={styles.splashLoading}>INITIALIZING SECURITY SYSTEMS...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (showWelcomeScreen) {
    return (
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#16213e']}
        style={styles.wrapper}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <MatrixBackground />
        <CyberGrid />

        <View style={styles.splashContainer}>
          <Animated.View style={styles.welcomeLogoContainer}>
            <Image
              source={logoImage}
              style={styles.welcomeLogoImage}
            />
          </Animated.View>

          <Text style={styles.welcomeTitle}>
            WELCOME TO{'\n'}SHIELD PROTOCOL
          </Text>
          <Text style={styles.welcomeSubtitle}>
            NEXT-GENERATION CYBERSECURITY DEFENSE SYSTEM
          </Text>

          <TouchableOpacity
            onPress={() => setShowWelcomeScreen(false)}
            activeOpacity={0.8}
            style={styles.welcomeButton}
          >
            <LinearGradient
              colors={['#00ff88', '#00ccff', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.welcomeButtonGradient}
            >
              <Text style={styles.welcomeButtonText}>INITIALIZE PROTOCOL</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
        <View style={styles.slideBackground}>
          <LinearGradient
            colors={['#0a0a0a', '#1a1a2e', '#16213e']}
            style={StyleSheet.absoluteFillObject}
          />
          <MatrixBackground />
          <CyberGrid />
        </View>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const slideIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            setCurrentSlide(slideIndex);
          }}
          style={styles.scrollView}
          bounces={false}
          scrollEventThrottle={16}
        >
          {slides.map((slide, index) => (
            <View key={slide.id} style={styles.slide}>
              <View style={styles.contentContainer}>
                <Text style={styles.slideIcon}>{slide.icon}</Text>
                <Text style={styles.subtitle}>{slide.subtitle}</Text>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.description}>{slide.description}</Text>

                <View style={styles.featuresContainer}>
                  {slide.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <View
                        style={[
                          styles.featureDot,
                          { backgroundColor: slide.primaryColor }
                        ]}
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.codeContainer}>
                  <Text
                    style={[
                      styles.codePattern,
                      { color: slide.secondaryColor }
                    ]}
                  >
                    {slide.codePattern}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.fixedBottomContainer}>
          <View style={styles.paginationContainer}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  currentSlide === index && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.8}
            style={styles.nextButton}
          >
            <LinearGradient
              colors={[
                currentSlideData.primaryColor,
                currentSlideData.secondaryColor,
                currentSlideData.tertiaryColor,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {currentSlide === slides.length - 1 ? "ACTIVATE SHIELD" : "NEXT PROTOCOL"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <LinearGradient
            colors={['rgba(0,255,136,0.1)', 'rgba(0,204,255,0.1)', 'rgba(139,92,246,0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badgeBackground}
          >
            <Text style={styles.badgeText}>
              🔒 QUANTUM ENCRYPTED • ZERO TRUST VERIFIED
            </Text>
          </LinearGradient>
        </View>
      </Animated.View>
    </View>
  );
};

export default OnBoardingScreen;
