/**
 * screens/Dashboard/ScanScreen.js
 *
 * Professional QR Code & Barcode scanner screen.
 *
 * Features:
 *   - QR code + all major barcode formats
 *   - Flashlight toggle button
 *   - Animated scan line
 *   - Permission handling with user-friendly UI
 *   - Tap-to-focus
 *   - Result display with copy + open URL actions
 *   - Haptic feedback on successful scan
 */

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Linking,
    Alert,
    Vibration,
    StatusBar,
    Clipboard,
    Platform,
    Dimensions,
} from 'react-native';
import {
    Camera,
    useCameraDevice,
    useCodeScanner,
} from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Size of the scan finder box */
const FINDER_SIZE = SCREEN_WIDTH * 0.72;

/** Corner bracket size */
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;

/** Scan line animation duration (ms) */
const SCAN_LINE_DURATION = 2000;

/** Supported barcode formats */
const CODE_TYPES = [
    'qr',
    'ean-13',
    'ean-8',
    'upc-a',
    'upc-e',
    'code-39',
    'code-93',
    'code-128',
    'pdf-417',
    'aztec',
    'data-matrix',
    'itf',
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — detect if scanned value is a URL
// ─────────────────────────────────────────────────────────────────────────────
const isURL = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Corner bracket — renders one corner of the finder box.
 * `position` is one of: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
 */
const CornerBracket = ({ position }) => {
    const isTop = position.startsWith('top');
    const isLeft = position.endsWith('Left');

    return (
        <View
            style={[
                cornerStyles.base,
                isTop ? cornerStyles.top : cornerStyles.bottom,
                isLeft ? cornerStyles.left : cornerStyles.right,
                isTop ? { borderTopWidth: CORNER_THICKNESS } : { borderBottomWidth: CORNER_THICKNESS },
                isLeft ? { borderLeftWidth: CORNER_THICKNESS } : { borderRightWidth: CORNER_THICKNESS },
                isTop && isLeft && cornerStyles.borderTopLeftRadius,
                isTop && !isLeft && cornerStyles.borderTopRightRadius,
                !isTop && isLeft && cornerStyles.borderBottomLeftRadius,
                !isTop && !isLeft && cornerStyles.borderBottomRightRadius,
            ]}
        />
    );
};

const cornerStyles = StyleSheet.create({
    base: {
        position: 'absolute',
        width: CORNER_SIZE,
        height: CORNER_SIZE,
        borderColor: '#2196F3',
    },
    top: { top: 0 },
    bottom: { bottom: 0 },
    left: { left: 0 },
    right: { right: 0 },
    borderTopLeftRadius: { borderTopLeftRadius: 6 },
    borderTopRightRadius: { borderTopRightRadius: 6 },
    borderBottomLeftRadius: { borderBottomLeftRadius: 6 },
    borderBottomRightRadius: { borderBottomRightRadius: 6 },
});

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const PermissionScreen = ({ onRequest, denied }) => (
    <View style={permStyles.container}>
        <View style={permStyles.iconWrapper}>
            <Icon name="camera-alt" size={64} color="#2196F3" />
        </View>
        <Text style={permStyles.title}>Camera Access Required</Text>
        <Text style={permStyles.description}>
            {denied
                ? 'Camera permission was denied. Please enable it in your device Settings to use the scanner.'
                : 'Shield needs camera access to scan QR codes and barcodes securely.'}
        </Text>
        {!denied ? (
            <TouchableOpacity
                style={permStyles.button}
                onPress={onRequest}
                activeOpacity={0.85}
            >
                <Icon name="camera-alt" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={permStyles.buttonText}>Grant Camera Access</Text>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity
                style={permStyles.button}
                onPress={() => Linking.openSettings()}
                activeOpacity={0.85}
            >
                <Icon name="settings" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={permStyles.buttonText}>Open Settings</Text>
            </TouchableOpacity>
        )}
    </View>
);

const permStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B1724',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(33, 150, 243, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(33, 150, 243, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 14,
        letterSpacing: 0.3,
    },
    description: {
        color: '#9BA3B2',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 36,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2196F3',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 14,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULT CARD
// ─────────────────────────────────────────────────────────────────────────────

const ResultCard = ({ value, codeType, onScanAgain }) => {
    const isUrl = isURL(value);

    const handleCopy = () => {
        Clipboard.setString(value);
        Alert.alert('Copied', 'Scan result copied to clipboard.');
    };

    const handleOpen = async () => {
        try {
            const supported = await Linking.canOpenURL(value);
            if (supported) {
                await Linking.openURL(value);
            } else {
                Alert.alert('Cannot Open', 'This URL cannot be opened on your device.');
            }
        } catch {
            Alert.alert('Error', 'Failed to open the URL.');
        }
    };

    return (
        <View style={resultStyles.container}>
            {/* Code type badge */}
            <View style={resultStyles.badge}>
                <Icon
                    name={isUrl ? 'link' : 'qr-code-scanner'}
                    size={14}
                    color="#2196F3"
                    style={{ marginRight: 5 }}
                />
                <Text style={resultStyles.badgeText}>
                    {codeType?.toUpperCase() ?? 'SCAN RESULT'}
                </Text>
            </View>

            {/* Result value */}
            <Text style={resultStyles.value} numberOfLines={4} selectable>
                {value}
            </Text>

            {/* Action buttons */}
            <View style={resultStyles.actions}>
                <TouchableOpacity
                    style={resultStyles.actionBtn}
                    onPress={handleCopy}
                    activeOpacity={0.8}
                >
                    <Icon name="content-copy" size={18} color="#fff" />
                    <Text style={resultStyles.actionText}>Copy</Text>
                </TouchableOpacity>

                {isUrl && (
                    <TouchableOpacity
                        style={[resultStyles.actionBtn, resultStyles.openBtn]}
                        onPress={handleOpen}
                        activeOpacity={0.8}
                    >
                        <Icon name="open-in-browser" size={18} color="#fff" />
                        <Text style={resultStyles.actionText}>Open URL</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[resultStyles.actionBtn, resultStyles.scanAgainBtn]}
                    onPress={onScanAgain}
                    activeOpacity={0.8}
                >
                    <Icon name="qr-code-scanner" size={18} color="#2196F3" />
                    <Text style={[resultStyles.actionText, { color: '#2196F3' }]}>
                        Scan Again
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const resultStyles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#111C29',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(33, 150, 243, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 20,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(33, 150, 243, 0.12)',
        alignSelf: 'flex-start',
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(33, 150, 243, 0.25)',
    },
    badgeText: {
        color: '#2196F3',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    value: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A2740',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    openBtn: {
        backgroundColor: 'rgba(33, 150, 243, 0.15)',
        borderColor: 'rgba(33, 150, 243, 0.3)',
    },
    scanAgainBtn: {
        backgroundColor: 'rgba(33, 150, 243, 0.08)',
        borderColor: 'rgba(33, 150, 243, 0.2)',
    },
    actionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const ScanScreen = () => {
    const insets = useSafeAreaInsets();

    // ── Camera setup ────────────────────────────────────────────────────────
    const device = useCameraDevice('back');

    // ── Permission state ─────────────────────────────────────────────────────
    const [permissionStatus, setPermissionStatus] = useState('checking');
    // 'checking' | 'granted' | 'denied' | 'blocked'

    // ── Flashlight ────────────────────────────────────────────────────────────
    const [torchOn, setTorchOn] = useState(false);

    // ── Scan state ────────────────────────────────────────────────────────────
    const [scannedValue, setScannedValue] = useState(null);
    const [scannedType, setScannedType] = useState(null);
    const [isScanning, setIsScanning] = useState(true);

    // ── Scan line animation ───────────────────────────────────────────────────
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const scanLineLoop = useRef(null);

    // ─── Effects ──────────────────────────────────────────────────────────────

    // Request camera permission on mount
    useEffect(() => {
        requestPermission();
    }, []);

    // Start scan line animation when scanning is active
    useEffect(() => {
        if (isScanning && permissionStatus === 'granted') {
            startScanAnimation();
        } else {
            scanLineAnim.stopAnimation();
            if (scanLineLoop.current) {
                scanLineLoop.current.stop();
            }
        }
        return () => {
            scanLineAnim.stopAnimation();
        };
    }, [isScanning, permissionStatus]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const requestPermission = async () => {
        setPermissionStatus('checking');
        try {
            const permission = Platform.OS === 'ios'
                ? PERMISSIONS.IOS.CAMERA
                : PERMISSIONS.ANDROID.CAMERA;

            const result = await request(permission);

            if (result === RESULTS.GRANTED) {
                setPermissionStatus('granted');
            } else if (result === RESULTS.BLOCKED || result === RESULTS.NEVER_ASK_AGAIN) {
                setPermissionStatus('blocked');
            } else {
                setPermissionStatus('denied');
            }
        } catch (e) {
            console.warn('[ScanScreen] Permission error:', e);
            setPermissionStatus('denied');
        }
    };

    const startScanAnimation = useCallback(() => {
        scanLineAnim.setValue(0);
        scanLineLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: 1,
                    duration: SCAN_LINE_DURATION,
                    useNativeDriver: true,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: SCAN_LINE_DURATION,
                    useNativeDriver: true,
                }),
            ]),
        );
        scanLineLoop.current.start();
    }, [scanLineAnim]);

    /**
     * Code scanner hook — called every frame a code is detected.
     * `isScanning` gate prevents multiple rapid triggers.
     */
    const codeScanner = useCodeScanner({
        codeTypes: CODE_TYPES,
        onCodeScanned: useCallback((codes) => {
            if (!isScanning || !codes.length) return;

            const code = codes[0];
            if (!code.value) return;

            // Haptic feedback
            Vibration.vibrate(100);

            // Turn off torch when result found
            setTorchOn(false);
            setIsScanning(false);
            setScannedValue(code.value);
            setScannedType(code.type);
        }, [isScanning]),
    });

    const handleScanAgain = useCallback(() => {
        setScannedValue(null);
        setScannedType(null);
        setIsScanning(true);
    }, []);

    const handleToggleTorch = useCallback(() => {
        setTorchOn(prev => !prev);
    }, []);

    // ─── Scan line translated Y position ──────────────────────────────────────
    const scanLineTranslateY = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, FINDER_SIZE - 4],
    });

    // ─── Render states ────────────────────────────────────────────────────────

    // Checking permission
    if (permissionStatus === 'checking') {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <Icon name="camera-alt" size={48} color="rgba(33,150,243,0.5)" />
                <Text style={styles.loadingText}>Initialising Camera…</Text>
            </View>
        );
    }

    // Permission denied / blocked
    if (permissionStatus !== 'granted') {
        return (
            <>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <PermissionScreen
                    onRequest={requestPermission}
                    denied={permissionStatus === 'blocked'}
                />
            </>
        );
    }

    // No back camera found (edge case — some devices)
    if (!device) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <Icon name="camera-off" size={48} color="#FF5252" />
                <Text style={styles.loadingText}>No camera found on this device.</Text>
            </View>
        );
    }

    // ─── Main camera view ──────────────────────────────────────────────────────

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* ── Full-screen Camera ─────────────────────────────────────────── */}
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isScanning}
                codeScanner={codeScanner}
                torch={torchOn ? 'on' : 'off'}
            />

            {/* ── Dark overlay with finder cutout ───────────────────────────── */}
            <View style={styles.overlay}>

                {/* Top dark band */}
                <View style={styles.overlayTop} />

                {/* Middle row: left mask | finder box | right mask */}
                <View style={styles.overlayMiddleRow}>
                    <View style={styles.overlaySide} />

                    {/* ── Finder box ──────────────────────────────────────────── */}
                    <View style={styles.finderBox}>

                        {/* Corner brackets */}
                        <CornerBracket position="topLeft" />
                        <CornerBracket position="topRight" />
                        <CornerBracket position="bottomLeft" />
                        <CornerBracket position="bottomRight" />

                        {/* Animated scan line */}
                        {isScanning && (
                            <Animated.View
                                style={[
                                    styles.scanLine,
                                    { transform: [{ translateY: scanLineTranslateY }] },
                                ]}
                            />
                        )}

                        {/* Success overlay when code detected */}
                        {!isScanning && scannedValue && (
                            <View style={styles.successOverlay}>
                                <Icon name="check-circle" size={48} color="#4CAF50" />
                            </View>
                        )}

                    </View>

                    <View style={styles.overlaySide} />
                </View>

                {/* Bottom dark band */}
                <View style={styles.overlayBottom} />

            </View>

            {/* ── Header bar (back hint + title) ────────────────────────────── */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Text style={styles.headerTitle}>Scanner</Text>
                <Text style={styles.headerSubtitle}>
                    Point camera at a QR code or barcode
                </Text>
            </View>

            {/* ── Finder hint label ─────────────────────────────────────────── */}
            <View style={styles.finderLabelContainer}>
                <Text style={styles.finderLabel}>
                    {isScanning ? 'Align code within the frame' : 'Code detected!'}
                </Text>
            </View>

            {/* ── Flashlight button ─────────────────────────────────────────── */}
            <View
                style={[
                    styles.torchContainer,
                    { bottom: insets.bottom + 110 },
                ]}
            >
                <TouchableOpacity
                    style={[
                        styles.torchButton,
                        torchOn && styles.torchButtonActive,
                    ]}
                    onPress={handleToggleTorch}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
                    accessibilityState={{ checked: torchOn }}
                >
                    <Icon
                        name={torchOn ? 'flash-on' : 'flash-off'}
                        size={26}
                        color={torchOn ? '#FFD600' : '#FFFFFF'}
                    />
                </TouchableOpacity>
                <Text style={[styles.torchLabel, torchOn && styles.torchLabelActive]}>
                    {torchOn ? 'Flash ON' : 'Flash OFF'}
                </Text>
            </View>

            {/* ── Result card (slides up when code is scanned) ──────────────── */}
            {scannedValue && (
                <ResultCard
                    value={scannedValue}
                    codeType={scannedType}
                    onScanAgain={handleScanAgain}
                />
            )}

        </View>
    );
};

