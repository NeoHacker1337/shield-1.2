// src/hooks/useGlobalCallListener.js
import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import chatService from '../services/chatService';

const POLL_INTERVAL = 3000;

// ─── Module-level room cache ─────────────────────────────────────────────────
// Shared across all hook instances so rooms discovered in ChatScreen
// are immediately visible to the hook running in AppNavigator.
let _cachedRoomIds = new Set();
let _lastRoomFetch = 0;
const ROOM_REFRESH_INTERVAL = 15000; // re-fetch room list every 15 seconds

const useGlobalCallListener = ({ navigationRef, currentUserId, activeRoomId }) => {
  const intervalRef = useRef(null);
  const isNavigating = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const activeRoomRef = useRef(activeRoomId);
  const userIdRef = useRef(currentUserId);
  const isMountedRef = useRef(true);

  // ── Keep refs in sync ──────────────────────────────────────────────────────
  useEffect(() => { activeRoomRef.current = activeRoomId; }, [activeRoomId]);
  useEffect(() => { userIdRef.current = currentUserId; }, [currentUserId]);

  // ── Recursively get the active route name (handles nested navigators) ──────
  const getActiveRouteName = useCallback((state) => {
    if (!state?.routes?.length) return null;
    const route = state.routes[state.index ?? state.routes.length - 1];
    if (route.state) return getActiveRouteName(route.state);
    return route.name;
  }, []);

  // ── Load ALL room IDs from server (not just from AsyncStorage) ────────────
  // This is the key fix: we don't rely on rooms being manually added to
  // AsyncStorage by ChatScreen — we fetch the full list directly.
  const refreshRoomIds = useCallback(async () => {
    try {
      const now = Date.now();
      // Only re-fetch if enough time has passed (avoid hammering the API)
      if (now - _lastRoomFetch < ROOM_REFRESH_INTERVAL && _cachedRoomIds.size > 0) {
        return;
      }
      _lastRoomFetch = now;

      const res = await chatService.getChatRooms();
      const rooms = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      if (rooms.length > 0) {
        _cachedRoomIds = new Set(rooms.map(r => String(r.id)));
        // Also persist so other parts of the app can read them
        await AsyncStorage.setItem('watched_room_ids', JSON.stringify([..._cachedRoomIds]));
      } else {
        // Fallback: read from AsyncStorage if API returned nothing
        const stored = await AsyncStorage.getItem('watched_room_ids');
        if (stored) {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids)) {
            ids.forEach(id => _cachedRoomIds.add(String(id)));
          }
        }
      }
    } catch (e) {
      // Fallback to AsyncStorage on error
      try {
        const stored = await AsyncStorage.getItem('watched_room_ids');
        if (stored) {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids)) {
            ids.forEach(id => _cachedRoomIds.add(String(id)));
          }
        }
      } catch { /* silent */ }
    }
  }, []);

  // ── Stop polling ───────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Core poll tick ─────────────────────────────────────────────────────────
  const pollTick = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;

      // Don't navigate if we just ended a call
      const justEnded = await AsyncStorage.getItem('call_just_ended');
      if (justEnded === 'true') {
        await AsyncStorage.removeItem('call_just_ended');
        isNavigating.current = false;
        return;
      }

      if (isNavigating.current) return;

      const userId = userIdRef.current;
      if (!userId) return;

      const nav = navigationRef?.current;
      if (!nav || !nav.isReady?.()) return;

      // Don't show incoming call if already on a call screen
      const state = nav.getState();
      const topScreen = getActiveRouteName(state);
      if (topScreen === 'IncomingCall' || topScreen === 'AudioCall') return;

      // Refresh room list periodically so we never miss a room
      await refreshRoomIds();

      if (_cachedRoomIds.size === 0) return;

      // Build the list of rooms to check:
      // Active room first (if any), then up to 5 others
      let roomsToCheck = [];
      if (activeRoomRef.current) {
        roomsToCheck.push(String(activeRoomRef.current));
      }
      _cachedRoomIds.forEach(id => {
        if (!roomsToCheck.includes(id)) roomsToCheck.push(id);
      });
      roomsToCheck = roomsToCheck.slice(0, 5); // limit to avoid too many requests

      for (const roomId of roomsToCheck) {
        if (!isMountedRef.current) return;

        try {
          const statusRes = await chatService.getCallStatus(roomId);
          const callStatus = statusRes?.data?.status;
          if (callStatus !== 'active') continue;

          const res = await chatService.getCallOffer(roomId);
          const offer = res?.data?.offer;
          const callerId = res?.data?.caller_id;

          if (!offer) continue;

          // Ignore calls we initiated ourselves
          if (String(callerId) === String(userId)) continue;

          console.log('[GlobalCallListener] 📞 Incoming call | room:', roomId, '| caller:', callerId);

          isNavigating.current = true;

          nav.navigate('IncomingCall', {
            roomId,
            callerName: 'Incoming Call',
            callerId,
          });

          // Reset navigation lock after a delay so repeat calls can come in
          setTimeout(() => {
            if (isMountedRef.current) {
              isNavigating.current = false;
            }
          }, 5000);

          break; // Handle one call at a time
        } catch (e) {
          if (e?.response?.status === 429) {
            // Rate limited — back off silently
            return;
          }
          // Room-specific error — continue to next room
          if (__DEV__) console.log(`[GlobalCallListener] Room ${roomId} error:`, e?.message);
        }
      }
    } catch (e) {
      if (__DEV__) console.log('[GlobalCallListener] Poll error:', e?.message);
    }
  }, [getActiveRouteName, refreshRoomIds]);

  // ── Start polling ──────────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    stopPolling();
    isNavigating.current = false;
    intervalRef.current = setInterval(pollTick, POLL_INTERVAL);
  }, [stopPolling, pollTick]);

  // ── Handle app foreground/background ──────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        console.log('[GlobalCallListener] App foregrounded — restarting poll');
        isNavigating.current = false;
        // Force a room refresh on foreground
        _lastRoomFetch = 0;
        startPolling();
      } else if (nextState === 'background') {
        console.log('[GlobalCallListener] App backgrounded');
        // Keep polling in background for incoming calls
        // (Android only — iOS will use push notifications in production)
      }
    });
    return () => sub.remove();
  }, [startPolling]);

  // ── Start / stop based on login state ─────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    if (!currentUserId) {
      console.log('[GlobalCallListener] No userId — stopping');
      stopPolling();
      return;
    }

    console.log('[GlobalCallListener] Started | userId:', currentUserId);

    // Initial room load, then start polling
    refreshRoomIds().then(() => {
      if (isMountedRef.current) startPolling();
    });

    return () => {
      isMountedRef.current = false;
      console.log('[GlobalCallListener] Stopped');
      stopPolling();
    };
  }, [currentUserId, startPolling, stopPolling, refreshRoomIds]);

  // ── Public restart method (called after a call ends) ──────────────────────
  const restart = useCallback(() => {
    console.log('[GlobalCallListener] Manually restarted');
    isNavigating.current = false;
    _lastRoomFetch = 0; // force room refresh
    startPolling();
  }, [startPolling]);

  return { restart };
};

export default useGlobalCallListener;