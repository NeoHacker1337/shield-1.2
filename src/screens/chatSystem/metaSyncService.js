import AsyncStorage from '@react-native-async-storage/async-storage';
import chatService from '../../services/chatService';

const META_KEY  = 'shield_chat_room_meta';
const QUEUE_KEY = 'shield_chat_meta_sync_queue';

// ── Local Storage ─────────────────────────────────────────────────────────

export const loadLocalMeta = async () => {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

export const saveLocalMeta = async (meta) => {
  try {
    await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch { /* silent */ }
};

// ── Sync Queue (retry when back online) ───────────────────────────────────

export const loadSyncQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveSyncQueue = async (queue) => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch { /* silent */ }
};

export const addToSyncQueue = async (roomId, meta) => {
  try {
    const queue    = await loadSyncQueue();
    const filtered = queue.filter(q => q.roomId !== roomId); // replace old entry
    filtered.push({ roomId, meta, timestamp: Date.now() });
    await saveSyncQueue(filtered);
  } catch { /* silent */ }
};

// ── API Sync ──────────────────────────────────────────────────────────────

export const syncMetaToAPI = async (roomId, meta) => {
  try {
    await chatService.updateRoomMeta(roomId, meta);
    // ✅ Success — make sure it is NOT in queue
    const queue    = await loadSyncQueue();
    const filtered = queue.filter(q => q.roomId !== roomId);
    await saveSyncQueue(filtered);
    return true;
  } catch {
    return false;
  }
};



export const flushSyncQueue = async () => {
  try {
    const queue = await loadSyncQueue();
    if (queue.length === 0) return;

    const remaining = [];
    for (const item of queue) {
      const success = await syncMetaToAPI(item.roomId, item.meta);
      if (success) {
        console.log('✅ Queue item synced and removed:', item.roomId); // ADD
      } else {
        console.log('⏳ Queue item kept for retry:', item.roomId);     // ADD
        remaining.push(item); // only keep failed ones
      }
    }
    await saveSyncQueue(remaining); // save only remaining failed ones
    console.log(`📦 Queue: ${queue.length - remaining.length} synced, ${remaining.length} remaining`);
  } catch {
    // silent
  }
};


// ── Merge server meta into local meta ─────────────────────────────────────
// Local wins first, server fills in missing values

export const mergeServerMeta = (localMeta, serverRooms) => {
  const merged = { ...localMeta };
  serverRooms.forEach(room => {
    if (room.meta) {
      merged[room.id] = {
        ...room.meta,          // server base
        ...localMeta[room.id], // local overwrites (local is more recent)
      };
    }
  });
  return merged;
};
