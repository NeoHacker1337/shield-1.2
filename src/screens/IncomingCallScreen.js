import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Vibration,
} from 'react-native';
import InCallManager from 'react-native-incall-manager';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ added
import chatService from '../services/chatService';

const IncomingCallScreen = ({ route, navigation }) => {
  const { roomId, callerName, callerId } = route.params;
  const hasActed = useRef(false);

  useEffect(() => {
    InCallManager.startRingtone('_BUNDLE_');
    Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], true);

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleReject();
      return true;
    });

    return () => {
      InCallManager.stopRingtone();
      Vibration.cancel();
      backHandler.remove();
    };
  }, []);

  // ✅ ACCEPT CALL (patched)
  const handleAccept = async () => {
    if (hasActed.current) return;
    hasActed.current = true;

    console.log('[IncomingCallScreen] Call accepted | roomId:', roomId, '| callerId:', callerId);

    InCallManager.stopRingtone();
    Vibration.cancel();

    try {
      await AsyncStorage.setItem('call_just_ended', 'true'); // ✅ prevent listener conflict
    } catch (e) {}
    global.activeCallType = 'audio';
    global.isCallActive = true;

    navigation.replace('AudioCall', {
      userId: callerId,
      roomId,
      isCaller: false,
      callerName,
    });
  };

  // ✅ REJECT CALL (patched)
  const handleReject = async () => {
    if (hasActed.current) return;
    hasActed.current = true;

    console.log('[IncomingCallScreen] Call rejected | roomId:', roomId);

    InCallManager.stopRingtone();
    Vibration.cancel();

    try {
      await chatService.endCall(roomId); // ✅ API call

      await AsyncStorage.setItem('call_just_ended', 'true'); // ✅ CRITICAL FIX
      global.activeCallType = null;
      global.isCallActive = false;
    } catch (e) {
      console.log('Error ending call:', e?.message);
    } finally {
      global.activeCallType = null;
      global.isCallActive = false;
    }

    // ✅ Safe navigation fallback
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('MainTabs'); // fallback
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.avatarRing}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {callerName?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      </View>

      <Text style={styles.callingLabel}>Incoming Call</Text>
      <Text style={styles.callerName}>{callerName || 'Unknown'}</Text>
      <Text style={styles.roomText}>Room: {roomId}</Text>

      <View style={styles.buttonRow}>

        <View style={styles.buttonWrapper}>
          <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
            <Text style={styles.buttonIcon}>📵</Text>
          </TouchableOpacity>
          <Text style={styles.buttonLabel}>Decline</Text>
        </View>

        <View style={styles.buttonWrapper}>
          <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
            <Text style={styles.buttonIcon}>📞</Text>
          </TouchableOpacity>
          <Text style={styles.buttonLabel}>Accept</Text>
        </View>

      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '700',
  },
  callingLabel: {
    color: '#aaaaaa',
    fontSize: 15,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  callerName: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  roomText: {
    color: '#555',
    fontSize: 12,
    marginBottom: 60,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 60,
    alignItems: 'center',
  },
  buttonWrapper: {
    alignItems: 'center',
    gap: 10,
  },
  rejectButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  acceptButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#43a047',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  buttonIcon: {
    fontSize: 28,
  },
  buttonLabel: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default IncomingCallScreen;
