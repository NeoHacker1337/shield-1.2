// src/context/GlobalCallContext.js
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import chatService from '../services/chatService';

const GlobalCallContext = createContext(null);

export const GlobalCallProvider = ({ children, currentUserId }) => {
    const navigation      = useRef(null);  // set via ref callback
    const intervalRef     = useRef(null);
    const isNavigating    = useRef(false);
    const roomsToWatch    = useRef(new Set()); // ✅ watch multiple rooms
    const appStateRef     = useRef(AppState.currentState);
    const [inCall, setInCall] = useState(false);

    // ✅ Register rooms to watch for calls
    const watchRoom = (roomId) => {
        if (roomId) roomsToWatch.current.add(String(roomId));
    };

    const unwatchRoom = (roomId) => {
        if (roomId) roomsToWatch.current.delete(String(roomId));
    };

    const watchRooms = (roomIds = []) => {
        roomIds.forEach(id => watchRoom(id));
    };

    const setNavigation = (nav) => {
        navigation.current = nav;
    };

    const stopPolling = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const startPolling = () => {
        stopPolling();
        isNavigating.current = false;

        intervalRef.current = setInterval(async () => {
            if (isNavigating.current)              return;
            if (!navigation.current)               return;
            if (!currentUserId)                    return;
            if (appStateRef.current === 'background') return;

            // ✅ Skip if already on call screens
            const state   = navigation.current.getState();
            const routes  = state?.routes || [];
            const topName = routes[routes.length - 1]?.name;

            if (topName === 'AudioCall' || topName === 'IncomingCall') return;

            // ✅ Poll every watched room
            const rooms = Array.from(roomsToWatch.current);
            if (!rooms.length) return;

            for (const roomId of rooms) {
                try {
                    const statusRes  = await chatService.getCallStatus(roomId);
                    const callStatus = statusRes?.data?.status;

                    if (callStatus !== 'active') continue;

                    const res      = await chatService.getCallOffer(roomId);
                    const offer    = res?.data?.offer;
                    const callerId = res?.data?.caller_id;

                    if (!offer) continue;

                    // ✅ SELF-CALL GUARD
                    if (String(callerId) === String(currentUserId)) continue;

                    console.log('[GlobalCallProvider] Incoming call | room:', roomId, '| caller:', callerId);

                    isNavigating.current = true;
                    setInCall(true);
                    stopPolling();

                    navigation.current.navigate('IncomingCall', {
                        roomId,
                        callerName: 'Incoming Call',
                        callerId,
                    });

                    break; // Handle one call at a time

                } catch (e) {
                    if (__DEV__) console.log('[GlobalCallProvider] Error | room:', roomId, e?.message);
                }
            }
        }, 2000);
    };

    // ✅ Handle foreground/background
    useEffect(() => {
        const sub = AppState.addEventListener('change', (next) => {
            appStateRef.current = next;
            if (next === 'active') {
                console.log('[GlobalCallProvider] App active — resuming poll');
                startPolling();
            }
        });

        return () => sub.remove();
    }, []);

    // ✅ Start/stop based on login
    useEffect(() => {
        if (currentUserId) {
            console.log('[GlobalCallProvider] User logged in — starting global poll');
            startPolling();
        } else {
            console.log('[GlobalCallProvider] No user — stopping poll');
            stopPolling();
        }

        return () => stopPolling();
    }, [currentUserId]);

    const onCallEnded = () => {
        setInCall(false);
        isNavigating.current = false;
        startPolling(); // ✅ Restart after call ends
        console.log('[GlobalCallProvider] Call ended — polling restarted');
    };

    return (
        <GlobalCallContext.Provider value={{
            watchRoom,
            unwatchRoom,
            watchRooms,
            setNavigation,
            onCallEnded,
            inCall,
        }}>
            {children}
        </GlobalCallContext.Provider>
    );
};

export const useGlobalCall = () => useContext(GlobalCallContext);