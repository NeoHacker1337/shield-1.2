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
    SafeAreaView,
    useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InCallManager from 'react-native-incall-manager';
import Icon from 'react-native-vector-icons/MaterialIcons';
import webrtcService from '../services/webrtcService';
import chatService from '../services/chatService';

const DISCONNECTED_GRACE_MS = 5000;

// Stops all tones that could be playing on either device.
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
        style={[
            styles.controlButton,
            compact && styles.controlButtonCompact,
            active && styles.controlButtonActive,
        ]}
        activeOpacity={0.82}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
    >
        <Icon
            name={iconName}
            size={compact ? 22 : 24}
            color={active ? '#FFFFFF' : '#DDE6ED'}
        />
        <Text style={[styles.controlText, active && styles.controlTextActive]}>
            {label}
        </Text>
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

    const hasAnswered = useRef(false);
    const hasSetRemoteAnswer = useRef(false);
    const appliedIceCandidates = useRef(new Set());
    const hasEndedCall = useRef(false);
    // ✅ FIX (Code 2 bug): isMountedRef was missing entirely in Code 2
    const isMountedRef = useRef(true);
    const intervalRef = useRef(null);
    const durationIntervalRef = useRef(null);
    const callStartTime = useRef(Date.now());
    const connectedAtRef = useRef(null);
    const disconnectTimeoutRef = useRef(null);
    const isRingtonePlayingRef = useRef(false);
    const callerRetryTimeoutRef = useRef(null);
    const currentUserIdRef = useRef(null);
    const ringbackSoundRef = useRef(null);
    const displayName = callerName || (isCaller ? 'Outgoing Call' : 'Incoming Call');
    const avatarInitial = String(displayName || 'C').trim().charAt(0).toUpperCase() || 'C';
    const statusTone = getStatusTone(status, isOnHold);
    const visibleStatus = isOnHold ? 'On Hold' : status;
    const callMeta = isConnected
        ? formatDuration(durationSeconds)
        : isCaller
            ? 'Waiting for answer'
            : 'Preparing secure audio';



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

    const markConnected = () => {
        // ✅ Always update status
        setStatus('Connected');

        // ✅ Stop ringback (caller) or ringtone (receiver)
        stopCallTones();
        isRingtonePlayingRef.current = false;
        console.log('[AudioCallScreen] Tones stopped — call connected ✅');

        if (!connectedAtRef.current) {
            connectedAtRef.current = Date.now();
            setIsConnected(true);
            InCallManager.stop();
            InCallManager.start({ media: 'audio' });
            InCallManager.setForceSpeakerphoneOn(false); // earpiece by default
            console.log('[AudioCallScreen] markConnected ✅');
        }
    };

    useEffect(() => {
        const loadCurrentUserId = async () => {
            try {
                const value = await AsyncStorage.getItem('current_user_id');
                if (value) currentUserIdRef.current = String(value);
            } catch { }
        };
        loadCurrentUserId();
    }, []);

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

    useEffect(() => {
        if (!roomId || typeof isCaller !== 'boolean') {
            setStatus('Missing call details');
            return undefined;
        }

        // ✅ reset mounted flag every time effect runs
        isMountedRef.current = true;

        webrtcService.onRemoteStream = () => {
            console.log('[AudioCallScreen] Remote stream arrived ✅');
            markConnected();
            setStatus('Connected'); // ✅ guarantee status on receiver side
        };

        webrtcService.onConnectionState = (state) => {
            console.log('[AudioCallScreen] connectionState:', state);

            if (state === 'connected') {
                if (disconnectTimeoutRef.current) {
                    clearTimeout(disconnectTimeoutRef.current);
                    disconnectTimeoutRef.current = null;
                }
                markConnected();
                setStatus('Connected'); // ✅ force status even if markConnected guard blocks
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
                setStatus('Connected'); // ✅ 'completed' also means fully connected
                markConnected();
            }

            if (state === 'failed' || state === 'closed') {
                console.log('[AudioCallScreen] Connection failed/closed — ending call');
                handleRemoteEndCall();
            }
        };

        startCall();

        // ── Polling: 3 staggered sequential requests per tick ──
        // 300ms gaps between requests prevent burst 429s.
        intervalRef.current = setInterval(async () => {
            try {
                // ── Request 1: Call status ──
                const statusRes = await chatService.getCallStatus(roomId);
                const callAge = Date.now() - callStartTime.current;
                const callStatus = statusRes?.data?.status;

                if (callStatus === 'ended' && !hasEndedCall.current && callAge > 15000) {
                    console.log('[AudioCallScreen] Remote ended call');
                    handleRemoteEndCall();
                    return;
                }

                // stagger
                await new Promise(r => setTimeout(r, 300));

                // ── Request 2: Answer (caller) or Offer (receiver) ──
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

                if (!isCaller && !hasAnswered.current) {
                    const res = await chatService.getCallOffer(roomId);
                    const offer = normalizeSessionDescription(res?.data, 'offer');
                    const offerCallerId =
                        res?.data?.caller_id ??
                        res?.data?.callerId ??
                        res?.data?.data?.caller_id;

                    if (offerCallerId && String(offerCallerId) === String(currentUserIdRef.current)) {
                        console.log('[AudioCallScreen] Ignored self offer | caller_id:', offerCallerId);
                        // ✅ FIX (Code 2 bug): do NOT return here — fall through to ICE polling
                        // Code 2 had a hard `return` here which skipped ICE candidates for that tick
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

                // stagger
                await new Promise(r => setTimeout(r, 300));

                // ── Request 3: ICE candidates (both sides) ──
                const iceRes = await chatService.getIceCandidates(roomId);
                const candidates = iceRes?.data?.candidates || [];

                console.log('[AudioCallScreen] ICE poll | found:', candidates.length,
                    '| applied:', appliedIceCandidates.current.size);

                candidates.forEach((c) => {
                    const key = c?.candidate ?? JSON.stringify(c);
                    if (key && !appliedIceCandidates.current.has(key)) {
                        appliedIceCandidates.current.add(key);
                        webrtcService.addIceCandidate(c);
                        console.log('[AudioCallScreen] ICE candidate applied ✅');
                    }
                });

            } catch (e) {
                if (e?.response?.status === 429) {
                    console.log('[AudioCallScreen] Rate limited — skipping tick');
                    return;
                }
                console.log('[AudioCallScreen] Poll error:', e?.message);
            }
        }, 6000);

        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleEndCall();
            return true;
        });

        return () => {
            console.log('[AudioCallScreen] Cleanup');

            // mark unmounted FIRST so every in-flight async callback bails out
            isMountedRef.current = false;

            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
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

            if (isCaller) {
                // ✅ ringback passed inside start() — this is the correct API
                InCallManager.start({ media: 'audio', ringback: '_BUNDLE_' });
                isRingtonePlayingRef.current = true;
                console.log('[AudioCallScreen] Custom ringback started ✅');

                await webrtcService.startCaller(roomId, userId);
                if (!isMountedRef.current || hasEndedCall.current) {
                    stopCallTones();
                    return;
                }

                InCallManager.setForceSpeakerphoneOn(isSpeaker);
                setStatus('Calling...');
            } else {
                await new Promise(r => setTimeout(r, 300));
                if (!isMountedRef.current || hasEndedCall.current) return;

                // ✅ NO startRingtone here — IncomingCallScreen already rang before accept
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

    const handleEndCall = async () => {
        if (hasEndedCall.current) return;
        hasEndedCall.current = true;

        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
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

        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
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

    const toggleMute = () => {
        const tracks = webrtcService.localStream?.getAudioTracks();
        if (!tracks?.length) return;
        const newMuted = !isMuted;
        tracks.forEach(t => { t.enabled = !newMuted && !isOnHold; });
        setIsMuted(newMuted);
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
    };

    const toggleSpeaker = () => {
        const newSpeaker = !isSpeaker;
        InCallManager.setForceSpeakerphoneOn(newSpeaker);
        setIsSpeaker(newSpeaker);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#0B0F14" barStyle="light-content" />

            <View style={styles.topBar}>
                <View style={[styles.statusPill, styles[`statusPill_${statusTone}`]]}>
                    <View style={[styles.statusDot, styles[`statusDot_${statusTone}`]]} />
                    <Text style={styles.statusPillText}>{visibleStatus}</Text>
                </View>
            </View>

            <View style={styles.identitySection}>
                <View
                    style={[
                        styles.avatarRing,
                        isCompact && styles.avatarRingCompact,
                        statusTone === 'ongoing' && styles.avatarRingLive,
                        statusTone === 'hold' && styles.avatarRingHold,
                    ]}
                >
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
                    <Icon name="lock" size={14} color="#86EFAC" />
                    <Text style={styles.roomBadgeText}>Room {roomId}</Text>
                </View>
            </View>

            <View style={styles.controlsPanel}>
                <View style={styles.controlsGrid}>
                    <ControlButton
                        iconName={isMuted ? 'mic-off' : 'mic'}
                        label={isMuted ? 'Muted' : 'Mute'}
                        active={isMuted}
                        compact={isCompact}
                        onPress={toggleMute}
                    />
                    <ControlButton
                        iconName={isSpeaker ? 'volume-up' : 'hearing'}
                        label={isSpeaker ? 'Speaker' : 'Earpiece'}
                        active={!isSpeaker}
                        compact={isCompact}
                        onPress={toggleSpeaker}
                    />
                    <ControlButton
                        iconName={isOnHold ? 'play-arrow' : 'pause'}
                        label={isOnHold ? 'Resume' : 'Hold'}
                        active={isOnHold}
                        compact={isCompact}
                        onPress={toggleHold}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.endCallButton, isCompact && styles.endCallButtonCompact]}
                    activeOpacity={0.84}
                    onPress={handleEndCall}
                    accessibilityRole="button"
                    accessibilityLabel="End call"
                >
                    <Icon name="call-end" size={30} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B0F14', paddingHorizontal: 24, paddingBottom: 24 },
    topBar: { minHeight: 76, justifyContent: 'center', alignItems: 'center' },
    statusPill: { flexDirection: 'row', alignItems: 'center', minHeight: 34, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1 },
    statusPill_connecting: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.32)' },
    statusPill_ongoing: { backgroundColor: 'rgba(34, 197, 94, 0.12)', borderColor: 'rgba(34, 197, 94, 0.32)' },
    statusPill_hold: { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.32)' },
    statusPill_ended: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.32)' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusDot_connecting: { backgroundColor: '#F59E0B' },
    statusDot_ongoing: { backgroundColor: '#22C55E' },
    statusDot_hold: { backgroundColor: '#3B82F6' },
    statusDot_ended: { backgroundColor: '#EF4444' },
    statusPillText: { color: '#F8FAFC', fontSize: 13, fontWeight: '700' },
    identitySection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 16 },
    avatarRing: { width: 152, height: 152, borderRadius: 76, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
    avatarRingCompact: { width: 124, height: 124, borderRadius: 62, marginBottom: 20 },
    avatarRingLive: { borderColor: 'rgba(34,197,94,0.55)', backgroundColor: 'rgba(34,197,94,0.08)' },
    avatarRingHold: { borderColor: 'rgba(59,130,246,0.52)', backgroundColor: 'rgba(59,130,246,0.08)' },
    avatar: { width: 118, height: 118, borderRadius: 59, backgroundColor: '#17212B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    avatarCompact: { width: 96, height: 96, borderRadius: 48 },
    avatarInitial: { color: '#F8FAFC', fontSize: 44, fontWeight: '800' },
    avatarInitialCompact: { fontSize: 36 },
    callerName: { color: '#F8FAFC', fontSize: 30, fontWeight: '800', maxWidth: '92%', textAlign: 'center', marginBottom: 8 },
    callerNameCompact: { fontSize: 24 },
    callMeta: { color: '#AAB6C2', fontSize: 15, fontWeight: '600', marginBottom: 18 },
    roomBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: 'rgba(134,239,172,0.08)', borderWidth: 1, borderColor: 'rgba(134,239,172,0.18)' },
    roomBadgeText: { color: '#C8D3DD', fontSize: 12, fontWeight: '700' },
    controlsPanel: { width: '100%', alignItems: 'center', paddingTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
    controlsGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 390, marginBottom: 22 },
    controlButton: { width: 96, minHeight: 80, borderRadius: 24, backgroundColor: '#161D25', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', gap: 7 },
    controlButtonCompact: { width: 86, minHeight: 72, borderRadius: 20 },
    controlButtonActive: { backgroundColor: '#1F7A5C', borderColor: 'rgba(255,255,255,0.18)' },
    controlText: { color: '#C8D3DD', fontSize: 12, fontWeight: '700', textAlign: 'center' },
    controlTextActive: { color: '#FFFFFF' },
    endCallButton: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#E11D48', justifyContent: 'center', alignItems: 'center', shadowColor: '#E11D48', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8 },
    endCallButtonCompact: { width: 64, height: 64, borderRadius: 32 },
});

export default AudioCallScreen;