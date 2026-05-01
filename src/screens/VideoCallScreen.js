/**
 * VideoCallScreen.js
 * ──────────────────
 * Full-screen video call UI.
 * - Remote video fills the screen
 * - Local video as draggable PiP (top-right)
 * - Controls: mute, video toggle, flip camera, speaker, end call
 * - All AudioCallScreen polling bugs fixed
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

const normalizeSessionDescription = (payload, key) => {
    if (!payload) return null;
    if (payload?.type && payload?.sdp)                           return payload;
    if (payload?.[key]?.type && payload?.[key]?.sdp)             return payload[key];
    if (payload?.data?.[key]?.type && payload?.data?.[key]?.sdp) return payload.data[key];
    if (payload?.data?.type && payload?.data?.sdp)               return payload.data;
    return null;
};

const VideoCallScreen = ({ route, navigation }) => {
    const { userId, roomId, isCaller, callerName } = route.params ?? {};

    const [status, setStatus]             = useState('Connecting...');
    const [isMuted, setIsMuted]           = useState(false);
    const [isVideoOff, setIsVideoOff]     = useState(false);
    const [isSpeaker, setIsSpeaker]       = useState(true);
    const [localStreamURL, setLocalStreamURL]   = useState(null);
    const [remoteStreamURL, setRemoteStreamURL] = useState(null);
    const [controlsVisible, setControlsVisible] = useState(true);

    // PiP drag position
    const pipPos = useRef(new Animated.ValueXY({ x: SCREEN_W - PIP_W - 16, y: 48 })).current;

    const hasAnswered           = useRef(false);
    const hasSetRemoteAnswer    = useRef(false);
    const appliedIceCandidates  = useRef(new Set()); // ✅ keyed by candidate string
    const hasEndedCall          = useRef(false);
    const intervalRef           = useRef(null);
    const controlsTimerRef      = useRef(null);
    const callStartTime         = useRef(Date.now());
    const disconnectTimeoutRef  = useRef(null);

    // Auto-hide controls after 4s
    const resetControlsTimer = () => {
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        setControlsVisible(true);
        controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
    };

    // PiP drag responder
    const pipResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: Animated.event(
            [null, { dx: pipPos.x, dy: pipPos.y }],
            { useNativeDriver: false }
        ),
        onPanResponderRelease: () => {
            pipPos.extractOffset();
        },
    });

    useEffect(() => {
        if (!roomId || typeof isCaller !== 'boolean') {
            setStatus('Missing call details');
            return undefined;
        }

        resetControlsTimer();

        webrtcVideoService.onLocalStream = (stream) => {
            console.log('[VideoCallScreen] Local stream ready ✅');
            setLocalStreamURL(stream.toURL());
        };

        webrtcVideoService.onRemoteStream = (stream) => {
            console.log('[VideoCallScreen] Remote stream arrived ✅');
            setRemoteStreamURL(stream.toURL());
            setStatus('Connected ✓');
            resetControlsTimer();
        };

        webrtcVideoService.onConnectionState = (state) => {
            console.log('[VideoCallScreen] connectionState:', state);

            if (state === 'connected') {
                if (disconnectTimeoutRef.current) {
                    clearTimeout(disconnectTimeoutRef.current);
                    disconnectTimeoutRef.current = null;
                }
                setStatus('Connected ✓');
            }

            if (state === 'disconnected') {
                if (disconnectTimeoutRef.current) return;
                disconnectTimeoutRef.current = setTimeout(() => {
                    disconnectTimeoutRef.current = null;
                    if (!hasEndedCall.current) {
                        console.log('[VideoCallScreen] Disconnect persisted — ending call');
                        handleRemoteEndCall();
                    }
                }, DISCONNECTED_GRACE_MS);
                return;
            }

            if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
                disconnectTimeoutRef.current = null;
            }

            if (state === 'closed' || state === 'failed') {
                console.log('[VideoCallScreen] Connection failed — ending call');
                handleRemoteEndCall();
            }
        };

        startCall();

        // ─── Polling loop (every 3s) ───
        intervalRef.current = setInterval(async () => {
            try {
                // Call status check
                const statusRes = await chatService.getVideoCallStatus(roomId);
                const callAge   = Date.now() - callStartTime.current;
                const callStatus = statusRes?.data?.status;

                if (callStatus === 'ended' && !hasEndedCall.current && callAge > 15000) {
                    console.log('[VideoCallScreen] Remote ended call via status poll');
                    handleRemoteEndCall();
                    return;
                }

                // ── CALLER: wait for answer ──
                if (isCaller && !hasSetRemoteAnswer.current) {
                    const res    = await chatService.getVideoCallAnswer(roomId);
                    const answer = normalizeSessionDescription(res?.data, 'answer');

                    if (answer) {
                        console.log('[VideoCallScreen] Answer found ✅ — setting remote answer');
                        await webrtcVideoService.setRemoteAnswer(answer);
                        hasSetRemoteAnswer.current = true;
                        console.log('[VideoCallScreen] Remote answer set ✅');
                    }
                }

                // ── RECEIVER: wait for offer then answer ──
                if (!isCaller && !hasAnswered.current) {
                    const res   = await chatService.getVideoCallOffer(roomId);
                    const offer = normalizeSessionDescription(res?.data, 'offer');

                    if (offer?.type && offer?.sdp) {
                        console.log('[VideoCallScreen] Offer ready | sdp length:', offer.sdp.length);
                        try {
                            const answer = await webrtcVideoService.createAnswer(offer);
                            if (answer) {
                                hasAnswered.current = true;
                                setStatus('Connecting...');
                                console.log('[VideoCallScreen] createAnswer complete ✅');
                            }
                        } catch (answerError) {
                            console.log('[VideoCallScreen] createAnswer failed:', answerError?.message);
                            const sigState = webrtcVideoService.pc?.signalingState;
                            if (sigState && sigState !== 'stable') {
                                await webrtcVideoService.init(roomId);
                            }
                        }
                    } else {
                        console.log('[VideoCallScreen] Video offer not ready yet — waiting...');
                    }
                }

                // ── ICE exchange (both sides) ──
                const iceRes    = await chatService.getVideoIceCandidates(roomId);
                const candidates = iceRes?.data?.candidates || [];

                console.log('[VideoCallScreen] ICE poll | found:', candidates.length,
                            '| applied:', appliedIceCandidates.current.size);

                candidates.forEach((c) => {
                    // ✅ Dedup by candidate string — not array index
                    const key = c?.candidate ?? JSON.stringify(c);
                    if (key && !appliedIceCandidates.current.has(key)) {
                        appliedIceCandidates.current.add(key);
                        webrtcVideoService.addIceCandidate(c);
                        console.log('[VideoCallScreen] ICE applied ✅');
                    }
                });

            } catch (e) {
                if (e?.response?.status === 429) {
                    console.log('[VideoCallScreen] Rate limited — skipping tick');
                    return;
                }
                console.log('[VideoCallScreen] Poll error:', e?.message);
            }
        }, 3000);

        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleEndCall();
            return true;
        });

        return () => {
            console.log('[VideoCallScreen] Cleanup');
            if (intervalRef.current)         { clearInterval(intervalRef.current);   intervalRef.current = null; }
            if (disconnectTimeoutRef.current) { clearTimeout(disconnectTimeoutRef.current); disconnectTimeoutRef.current = null; }
            if (controlsTimerRef.current)     { clearTimeout(controlsTimerRef.current); controlsTimerRef.current = null; }
            backHandler.remove();
            InCallManager.stop();
            if (!hasEndedCall.current) {
                hasEndedCall.current = true;
                global.isCallActive = false;
                webrtcVideoService.close();
                chatService.endVideoCall(roomId);
                AsyncStorage.setItem('call_just_ended', 'true');
            }
        };
    }, [isCaller, roomId]);

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

                const audioOk  = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
                const cameraOk = granted[PermissionsAndroid.PERMISSIONS.CAMERA]        === PermissionsAndroid.RESULTS.GRANTED;

                if (!audioOk || !cameraOk) {
                    setStatus(
                        !cameraOk ? 'Camera permission denied' : 'Microphone permission denied'
                    );
                    return;
                }
            }

            global.isCallActive = true;
            global.activeCallType = 'video';
            InCallManager.start({ media: 'video' });
            InCallManager.setKeepScreenOn(true);
            InCallManager.setForceSpeakerphoneOn(true);

            if (isCaller) {
                await webrtcVideoService.startCaller(roomId, userId);
                setStatus('Calling...');
            } else {
                await webrtcVideoService.init(roomId);
                setStatus('Connecting...');
            }
        } catch (e) {
            console.log('[VideoCallScreen] startCall error:', e?.message);
            setStatus('Connection Failed');
        }
    };

    // ─────────────────────────────────────────────
    // END CALL
    // ─────────────────────────────────────────────
    const handleEndCall = async () => {
        if (hasEndedCall.current) return;
        hasEndedCall.current = true;

        if (intervalRef.current)         { clearInterval(intervalRef.current);   intervalRef.current = null; }
        if (disconnectTimeoutRef.current) { clearTimeout(disconnectTimeoutRef.current); disconnectTimeoutRef.current = null; }

        InCallManager.stop();
        global.isCallActive = false;
        global.activeCallType = null;
        webrtcVideoService.close();
        chatService.endVideoCall(roomId);
        await AsyncStorage.setItem('call_just_ended', 'true');

        if (navigation.canGoBack()) navigation.goBack();
        else navigation.replace('MainTabs');
    };

    const handleRemoteEndCall = async () => {
        if (hasEndedCall.current) return;
        hasEndedCall.current = true;

        if (intervalRef.current)         { clearInterval(intervalRef.current);   intervalRef.current = null; }
        if (disconnectTimeoutRef.current) { clearTimeout(disconnectTimeoutRef.current); disconnectTimeoutRef.current = null; }

        InCallManager.stop();
        global.isCallActive = false;
        global.activeCallType = null;
        webrtcVideoService.close();
        await AsyncStorage.setItem('call_just_ended', 'true');

        setStatus('Call Ended');
        setTimeout(() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.replace('MainTabs');
        }, 1500);
    };

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
        <View style={styles.container} onTouchStart={resetControlsTimer}>
            <StatusBar hidden />

            {/* ── Remote video — full screen background ── */}
            {remoteStreamURL ? (
                <RTCView
                    streamURL={remoteStreamURL}
                    style={styles.remoteVideo}
                    objectFit="cover"
                    mirror={false}
                />
            ) : (
                <View style={styles.remoteVideoPlaceholder}>
                    <Text style={styles.placeholderAvatar}>👤</Text>
                    <Text style={styles.placeholderName}>{callerName ?? `User ${userId}`}</Text>
                    <Text style={styles.statusText}>{status}</Text>
                </View>
            )}

            {/* ── Local video — draggable PiP ── */}
            <Animated.View
                style={[styles.localVideoPip, pipPos.getLayout()]}
                {...pipResponder.panHandlers}
            >
                {localStreamURL && !isVideoOff ? (
                    <RTCView
                        streamURL={localStreamURL}
                        style={styles.localVideoView}
                        objectFit="cover"
                        mirror={true}
                        zOrder={1}
                    />
                ) : (
                    <View style={styles.localVideoOff}>
                        <Text style={styles.videoOffIcon}>🚫</Text>
                    </View>
                )}
            </Animated.View>

            {/* ── Status overlay (top center) ── */}
            {controlsVisible && (
                <View style={styles.statusOverlay}>
                    <Text style={styles.statusOverlayText}>{status}</Text>
                </View>
            )}

            {/* ── Bottom controls ── */}
            {controlsVisible && (
                <View style={styles.controlsWrapper}>
                    <View style={styles.controlsRow}>
                        {/* Mute */}
                        <TouchableOpacity
                            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                            onPress={toggleMute}
                        >
                            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
                            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                        </TouchableOpacity>

                        {/* Video toggle */}
                        <TouchableOpacity
                            style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}
                            onPress={toggleVideo}
                        >
                            <Text style={styles.controlIcon}>{isVideoOff ? '📷' : '📷'}</Text>
                            <Text style={styles.controlLabel}>{isVideoOff ? 'Start Video' : 'Stop Video'}</Text>
                        </TouchableOpacity>

                        {/* Flip camera */}
                        <TouchableOpacity style={styles.controlBtn} onPress={flipCamera}>
                            <Text style={styles.controlIcon}>🔄</Text>
                            <Text style={styles.controlLabel}>Flip</Text>
                        </TouchableOpacity>

                        {/* Speaker */}
                        <TouchableOpacity
                            style={[styles.controlBtn, !isSpeaker && styles.controlBtnActive]}
                            onPress={toggleSpeaker}
                        >
                            <Text style={styles.controlIcon}>{isSpeaker ? '🔊' : '🔈'}</Text>
                            <Text style={styles.controlLabel}>{isSpeaker ? 'Speaker' : 'Earpiece'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* End call */}
                    <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
                        <Text style={styles.endCallIcon}>📵</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Minimal end call always visible when controls hidden */}
            {!controlsVisible && (
                <TouchableOpacity
                    style={styles.endCallBtnMinimal}
                    onPress={handleEndCall}
                >
                    <Text style={styles.endCallIcon}>📵</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },

    // Remote video
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
    placeholderAvatar: { fontSize: 88, marginBottom: 12 },
    placeholderName:   { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
    statusText:        { color: '#aac4e0', fontSize: 16 },

    // Local PiP
    localVideoPip: {
        position: 'absolute',
        width: PIP_W,
        height: PIP_H,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.7)',
        zIndex: 10,
        elevation: 10,
    },
    localVideoView: { width: '100%', height: '100%' },
    localVideoOff: {
        width: '100%', height: '100%',
        backgroundColor: '#2a2a2a',
        justifyContent: 'center', alignItems: 'center',
    },
    videoOffIcon: { fontSize: 28 },

    // Status overlay
    statusOverlay: {
        position: 'absolute',
        top: 48, left: 0, right: 0,
        alignItems: 'center',
        zIndex: 5,
    },
    statusOverlayText: {
        color: '#fff',
        fontSize: 14,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 14,
        overflow: 'hidden',
    },

    // Controls
    controlsWrapper: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        paddingBottom: 40,
        paddingTop: 16,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        zIndex: 20,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        width: '100%',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    controlBtn: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 40,
        paddingVertical: 12,
        paddingHorizontal: 14,
        minWidth: 72,
    },
    controlBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    controlIcon:  { fontSize: 22, marginBottom: 4 },
    controlLabel: { color: '#fff', fontSize: 11, textAlign: 'center' },

    // End call button
    endCallBtn: {
        backgroundColor: '#e53935',
        width: 64, height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    endCallBtnMinimal: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: '#e53935',
        width: 56, height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 30,
    },
    endCallIcon: { fontSize: 26 },
});

export default VideoCallScreen;
