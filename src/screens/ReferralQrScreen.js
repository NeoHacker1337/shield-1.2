import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    memo,
    useRef,
} from 'react';

import {
    View,
    Text,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    useWindowDimensions,
    StyleSheet,
    Platform,
    Clipboard,
    Share,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'qrcode';


/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */
const BRAND_BLUE = '#0D47C9';
const MAX_QR_SIZE = 280;
const QR_SIZE_RATIO = 0.65;
const QR_ERROR_LEVEL = 'M';

const COLORS = {
    primary: BRAND_BLUE,
    primaryDark: '#0A3AA8',
    primaryLight: 'rgba(13, 71, 201, 0.08)',
    primarySoft: 'rgba(13, 71, 201, 0.12)',
    accent: '#00C853',
    white: '#FFFFFF',
    bg: '#F0F4FF',
    card: '#FFFFFF',
    text: '#0D2137',
    textSecondary: '#5A6B80',
    textMuted: '#94A3B8',
    border: 'rgba(13, 71, 201, 0.1)',
    shadow: 'rgba(13, 71, 201, 0.15)',
    qrDot: '#0D2137',
    qrBg: '#FFFFFF',
    error: '#EF4444',
    errorBg: 'rgba(239, 68, 68, 0.06)',
    success: '#10B981',
    successBg: 'rgba(16, 185, 129, 0.08)',
    headerGradientStart: BRAND_BLUE,
    headerGradientEnd: '#1565E0',
};


/* ─────────────────────────────────────────────────────────────
   QR Component (memoized)
───────────────────────────────────────────────────────────── */
const QRCodeView = memo(({ value, size }) => {
    const [matrix, setMatrix] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        setMatrix(null);
        setError(false);

        if (!value) {
            setError(true);
            return;
        }

        let isMounted = true;

        try {
            const qr = QRCode.create(value, {
                errorCorrectionLevel: QR_ERROR_LEVEL,
            });

            if (!qr || !qr.modules) {
                throw new Error('Invalid QR object returned');
            }

            const { modules } = qr;
            const moduleCount = modules.size;
            const grid = [];

            for (let row = 0; row < moduleCount; row++) {
                const rowArr = [];
                for (let col = 0; col < moduleCount; col++) {
                    rowArr.push(modules.get(row, col) ? 1 : 0);
                }
                grid.push(rowArr);
            }

            if (isMounted) {
                setMatrix(grid);
                setError(false);
            }
        } catch (err) {
            console.error('[QRCodeView] Failed:', err);
            if (isMounted) {
                setError(true);
            }
        }

        return () => {
            isMounted = false;
        };
    }, [value]);

    /* ── Memoized QR grid rendering ── */
    const renderedGrid = useMemo(() => {
        if (!matrix) return null;

        const moduleCount = matrix.length;
        const cellSize = size / moduleCount;

        return matrix.map((row, rowIndex) => (
            <View key={`qr-r-${rowIndex}`} style={qrStyles.qrRow}>
                {row.map((cell, colIndex) => (
                    <View
                        key={`qr-c-${rowIndex}-${colIndex}`}
                        style={{
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: cell ? COLORS.qrDot : COLORS.qrBg,
                            borderRadius: cell ? cellSize * 0.15 : 0,
                        }}
                    />
                ))}
            </View>
        ));
    }, [matrix, size]);

    if (error) {
        return (
            <View
                style={qrStyles.errorBox}
                accessible
                accessibilityLabel="QR code generation failed"
                accessibilityRole="alert">
                <View style={qrStyles.errorIconWrap}>
                    <Icon name="alert-circle-outline" size={36} color={COLORS.error} />
                </View>
                <Text style={qrStyles.errorText}>Failed to generate QR code</Text>
                <Text style={qrStyles.errorSubText}>Please try again later</Text>
            </View>
        );
    }

    if (!matrix) {
        return (
            <View style={qrStyles.loadingBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={qrStyles.loadingText}>Generating QR…</Text>
            </View>
        );
    }

    return (
        <View
            style={[qrStyles.qrWrapper, { width: size, height: size }]}
            accessible
            accessibilityLabel="QR code for referral link"
            accessibilityRole="image">
            {renderedGrid}
        </View>
    );
});

QRCodeView.displayName = 'QRCodeView';


/* ─────────────────────────────────────────────────────────────
   QR Styles (kept separate from main styles)
───────────────────────────────────────────────────────────── */
const qrStyles = StyleSheet.create({
    qrWrapper: {
        overflow: 'hidden',
        backgroundColor: COLORS.qrBg,
    },
    qrRow: {
        flexDirection: 'row',
    },
    errorBox: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        minHeight: 160,
    },
    errorIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.errorBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    errorText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 4,
    },
    errorSubText: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    loadingBox: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        minHeight: 160,
        gap: 12,
    },
    loadingText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
    },
});


