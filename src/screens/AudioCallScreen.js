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
    const [isSpeaker, setIsSpeaker] = useState(true);
    const [isOnHold, setIsOnHold] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [durationSeconds, setDurationSeconds] = useState(0);

    const hasAnswered = useRef(false);
    const hasSetRemoteAnswer = useRef(false);
    const appliedIceCandidates = useRef(new Set());
    const hasEndedCall = useRef(false);
    const intervalRef = useRef(null);
    const durationIntervalRef = useRef(null);
    const callStartTime = useRef(Date.now());
    const connectedAtRef = useRef(null);
    const disconnectTimeoutRef = useRef(null);

    const displayName = callerName || (isCaller ? 'Outgoing Call' : 'Incoming Call');
    const avatarInitial = String(displayName || 'C').trim().charAt(0).toUpperCase() || 'C';
    const statusTone = getStatusTone(status, isOnHold);
    const visibleStatus = isOnHold ? 'On Hold' : status;
    const callMeta = isConnected
        ? formatDuration(durationSeconds)
        : isCaller
            ? 'Waiting for answer'
            : 'Preparing secure audio';

    const markConnected = () => {
        if (!connectedAtRef.current) connectedAtRef.current = Date.now();
        setIsConnected(true);
        if (!isOnHold) setStatus('Connected');
    };

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
        };
    }, [isConnected]);

    useEffect(() => {
        if (!roomId || typeof isCaller !== 'boolean') {
            setStatus('Missing call details');
            return undefined;
        }

        webrtcService.onRemoteStream = (stream) => {
            console.log('[AudioCallScreen] Remote stream arrived ✅');
            markConnected();
        };

        webrtcService.onConnectionState = (state) => {
            console.log('[AudioCallScreen] connectionState:', state);

            if (state === 'connected') {
                if (disconnectTimeoutRef.current) {
                    clearTimeout(disconnectTimeoutRef.current);
                    disconnectTimeoutRef.current = null;
                }
                markConnected();
            }

            // Give transient disconnects a moment to recover before ending the call.
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

            if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
                disconnectTimeoutRef.current = null;
            }

            if (state === 'closed' || state === 'failed') {
                console.log('[AudioCallScreen] Remote disconnected/failed — ending call');
                handleRemoteEndCall();
            }
        };

        startCall();

        // polling every 3s
        // intervalRef.current = setInterval(async () => {
        //     try {
        //         const statusRes = await chatService.getCallStatus(roomId);

        //         const callAge = Date.now() - callStartTime.current;
        //         const callStatus = statusRes?.data?.status;

        //         if (callStatus === 'ended' && !hasEndedCall.current && callAge > 15000) {
        //             console.log('[AudioCallScreen] Remote ended call');
        //             handleRemoteEndCall();
        //             return;
        //         }

        //         if (isCaller) {
        //             // caller waits for answer
        //             if (!hasSetRemoteAnswer.current) {
        //                 const res = await chatService.getCallAnswer(roomId);
        //                 const answer = normalizeSessionDescription(res?.data, 'answer');

        //                 if (answer) {
        //                     await webrtcService.setRemoteAnswer(answer);
        //                     hasSetRemoteAnswer.current = true;
        //                     setStatus('Connected ✓');
        //                 }
        //             }
        //         } else {
        //             // receiver waits for offer
        //             // RECEIVER (Device B)
        //             if (!hasAnswered.current) {
        //                 const res = await chatService.getCallOffer(roomId);
        //                 const offer = normalizeSessionDescription(res?.data, 'offer');

        //                 console.log('[AudioCallScreen] offer resolved:', offer?.type, '| sdp length:', offer?.sdp?.length);

        //                 if (offer?.type && offer?.sdp) {
        //                     try {
        //                         const answer = await webrtcService.createAnswer(offer);

        //                         if (answer) {
        //                             // ✅ single send — only here, NOT inside webrtcService
        //                             await chatService.sendCallAnswer({
        //                                 room_id: roomId,
        //                                 answer,
        //                             });

        //                             hasAnswered.current = true;
        //                             setStatus('Connected ✓');

        //                             // ✅ safety flush after answer is sent
        //                             await webrtcService.flushPendingIceCandidates();
        //                         }
        //                     } catch (answerError) {
        //                         console.log('[AudioCallScreen] createAnswer failed:', answerError?.message);
        //                         const sigState = webrtcService.pc?.signalingState;
        //                         if (sigState && sigState !== 'stable' && sigState !== 'closed') {
        //                             await webrtcService.init(roomId);
        //                         }
        //                     }
        //                 } else {
        //                     console.log('[AudioCallScreen] offer not ready yet — waiting...');
        //                 }
        //             }
        //         }

        //         // ICE
        //         const iceRes = await chatService.getIceCandidates(roomId);
        //         const candidates = iceRes?.data?.candidates || [];

        //         candidates.forEach((c, index) => {
        //             if (!appliedIceCandidates.current.has(index)) {
        //                 appliedIceCandidates.current.add(index);
        //                 webrtcService.addIceCandidate(c);
        //             }
        //         });
        //     } catch (e) {
        //         if (e?.response?.status === 429) {
        //             console.log('[AudioCallScreen] Rate limited — skipping tick');
        //             return;
        //         }
        //         console.log('[AudioCallScreen] Poll error:', e?.message);
        //     }
        // }, 3000);

        intervalRef.current = setInterval(async () => {
            try {
                // ── Call status check ──
                const statusRes = await chatService.getCallStatus(roomId);
                const callAge = Date.now() - callStartTime.current;
                const callStatus = statusRes?.data?.status;

                if (callStatus === 'ended' && !hasEndedCall.current && callAge > 15000) {
                    console.log('[AudioCallScreen] Remote ended call');
                    handleRemoteEndCall();
                    return;
                }

                // ── Caller: wait for answer ──
                if (isCaller && !hasSetRemoteAnswer.current) {
                    const res = await chatService.getCallAnswer(roomId);
                    const answer = normalizeSessionDescription(res?.data, 'answer');

                    if (answer) {
                        console.log('[AudioCallScreen] Answer found via poll ✅ — setting remote answer');
                        await webrtcService.setRemoteAnswer(answer);
                        hasSetRemoteAnswer.current = true;
                        console.log('[AudioCallScreen] Remote answer set ✅ — ICE flushing...');
                    }
                }

                // ── Receiver: wait for offer, then answer ──
                if (!isCaller && !hasAnswered.current) {
                    const res = await chatService.getCallOffer(roomId);
                    const offer = normalizeSessionDescription(res?.data, 'offer');

                    if (offer?.type && offer?.sdp) {
                        console.log('[AudioCallScreen] Offer ready | type:', offer.type, '| sdp length:', offer.sdp.length);
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

                // ── ICE exchange (both sides) ──
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
        }, 3000);

        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleEndCall();
            return true;
        });

        return () => {
            console.log('[AudioCallScreen] Cleanup');

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

            backHandler.remove();
            InCallManager.stop();

            if (!hasEndedCall.current) {
                hasEndedCall.current = true;
                webrtcService.close();
                chatService.endCall(roomId);
                AsyncStorage.setItem('call_just_ended', 'true');
            }
        };
    }, [isCaller, roomId]);

    // 🔑 FIXED: use startCaller for caller, init only for receiver
    const startCall = async () => {
        try {
            // ✅ request permissions first
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

            // ✅ pause message polling during call
            global.isCallActive = true;

            InCallManager.start({ media: 'audio' });
            InCallManager.setKeepScreenOn(true);
            InCallManager.setForceSpeakerphoneOn(true);

            if (isCaller) {
                await webrtcService.startCaller(roomId, userId);
                setStatus('Calling...');
            } else {
                await webrtcService.init(roomId);
                setStatus('Incoming Call...');
            }
        } catch (e) {
            console.log('[AudioCallScreen] startCall error:', e?.message);
            setStatus('Connection Failed');
        }
    };

    const handleEndCall = async () => {
        if (hasEndedCall.current) return;
        hasEndedCall.current = true;

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

        InCallManager.stop();
        global.isCallActive = false;
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

        InCallManager.stop();
        global.isCallActive = false;
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
    container: {
        flex: 1,
        backgroundColor: '#0B0F14',
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    topBar: {
        minHeight: 76,
        justifyContent: 'center',
        alignItems: 'center',
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
    statusDot_connecting: {
        backgroundColor: '#F59E0B',
    },
    statusDot_ongoing: {
        backgroundColor: '#22C55E',
    },
    statusDot_hold: {
        backgroundColor: '#3B82F6',
    },
    statusDot_ended: {
        backgroundColor: '#EF4444',
    },
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
    avatarInitialCompact: {
        fontSize: 36,
    },
    callerName: {
        color: '#F8FAFC',
        fontSize: 30,
        fontWeight: '800',
        maxWidth: '92%',
        textAlign: 'center',
        marginBottom: 8,
    },
    callerNameCompact: {
        fontSize: 24,
    },
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
    controlsPanel: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 18,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    controlsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 390,
        marginBottom: 22,
    },
    controlButton: {
        width: 96,
        minHeight: 80,
        borderRadius: 24,
        backgroundColor: '#161D25',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
    },
    controlButtonCompact: {
        width: 86,
        minHeight: 72,
        borderRadius: 20,
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
    controlTextActive: {
        color: '#FFFFFF',
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
