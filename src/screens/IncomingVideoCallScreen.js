/**
 * IncomingVideoCallScreen.js
 * ──────────────────────────
 * Displayed when Device B receives a video call.
 * Accept → navigates to VideoCallScreen as receiver.
 * Decline → goes back.
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Vibration,
    StatusBar,
    BackHandler,
} from 'react-native';
import InCallManager from 'react-native-incall-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import chatService from '../services/chatService';

const IncomingVideoCallScreen = ({ route, navigation }) => {
    const { roomId, callerId, callerName } = route.params ?? {};
    const hasActed = useRef(false);

    useEffect(() => {
        InCallManager.startRingtone('_BUNDLE_');
        Vibration.vibrate([0, 1000, 1000], true);

        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleDecline();
            return true;
        });

        return () => {
            InCallManager.stopRingtone();
            Vibration.cancel();
            backHandler.remove();
        };
    }, []);

    const handleAccept = async () => {
        if (hasActed.current) return;
        hasActed.current = true;

        console.log('[IncomingVideoCallScreen] Call accepted | roomId:', roomId, '| callerId:', callerId);
        InCallManager.stopRingtone();
        Vibration.cancel();

        try {
            await AsyncStorage.setItem('call_just_ended', 'true');
        } catch (e) {}
        global.activeCallType = 'video';
        global.isCallActive = true;

        navigation.replace('VideoCallScreen', {
            roomId,
            userId:   callerId,
            isCaller: false,
            callerName,
        });
    };

    const handleDecline = async () => {
        if (hasActed.current) return;
        hasActed.current = true;

        console.log('[IncomingVideoCallScreen] Call declined | roomId:', roomId);
        InCallManager.stopRingtone();
        Vibration.cancel();

        try {
            await chatService.endVideoCall(roomId);
            await AsyncStorage.setItem('call_just_ended', 'true');
            global.activeCallType = null;
            global.isCallActive = false;
        } catch (e) {
            console.log('[IncomingVideoCallScreen] decline error:', e?.message);
        }

        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.replace('MainTabs');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Pulsing ring decoration */}
            <View style={styles.pulseOuter}>
                <View style={styles.pulseInner}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarIcon}>🎥</Text>
                    </View>
                </View>
            </View>

            {/* Caller info */}
            <View style={styles.callerInfo}>
                <Text style={styles.callerName}>{callerName ?? `User ${callerId}`}</Text>
                <Text style={styles.callType}>Incoming Video Call</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
                <View style={styles.actionItem}>
                    <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
                        <Text style={styles.actionIcon}>📵</Text>
                    </TouchableOpacity>
                    <Text style={styles.actionLabel}>Decline</Text>
                </View>

                <View style={styles.actionItem}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
                        <Text style={styles.actionIcon}>📹</Text>
                    </TouchableOpacity>
                    <Text style={styles.actionLabel}>Accept</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d1b2a',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingVertical: 60,
    },

    // Pulse rings
    pulseOuter: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(74,144,217,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseInner: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(74,144,217,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1e3a5f',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#4a90d9',
    },
    avatarIcon: { fontSize: 44 },

    // Caller info
    callerInfo: { alignItems: 'center' },
    callerName: {
        color: '#ffffff',
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    callType: {
        color: '#7aafd4',
        fontSize: 16,
        letterSpacing: 0.5,
    },

    // Action buttons
    actions: {
        flexDirection: 'row',
        gap: 72,
    },
    actionItem: {
        alignItems: 'center',
        gap: 10,
    },
    declineBtn: {
        backgroundColor: '#e53935',
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
    },
    acceptBtn: {
        backgroundColor: '#2e7d32',
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
    },
    actionIcon:  { fontSize: 30 },
    actionLabel: { color: '#aac4e0', fontSize: 13 },
});

export default IncomingVideoCallScreen;