/* ─────────────────────────────────────────────────────────────
   Screen
───────────────────────────────────────────────────────────── */
const ReferralQrScreen = ({ navigation, route }) => {
    const [referralLink, setReferralLink] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const hasLink = useMemo(
        () => !!referralLink && referralLink !== '—' && referralLink.trim() !== '',
        [referralLink],
    );

    const { width: screenWidth } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const hasCalledOnClose = useRef(false);
    const copyTimeoutRef = useRef(null);

    const safeOnClose = useCallback(() => {
        if (!hasCalledOnClose.current && route?.params?.onClose) {
            hasCalledOnClose.current = true;
            route.params.onClose();
        }
    }, [route]);

    const qrSize = useMemo(
        () => Math.min(screenWidth * QR_SIZE_RATIO, MAX_QR_SIZE),
        [screenWidth],
    );

    const handleGoBack = useCallback(() => {
        safeOnClose();
        navigation.goBack();
    }, [navigation, safeOnClose]);

    /* ── Copy to clipboard ── */
    const handleCopy = useCallback(() => {
        if (!hasLink) return;

        try {
            Clipboard.setString(referralLink);
            setCopied(true);

            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }

            copyTimeoutRef.current = setTimeout(() => {
                setCopied(false);
                copyTimeoutRef.current = null;
            }, 2000);
        } catch (e) {
            console.error('Copy error:', e.message);
        }
    }, [referralLink, hasLink]);

    /* ── Share ── */
    const handleShare = useCallback(async () => {
        if (!hasLink) return;

        try {
            await Share.share({
                message: `Join using my referral link: ${referralLink}`,
                title: 'Referral Link',
            });
        } catch (e) {
            console.error('Share error:', e.message);
        }
    }, [referralLink, hasLink]);

    /* ── Load referral data ── */
    useEffect(() => {
        const loadReferral = async () => {
            try {
                setIsLoading(true);

                // 1. First priority: route params (online flow)
                if (route?.params?.referralLink) {
                    setReferralLink(route.params.referralLink);
                    return;
                }

                // 2. Fallback: local storage (offline)
                const localData = await AsyncStorage.getItem('referral_data');

                if (localData) {
                    const parsed = JSON.parse(localData);

                    // adjust based on your API response structure
                    const link =
                        parsed?.referral_link ||
                        parsed?.referralLink ||
                        parsed?.link ||
                        '';

                    if (link) {
                        setReferralLink(link);
                    }
                }
            } catch (error) {
                console.error('❌ Failed to load referral:', error.message);
            } finally {
                setIsLoading(false);
            }
        };

        loadReferral();
    }, [route]);

    /* ── Navigation cleanup ── */
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', () => {
            safeOnClose();
        });
        return unsubscribe;
    }, [navigation, safeOnClose]);

    /* ── Cleanup copy timeout ── */
    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={['top', 'bottom', 'left', 'right']}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={COLORS.primary}
                translucent={false}
            />

            <View style={styles.container}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={handleGoBack}
                        style={styles.backButton}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessibilityLabel="Go back"
                        accessibilityRole="button">
                        <Icon name="arrow-left" size={24} color={COLORS.white} />
                    </TouchableOpacity>

                    <Text
                        style={styles.headerTitle}
                        numberOfLines={1}
                        accessibilityRole="header">
                        Referral QR Code
                    </Text>

                    <TouchableOpacity
                        onPress={handleShare}
                        style={styles.headerAction}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessibilityLabel="Share referral link"
                        accessibilityRole="button"
                        disabled={!hasLink}>
                        <Icon
                            name="share-variant-outline"
                            size={22}
                            color={hasLink ? COLORS.white : 'rgba(255,255,255,0.4)'}
                        />
                    </TouchableOpacity>
                </View>

                {/* ── Content ── */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingBottom: Math.max(32, insets.bottom + 24),
                        },
                    ]}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                    overScrollMode="always"
                    keyboardShouldPersistTaps="handled">

                    {/* ── Loading state ── */}
                    {isLoading ? (
                        <View style={styles.fullCenterLoader}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.loadingLabel}>Loading referral data…</Text>
                        </View>
                    ) : (
                        <>
                            {/* ── QR Card ── */}
                            <View style={styles.card}>

                                {/* Card Header Icon */}
                                <View style={styles.iconCircle}>
                                    <Icon name="qrcode-scan" size={26} color={COLORS.primary} />
                                </View>

                                <Text style={styles.cardTitle}>Scan QR Code</Text>

                                <Text style={styles.cardDescription}>
                                    Share this QR code with others.{'\n'}
                                    It contains your unique referral link.
                                </Text>

                                {/* QR Display */}
                                <View style={styles.qrOuterWrap}>
                                    {/* Corner accents */}
                                    <View style={styles.qrCornerTL} />
                                    <View style={styles.qrCornerTR} />
                                    <View style={styles.qrCornerBL} />
                                    <View style={styles.qrCornerBR} />

                                    <View
                                        style={[
                                            styles.qrContainer,
                                            {
                                                width: qrSize + 28,
                                                height: qrSize + 28,
                                            },
                                        ]}>
                                        {hasLink ? (
                                            <QRCodeView value={referralLink} size={qrSize} />
                                        ) : (
                                            <View
                                                style={styles.noLinkContainer}
                                                accessible
                                                accessibilityLabel="Referral link not available"
                                                accessibilityRole="alert">
                                                <View style={styles.noLinkIconWrap}>
                                                    <Icon
                                                        name="link-variant-off"
                                                        size={36}
                                                        color={COLORS.textMuted}
                                                    />
                                                </View>
                                                <Text style={styles.noLinkTitle}>
                                                    Link Not Available
                                                </Text>
                                                <Text style={styles.noLinkSub}>
                                                    Referral link could not be loaded
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Referral Link Display */}
                                {hasLink && (
                                    <View style={styles.linkBox}>
                                        <View style={styles.linkHeader}>
                                            <Icon
                                                name="link-variant"
                                                size={16}
                                                color={COLORS.primary}
                                            />
                                            <Text style={styles.linkLabel}>
                                                Your Referral Link
                                            </Text>
                                        </View>

                                        <Text
                                            style={styles.linkText}
                                            numberOfLines={2}
                                            selectable>
                                            {referralLink}
                                        </Text>

                                        <TouchableOpacity
                                            style={[
                                                styles.copyBtn,
                                                copied && styles.copyBtnSuccess,
                                            ]}
                                            onPress={handleCopy}
                                            activeOpacity={0.8}
                                            accessibilityLabel={
                                                copied ? 'Copied' : 'Copy referral link'
                                            }
                                            accessibilityRole="button">
                                            <Icon
                                                name={
                                                    copied
                                                        ? 'check-circle-outline'
                                                        : 'content-copy'
                                                }
                                                size={16}
                                                color={
                                                    copied ? COLORS.success : COLORS.primary
                                                }
                                            />
                                            <Text
                                                style={[
                                                    styles.copyBtnText,
                                                    copied && styles.copyBtnTextSuccess,
                                                ]}>
                                                {copied ? 'Copied!' : 'Copy Link'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* ── Share Button ── */}
                            {hasLink && (
                                <TouchableOpacity
                                    style={styles.shareBtn}
                                    onPress={handleShare}
                                    activeOpacity={0.85}
                                    accessibilityLabel="Share referral link"
                                    accessibilityRole="button">
                                    <Icon
                                        name="share-variant-outline"
                                        size={20}
                                        color={COLORS.white}
                                    />
                                    <Text style={styles.shareBtnText}>
                                        Share Referral Link
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* ── Privacy footer ── */}
                            <View style={styles.footer}>
                                <Icon
                                    name="shield-check-outline"
                                    size={14}
                                    color={COLORS.textMuted}
                                />
                                <Text style={styles.footerText}>
                                    Your referral link is unique and secure
                                </Text>
                            </View>
                        </>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

export default ReferralQrScreen;


/* ─────────────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({

    /* ── Layout ── */
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.primary,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },

    /* ── Header ── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 56,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white,
        textAlign: 'center',
        letterSpacing: -0.3,
        marginHorizontal: 12,
    },
    headerAction: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* ── ScrollView ── */
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 24,
        flexGrow: 1,
    },

    /* ── Loading ── */
    fullCenterLoader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        minHeight: 300,
    },
    loadingLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        letterSpacing: 0.2,
    },

    /* ── Card ── */
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: COLORS.card,
        borderRadius: 24,
        paddingVertical: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.shadow,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 1,
                shadowRadius: 24,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    cardDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        letterSpacing: 0.1,
        marginBottom: 24,
    },

    /* ── QR Code ── */
    qrOuterWrap: {
        position: 'relative',
        padding: 10,
        marginBottom: 20,
    },
    qrContainer: {
        backgroundColor: COLORS.qrBg,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },

    /* Corner accents */
    qrCornerTL: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 22,
        height: 22,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderColor: COLORS.primary,
        borderTopLeftRadius: 10,
        zIndex: 2,
    },
    qrCornerTR: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 22,
        height: 22,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderColor: COLORS.primary,
        borderTopRightRadius: 10,
        zIndex: 2,
    },
    qrCornerBL: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 22,
        height: 22,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderColor: COLORS.primary,
        borderBottomLeftRadius: 10,
        zIndex: 2,
    },
    qrCornerBR: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 22,
        height: 22,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderColor: COLORS.primary,
        borderBottomRightRadius: 10,
        zIndex: 2,
    },

    /* ── No Link State ── */
    noLinkContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    noLinkIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    noLinkTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    noLinkSub: {
        fontSize: 12,
        color: COLORS.textMuted,
        textAlign: 'center',
    },

    /* ── Link Box ── */
    linkBox: {
        width: '100%',
        backgroundColor: COLORS.primaryLight,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    linkHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    linkLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    linkText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 19,
        letterSpacing: 0.1,
        marginBottom: 12,
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.white,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    copyBtnSuccess: {
        backgroundColor: COLORS.successBg,
        borderColor: COLORS.success,
    },
    copyBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
        letterSpacing: 0.2,
    },
    copyBtnTextSuccess: {
        color: COLORS.success,
    },

    /* ── Share Button ── */
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        maxWidth: 400,
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 20,
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
    shareBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: 0.3,
    },

    /* ── Footer ── */
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 'auto',
        paddingTop: 24,
    },
    footerText: {
        fontSize: 11,
        color: COLORS.textMuted,
        letterSpacing: 0.2,
    },
});