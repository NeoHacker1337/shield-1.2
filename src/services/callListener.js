
import chatService from './chatService';

let interval = null;
let isNavigating = false;

// 🚨 GLOBAL FLAG — disable this old system safely
const ENABLE_OLD_CALL_LISTENER = false;

/**
 * Global call listener — (NOW DISABLED SAFELY)
 */
export const startCallListener = (navigation, roomId, currentUserId) => {

  // 🔥 BLOCK EXECUTION
  if (!ENABLE_OLD_CALL_LISTENER) {
    console.log('[callListener] ❌ DISABLED — using useGlobalCallListener instead');
    return;
  }

  stopCallListener();
  isNavigating = false;

  console.log('[callListener] Started | roomId:', roomId, '| currentUserId:', currentUserId);

  interval = setInterval(async () => {
    try {
      if (isNavigating) return;

      let statusRes;

      try {
        statusRes = await chatService.getCallStatus(roomId);
      } catch (e) {
        if (e?.response?.status === 429) {
          console.log('[callListener] Rate limited — skipping');
          return;
        }
        console.log('[callListener] Status error:', e?.message);
        return;
      }

      const callStatus = statusRes?.data?.status;

      if (callStatus === 'ended') return;

      let res;

      try {
        res = await chatService.getCallOffer(roomId);
      } catch (e) {
        console.log('[callListener] Offer error:', e?.message);
        return;
      }

      const offer = res?.data?.offer;
      const callerId = res?.data?.caller_id;

      if (!offer) return;

      if (callerId && String(callerId) === String(currentUserId)) {
        return;
      }

      console.log('[callListener] Incoming call detected | caller_id:', callerId);

      isNavigating = true;
      stopCallListener();

      if (navigation?.navigate) {
        navigation.navigate('IncomingCall', {
          roomId,
          callerName: 'Incoming Call',
          callerId,
        });
      }

    } catch (e) {
      console.log('[callListener] Polling error:', e?.message || e);
    }
  }, 3000); // 🔥 FIXED interval
};

export const stopCallListener = () => {
  if (interval) {
    clearInterval(interval);
    interval = null;
    console.log('[callListener] Stopped');
  }
};

/**
 * Restart (SAFE)
 */
export const restartCallListener = (navigation, roomId, currentUserId) => {

  if (!ENABLE_OLD_CALL_LISTENER) {
    console.log('[callListener] Restart skipped — global system active');
    return;
  }

  console.log('[callListener] Restarting after call ended | roomId:', roomId);
  isNavigating = false;
  startCallListener(navigation, roomId, currentUserId);
};
