/**
 * VideoCallScreen.js
 * ──────────────────
 * Full-screen video call UI.
 *
 * FIXES APPLIED:
 * ✅ InCallManager.start() moved AFTER webrtcVideoService.init() — prevents audio
 *    routing conflict when TURN fetch + getUserMedia takes longer on different networks
 * ✅ Signaling poll re-init guard fixed — only re-inits on truly broken states
 *    (was incorrectly re-initing on valid 'have-remote-offer' signalingState)
 * ✅ All existing features preserved — controls, PiP, glassmorphism UI, animations
 */

import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    BackHandler,
    Platform,
    PermissionsAndroid,
    StatusBar,
    PanResponder,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InCallManager from 'react-native-incall-manager';
import webrtcVideoService from '../services/webrtcVideoService';
import chatService from '../services/chatService';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PIP_W = 110;
const PIP_H = 150;
const DISCONNECTED_GRACE_MS = 5000;
const ICE_POLL_INTERVAL_MS = 2000;
const SIGNALING_POLL_INTERVAL_MS = 3000;
const CONTROLS_HIDE_DELAY_MS = 4000;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const stopCallTones = () => {
    try { InCallManager.stopRingback(); } catch (_) { }
};

const normalizeSessionDescription = (payload, key) => {
    if (!payload) return null;
    if (payload?.type && payload?.sdp) return payload;
    if (payload?.[key]?.type && payload?.[key]?.sdp) return payload[key];
    if (payload?.data?.[key]?.type && payload?.data?.[key]?.sdp) return payload.data[key];
    if (payload?.data?.type && payload?.data?.sdp) return payload.data;
    return null;
};

// ─────────────────────────────────────────────
// CONTROL BUTTON
// ─────────────────────────────────────────────

const ControlButton = ({ icon, label, onPress, active = false, danger = false, alwaysVisible = false }) => (
    <TouchableOpacity
        style={[
            styles.ctrlBtn,
            active && styles.ctrlBtnActive,
            danger && styles.ctrlBtnDanger,
        ]}
        onPress={onPress}
        activeOpacity={0.75}
    >
        <Text style={danger ? styles.ctrlIconDanger : styles.ctrlIcon}>{icon}</Text>
        {label ? <Text style={styles.ctrlLabel}>{label}</Text> : null}
    </TouchableOpacity>
);

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────

