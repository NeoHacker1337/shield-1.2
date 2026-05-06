/**
 * AudioCallScreen.js
 * ──────────────────
 * Full audio call UI.
 *
 * FIXES APPLIED:
 * ✅ Issue 1: Dynamic TURN credentials handled in webrtcService.init() — no change here
 * ✅ Issue 2: Separate fast ICE poll (2s) + signaling poll (3s) — removed from single 6s loop
 * ✅ Issue 3: Safe ICE dedup — uses candidate string key only (not JSON.stringify fallback)
 * ✅ Issue 4: InCallManager.setForceSpeakerphoneOn moved out of startCall (caller) —
 *             applied only in markConnected() after WebRTC is ready
 * ✅ All existing features preserved: hold, mute, speaker toggle, duration timer,
 *    controls auto-hide, compact layout, retry on 429, avatar initial, status pill,
 *    ringback tone, self-offer guard, disconnect grace period
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    BackHandler,
    Platform,
    PermissionsAndroid,
    StatusBar,
    SafeAreaView,
    useWindowDimensions,
    Animated,
    Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InCallManager from 'react-native-incall-manager';
import Icon from 'react-native-vector-icons/MaterialIcons';
import webrtcService from '../services/webrtcService';
import chatService from '../services/chatService';

const DISCONNECTED_GRACE_MS = 5000;
const CONTROLS_AUTO_HIDE_MS = 5000;
const ICE_POLL_INTERVAL_MS = 2000;
const SIGNALING_POLL_INTERVAL_MS = 3000;

const stopCallTones = () => {
    try { InCallManager.stopRingtone(); } catch (_) { }
    try { InCallManager.stopRingback(); } catch (_) { }
};

const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const getStatusTone = (status, isOnHold) => {
    const value = String(status || '').toLowerCase();
    if (isOnHold) return 'hold';
    if (value.includes('denied') || value.includes('failed') || value.includes('ended')) return 'ended';
    if (value.includes('connected')) return 'ongoing';
    return 'connecting';
};

const ControlButton = ({ iconName, label, active, onPress, compact }) => (
    <TouchableOpacity
        style={[styles.controlButton, compact && styles.controlButtonCompact, active && styles.controlButtonActive]}
        onPress={onPress}
        activeOpacity={0.75}
    >
        <Icon name={iconName} size={compact ? 22 : 26} color={active ? '#FFFFFF' : '#C8D3DD'} />
        <Text style={[styles.controlText, active && styles.controlTextActive]}>{label}</Text>
    </TouchableOpacity>
);

const normalizeSessionDescription = (payload, key) => {
    if (!payload) return null;
    if (payload?.type && payload?.sdp) return payload;
    if (payload?.[key]?.type && payload?.[key]?.sdp) return payload[key];
    if (payload?.data?.[key]?.type && payload?.data?.[key]?.sdp) return payload.data[key];
    if (payload?.data?.type && payload?.data?.sdp) return payload.data;
    return null;
};

const AudioCallScreen = ({ route, navigation }) => {
    const { userId, roomId, isCaller, callerName } = route.params ?? {};
    const { width, height } = useWindowDimensions();
    const isCompact = width < 360 || height < 680;

    const [status, setStatus] = useState('Connecting...');
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(false);
    const [isOnHold, setIsOnHold] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [controlsVisible, setControlsVisible] = useState(true);

    const hasAnswered = useRef(false);
    const hasSetRemoteAnswer = useRef(false);
    const appliedIceCandidates = useRef(new Set());
    const hasEndedCall = useRef(false);
    const isMountedRef = useRef(true);
    const signalingIntervalRef = useRef(null);
    const iceIntervalRef = useRef(null);
    const durationIntervalRef = useRef(null);
    const callStartTime = useRef(Date.now());
    const connectedAtRef = useRef(null);
    const disconnectTimeoutRef = useRef(null);
    const isRingtonePlayingRef = useRef(false);
    const callerRetryTimeoutRef = useRef(null);
    const currentUserIdRef = useRef(null);
    const ringbackSoundRef = useRef(null);
    const controlsTimerRef = useRef(null);
    const speakerAppliedRef = useRef(false); // ✅ Issue 4: prevent double speaker apply
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const displayName = callerName || (isCaller ? 'Outgoing Call' : 'Incoming Call');
    const avatarInitial = String(displayName || 'C').trim().charAt(0).toUpperCase() || 'C';
    const statusTone = getStatusTone(status, isOnHold);
    const visibleStatus = isOnHold ? 'On Hold' : status;
    const callMeta = isConnected
        ? formatDuration(durationSeconds)
        : isCaller
        ? 'Waiting for answer'
        : 'Preparing secure audio';

    // ─────────────────────────────────────────────
    // CONTROLS AUTO-HIDE
    // ─────────────────────────────────────────────

    const animateControls = useCallback((visible) => {
        Animated.timing(fadeAnim, {
            toValue: visible ? 1 : 0,
            duration: 280,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const clearControlsTimer = useCallback(() => {
        if (controlsTimerRef.current) {
            clearTimeout(controlsTimerRef.current);
            controlsTimerRef.current = null;
        }
    }, []);

    const scheduleHideControls = useCallback(() => {
        clearControlsTimer();
        controlsTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
                setControlsVisible(false);
                animateControls(false);
            }
        }, CONTROLS_AUTO_HIDE_MS);
    }, [animateControls, clearControlsTimer]);

    const showControls = useCallback(() => {
        if (!controlsVisible) {
            setControlsVisible(true);
            animateControls(true);
        }
        scheduleHideControls();
    }, [controlsVisible, animateControls, scheduleHideControls]);

    const handleScreenPress = useCallback(() => {
        showControls();
    }, [showControls]);

    // ─────────────────────────────────────────────
    // RINGBACK
    // ─────────────────────────────────────────────

    const startCustomRingback = () => {
        try {
            InCallManager.startRingback('_BUNDLE_');
            isRingtonePlayingRef.current = true;
            console.log('[AudioCallScreen] Ringback started ✅');
        } catch (e) {
            console.log('[AudioCallScreen] Ringback error:', e.message);
        }
    };

    const stopCustomRingback = () => {
        try {
            InCallManager.stopRingback();
            console.log('[AudioCallScreen] Ringback stopped ✅');
        } catch (e) {
            console.log('[AudioCallScreen] stopRingback error:', e.message);
        }
    };

    // ─────────────────────────────────────────────
    // MARK CONNECTED
    // ─────────────────────────────────────────────

    const markConnected = () => {
        setStatus('Connected');
        stopCallTones();
        isRingtonePlayingRef.current = false;
        console.log('[AudioCallScreen] Tones stopped — call connected ✅');

        if (!connectedAtRef.current) {
            connectedAtRef.current = Date.now();
            setIsConnected(true);
            InCallManager.stop();
            InCallManager.start({ media: 'audio' });

            // ✅ Issue 4 FIX: Apply speaker here — after WebRTC is fully ready
            // NOT in startCall() to avoid audio routing conflict on different networks
            if (!speakerAppliedRef.current) {
                speakerAppliedRef.current = true;
                InCallManager.setForceSpeakerphoneOn(false);
                console.log('[AudioCallScreen] Speaker set after connection ✅');
            }

            console.log('[AudioCallScreen] markConnected ✅');
        }
    };

    // ─────────────────────────────────────────────
    // STOP ALL INTERVALS
    // ─────────────────────────────────────────────

    const stopAllIntervals = () => {
        if (signalingIntervalRef.current) clearInterval(signalingIntervalRef.current);
        if (iceIntervalRef.current) clearInterval(iceIntervalRef.current);
        signalingIntervalRef.current = null;
        iceIntervalRef.current = null;
    };

    // ─────────────────────────────────────────────
    // ✅ Issue 3 FIX: Safe ICE dedup — candidate string key only
    // ─────────────────────────────────────────────

    const applyIceCandidate = (candidate) => {
        if (!candidate) return;
        const key = candidate?.candidate;
        if (!key || typeof key !== 'string') {
            console.warn('[AudioCallScreen] Skipping malformed ICE candidate:', candidate);
            return;
        }
        if (appliedIceCandidates.current.has(key)) return;
        appliedIceCandidates.current.add(key);
        webrtcService.addIceCandidate(candidate);
        console.log('[AudioCallScreen] ICE applied ✅ type:', key.match(/typ\s+(\w+)/)?.[1] ?? 'unknown');
    };

    // ─────────────────────────────────────────────
    // LOAD USER ID
    // ─────────────────────────────────────────────

    useEffect(() => {
        const loadCurrentUserId = async () => {
            try {
                const value = await AsyncStorage.getItem('current_user_id');
                if (value) currentUserIdRef.current = String(value);
            } catch { }
        };
        loadCurrentUserId();
    }, []);

    // ─────────────────────────────────────────────
    // DURATION TIMER
    // ─────────────────────────────────────────────

    useEffect(() => {
        if (!isConnected) return undefined;

        durationIntervalRef.current = setInterval(() => {
            if (!connectedAtRef.current) return;
            setDurationSeconds(Math.floor((Date.now() - connectedAtRef.current) / 1000));
        }, 1000);

        return () => {
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
                durationIntervalRef.current = null;
            }
            if (callerRetryTimeoutRef.current) {
                clearTimeout(callerRetryTimeoutRef.current);
                callerRetryTimeoutRef.current = null;
            }
        };
    }, [isConnected]);

    // ─────────────────────────────────────────────
    // MAIN EFFECT
    // ─────────────────────────────────────────────

    useEffect(() => {
        if (!roomId || typeof isCaller !== 'boolean') {
            setStatus('Missing call details');
            return undefined;
        }

        isMountedRef.current = true;

        webrtcService.onRemoteStream = () => {
            console.log('[AudioCallScreen] Remote stream arrived ✅');
            markConnected();
            setStatus('Connected');
        };

        webrtcService.onConnectionState = (state) => {
            console.log('[AudioCallScreen] connectionState:', state);

            if (state === 'connected') {
                if (disconnectTimeoutRef.current) {
                    clearTimeout(disconnectTimeoutRef.current);
                    disconnectTimeoutRef.current = null;
                }
                markConnected();
                setStatus('Connected');
            }

            if (state === 'disconnected') {
                if (disconnectTimeoutRef.current) return;
                disconnectTimeoutRef.current = setTimeout(() => {
                    disconnectTimeoutRef.current = null;
                    if (!hasEndedCall.current) {
                        console.log('[AudioCallScreen] Disconnect persisted — ending call');
                        handleRemoteEndCall();
                    }
                }, DISCONNECTED_GRACE_MS);
                return;
            }

            if (state === 'completed') {
                if (disconnectTimeoutRef.current) {
                    clearTimeout(disconnectTimeoutRef.current);
                    disconnectTimeoutRef.current = null;
                }
                setStatus('Connected');
                markConnected();
            }

            if (state === 'failed' || state === 'closed') {
                console.log('[AudioCallScreen] Connection failed/closed — ending call');
                handleRemoteEndCall();
            }
        };

        startCall();

        // ✅ Issue 2 FIX: Dedicated fast ICE poll every 2s
        iceIntervalRef.current = setInterval(async () => {
            try {
                if (!webrtcService.pc) return;
                const iceRes = await chatService.getIceCandidates(roomId);
                const candidates = iceRes?.data?.candidates ?? [];
                if (candidates.length > 0) {
                    console.log('[AudioCallScreen] ICE poll:', candidates.length,
                        'total | applied:', appliedIceCandidates.current.size);
                    candidates.forEach(applyIceCandidate);
                }
            } catch (e) {
                if (e?.response?.status === 429) return;
                console.log('[AudioCallScreen] ICE poll error:', e?.message);
            }
        }, ICE_POLL_INTERVAL_MS);

        // Signaling poll every 3s — offer / answer / call status only
        signalingIntervalRef.current = setInterval(async () => {
            try {
                const statusRes = await chatService.getCallStatus(roomId);
                const callAge = Date.now() - callStartTime.current;
                const callStatus = statusRes?.data?.status;

                if (callStatus === 'ended' && !hasEndedCall.current && callAge > 15000) {
                    console.log('[AudioCallScreen] Remote ended call');
                    handleRemoteEndCall();
                    return;
                }

                await new Promise(r => setTimeout(r, 300));

                // CALLER — wait for answer
                if (isCaller && !hasSetRemoteAnswer.current) {
                    const res = await chatService.getCallAnswer(roomId);
                    const answer = normalizeSessionDescription(res?.data, 'answer');
                    if (answer) {
                        console.log('[AudioCallScreen] Answer found ✅ — setting remote answer');
                        await webrtcService.setRemoteAnswer(answer);
                        hasSetRemoteAnswer.current = true;
                        console.log('[AudioCallScreen] Remote answer set ✅');
                    }
                }

                // RECEIVER — wait for offer then answer
                if (!isCaller && !hasAnswered.current) {
                    const res = await chatService.getCallOffer(roomId);
                    const offer = normalizeSessionDescription(res?.data, 'offer');
                    const offerCallerId =
                        res?.data?.caller_id ??
                        res?.data?.callerId ??
                        res?.data?.data?.caller_id;

                    if (offerCallerId && String(offerCallerId) === String(currentUserIdRef.current)) {
                        console.log('[AudioCallScreen] Ignored self offer | caller_id:', offerCallerId);
                    } else if (offer?.type && offer?.sdp) {
                        console.log('[AudioCallScreen] Offer ready | type:', offer.type, '| sdp:', offer.sdp.length);
                        try {
                            const answer = await webrtcService.createAnswer(offer);
                            if (answer) {
                                hasAnswered.current = true;
                                setStatus('Connecting...');
                                console.log('[AudioCallScreen] createAnswer complete ✅');
                            }
                        } catch (answerError) {
                            console.log('[AudioCallScreen] createAnswer failed:', answerError?.message);
                            const sigState = webrtcService.pc?.signalingState;
                            if (sigState && sigState !== 'stable') {
                                await webrtcService.init(roomId);
                            }
                        }
                    } else {
                        console.log('[AudioCallScreen] Offer not ready yet — waiting...');
                    }
                }

            } catch (e) {
                if (e?.response?.status === 429) {
                    console.log('[AudioCallScreen] Rate limited — skipping tick');
                    return;
                }
                console.log('[AudioCallScreen] Poll error:', e?.message);
            }
        }, SIGNALING_POLL_INTERVAL_MS);

        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleEndCall();
            return true;
        });

        return () => {
            console.log('[AudioCallScreen] Cleanup');
            isMountedRef.current = false;
            clearControlsTimer();
            stopAllIntervals();
            if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
                disconnectTimeoutRef.current = null;
            }
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
                durationIntervalRef.current = null;
            }
            if (callerRetryTimeoutRef.current) {
                clearTimeout(callerRetryTimeoutRef.current);
                callerRetryTimeoutRef.current = null;
            }
            backHandler.remove();
            stopCallTones();
            isRingtonePlayingRef.current = false;
            InCallManager.stop();
            global.isCallActive = false;
            global.activeCallType = null;
            if (!hasEndedCall.current) {
                hasEndedCall.current = true;
                webrtcService.close();
                chatService.endCall(roomId);
                AsyncStorage.setItem('call_just_ended', 'true');
            }
        };
    }, [isCaller, roomId]);

    // ─────────────────────────────────────────────
    // START CALL
    // ─────────────────────────────────────────────

    const startCall = async (attempt = 0) => {
        if (!isMountedRef.current || hasEndedCall.current) return;

        try {
            if (Platform.OS === 'android') {
                const result = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    {
                        title: 'Microphone Permission',
                        message: 'This app needs access to your microphone for calls.',
                        buttonPositive: 'Allow',
                        buttonNegative: 'Deny',
                    }
                );
                if (result !== PermissionsAndroid.RESULTS.GRANTED) {
                    setStatus('Microphone permission denied');
                    return;
                }
            }

            global.isCallActive = true;
            global.activeCallType = 'audio';
            InCallManager.setKeepScreenOn(true);

            // ✅ Issue 4 FIX: Do NOT call setForceSpeakerphoneOn here
            // It will be applied in markConnected() AFTER WebRTC is fully ready
            // This prevents InCallManager from grabbing audio route before WebRTC track is active

            if (isCaller) {
                InCallManager.start({ media: 'audio', ringback: '_BUNDLE_' });
                isRingtonePlayingRef.current = true;
                console.log('[AudioCallScreen] Custom ringback started ✅');

                await webrtcService.startCaller(roomId, userId);
                if (!isMountedRef.current || hasEndedCall.current) {
                    stopCallTones();
                    return;
                }

                setStatus('Calling...');
            } else {
                await new Promise(r => setTimeout(r, 300));
                if (!isMountedRef.current || hasEndedCall.current) return;

                await webrtcService.init(roomId);

                if (!isMountedRef.current || hasEndedCall.current) return;
                setStatus('Connecting...');
            }

        } catch (e) {
            console.log('[AudioCallScreen] startCall error:', e?.message);
            if (isCaller && e?.response?.status === 429 && attempt < 2
                && isMountedRef.current && !hasEndedCall.current) {
                setStatus(`Server busy, retrying (${attempt + 1}/2)...`);
                callerRetryTimeoutRef.current = setTimeout(() => {
                    callerRetryTimeoutRef.current = null;
                    if (isMountedRef.current && !hasEndedCall.current) startCall(attempt + 1);
                }, 1200 * (attempt + 1));
                return;
            }
            stopCallTones();
            isRingtonePlayingRef.current = false;
            if (isMountedRef.current) setStatus('Connection Failed');
        }
    };

    // ─────────────────────────────────────────────
    // END CALL
    // ─────────────────────────────────────────────

    const handleEndCall = async () => {
        if (hasEndedCall.current) return;
        hasEndedCall.current = true;

        clearControlsTimer();
        stopAllIntervals();
        if (disconnectTimeoutRef.current) { clearTimeout(disconnectTimeoutRef.current); disconnectTimeoutRef.current = null; }
        if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null; }
        if (callerRetryTimeoutRef.current) { clearTimeout(callerRetryTimeoutRef.current); callerRetryTimeoutRef.current = null; }

        stopCallTones();
        isRingtonePlayingRef.current = false;
        InCallManager.stop();
        global.isCallActive = false;
        global.activeCallType = null;
        webrtcService.close();
        chatService.endCall(roomId);

        await AsyncStorage.setItem('call_just_ended', 'true');

        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.replace('MainTabs');
        }
    };

    const handleRemoteEndCall = async () => {
        if (hasEndedCall.current) return;
        hasEndedCall.current = true;

        clearControlsTimer();
        stopAllIntervals();
        if (disconnectTimeoutRef.current) { clearTimeout(disconnectTimeoutRef.current); disconnectTimeoutRef.current = null; }
        if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null; }
        if (callerRetryTimeoutRef.current) { clearTimeout(callerRetryTimeoutRef.current); callerRetryTimeoutRef.current = null; }

        stopCallTones();
        isRingtonePlayingRef.current = false;
        InCallManager.stop();
        global.isCallActive = false;
        global.activeCallType = null;
        webrtcService.close();

        await AsyncStorage.setItem('call_just_ended', 'true');

        setStatus('Call Ended');
        setTimeout(() => {
            if (navigation.canGoBack()) navigation.goBack();
        }, 1500);
    };

    // ─────────────────────────────────────────────
    // CONTROLS
    // ─────────────────────────────────────────────

    const toggleMute = () => {
        const tracks = webrtcService.localStream?.getAudioTracks();
        if (!tracks?.length) return;
        const newMuted = !isMuted;
        tracks.forEach(t => { t.enabled = !newMuted && !isOnHold; });
        setIsMuted(newMuted);
        showControls();
    };

    const toggleHold = () => {
        const tracks = webrtcService.localStream?.getAudioTracks();
        if (!tracks?.length) return;
        const nextHold = !isOnHold;
        tracks.forEach(t => { t.enabled = !nextHold && !isMuted; });
        setIsOnHold(nextHold);
        if (nextHold) {
            setStatus('On Hold');
        } else if (isConnected) {
            setStatus('Connected');
        } else {
            setStatus(isCaller ? 'Calling...' : 'Connecting...');
        }
        showControls();
    };

    const toggleSpeaker = () => {
        const newSpeaker = !isSpeaker;
        InCallManager.setForceSpeakerphoneOn(newSpeaker);
        setIsSpeaker(newSpeaker);
        showControls();
    };

    // ─────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0B0F14" />
            <Pressable style={styles.pressableContainer} onPress={handleScreenPress}>

                {/* Status pill */}
                <View style={styles.topBar}>
                    <View style={[styles.statusPill, styles[`statusPill_${statusTone}`]]}>
                        <View style={[styles.statusDot, styles[`statusDot_${statusTone}`]]} />
                        <Text style={styles.statusPillText}>{visibleStatus}</Text>
                    </View>
                </View>

                {/* Identity section */}
                <View style={styles.identitySection}>
                    <View style={[
                        styles.avatarRing,
                        isCompact && styles.avatarRingCompact,
                        isConnected && !isOnHold && styles.avatarRingLive,
                        isOnHold && styles.avatarRingHold,
                    ]}>
                        <View style={[styles.avatar, isCompact && styles.avatarCompact]}>
                            <Text style={[styles.avatarInitial, isCompact && styles.avatarInitialCompact]}>
                                {avatarInitial}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.callerName, isCompact && styles.callerNameCompact]} numberOfLines={1}>
                        {displayName}
                    </Text>

                    <Text style={styles.callMeta}>{callMeta}</Text>

                    <View style={styles.roomBadge}>
                        <Icon name="meeting-room" size={13} color="#86EFAC" />
                        <Text style={styles.roomBadgeText}>Room {roomId}</Text>
                    </View>
                </View>

                {/* Controls */}
                <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
                    <View style={styles.controlsRowWrapper}>
                        <View style={styles.controlsRow}>
                            <ControlButton
                                iconName={isMuted ? 'mic-off' : 'mic'}
                                label={isMuted ? 'Unmute' : 'Mute'}
                                active={isMuted}
                                onPress={toggleMute}
                                compact={isCompact}
                            />
                            <View style={styles.controlSpacer} />
                            <ControlButton
                                iconName={isSpeaker ? 'volume-up' : 'volume-down'}
                                label={isSpeaker ? 'Speaker' : 'Earpiece'}
                                active={isSpeaker}
                                onPress={toggleSpeaker}
                                compact={isCompact}
                            />
                            <View style={styles.controlSpacer} />
                            <ControlButton
                                iconName={isOnHold ? 'play-circle-outline' : 'pause-circle-outline'}
                                label={isOnHold ? 'Resume' : 'Hold'}
                                active={isOnHold}
                                onPress={toggleHold}
                                compact={isCompact}
                            />
                        </View>
                    </View>

                    {/* End call */}
                    <View style={styles.endCallWrapper}>
                        <TouchableOpacity
                            style={[styles.endCallButton, isCompact && styles.endCallButtonCompact]}
                            onPress={handleEndCall}
                            activeOpacity={0.8}
                        >
                            <Icon name="call-end" size={isCompact ? 28 : 32} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>

            </Pressable>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0F14',
    },
    pressableContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    topBar: {
        minHeight: 56,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 8,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 34,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
    },
    statusPill_connecting: {
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        borderColor: 'rgba(245, 158, 11, 0.32)',
    },
    statusPill_ongoing: {
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        borderColor: 'rgba(34, 197, 94, 0.32)',
    },
    statusPill_hold: {
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        borderColor: 'rgba(59, 130, 246, 0.32)',
    },
    statusPill_ended: {
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderColor: 'rgba(239, 68, 68, 0.32)',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusDot_connecting: { backgroundColor: '#F59E0B' },
    statusDot_ongoing: { backgroundColor: '#22C55E' },
    statusDot_hold: { backgroundColor: '#3B82F6' },
    statusDot_ended: { backgroundColor: '#EF4444' },
    statusPillText: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '700',
    },
    identitySection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 16,
    },
    avatarRing: {
        width: 152,
        height: 152,
        borderRadius: 76,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
    },
    avatarRingCompact: {
        width: 124,
        height: 124,
        borderRadius: 62,
        marginBottom: 20,
    },
    avatarRingLive: {
        borderColor: 'rgba(34,197,94,0.55)',
        backgroundColor: 'rgba(34,197,94,0.08)',
    },
    avatarRingHold: {
        borderColor: 'rgba(59,130,246,0.52)',
        backgroundColor: 'rgba(59,130,246,0.08)',
    },
    avatar: {
        width: 118,
        height: 118,
        borderRadius: 59,
        backgroundColor: '#17212B',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarCompact: {
        width: 96,
        height: 96,
        borderRadius: 48,
    },
    avatarInitial: {
        color: '#F8FAFC',
        fontSize: 44,
        fontWeight: '800',
    },
    avatarInitialCompact: { fontSize: 36 },
    callerName: {
        color: '#F8FAFC',
        fontSize: 30,
        fontWeight: '800',
        maxWidth: '92%',
        textAlign: 'center',
        marginBottom: 8,
    },
    callerNameCompact: { fontSize: 24 },
    callMeta: {
        color: '#AAB6C2',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 18,
    },
    roomBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
        backgroundColor: 'rgba(134,239,172,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(134,239,172,0.18)',
    },
    roomBadgeText: {
        color: '#C8D3DD',
        fontSize: 12,
        fontWeight: '700',
    },
    bottomSection: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    controlsRowWrapper: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: 360,
    },
    controlSpacer: {
        width: 20,
    },
    controlButton: {
        width: 88,
        minHeight: 76,
        borderRadius: 22,
        backgroundColor: '#161D25',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    controlButtonCompact: {
        width: 78,
        minHeight: 68,
        borderRadius: 18,
    },
    controlButtonActive: {
        backgroundColor: '#1F7A5C',
        borderColor: 'rgba(255,255,255,0.18)',
    },
    controlText: {
        color: '#C8D3DD',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    controlTextActive: { color: '#FFFFFF' },
    endCallWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    endCallButton: {
        width: 74,
        height: 74,
        borderRadius: 37,
        backgroundColor: '#E11D48',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#E11D48',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 8,
    },
    endCallButtonCompact: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
});

export default AudioCallScreen;