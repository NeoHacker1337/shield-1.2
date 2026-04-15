import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

import styles from '../assets/AboutUsStyles';

const AboutUsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start fade-in and slide-in animations
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

    // Pulsing glow animation
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

    return () => {
      pulseAnimation.stop();
    };
  }, [fadeAnim, slideAnim, scaleAnim, glowAnim]);

  const handleLinkPress = (url) => {
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open URL:', err);
    });
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          paddingTop: Platform.OS === 'android' ? insets.top : 0,
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      {/*
        LinearGradient is kept intentionally for future gradient customisation.
        Currently renders as a solid background matching the app's dark theme.
      */}
      <LinearGradient
        colors={['#020617', '#020617', '#020617']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: Platform.OS === 'ios' ? insets.top : 12 },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.85}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {/*
              MaterialIcons does not include 'arrow-back-ios'.
              'arrow-back' works correctly on both platforms.
            */}
            <Icon name="arrow-back" size={20} color="#E5E7EB" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>About Us</Text>
        </View>

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
            {/* Logo + glow */}
            <View style={styles.logoContainer}>
              {/*
                glowEffect uses opacity/scale animations only (no zIndex: -1 at
                runtime) — the element is rendered before logoBackground so it
                sits visually behind it in the natural stacking order.
              */}
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

              <View style={styles.logoBackground}>
                <Image
                  source={require('../assets/shield-logo.png')}
                  style={styles.logoImage}
                />
              </View>
            </View>

            {/* App name + version */}
            <View style={styles.titleContainer}>
              <Text style={styles.appName}>
                Shield <Text style={styles.appNameAccent}>Security</Text>
              </Text>
              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>

            {/* Mission */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="flag" size={20} color="#4F46E5" />
                <Text style={styles.sectionTitle}>Our Mission</Text>
              </View>
              <Text style={styles.description}>
                At Shield Security, our mission is to provide robust and intuitive
                mobile security solutions that empower users to protect their privacy
                and digital assets with ease. We believe everyone deserves peace of
                mind in the digital world.
              </Text>
            </View>

            {/* What we offer */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="security" size={20} color="#4F46E5" />
                <Text style={styles.sectionTitle}>What We Offer</Text>
              </View>
              <Text style={styles.description}>
                Shield Security offers a comprehensive suite of features including
                secure file locking, privacy protection, app locking, and regular
                security scans to keep your device safe from threats.
              </Text>

              <View style={styles.featuresGrid}>
                <View style={styles.featureItem}>
                  <Icon name="folder" size={18} color="#A5B4FC" />
                  <Text style={styles.featureText}>File Locking</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="visibility-off" size={18} color="#A5B4FC" />
                  <Text style={styles.featureText}>Privacy Protection</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="phonelink-lock" size={18} color="#A5B4FC" />
                  <Text style={styles.featureText}>App Security</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="health-and-safety" size={18} color="#A5B4FC" />
                  <Text style={styles.featureText}>Security Scans</Text>
                </View>
              </View>
            </View>

            {/* Contact */}
            {/* <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="support-agent" size={20} color="#4F46E5" />
                <Text style={styles.sectionTitle}>Contact Us</Text>
              </View>
              <Text style={styles.contactText}>
                For support or inquiries, please visit our website or contact us at:
              </Text>

              <TouchableOpacity
                onPress={() =>
                  handleLinkPress('mailto:support@shieldsecurity.com')
                }
                style={styles.contactLinkContainer}
                activeOpacity={0.85}
              >
                <View style={styles.contactLinkContent}>
                  <Icon name="email" size={18} color="#4F46E5" />
                  <Text style={styles.contactLink}>support@example.com</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleLinkPress('https://cicmail.com/')}
                style={styles.contactLinkContainer}
                activeOpacity={0.85}
              >
                <View style={styles.contactLinkContent}>
                  <Icon name="public" size={18} color="#4F46E5" />
                  <Text style={styles.contactLink}>www.cicmail.com</Text>
                </View>
              </TouchableOpacity>
            </View> */}

            {/* Footer */}
            <View style={styles.footerSpacer} />
            <View style={styles.footerLine} />
            <View style={styles.copyrightContainer}>
              <Icon name="copyright" size={14} color="#9CA3AF" />
              <Text style={styles.copyrightText}>
                2025 Shield Security. All rights reserved.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default AboutUsScreen;