const VideoCallScreen = ({ route, navigation }) => {
    const { userId, roomId, isCaller, callerName } = route.params ?? {};

    // ── State ──
    const [status, setStatus] = useState('Connecting...');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(true);
    const [localStreamURL, setLocalStreamURL] = useState(null);
    const [remoteStreamURL, setRemoteStreamURL] = useState(null);

    // ── UI state ──
    const [controlsVisible, setControlsVisible] = useState(true);
    const controlsAnim = useRef(new Animated.Value(1)).current;

    // ── PiP drag ──
    const pipPos = useRef(new Animated.ValueXY({ x: SCREEN_W - PIP_W - 16, y: 48 })).current;

    // ── Refs ──
    const hasAnswered = useRef(false);
    const hasSetRemoteAnswer = useRef(false);
    const appliedIceCandidates = useRef(new Set());
    const hasEndedCall = useRef(false);
    const signalingIntervalRef = useRef(null);
    const iceIntervalRef = useRef(null);
    const controlsTimerRef = useRef(null);
    const callStartTime = useRef(Date.now());
    const disconnectTimeoutRef = useRef(null);
    const isRingbackPlayingRef = useRef(false);
    const speakerAppliedRef = useRef(false);

    // ─────────────────────────────────────────────
    // UI HELPERS
    // ─────────────────────────────────────────────

    const showControls = () => {
        Animated.timing(controlsAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
        }).start();
        setControlsVisible(true);
    };

    const hideControls = () => {
        Animated.timing(controlsAnim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
        }).start(() => setControlsVisible(false));
    };

    const resetControlsTimer = () => {
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        showControls();
        controlsTimerRef.current = setTimeout(hideControls, CONTROLS_HIDE_DELAY_MS);
    };

    const handleScreenTap = () => {
        resetControlsTimer();
    };

    // ─────────────────────────────────────────────
    // PiP PanResponder
    // ─────────────────────────────────────────────

    const pipResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: Animated.event(
            [null, { dx: pipPos.x, dy: pipPos.y }],
            { useNativeDriver: false }
        ),
        onPanResponderRelease: () => { pipPos.extractOffset(); },
    });

    // ─────────────────────────────────────────────
    // CALL HELPERS
    // ─────────────────────────────────────────────

    const markConnected = () => {
        setStatus('Connected ✓');
        if (isRingbackPlayingRef.current) {
            stopCallTones();
            isRingbackPlayingRef.current = false;
        }
    };

    const applyIceCandidate = (candidate) => {
        if (!candidate) return;
        const key = candidate?.candidate;
        if (!key || typeof key !== 'string') return;
        if (appliedIceCandidates.current.has(key)) return;
        appliedIceCandidates.current.add(key);
        webrtcVideoService.addIceCandidate(candidate);
    };

    const stopAllIntervals = () => {
        if (signalingIntervalRef.current) clearInterval(signalingIntervalRef.current);
        if (iceIntervalRef.current) clearInterval(iceIntervalRef.current);
        signalingIntervalRef.current = null;
        iceIntervalRef.current = null;
    };

    // ─────────────────────────────────────────────
    // END CALL
    // ─────────────────────────────────────────────

    const handleEndCall = async () => {
        if (hasEndedCall.current) return;
        hasEndedCall.current = true;
        stopAllIntervals();
        if (disconnectTimeoutRef.current) clearTimeout(disconnectTimeoutRef.current);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        stopCallTones();
        isRingbackPlayingRef.current = false;
        InCallManager.stop();
        global.isCallActive = false;
        global.activeCallType = null;
        webrtcVideoService.close();
        chatService.endVideoCall(roomId);
        await AsyncStorage.setItem('calljustended', 'true');
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.replace('MainTabs');
    };

    const handleRemoteEndCall = async () => {
        if (hasEndedCall.current) return;
        hasEndedCall.current = true;
        stopAllIntervals();
        if (disconnectTimeoutRef.current) clearTimeout(disconnectTimeoutRef.current);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        stopCallTones();
        isRingbackPlayingRef.current = false;
        InCallManager.stop();
        global.isCallActive = false;
        global.activeCallType = null;
        webrtcVideoService.close();
        await AsyncStorage.setItem('calljustended', 'true');
        setStatus('Call Ended');
        setTimeout(() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.replace('MainTabs');
        }, 1500);
    };

    // ─────────────────────────────────────────────
    // START CALL
    // ─────────────────────────────────────────────

    const startCall = async () => {
        try {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                ]);
                const audioOk = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
                const cameraOk = granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
                if (!audioOk || !cameraOk) {
                    setStatus(!cameraOk ? 'Camera permission denied' : 'Microphone permission denied');
                    return;
                }
            }

            global.isCallActive = true;
            global.activeCallType = 'video';
            InCallManager.setKeepScreenOn(true);

            if (isCaller) {
                // Caller: start InCallManager with ringback BEFORE init (ringback is audio-only, no conflict)
                InCallManager.start({ media: 'video', ringback: '_BUNDLE_' });
                isRingbackPlayingRef.current = true;
                await webrtcVideoService.startCaller(roomId, userId);
                setStatus('Calling...');
            } else {
                // ✅ FIX: init() first — fetches TURN + getUserMedia (camera/mic)
                // InCallManager.start() called AFTER so it doesn't grab audio route
                // before WebRTC tracks are active. On different networks, init() can
                // take 500ms–1s (TURN fetch). Starting InCallManager before this
                // caused audio routing conflicts identical to Issue 4 in AudioCallScreen.
                await webrtcVideoService.init(roomId);
                InCallManager.start({ media: 'video' }); // ✅ MOVED: after init()
                setStatus('Connecting...');
            }

        } catch (e) {
            console.log('[VideoCallScreen] startCall error:', e?.message);
            stopCallTones();
            isRingbackPlayingRef.current = false;
            setStatus('Connection Failed');
        }
    };

    // ─────────────────────────────────────────────
    // MAIN EFFECT
    // ─────────────────────────────────────────────

    useEffect(() => {
        if (!roomId || typeof isCaller !== 'boolean') {
            setStatus('Missing call details');
            return undefined;
        }

        resetControlsTimer();

        webrtcVideoService.onLocalStream = (stream) => {
            setLocalStreamURL(stream.toURL());
        };

        webrtcVideoService.onRemoteStream = (stream) => {
            if (!stream) return;
            setRemoteStreamURL(stream.toURL());
            markConnected();
            resetControlsTimer();
        };

        webrtcVideoService.onConnectionState = (state) => {
            if (state === 'connected' || state === 'completed') {
                markConnected();
                // ✅ Apply speaker AFTER connection established
                if (!speakerAppliedRef.current) {
                    speakerAppliedRef.current = true;
                    InCallManager.setForceSpeakerphoneOn(true);
                }
                const stream = webrtcVideoService.remoteStream;
                if (stream) setRemoteStreamURL(stream.toURL());
            }

            if (state === 'disconnected') {
                if (disconnectTimeoutRef.current) return;
                disconnectTimeoutRef.current = setTimeout(() => {
                    disconnectTimeoutRef.current = null;
                    if (!hasEndedCall.current) handleRemoteEndCall();
                }, DISCONNECTED_GRACE_MS);
                return;
            }

            if (state === 'closed' || state === 'failed') {
                handleRemoteEndCall();
            }
        };

        startCall();

        // ── Fast ICE poll every 2s ──
        iceIntervalRef.current = setInterval(async () => {
            try {
                if (!webrtcVideoService.pc) return;
                const iceRes = await chatService.getVideoIceCandidates(roomId);
                const candidates = iceRes?.data?.candidates ?? [];
                if (candidates.length > 0) {
                    candidates.forEach(applyIceCandidate);
                }
            } catch (e) {
                if (e?.response?.status === 429) return;
                console.log('[VideoCallScreen] ICE poll error:', e?.message);
            }
        }, ICE_POLL_INTERVAL_MS);

        // ── Signaling poll every 3s ──
        signalingIntervalRef.current = setInterval(async () => {
            try {
                if (!webrtcVideoService.pc) return;

                const statusRes = await chatService.getVideoCallStatus(roomId);
                const callAge = Date.now() - callStartTime.current;
                const callStatus = statusRes?.data?.status;

                if (callStatus === 'ended' && !hasEndedCall.current && callAge > 15000) {
                    handleRemoteEndCall();
                    return;
                }

                // CALLER — wait for answer
                if (isCaller && !hasSetRemoteAnswer.current) {
                    const res = await chatService.getVideoCallAnswer(roomId);
                    const answer = normalizeSessionDescription(res?.data, 'answer');
                    if (answer) {
                        await webrtcVideoService.setRemoteAnswer(answer);
                        hasSetRemoteAnswer.current = true;
                        console.log('[VideoCallScreen] Remote answer set ✅');
                    }
                }

                // RECEIVER — wait for offer then answer
                if (!isCaller && !hasAnswered.current) {
                    const res = await chatService.getVideoCallOffer(roomId);
                    const offer = normalizeSessionDescription(res?.data, 'offer');
                    if (offer?.type && offer?.sdp) {
                        try {
                            // ✅ FIX: Only re-init on truly broken states
                            // Previous code re-inited on 'have-remote-offer' which is a
                            // valid intermediate state BEFORE createAnswer — not an error.
                            // This was causing unnecessary PC teardown and adding 1-2s delay.
                            const sigState = webrtcVideoService.pc?.signalingState;
                            const isBroken = sigState === 'closed' || sigState === 'failed';
                            if (isBroken) {
                                console.log('[VideoCallScreen] PC in broken state, reiniting:', sigState);
                                await webrtcVideoService.init(roomId);
                            }

                            const answer = await webrtcVideoService.createAnswer(offer);
                            if (answer) {
                                hasAnswered.current = true;
                                setStatus('Connecting...');
                                console.log('[VideoCallScreen] createAnswer complete ✅');
                            }
                        } catch (answerError) {
                            console.log('[VideoCallScreen] createAnswer failed:', answerError?.message);
                            const sigState = webrtcVideoService.pc?.signalingState;
                            // ✅ Only re-init if state is actually broken
                            if (!sigState || sigState === 'closed') {
                                await webrtcVideoService.init(roomId);
                            }
                        }
                    }
                }

            } catch (e) {
                if (e?.response?.status === 429) return;
                console.log('[VideoCallScreen] Signaling poll error:', e?.message);
            }
        }, SIGNALING_POLL_INTERVAL_MS);

        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleEndCall();
            return true;
        });

        return () => {
            stopAllIntervals();
            if (disconnectTimeoutRef.current) clearTimeout(disconnectTimeoutRef.current);
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
            backHandler.remove();
            stopCallTones();
            isRingbackPlayingRef.current = false;
            InCallManager.stop();
            if (!hasEndedCall.current) {
                hasEndedCall.current = true;
                global.isCallActive = false;
                global.activeCallType = null;
                webrtcVideoService.close();
                chatService.endVideoCall(roomId);
                AsyncStorage.setItem('calljustended', 'true');
            }
        };
    }, [isCaller, roomId]);

    // ─────────────────────────────────────────────
    // CONTROLS
    // ─────────────────────────────────────────────

    const toggleMute = () => {
        const next = !isMuted;
        webrtcVideoService.setAudioEnabled(!next);
        setIsMuted(next);
        resetControlsTimer();
    };

    const toggleVideo = () => {
        const next = !isVideoOff;
        webrtcVideoService.setVideoEnabled(!next);
        setIsVideoOff(next);
        resetControlsTimer();
    };

    const toggleSpeaker = () => {
        const next = !isSpeaker;
        InCallManager.setForceSpeakerphoneOn(next);
        setIsSpeaker(next);
        resetControlsTimer();
    };

    const flipCamera = async () => {
        await webrtcVideoService.flipCamera();
        resetControlsTimer();
    };

    // ─────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────

    return (
        <TouchableWithoutFeedback onPress={handleScreenTap}>
            <View style={styles.container}>
                <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

                {/* ── Remote Video / Placeholder ── */}
                {remoteStreamURL ? (
                    <RTCView
                        streamURL={remoteStreamURL}
                        style={styles.remoteVideo}
                        objectFit="cover"
                        mirror={false}
                    />
                ) : (
                    <View style={styles.remoteVideoPlaceholder}>
                        <View style={styles.avatarRing}>
                            <Text style={styles.placeholderAvatar}>👤</Text>
                        </View>
                        <Text style={styles.placeholderName}>{callerName ?? `User ${userId}`}</Text>
                        <View style={styles.statusPill}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusPillText}>{status}</Text>
                        </View>
                    </View>
                )}

                {/* ── Local PiP ── */}
                <Animated.View
                    style={[styles.localVideoPip, { transform: pipPos.getTranslateTransform() }]}
                    {...pipResponder.panHandlers}
                >
                    {localStreamURL && !isVideoOff ? (
                        <RTCView
                            streamURL={localStreamURL}
                            style={styles.localVideoView}
                            objectFit="cover"
                            mirror={true}
                        />
                    ) : (
                        <View style={styles.localVideoOff}>
                            <Text style={styles.videoOffIcon}>📵</Text>
                        </View>
                    )}
                </Animated.View>

                {/* ── Status Badge ── */}
                <Animated.View style={[styles.statusBadgeWrapper, { opacity: controlsAnim }]}>
                    <Text style={styles.statusBadgeText}>{status}</Text>
                </Animated.View>

                {/* ── Control Bar ── */}
                <View style={styles.controlBarContainer}>

                    {/* Secondary controls — fade in/out */}
                    <Animated.View style={[styles.secondaryControls, { opacity: controlsAnim }]}>
                        <ControlButton
                            icon={isMuted ? '🔇' : '🎙️'}
                            onPress={toggleMute}
                            active={isMuted}
                        />
                        <ControlButton
                            icon={isVideoOff ? '📵' : '📹'}
                            onPress={toggleVideo}
                            active={isVideoOff}
                        />
                        <ControlButton
                            icon="🔄"
                            onPress={flipCamera}
                        />
                        <ControlButton
                            icon={isSpeaker ? '🔊' : '🔉'}
                            onPress={toggleSpeaker}
                            active={isSpeaker}
                        />
                    </Animated.View>

                    {/* End Call — always visible */}
                    <TouchableOpacity
                        style={styles.endCallBtn}
                        onPress={handleEndCall}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.endCallIcon}>📵</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </TouchableWithoutFeedback>
    );
};

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const CTRL_SIZE = 58;
const END_CALL_SIZE = 66;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0f1a',
    },

    // ── Remote Video ──
    remoteVideo: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
    },
    remoteVideoPlaceholder: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0d1b2a',
    },
    avatarRing: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: 'rgba(100,180,255,0.35)',
        backgroundColor: 'rgba(255,255,255,0.07)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#4fa3e0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    placeholderAvatar: {
        fontSize: 60,
    },
    placeholderName: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: 0.3,
        marginBottom: 12,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#4ade80',
        marginRight: 7,
    },
    statusPillText: {
        color: '#c8dff0',
        fontSize: 13,
        fontWeight: '500',
    },

    // ── Local PiP ──
    localVideoPip: {
        position: 'absolute',
        width: PIP_W,
        height: PIP_H,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.55)',
        zIndex: 10,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    localVideoView: {
        width: '100%',
        height: '100%',
    },
    localVideoOff: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1f2e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoOffIcon: {
        fontSize: 26,
    },

    // ── Status Badge ──
    statusBadgeWrapper: {
        position: 'absolute',
        top: 52,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 5,
        pointerEvents: 'none',
    },
    statusBadgeText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '600',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        overflow: 'hidden',
        letterSpacing: 0.2,
    },

    // ── Control Bar ──
    controlBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        paddingTop: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
        zIndex: 20,
    },
    secondaryControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
        gap: 14,
        backgroundColor: 'rgba(10,15,26,0.65)',
        borderRadius: 36,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },

    // ── Individual Control Button ──
    ctrlBtn: {
        width: CTRL_SIZE,
        height: CTRL_SIZE,
        borderRadius: CTRL_SIZE / 2,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    ctrlBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.28)',
        borderColor: 'rgba(255,255,255,0.3)',
    },
    ctrlBtnDanger: {
        backgroundColor: '#dc2626',
        borderColor: '#ef4444',
    },
    ctrlIcon: {
        fontSize: 22,
    },
    ctrlIconDanger: {
        fontSize: 24,
    },
    ctrlLabel: {
        display: 'none',
        color: '#fff',
        fontSize: 10,
        marginTop: 3,
        textAlign: 'center',
    },

    // ── End Call Button ──
    endCallBtn: {
        width: END_CALL_SIZE,
        height: END_CALL_SIZE,
        borderRadius: END_CALL_SIZE / 2,
        backgroundColor: '#dc2626',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        elevation: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,100,100,0.3)',
    },
    endCallIcon: {
        fontSize: 28,
    },
});

export default VideoCallScreen;