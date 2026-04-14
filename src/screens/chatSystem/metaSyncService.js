import AsyncStorage from '@react-native-async-storage/async-storage';
import chatService from '../../services/chatService';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const META_KEY  = 'shield_chat_room_meta';
export const QUEUE_KEY = 'shield_chat_meta_sync_queue';

/** Maximum number of pending sync items to retain in the queue. */
const MAX_QUEUE_SIZE = 100;

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Centralized dev-only logger.
 * Strips all log calls from production bundles automatically.
 *
 * @param {...any} args
 */
const devLog = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

/**
 * Safely parse a JSON string, returning `fallback` on any failure.
 * Also validates that the parsed value matches the expected type tag
 * ('array' | 'object') to guard against corrupted storage.
 *
 * @param {string|null} raw      - Raw string from AsyncStorage
 * @param {'array'|'object'} typeTag - Expected type of the parsed value
 * @param {Array|Object} fallback    - Value to return on failure
 * @returns {Array|Object}
 */
const safeParse = (raw, typeTag, fallback) => {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (typeTag === 'array'  && !Array.isArray(parsed))  return fallback;
    if (typeTag === 'object' && (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null)) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL STORAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the full room meta object from local storage.
 * Returns an empty object if nothing is stored or on error.
 *
 * @returns {Promise<Object>}
 */
export const loadLocalMeta = async () => {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    return safeParse(raw, 'object', {});
  } catch (e) {
    devLog('[roomMetaStorage] loadLocalMeta error:', e);
    return {};
  }
};

/**
 * Persist the full room meta object to local storage.
 *
 * @param {Object} meta
 * @returns {Promise<void>}
 */
export const saveLocalMeta = async (meta) => {
  try {
    await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (e) {
    devLog('[roomMetaStorage] saveLocalMeta error:', e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SYNC QUEUE  (retry when back online)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the pending sync queue from local storage.
 * Returns an empty array if nothing is stored or on error.
 *
 * @returns {Promise<Array<{roomId: string, meta: Object, timestamp: number}>>}
 */
export const loadSyncQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return safeParse(raw, 'array', []);
  } catch (e) {
    devLog('[roomMetaStorage] loadSyncQueue error:', e);
    return [];
  }
};

/**
 * Persist the sync queue to local storage.
 *
 * @param {Array} queue
 * @returns {Promise<void>}
 */
export const saveSyncQueue = async (queue) => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    devLog('[roomMetaStorage] saveSyncQueue error:', e);
  }
};

/**
 * Add or replace a room's pending meta sync entry in the queue.
 * Enforces a maximum queue size (oldest entries are dropped first).
 *
 * @param {string} roomId
 * @param {Object} meta
 * @returns {Promise<void>}
 */
export const addToSyncQueue = async (roomId, meta) => {
  try {
    const queue = await loadSyncQueue();

    // Replace any existing entry for this roomId so we never sync stale data
    const filtered = queue.filter((q) => q.roomId !== roomId);
    filtered.push({ roomId, meta, timestamp: Date.now() });

    // Enforce max queue size — drop oldest entries if over limit
    const trimmed =
      filtered.length > MAX_QUEUE_SIZE
        ? filtered.slice(filtered.length - MAX_QUEUE_SIZE)
        : filtered;

    await saveSyncQueue(trimmed);
  } catch (e) {
    devLog('[roomMetaStorage] addToSyncQueue error:', e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// API SYNC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt to sync a single room's meta to the server API.
 *
 * FIX: This function no longer manages the queue internally.
 * Queue management is handled exclusively by `flushSyncQueue` so there
 * are no concurrent read-modify-write races between the two.
 *
 * @param {string} roomId
 * @param {Object} meta
 * @returns {Promise<boolean>} true on success, false on failure
 */
export const syncMetaToAPI = async (roomId, meta) => {
  try {
    await chatService.updateRoomMeta(roomId, meta);
    return true;
  } catch (e) {
    devLog('[roomMetaStorage] syncMetaToAPI error for room', roomId, ':', e);
    return false;
  }
};

/**
 * Attempt to flush all queued meta updates to the server.
 *
 * FIX: The queue is read once at the start and written once at the end.
 * `syncMetaToAPI` no longer touches the queue, eliminating the double-write
 * and concurrent mutation bugs that existed previously.
 *
 * Items that fail to sync are kept in the queue for the next flush attempt.
 *
 * @returns {Promise<void>}
 */
export const flushSyncQueue = async () => {
  try {
    const queue = await loadSyncQueue();
    if (queue.length === 0) return;

    const remaining = [];

    for (const item of queue) {
      // Guard against malformed queue entries
      if (!item?.roomId || !item?.meta) {
        devLog('[roomMetaStorage] Skipping malformed queue entry:', item);
        continue; // discard silently — don't re-queue corrupted data
      }

      const success = await syncMetaToAPI(item.roomId, item.meta);

      if (success) {
        devLog('✅ Queue item synced and removed:', item.roomId);
      } else {
        devLog('⏳ Queue item kept for retry:', item.roomId);
        remaining.push(item);
      }
    }

    // FIX: Single authoritative queue write at the end of the flush —
    // no intermediate writes from syncMetaToAPI competing with this one.
    await saveSyncQueue(remaining);

    devLog(
      `📦 Queue flush complete: ${queue.length - remaining.length} synced,`,
      `${remaining.length} remaining`,
    );
  } catch (e) {
    devLog('[roomMetaStorage] flushSyncQueue error:', e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// META MERGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge server-provided room metadata into local metadata.
 * Local values take priority (they are assumed to be more recent).
 * Rooms without an `id` or without a `meta` field are skipped safely.
 *
 * @param {Object} localMeta    - Current local meta keyed by roomId
 * @param {Array}  serverRooms  - Array of room objects from the server
 * @returns {Object}            - Merged meta object keyed by roomId
 */
export const mergeServerMeta = (localMeta, serverRooms) => {
  if (!Array.isArray(serverRooms)) {
    devLog('[roomMetaStorage] mergeServerMeta: serverRooms is not an array');
    return { ...localMeta };
  }

  return serverRooms.reduce((merged, room) => {
    // FIX: Skip rooms with no id — prevents merged["undefined"] corruption
    if (room?.id == null || !room?.meta) return merged;

    return {
      ...merged,
      [room.id]: {
        ...room.meta,           // server base values
        ...localMeta[room.id],  // local overwrites (local is more recent)
      },
    };
  }, { ...localMeta });
};