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
    StyleSheet, // ✅ FIX: Added missing import
} from 'react-native';

import { styles } from '../assets/ReferralQrScreenStyle';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'qrcode';


/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */
const BRAND_BLUE = '#0D47C9';
const MAX_QR_SIZE = 280;


/* ─────────────────────────────────────────────────────────────
   QR Component
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
            const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });

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

    if (error) {
        return (
            <View style={qrStyles.errorBox}>
                <Icon name="alert-circle-outline" size={40} color="#999" />
                <Text style={qrStyles.errorText}>Failed to generate QR</Text>
            </View>
        );
    }

    if (!matrix) {
        return <ActivityIndicator size="large" color={BRAND_BLUE} />;
    }

    const moduleCount = matrix.length;
    const cellSize = size / moduleCount;

    return (
        <View style={[qrStyles.qrWrapper, { width: size, height: size }]}>
            {matrix.map((row, rowIndex) => (
                <View key={rowIndex} style={qrStyles.qrRow}>
                    {row.map((cell, colIndex) => (
                        <View
                            key={colIndex}
                            style={{
                                width: cellSize,
                                height: cellSize,
                                backgroundColor: cell ? '#000' : '#FFF',
                            }}
                        />
                    ))}
                </View>
            ))}
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
        backgroundColor: '#FFFFFF',
    },
    qrRow: {
        flexDirection: 'row',
    },
    errorBox: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
});


/* ─────────────────────────────────────────────────────────────
   Screen
───────────────────────────────────────────────────────────── */
const ReferralQrScreen = ({ navigation, route }) => {
    const referralLink = route?.params?.referralLink || '';
    const hasLink = !!referralLink && referralLink !== '—';

    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const hasCalledOnClose = useRef(false);

    const safeOnClose = useCallback(() => {
        if (!hasCalledOnClose.current && route?.params?.onClose) {
            hasCalledOnClose.current = true;
            route.params.onClose();
        }
    }, [route]);

    const qrSize = useMemo(
        () => Math.min(width * 0.65, MAX_QR_SIZE),
        [width]
    );

    const handleGoBack = useCallback(() => {
        safeOnClose();
        navigation.goBack();
    }, [navigation, safeOnClose]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', () => {
            safeOnClose();
        });
        return unsubscribe;
    }, [navigation, safeOnClose]);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={BRAND_BLUE}
            />

            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                        <Icon name="arrow-left" size={26} color="#fff" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>Referral QR Code</Text>

                    <View style={styles.headerRightSpace} />
                </View>

                {/* Content */}
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: Math.max(32, insets.bottom + 16) },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        <View style={styles.iconCircle}>
                            <Icon name="qrcode-scan" size={28} color={BRAND_BLUE} />
                        </View>

                        <Text style={styles.cardTitle}>Scan QR Code</Text>

                        <Text style={styles.cardDescription}>
                            Share this QR code with others. It contains your referral link.
                        </Text>

                        <View style={styles.qrContainer}>
                            {hasLink ? (
                                <QRCodeView value={referralLink} size={qrSize} />
                            ) : (
                                <View style={styles.errorContainer}>
                                    <Icon name="alert-circle-outline" size={40} color="#999" />
                                    <Text style={styles.noDataText}>
                                        Referral link not available
                                    </Text>
                                </View>
                            )}
                        </View>

                        {hasLink && (
                            <View style={styles.linkContainer}>
                                <Text style={styles.linkLabel}>Your Referral Link</Text>
                                <Text style={styles.linkText} numberOfLines={2}>
                                    {referralLink}
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

export default ReferralQrScreen;