export default ScanScreen;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.62)';

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#000',
    },

    // ── Loading / error states ─────────────────────────────────────────────
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0B1724',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        color: '#9BA3B2',
        fontSize: 16,
    },

    // ── Overlay ────────────────────────────────────────────────────────────
    overlay: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'column',
    },
    overlayTop: {
        flex: 1,
        backgroundColor: OVERLAY_COLOR,
    },
    overlayMiddleRow: {
        flexDirection: 'row',
        height: FINDER_SIZE,
    },
    overlaySide: {
        flex: 1,
        backgroundColor: OVERLAY_COLOR,
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: OVERLAY_COLOR,
    },

    // ── Finder box ─────────────────────────────────────────────────────────
    finderBox: {
        width: FINDER_SIZE,
        height: FINDER_SIZE,
        overflow: 'hidden',
    },

    // ── Scan line ──────────────────────────────────────────────────────────
    scanLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#2196F3',
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
        elevation: 4,
    },

    // ── Success overlay ────────────────────────────────────────────────────
    successOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(76, 175, 80, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Header ─────────────────────────────────────────────────────────────
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingBottom: 16,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 13,
        marginTop: 4,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },

    // ── Finder label ───────────────────────────────────────────────────────
    finderLabelContainer: {
        position: 'absolute',
        // Vertically centered below the finder box
        top: '50%',
        left: 0,
        right: 0,
        marginTop: (FINDER_SIZE / 2) + 16,
        alignItems: 'center',
    },
    finderLabel: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 13,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        overflow: 'hidden',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },

    // ── Flashlight button ──────────────────────────────────────────────────
    torchContainer: {
        position: 'absolute',
        alignSelf: 'center',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    torchButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    torchButtonActive: {
        backgroundColor: 'rgba(255, 214, 0, 0.2)',
        borderColor: 'rgba(255, 214, 0, 0.6)',
        shadowColor: '#FFD600',
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    },
    torchLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 6,
        fontWeight: '500',
    },
    torchLabelActive: {
        color: '#FFD600',
    },

});