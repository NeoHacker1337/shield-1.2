// src/hooks/useGlobalVideoCallListener.js
import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import chatService from '../services/chatService';

const POLL_INTERVAL = 6000;
const ROOM_REFRESH_INTERVAL = 15000;

let cachedRoomIds = new Set();
let lastRoomFetch = 0;

const useGlobalVideoCallListener = ({ navigationRef, currentUserId, activeRoomId }) => {
  const intervalRef = useRef(null);
  const isNavigating = useRef(false);
  const activeRoomRef = useRef(activeRoomId);
  const userIdRef = useRef(currentUserId);
  const isMountedRef = useRef(true);
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
      if (now - lastRoomFetch < ROOM_REFRESH_INTERVAL && cachedRoomIds.size > 0) return;
      lastRoomFetch = now;

      const res = await chatService.getChatRooms();
      const rooms = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      if (rooms.length > 0) {
        cachedRoomIds = new Set(rooms.map(r => String(r.id)));
        await AsyncStorage.setItem('watched_room_ids', JSON.stringify([...cachedRoomIds]));
        return;
      }

      const stored = await AsyncStorage.getItem('watched_room_ids');
      if (stored) {
        const ids = JSON.parse(stored);
        if (Array.isArray(ids)) ids.forEach(id => cachedRoomIds.add(String(id)));
      }
    } catch (e) {
      try {
        const stored = await AsyncStorage.getItem('watched_room_ids');
        if (stored) {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids)) ids.forEach(id => cachedRoomIds.add(String(id)));
        }
      } catch { }
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
      if (!isMountedRef.current || isNavigating.current || global.isCallActive) return;
      if (global.isCallActive && global.activeCallType === 'audio') return;

      const justEnded = await AsyncStorage.getItem('call_just_ended');
      if (justEnded === 'true') {
        await AsyncStorage.removeItem('call_just_ended');
        isNavigating.current = false;
        return;
      }

      // FIX #1: Always read from ref — never stale even if prop was null on mount
      const userId = userIdRef.current;
      if (!userId) return;

      // FIX #4: navigationRef.isReady() guard
      const nav = navigationRef?.current;
      if (!nav || !nav.isReady?.()) return;

      const topScreen = getActiveRouteName(nav.getState());
      if (
        topScreen === 'IncomingVideoCallScreen' ||
        topScreen === 'VideoCallScreen' ||
        topScreen === 'IncomingCall' ||
        topScreen === 'AudioCall'
      ) return;

      await refreshRoomIds();
      if (cachedRoomIds.size === 0) return;

      const roomsToCheck = [];
      if (activeRoomRef.current) roomsToCheck.push(String(activeRoomRef.current));
      cachedRoomIds.forEach(id => {
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
          const statusRes = await chatService.getVideoCallStatus(roomId);
          const callStatus = statusRes?.data?.status;

          const callerName = statusRes?.data?.caller_name ?? 'Unknown';
          if (callStatus !== 'active') continue;

          const res = await chatService.getVideoCallOffer(roomId);
          const offer = res?.data?.offer;
          const callerId = res?.data?.caller_id ?? res?.data?.callerId ?? res?.data?.user_id;

          if (!offer) continue;

          // FIX #2: Skip calls initiated by the current user themselves
          if (callerId && String(callerId) === String(userIdRef.current)) {
            console.log('[GlobalVideoCallListener] Skipping own outgoing video call in room:', roomId);
            continue;
          }

          console.log('[GlobalVideoCallListener] Incoming video call | room:', roomId, '| caller:', callerId);

          isNavigating.current = true;
          global.activeCallType = 'video';
          nav.navigate('IncomingVideoCallScreen', {
            roomId,
            callerId,
            callerName, 
          });

          setTimeout(() => {
            if (isMountedRef.current) isNavigating.current = false;
          }, 5000);

          break;
        } catch (e) {
          if (e?.response?.status === 429) return;
          if (__DEV__) console.log(`[GlobalVideoCallListener] Room ${roomId} error:`, e?.message);
        }
      }
    } catch (e) {
      if (__DEV__) console.log('[GlobalVideoCallListener] Poll error:', e?.message);
    }
  }, [getActiveRouteName, navigationRef, refreshRoomIds]);

  const startPolling = useCallback(() => {
    stopPolling();
    isNavigating.current = false;
    intervalRef.current = setInterval(pollTick, POLL_INTERVAL);
  }, [pollTick, stopPolling]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        isNavigating.current = false;
        lastRoomFetch = 0;
        startPolling();
      }
    });
    return () => sub.remove();
  }, [startPolling]);

  // FIX #2: useEffect on [currentUserId] — re-runs the moment userId resolves from null
  useEffect(() => {
    isMountedRef.current = true;

    if (!currentUserId) {
      console.log('[GlobalVideoCallListener] No userId — waiting to start polling');
      stopPolling();
      return;
    }

    console.log('[GlobalVideoCallListener] Started | userId:', currentUserId);
    refreshRoomIds().then(() => {
      if (isMountedRef.current) startPolling();
    });

    return () => {
      isMountedRef.current = false;
      stopPolling();
      console.log('[GlobalVideoCallListener] Stopped');
    };
  }, [currentUserId, refreshRoomIds, startPolling, stopPolling]);

  return {
    restart: () => {
      isNavigating.current = false;
      lastRoomFetch = 0;
      startPolling();
    },
  };
};

export default useGlobalVideoCallListener;