import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InCallManager from 'react-native-incall-manager';
import webrtcService from '../services/webrtcService';
import chatService from '../services/chatService';

const AudioCallScreen = ({ route, navigation }) => {
    const { userId, roomId, isCaller } = route.params;

    const [status, setStatus] = useState('Connecting...');
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(true);

    const hasAnswered = useRef(false);
    const hasSetRemoteAnswer = useRef(false);
    const appliedIceCandidates = useRef(new Set());
    const hasEndedCall = useRef(false);
    const intervalRef = useRef(null);

    useEffect(() => {
        webrtcService.onRemoteStream = (stream) => {
            console.log('[AudioCallScreen] Remote stream arrived ✅');
            setStatus('Connected ✓');
        };

        webrtcService.onConnectionState = (state) => {
            console.log('[AudioCallScreen] connectionState:', state);

            if (state === 'connected') {
                setStatus('Connected ✓');
            }

            // 🔥 FIX — END CALL instead of reconnect
            if (state === 'disconnected' || state === 'closed') {
                console.log('[AudioCallScreen] Remote disconnected — ending call');
                handleRemoteEndCall();
            }

            if (state === 'failed') {
                console.log('[AudioCallScreen] Connection failed');
                handleRemoteEndCall();
            }
        };

        startCall();

        // 🔥 FIX — safer polling (5 sec)
        intervalRef.current = setInterval(async () => {
            try {
                const statusRes = await chatService.getCallStatus(roomId);
                const callStatus = statusRes?.data?.status;

                if (callStatus === 'ended' && !hasEndedCall.current) {
                    console.log('[AudioCallScreen] Remote ended call');
                    handleRemoteEndCall();
                    return;
                }

                if (isCaller) {
                    if (!hasSetRemoteAnswer.current) {
                        const res = await chatService.getCallAnswer(roomId);
                        const answer = res?.data?.answer;

                        if (answer) {
                            await webrtcService.setRemoteAnswer(answer);
                            hasSetRemoteAnswer.current = true;
                            setStatus('Connected ✓');
                        }
                    }
                } else {
                    if (!hasAnswered.current) {
                        const res = await chatService.getCallOffer(roomId);
                        const offer = res?.data?.offer;

                        if (offer) {
                            try {
                                const answer = await webrtcService.createAnswer(offer);

                                await chatService.sendCallAnswer({
                                    room_id: roomId,
                                    answer,
                                });

                                hasAnswered.current = true;
                                setStatus('Connected ✓');

                            } catch (answerError) {
                                const state = webrtcService.pc?.signalingState;

                                if (state && state !== 'stable' && state !== 'closed') {
                                    await webrtcService.init(roomId);
                                }
                            }
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
        }, 3000); // 🔥 FIXED

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

            backHandler.remove();
            InCallManager.stop();

            if (!hasEndedCall.current) {
                hasEndedCall.current = true;
                webrtcService.close();
                chatService.endCall(roomId);
                AsyncStorage.setItem('call_just_ended', 'true');
            }
        };
    }, []);

    const startCall = async () => {
        try {
            await webrtcService.init(roomId);

            InCallManager.start({ media: 'audio' });
            InCallManager.setForceSpeakerphoneOn(true);

            if (isCaller) {
                const offer = await webrtcService.createOffer();

                await chatService.sendCallOffer({
                    room_id: roomId,
                    offer,
                    caller_id: userId,
                });

                setStatus('Calling...');
            } else {
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

        InCallManager.stop();
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

        InCallManager.stop();
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
                    <Text style={styles.controlText}>{isMuted ? '🔇 Muted' : '🎙️ Mute'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.controlButton, !isSpeaker && styles.controlActive]}
                    onPress={toggleSpeaker}
                >
                    <Text style={styles.controlText}>{isSpeaker ? '🔊 Speaker' : '🔈 Earpiece'}</Text>
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
