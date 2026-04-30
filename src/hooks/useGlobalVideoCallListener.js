/**
 * useGlobalCallListener.js (FIXED)
 * ───────────────────────────────
 * Uses navigationRef instead of useNavigation()
 * Safe for global usage (App.js / RootNavigator)
 */

import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useGlobalCallListener = ({ navigationRef }) => {
    const channelRef = useRef(null);
    const userIdRef  = useRef(null);

    useEffect(() => {
        const subscribeToCallEvents = async () => {
            try {
                // ── Get logged-in user ──
                const userStr = await AsyncStorage.getItem('user');
                const user    = userStr ? JSON.parse(userStr) : null;
                const userId  = user?.id;

                if (!userId) {
                    console.warn('[GlobalCallListener] No user found — skipping subscription');
                    return;
                }

                // ── Wait for Echo ──
                if (!global.Echo) {
                    console.warn('[GlobalCallListener] Echo not ready — retrying...');
                    setTimeout(subscribeToCallEvents, 1000);
                    return;
                }

                userIdRef.current = userId;

                console.log('[GlobalCallListener] Subscribing | userId:', userId);

                // ── Subscribe ──
                channelRef.current = global.Echo
                    .private(`user.${userId}`)
                    .listen('CallOfferEvent', (e) => {
                        const { room_id, caller_id, caller_name } = e;

                        console.log(
                            '[GlobalCallListener] 📞 Incoming call | room:',
                            room_id, '| caller:', caller_id
                        );

                        // Skip if already in call
                        if (global.isCallActive) {
                            console.log('[GlobalCallListener] Already in call — ignoring');
                            return;
                        }

                        // ✅ SAFE NAVIGATION
                        if (navigationRef?.current) {
                            navigationRef.current.navigate('IncomingCall', {
                                roomId:     room_id,
                                callerId:   caller_id,
                                callerName: caller_name ?? null,
                            });
                        } else {
                            console.warn('[GlobalCallListener] Navigation not ready');
                        }
                    });

                console.log('[GlobalCallListener] ✅ Subscribed');

            } catch (e) {
                console.error('[GlobalCallListener] Error:', e?.message);
            }
        };

        subscribeToCallEvents();

        return () => {
            if (channelRef.current) {
                try {
                    channelRef.current.stopListening('CallOfferEvent');
                    console.log('[GlobalCallListener] Stopped listening');
                } catch (e) {
                    console.warn('[GlobalCallListener] stopListening error:', e?.message);
                }
                channelRef.current = null;
            }
        };
    }, [navigationRef]);
};

export default useGlobalCallListener;