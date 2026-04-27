import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    BackHandler,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InCallManager from 'react-native-incall-manager';
import webrtcService from '../services/webrtcService';
import chatService from '../services/chatService';

const DISCONNECTED_GRACE_MS = 5000;

const normalizeSessionDescription = (payload, key) => {
    if (!payload) return null;

    if (payload?.type && payload?.sdp) return payload;
    if (payload?.[key]?.type && payload?.[key]?.sdp) return payload[key];
    if (payload?.data?.[key]?.type && payload?.data?.[key]?.sdp) return payload.data[key];
    if (payload?.data?.type && payload?.data?.sdp) return payload.data;

    return null;
};

const AudioCallScreen = ({ route, navigation }) => {
    const { userId, roomId, isCaller } = route.params ?? {};

    const [status, setStatus] = useState('Connecting...');
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(true);

    const hasAnswered = useRef(false);
    const hasSetRemoteAnswer = useRef(false);
    const appliedIceCandidates = useRef(new Set());
    const hasEndedCall = useRef(false);
    const intervalRef = useRef(null);
    const callStartTime = useRef(Date.now());
    const disconnectTimeoutRef = useRef(null);

    useEffect(() => {
        if (!roomId || typeof isCaller !== 'boolean') {
            setStatus('Missing call details');
            return undefined;
        }

        webrtcService.onRemoteStream = (stream) => {
            console.log('[AudioCallScreen] Remote stream arrived ✅');
            setStatus('Connected ✓');
        };

        webrtcService.onConnectionState = (state) => {
            console.log('[AudioCallScreen] connectionState:', state);

            if (state === 'connected') {
                if (disconnectTimeoutRef.current) {
                    clearTimeout(disconnectTimeoutRef.current);
                    disconnectTimeoutRef.current = null;
                }
                setStatus('Connected ✓');
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
        intervalRef.current = setInterval(async () => {
            try {
                const statusRes = await chatService.getCallStatus(roomId);

                const callAge = Date.now() - callStartTime.current;
                const callStatus = statusRes?.data?.status;

                if (callStatus === 'ended' && !hasEndedCall.current && callAge > 15000) {
                    console.log('[AudioCallScreen] Remote ended call');
                    handleRemoteEndCall();
                    return;
                }

                if (isCaller) {
                    // caller waits for answer
                    if (!hasSetRemoteAnswer.current) {
                        const res = await chatService.getCallAnswer(roomId);
                        const answer = normalizeSessionDescription(res?.data, 'answer');

                        if (answer) {
                            await webrtcService.setRemoteAnswer(answer);
                            hasSetRemoteAnswer.current = true;
                            setStatus('Connected ✓');
                        }
                    }
                } else {
                    // receiver waits for offer
                    // RECEIVER (Device B)
                    if (!hasAnswered.current) {
                        const res = await chatService.getCallOffer(roomId);
                        const offer = normalizeSessionDescription(res?.data, 'offer');

                        console.log('[AudioCallScreen] offer resolved:', offer?.type, '| sdp length:', offer?.sdp?.length);

                        if (offer?.type && offer?.sdp) {
                            try {
                                const answer = await webrtcService.createAnswer(offer);

                                if (answer) {
                                    // ✅ single send — only here, NOT inside webrtcService
                                    await chatService.sendCallAnswer({
                                        room_id: roomId,
                                        answer,
                                    });

                                    hasAnswered.current = true;
                                    setStatus('Connected ✓');

                                    // ✅ safety flush after answer is sent
                                    await webrtcService.flushPendingIceCandidates();
                                }
                            } catch (answerError) {
                                console.log('[AudioCallScreen] createAnswer failed:', answerError?.message);
                                const sigState = webrtcService.pc?.signalingState;
                                if (sigState && sigState !== 'stable' && sigState !== 'closed') {
                                    await webrtcService.init(roomId);
                                }
                            }
                        } else {
                            console.log('[AudioCallScreen] offer not ready yet — waiting...');
                        }
                    }
                }

                // ICE
                const iceRes = await chatService.getIceCandidates(roomId);
                const candidates = iceRes?.data?.candidates || [];

                candidates.forEach((c, index) => {
                    if (!appliedIceCandidates.current.has(index)) {
                        appliedIceCandidates.current.add(index);
                        webrtcService.addIceCandidate(c);
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
        tracks.forEach(t => { t.enabled = !newMuted; });
        setIsMuted(newMuted);
    };

    const toggleSpeaker = () => {
        const newSpeaker = !isSpeaker;
        InCallManager.setForceSpeakerphoneOn(newSpeaker);
        setIsSpeaker(newSpeaker);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.statusText}>{status}</Text>

            <Text style={styles.debugText}>Room: {roomId}</Text>
            <Text style={styles.debugText}>
                Role: {isCaller ? '📞 Caller' : '📲 Receiver'}
            </Text>

            <View style={styles.controlsRow}>
                <TouchableOpacity
                    style={[styles.controlButton, isMuted && styles.controlActive]}
                    onPress={toggleMute}
                >
                    <Text style={styles.controlText}>
                        {isMuted ? '🔇 Muted' : '🎙️ Mute'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.controlButton, !isSpeaker && styles.controlActive]}
                    onPress={toggleSpeaker}
                >
                    <Text style={styles.controlText}>
                        {isSpeaker ? '🔊 Speaker' : '🔈 Earpiece'}
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
                <Text style={styles.endCallText}>📵 End Call</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
    },
    statusText: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 12,
    },
    debugText: {
        color: '#aaaaaa',
        fontSize: 13,
        marginBottom: 4,
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 32,
        marginBottom: 8,
    },
    controlButton: {
        backgroundColor: '#2e2e4e',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 40,
    },
    controlActive: {
        backgroundColor: '#555577',
    },
    controlText: {
        color: '#ffffff',
        fontSize: 14,
    },
    endCallButton: {
        marginTop: 24,
        backgroundColor: '#e53935',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 50,
    },
    endCallText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default AudioCallScreen;
