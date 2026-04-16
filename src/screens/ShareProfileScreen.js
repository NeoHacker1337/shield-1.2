import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  StatusBar,
  Platform,
  Share,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'qrcode';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/* ── Constants ── */
const COLORS = {
  primary: '#0D47C9',
  primaryLight: 'rgba(13, 71, 201, 0.08)',
  primarySoft: 'rgba(13, 71, 201, 0.15)',
  accent: '#00C853',
  accentLight: 'rgba(0, 200, 83, 0.1)',
  bgStart: '#F0F4FF',
  bgEnd: '#FFFFFF',
  card: '#FFFFFF',
  qrDot: '#0D2137',
  qrBg: '#FFFFFF',
  text: '#0D2137',
  textSecondary: '#5A6B80',
  textMuted: '#94A3B8',
  border: 'rgba(13, 71, 201, 0.1)',
  shadow: 'rgba(13, 71, 201, 0.12)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.08)',
};

const QR_ERROR_CORRECTION = 'M';
const QR_MAX_SIZE = 280;
const QR_SIZE_RATIO = 0.65;
const AVATAR_SIZE = 72;

/* ── Component ── */
const ShareProfileScreen = () => {
  const [qrValue, setQrValue] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matrix, setMatrix] = useState(null);

  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fadeAnim = useState(new Animated.Value(0))[0];

  const qrSize = useMemo(
    () => Math.min(screenWidth * QR_SIZE_RATIO, QR_MAX_SIZE),
    [screenWidth],
  );

  /* ── Fade-in animation ── */
  const fadeIn = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  /* ── Load user data ── */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user_data');
        const user = userStr ? JSON.parse(userStr) : {};

        const name = user?.name?.trim() || 'User';
        const email = user?.email?.trim() || '';

        setUserName(name);
        setUserEmail(email);

        // ✅ vCard format (IMPORTANT)
        const vCard =
          `BEGIN:VCARD\n` +
          `VERSION:3.0\n` +
          `FN:${name}\n` +
          (email ? `EMAIL:${email}\n` : '') +
          `END:VCARD`;

        setQrValue(vCard);
      } catch (e) {
        console.error('❌ Failed to load user:', e.message);
        setError('Could not load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  /* ── Generate QR matrix ── */
  useEffect(() => {
    if (!qrValue) return;

    try {
      const qr = QRCode.create(qrValue, {
        errorCorrectionLevel: QR_ERROR_CORRECTION,
      });
      const { modules } = qr;
      const grid = [];

      for (let r = 0; r < modules.size; r++) {
        const row = [];
        for (let c = 0; c < modules.size; c++) {
          row.push(modules.get(r, c) ? 1 : 0);
        }
        grid.push(row);
      }

      setMatrix(grid);
      fadeIn();
    } catch (e) {
      console.error('QR error:', e.message);
      setError('Could not generate QR code');
    }
  }, [qrValue, fadeIn]);

  /* ── User initials for avatar ── */
  const initials = useMemo(() => {
    if (!userName || userName === 'User') return '?';
    const parts = userName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }, [userName]);

  /* ── Share handler ── */
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Contact: ${userName}${userEmail ? ` — ${userEmail}` : ''}`,
        title: 'Share Contact',
      });
    } catch (e) {
      console.error('Share error:', e.message);
    }
  }, [userName, userEmail]);

  /* ── Memoized QR grid ── */
  const renderedQR = useMemo(() => {
    if (!matrix) return null;

    const cellSize = qrSize / matrix.length;

    return matrix.map((row, rowIndex) => (
      <View key={`r-${rowIndex}`} style={styles.qrRow}>
        {row.map((cell, colIndex) => (
          <View
            key={`c-${rowIndex}-${colIndex}`}
            style={[
              styles.qrCell,
              {
                width: cellSize,
                height: cellSize,
                backgroundColor: cell ? COLORS.qrDot : COLORS.qrBg,
                borderRadius: cell ? cellSize * 0.2 : 0,
              },
            ]}
          />
        ))}
      </View>
    ));
  }, [matrix, qrSize]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <View
        style={[
          styles.centered,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.bgStart}
          translucent
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <View
        style={[
          styles.centered,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.bgStart}
          translucent
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Icon name="alert-circle-outline" size={40} color={COLORS.error} />
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      </View>
    );
  }

  /* ── Main render ── */
  return (
    <View
      style={[
        styles.outerContainer,
        {
          paddingTop: insets.top,
        },
      ]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.bgStart}
        translucent
      />

      {/* ── Background decoration circles ── */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* ── Scrollable Content ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        keyboardShouldPersistTaps="handled"
        overScrollMode="always">

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Icon name="qrcode-scan" size={22} color={COLORS.primary} />
          </View>
          <Text style={styles.headerTitle}>Share Profile</Text>
          <Text style={styles.headerSubtitle}>
            Let others scan to save your contact
          </Text>
        </View>

        {/* ── Profile Card ── */}
        <Animated.View style={[styles.profileCard, { opacity: fadeAnim }]}>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
            <View style={styles.verifiedBadge}>
              <Icon name="check-decagram" size={20} color={COLORS.accent} />
            </View>
          </View>

          {/* User Info */}
          <Text style={styles.userName}>{userName}</Text>
          {userEmail ? (
            <View style={styles.emailRow}>
              <Icon
                name="email-outline"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={styles.userEmail}>{userEmail}</Text>
            </View>
          ) : null}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>SCAN QR CODE</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* QR Code */}
          <View style={styles.qrOuterWrap}>
            <View style={styles.qrCornerTL} />
            <View style={styles.qrCornerTR} />
            <View style={styles.qrCornerBL} />
            <View style={styles.qrCornerBR} />

            <View
              style={[
                styles.qrContainer,
                { width: qrSize + 24, height: qrSize + 24 },
              ]}
              accessible
              accessibilityLabel={`QR code for ${userName}`}
              accessibilityRole="image">
              <View style={{ width: qrSize, height: qrSize, overflow: 'hidden' }}>
                {renderedQR || (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                )}
              </View>
            </View>
          </View>

          {/* Hint */}
          <View style={styles.hintRow}>
            <Icon name="cellphone-nfc" size={16} color={COLORS.textMuted} />
            <Text style={styles.hintText}>
              Point camera at QR code to scan
            </Text>
          </View>
        </Animated.View>

        {/* ── Footer privacy text (inside scroll) ── */}
        <View style={styles.footer}>
          <Icon name="shield-check-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.footerText}>
            Your data is shared only when scanned
          </Text>
        </View>

      </ScrollView>

      {/* ── Sticky Bottom Button (outside scroll) ── */}
      <View
        style={[
          styles.stickyBottom,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}>
        <TouchableOpacity
          style={styles.actionBtnPrimary}
          onPress={handleShare}
          activeOpacity={0.85}
          accessibilityLabel="Share profile"
          accessibilityRole="button">
          <Icon name="share-variant-outline" size={20} color="#FFF" />
          <Text style={styles.actionBtnPrimaryText}>Share Contact</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ShareProfileScreen;

/* ── Styles ── */
const styles = StyleSheet.create({
  /* Outer wrapper */
  outerContainer: {
    flex: 1,
    backgroundColor: COLORS.bgStart,
  },

  /* ScrollView */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },

  /* Centered (loading/error) */
  centered: {
    flex: 1,
    backgroundColor: COLORS.bgStart,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  /* Background decorations */
  bgCircle1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.primaryLight,
    zIndex: 0,
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.accentLight,
    zIndex: 0,
  },

  /* Loading */
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },

  /* Error */
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* Header */
  header: {
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 1,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    letterSpacing: 0.2,
  },

  /* Profile Card */
  profileCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  /* Avatar */
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarRing: {
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    borderWidth: 2.5,
    borderColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  /* User Info */
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 0.1,
  },

  /* Divider */
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },

  /* QR Code */
  qrOuterWrap: {
    position: 'relative',
    padding: 8,
    marginBottom: 16,
  },
  qrContainer: {
    backgroundColor: COLORS.qrBg,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrRow: {
    flexDirection: 'row',
  },
  qrCell: {
    /* Dynamic styles applied inline */
  },

  /* QR Corner Accents */
  qrCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.primary,
    borderTopLeftRadius: 8,
  },
  qrCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: COLORS.primary,
    borderTopRightRadius: 8,
  },
  qrCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.primary,
    borderBottomLeftRadius: 8,
  },
  qrCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: COLORS.primary,
    borderBottomRightRadius: 8,
  },

  /* Hint */
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },

  /* Sticky Bottom Button */
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.bgStart,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  actionBtnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 20,
    paddingBottom: 100,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },
});