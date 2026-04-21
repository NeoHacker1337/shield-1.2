
// src/hooks/useGlobalCallListener.js
import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import chatService from '../services/chatService';

const POLL_INTERVAL = 3000;

const useGlobalCallListener = ({ navigationRef, currentUserId, activeRoomId }) => {
  const intervalRef = useRef(null);
  const isNavigating = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const activeRoomRef = useRef(activeRoomId);
  const watchedRooms = useRef(new Set());
  const userIdRef = useRef(currentUserId);

  // ✅ Keep refs updated
  useEffect(() => { activeRoomRef.current = activeRoomId; }, [activeRoomId]);
  useEffect(() => { userIdRef.current = currentUserId; }, [currentUserId]);

  // ✅ Load watched rooms
  const loadWatchedRooms = async () => {
    try {
      const stored = await AsyncStorage.getItem('watched_room_ids');
      if (stored) {
        const ids = JSON.parse(stored);
        ids.forEach(id => watchedRooms.current.add(String(id)));
        console.log('[useGlobalCallListener] Loaded watched rooms:', ids);
      }
    } catch (e) {
      console.log('[useGlobalCallListener] Could not load watched rooms:', e?.message);
    }
  };

  // ✅ Get active route name (FIX for nested navigation)
  const getActiveRouteName = (state) => {
    if (!state || !state.routes) return null;

    const route = state.routes[state.index];

    if (route.state) {
      return getActiveRouteName(route.state);
    }

    return route.name;
  };

  // ✅ Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ✅ Start polling
  const startPolling = useCallback(() => {
    stopPolling();
    isNavigating.current = false;

    intervalRef.current = setInterval(async () => {
      try {
        // ✅ Prevent reopen after call end
        const justEnded = await AsyncStorage.getItem('call_just_ended');
        if (justEnded === 'true') {
          await AsyncStorage.removeItem('call_just_ended');
          isNavigating.current = false;
          return;
        }

        if (isNavigating.current) return;
        if (!userIdRef.current) return;

        // ✅ Allow background check (no block)
        if (appStateRef.current === 'background') {
          console.log('[useGlobalCallListener] Background check running...');
        }

        const nav = navigationRef?.current;

        // ✅ Navigation safety
        if (!nav || !nav.isReady?.()) return;

        const state = nav.getState();
        const topScreen = getActiveRouteName(state);

        if (topScreen === 'IncomingCall' || topScreen === 'AudioCall') return;

        // ✅ Build rooms list (FIXED ARRAY LOGIC)
        let roomsToCheck = [];

        if (activeRoomRef.current) {
          roomsToCheck = [String(activeRoomRef.current)];
        } else {
          roomsToCheck = Array.from(watchedRooms.current).slice(0, 2);
        }

        if (roomsToCheck.length === 0) return;

        const rooms = roomsToCheck.slice(0, 3);

        // ✅ Loop rooms
        for (const roomId of rooms) {

          let statusRes;

          try {
            statusRes = await chatService.getCallStatus(roomId);
          } catch (e) {
            if (e?.response?.status === 429) {
              console.log('[GlobalListener] Rate limited — skipping cycle');
              return;
            }
            console.log('[GlobalListener] Status error:', e?.message);
            continue;
          }

          const callStatus = statusRes?.data?.status;
          if (callStatus !== 'active') continue;

          let res;

          try {
            res = await chatService.getCallOffer(roomId);
          } catch (e) {
            console.log('[GlobalListener] Offer error:', e?.message);
            continue;
          }

          const offer = res?.data?.offer;
          const callerId = res?.data?.caller_id;

          if (!offer) continue;

          // ✅ Ignore self-call
          if (String(callerId) === String(userIdRef.current)) continue;

          console.log('[useGlobalCallListener] 📞 Incoming call | room:', roomId, '| caller:', callerId);

          // ✅ Navigate safely
          isNavigating.current = true;

          nav.navigate('IncomingCall', {
            roomId,
            callerName: 'Incoming Call',
            callerId,
          });

          // ✅ Reset navigation lock (IMPORTANT FIX)
          setTimeout(() => {
            isNavigating.current = false;
          }, 3000);

          break;
        }

      } catch (e) {
        if (__DEV__) console.log('[useGlobalCallListener] Poll error:', e?.message);
      }
    }, POLL_INTERVAL);

  }, [stopPolling]);

  // ✅ App state handling
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;

      if (nextState === 'active') {
        console.log('[useGlobalCallListener] App foregrounded — restart polling');
        isNavigating.current = false;
        startPolling();
      } else {
        console.log('[useGlobalCallListener] App backgrounded');
      }
    });

    return () => sub.remove();
  }, [startPolling]);

  // ✅ Start listener
  useEffect(() => {
    if (!currentUserId) return;

    console.log('[useGlobalCallListener] Started | userId:', currentUserId);

    loadWatchedRooms().then(() => startPolling());

    return () => {
      console.log('[useGlobalCallListener] Stopped');
      stopPolling();
    };
  }, [currentUserId, startPolling, stopPolling]);

  // ✅ Restart function (kept as-is)
  const restart = useCallback(() => {
    console.log('[useGlobalCallListener] Manually restarted');
    isNavigating.current = false;
    startPolling();
  }, [startPolling]);

  return { restart };
};

export default useGlobalCallListener;
