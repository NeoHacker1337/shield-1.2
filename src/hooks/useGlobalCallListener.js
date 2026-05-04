// src/hooks/useGlobalCallListener.js
import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import chatService from '../services/chatService';

const POLL_INTERVAL = 1500;

let _cachedRoomIds = new Set();
let _lastRoomFetch = 0;
const ROOM_REFRESH_INTERVAL = 15000;

const useGlobalCallListener = ({ navigationRef, currentUserId, activeRoomId }) => {
  const intervalRef   = useRef(null);
  const isNavigating  = useRef(false);
  const appStateRef   = useRef(AppState.currentState);
  const activeRoomRef = useRef(activeRoomId);
  const userIdRef     = useRef(currentUserId);
  const isMountedRef  = useRef(true);
  const roomCursorRef = useRef(0);

  // FIX #1: Keep refs in sync so pollTick always reads fresh values
  useEffect(() => { activeRoomRef.current = activeRoomId; }, [activeRoomId]);
  useEffect(() => { userIdRef.current = currentUserId; }, [currentUserId]);

  const getActiveRouteName = useCallback((state) => {
    if (!state?.routes?.length) return null;
    const route = state.routes[state.index ?? state.routes.length - 1];
    if (route.state) return getActiveRouteName(route.state);
    return route.name;
  }, []);

  // FIX #3: Rooms fetched fresh inside hook — not dependent on App.js timing
  const refreshRoomIds = useCallback(async () => {
    try {
      const now = Date.now();
      if (now - _lastRoomFetch < ROOM_REFRESH_INTERVAL && _cachedRoomIds.size > 0) return;
      _lastRoomFetch = now;

      const res = await chatService.getChatRooms();
      const rooms = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      if (rooms.length > 0) {
        _cachedRoomIds = new Set(rooms.map(r => String(r.id)));
        await AsyncStorage.setItem('watched_room_ids', JSON.stringify([..._cachedRoomIds]));
      } else {
        const stored = await AsyncStorage.getItem('watched_room_ids');
        if (stored) {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids)) ids.forEach(id => _cachedRoomIds.add(String(id)));
        }
      }
    } catch (e) {
      try {
        const stored = await AsyncStorage.getItem('watched_room_ids');
        if (stored) {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids)) ids.forEach(id => _cachedRoomIds.add(String(id)));
        }
      } catch { /* silent */ }
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pollTick = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;

      const justEnded = await AsyncStorage.getItem('call_just_ended');
      if (justEnded === 'true') {
        await AsyncStorage.removeItem('call_just_ended');
        isNavigating.current = false;
        return;
      }

      if (isNavigating.current) return;
      if (global.isCallActive && global.activeCallType === 'video') return;

      // FIX #1: Always read from ref — never stale even if prop was null on mount
      const userId = userIdRef.current;
      if (!userId) return;

      // FIX #4: navigationRef.isReady() guard
      const nav = navigationRef?.current;
      if (!nav || !nav.isReady?.()) return;

      const state = nav.getState();
      const topScreen = getActiveRouteName(state);
      if (topScreen === 'IncomingCall' || topScreen === 'AudioCall') return;

      await refreshRoomIds();
      if (_cachedRoomIds.size === 0) return;

      let roomsToCheck = [];
      if (activeRoomRef.current) roomsToCheck.push(String(activeRoomRef.current));
      _cachedRoomIds.forEach(id => {
        if (!roomsToCheck.includes(id)) roomsToCheck.push(id);
      });

      const MAX_ROOMS_PER_TICK = 5;
      let limitedRooms = roomsToCheck;
      if (roomsToCheck.length > MAX_ROOMS_PER_TICK) {
        const cursor = roomCursorRef.current % roomsToCheck.length;
        const rotated = [...roomsToCheck.slice(cursor), ...roomsToCheck.slice(0, cursor)];
        limitedRooms = rotated.slice(0, MAX_ROOMS_PER_TICK);
        roomCursorRef.current = (cursor + MAX_ROOMS_PER_TICK) % roomsToCheck.length;
      }

      for (const roomId of limitedRooms) {
        if (!isMountedRef.current) return;

        try {
          const statusRes = await chatService.getCallStatus(roomId);
          const callStatus = statusRes?.data?.status;
          if (callStatus !== 'active') continue;

          const res = await chatService.getCallOffer(roomId);
          const offer    = res?.data?.offer;
          const callerId = res?.data?.caller_id ?? res?.data?.callerId ?? res?.data?.user_id;

          if (!offer) continue;

          // FIX #2: Skip calls initiated by the current user themselves
          if (callerId && String(callerId) === String(userIdRef.current)) {
            console.log('[GlobalCallListener] Skipping own outgoing call in room:', roomId);
            continue;
          }

          console.log('[GlobalCallListener] 📞 Incoming call | room:', roomId, '| caller:', callerId);

          isNavigating.current = true;
          global.activeCallType = 'audio';

          nav.navigate('IncomingCall', {
            roomId,
            callerName: 'Incoming Call',
            callerId,
          });

          setTimeout(() => {
            if (isMountedRef.current) isNavigating.current = false;
          }, 5000);

          break;
        } catch (e) {
          if (e?.response?.status === 429) return;
          if (__DEV__) console.log(`[GlobalCallListener] Room ${roomId} error:`, e?.message);
        }
      }
    } catch (e) {
      if (__DEV__) console.log('[GlobalCallListener] Poll error:', e?.message);
    }
  }, [getActiveRouteName, refreshRoomIds]);

  const startPolling = useCallback(() => {
    stopPolling();
    isNavigating.current = false;
    intervalRef.current = setInterval(pollTick, POLL_INTERVAL);
  }, [stopPolling, pollTick]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        console.log('[GlobalCallListener] App foregrounded — restarting poll');
        isNavigating.current = false;
        _lastRoomFetch = 0;
        startPolling();
      } else if (nextState === 'background') {
        console.log('[GlobalCallListener] App backgrounded');
      }
    });
    return () => sub.remove();
  }, [startPolling]);

  // FIX #2: useEffect on [currentUserId] — re-runs the moment userId resolves from null
  useEffect(() => {
    isMountedRef.current = true;

    if (!currentUserId) {
      console.log('[GlobalCallListener] No userId — waiting to start polling');
      stopPolling();
      return;
    }

    console.log('[GlobalCallListener] Started | userId:', currentUserId);

    refreshRoomIds().then(() => {
      if (isMountedRef.current) startPolling();
    });

    return () => {
      isMountedRef.current = false;
      console.log('[GlobalCallListener] Stopped');
      stopPolling();
    };
  }, [currentUserId, startPolling, stopPolling, refreshRoomIds]);

  const restart = useCallback(() => {
    console.log('[GlobalCallListener] Manually restarted');
    isNavigating.current = false;
    _lastRoomFetch = 0;
    startPolling();
  }, [startPolling]);

  return { restart };
};

export default useGlobalCallListener;