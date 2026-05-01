
// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/Features/useMessages.js        ║
// ╚══════════════════════════════════════════════════════════════╝

import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import chatService from '../../../services/chatService';
import { handleApiError } from '../../../utils/errorHandler';
import { startCallListener, stopCallListener } from '../../../services/callListener';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🚨 GLOBAL FLAG — disables old listener safely
const ENABLE_OLD_CALL_LISTENER = false;

// ─────────────────────────────────────────────────────────────────
// HELPERS (unchanged)
// ─────────────────────────────────────────────────────────────────

const unwrapMessagesResponse = (response) => {
  if (response?.data?.success && response?.data?.data?.data) {
    const page = response.data.data;
    return {
      messages: page.data,
      pagination: {
        currentPage: page.current_page,
        lastPage: page.last_page,
        hasNextPage: page.next_page_url !== null,
        total: page.total,
      },
    };
  }

  if (Array.isArray(response?.data?.data)) {
    return { messages: response.data.data, pagination: null };
  }

  if (Array.isArray(response?.data)) {
    return { messages: response.data, pagination: null };
  }

  return { messages: [], pagination: null };
};

const isValidMessage = (msg) => {
  if (!msg || !msg.id || !msg.created_at) return false;

  const hasContent =
    msg.content != null ||
    msg.message != null ||
    msg.text != null ||
    msg.body != null ||
    !!msg.file_url;

  if (!hasContent) return false;

  const hasSender =
    msg.user_id !== undefined ||
    msg.is_guest === 1 ||
    msg.is_guest === true ||
    !!msg.sender?.id;

  return hasSender;
};

const sortMessagesAsc = (msgs) =>
  [...msgs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

const deduplicateMessages = (msgs) => {
  const seen = new Map();
  for (const msg of msgs) {
    seen.set(msg.id, msg);
  }
  return Array.from(seen.values());
};

const SCROLL_BOTTOM_THRESHOLD = 50;
const MAX_POLL_BACKOFF_MS = 15000;
const getRoomCacheKey = (roomId) => `chat_room_messages_${roomId}`;
const ROOM_META_KEY = 'shield_chat_room_meta';

const parseRetryAfterMs = (rawHeader) => {
  if (rawHeader == null) return 0;

  // Retry-After can be seconds ("10") or HTTP date.
  const asNumber = Number(rawHeader);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber * 1000;
  }

  const asDate = new Date(rawHeader).getTime();
  if (Number.isFinite(asDate)) {
    const diff = asDate - Date.now();
    return diff > 0 ? diff : 0;
  }

  return 0;
};

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

const useMessages = ({ chatRoom, currentUser, navigation }) => {

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessageBadge, setShowNewMessageBadge] = useState(false);

  const lastMessageIdRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const isLoadingRef = useRef(false);
  const mountedRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const currentPageRef = useRef(1);
  const pollBackoffUntilRef = useRef(0);
  const poll429CountRef = useRef(0);
  const lastNotifiedMessageIdRef = useRef(null);

  const shouldNotifyForRoom = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(ROOM_META_KEY);
      const meta = raw ? JSON.parse(raw) : {};
      const roomMeta = meta?.[String(chatRoom?.id)] || meta?.[chatRoom?.id] || {};
      return roomMeta?.muted !== true;
    } catch {
      return true;
    }
  }, [chatRoom?.id]);

  // ─────────────────────────────────────────────────────────────
  // MOUNT / UNMOUNT
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // 🔥 SAFE CLEANUP
      if (ENABLE_OLD_CALL_LISTENER) {
        stopCallListener();
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 🚨 FIXED CALL LISTENER BLOCK (DISABLED SAFELY)
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    console.log('[useMessages] chatRoom?.id:', chatRoom?.id);
    console.log('[useMessages] navigation exists:', !!navigation);
    console.log('[useMessages] currentUser?.id:', currentUser?.id);

    if (!chatRoom?.id || !navigation) {
      console.warn('[useMessages] callListener SKIPPED — missing params');
      return;
    }

    // 🔥 ONLY RUN IF ENABLED (NOW DISABLED)
    if (ENABLE_OLD_CALL_LISTENER) {
      console.log('[useMessages] OLD callListener ACTIVE');
      startCallListener(navigation, chatRoom.id, currentUser?.id);
    } else {
      console.log('[useMessages] OLD callListener DISABLED — using global listener');
    }

    return () => {
      if (ENABLE_OLD_CALL_LISTENER) {
        stopCallListener();
      }
    };
  }, [chatRoom?.id, navigation, currentUser?.id]);

  // ─────────────────────────────────────────────────────────────
  // REST OF YOUR FILE (UNCHANGED)
  // ─────────────────────────────────────────────────────────────

  const filterValidMessages = useCallback((messagesArray) => {
    if (!Array.isArray(messagesArray)) return [];
    return messagesArray.filter(isValidMessage);
  }, []);

  const loadMessages = useCallback(
    async (page = 1, isLoadingMore = false) => {
      if (!chatRoom?.id) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      if (isLoadingRef.current && !isLoadingMore) return;
      isLoadingRef.current = true;

      try {
        if (mountedRef.current) {
          if (!isLoadingMore) setLoading(true);
          else setLoadingOlderMessages(true);
        }

        const response = await chatService.getRoomMessages(chatRoom.id, page);

        if (!mountedRef.current) return;

        const { messages: messagesData, pagination } =
          unwrapMessagesResponse(response);

        const validMessages = filterValidMessages(messagesData);
        const sortedMessages = sortMessagesAsc(validMessages);

        if (isLoadingMore && page > 1) {
          setMessages((prev) => {
            const combined = [...sortedMessages, ...prev];
            const next = deduplicateMessages(combined);
            AsyncStorage.setItem(getRoomCacheKey(chatRoom.id), JSON.stringify(next)).catch(() => {});
            return next;
          });
        } else {
          setMessages(sortedMessages);
          AsyncStorage.setItem(getRoomCacheKey(chatRoom.id), JSON.stringify(sortedMessages)).catch(() => {});
          if (sortedMessages.length > 0) {
            lastMessageIdRef.current =
              sortedMessages[sortedMessages.length - 1].id;
          }
        }

        if (pagination) {
          setCurrentPage(pagination.currentPage);
          currentPageRef.current = pagination.currentPage;
          setHasMoreMessages(pagination.hasNextPage);
        } else {
          setHasMoreMessages(false);
        }
      } catch (error) {
        if (!mountedRef.current) return;
        if (error?.response?.status === 429) {
          poll429CountRef.current += 1;
          const retryAfterMs = parseRetryAfterMs(error?.response?.headers?.['retry-after']);
          const exponentialMs = Math.min(MAX_POLL_BACKOFF_MS, 2000 * (2 ** (poll429CountRef.current - 1)));
          const backoffMs = Math.min(MAX_POLL_BACKOFF_MS, Math.max(retryAfterMs, exponentialMs));
          pollBackoffUntilRef.current = Date.now() + backoffMs;
          // Keep current messages on screen; don't surface as hard error.
          if (__DEV__) {
            console.log(
              `[useMessages] initial/load-more rate-limited (429) — backing off ${Math.ceil(backoffMs / 1000)}s`
            );
          }
          return;
        }

        handleApiError(error, 'Failed to load messages');
        if (!isLoadingMore) setMessages([]);
      } finally {
        isLoadingRef.current = false;
        if (mountedRef.current) {
          if (!isLoadingMore) setLoading(false);
          else setLoadingOlderMessages(false);
        }
      }
    },
    [chatRoom?.id, filterValidMessages]
  );

  const checkForNewMessages = useCallback(async () => {
    if (!chatRoom?.id || isLoadingRef.current) return;
    if (!mountedRef.current) return;
    if (global.isCallActive) return;

    const now = Date.now();
    if (now < pollBackoffUntilRef.current) return;

    isLoadingRef.current = true;

    try {
      const response = await chatService.getRoomMessages(chatRoom.id, 1);

      if (!mountedRef.current) return;

      const { messages: messagesData } = unwrapMessagesResponse(response);

      if (!messagesData.length) return;

      const validMessages = filterValidMessages(messagesData);
      const sortedMessages = sortMessagesAsc(validMessages);
      const latestMessage = sortedMessages[sortedMessages.length - 1];

      if (!latestMessage) return;
      if (lastMessageIdRef.current === latestMessage.id) return;

      setMessages((prevMessages) => {
        const existingIds = new Set(prevMessages.map((m) => m.id));
        const uniqueNew = sortedMessages.filter((m) => !existingIds.has(m.id));

        if (!uniqueNew.length) return prevMessages;

        if (!isAtBottomRef.current) {
          setShowNewMessageBadge(true);
        }

        const next = [...prevMessages, ...uniqueNew];
        AsyncStorage.setItem(getRoomCacheKey(chatRoom.id), JSON.stringify(next)).catch(() => {});
        return next;
      });

      lastMessageIdRef.current = latestMessage.id;
      poll429CountRef.current = 0;
      pollBackoffUntilRef.current = 0;

      if (
        latestMessage?.id &&
        latestMessage.id !== lastNotifiedMessageIdRef.current &&
        !isAtBottomRef.current
      ) {
        const canNotify = await shouldNotifyForRoom();
        if (canNotify) {
          const text = latestMessage?.content || latestMessage?.message || latestMessage?.text || 'New message';
          if (Platform.OS === 'android') {
            ToastAndroid.show(`New message: ${text}`, ToastAndroid.SHORT);
          } else {
            Alert.alert('New message', String(text));
          }
          lastNotifiedMessageIdRef.current = latestMessage.id;
        }
      }
    } catch (error) {
      if (error?.response?.status === 429) {
        poll429CountRef.current += 1;
        const retryAfterMs = parseRetryAfterMs(error?.response?.headers?.['retry-after']);
        const exponentialMs = Math.min(MAX_POLL_BACKOFF_MS, 2000 * (2 ** (poll429CountRef.current - 1)));
        const backoffMs = Math.min(MAX_POLL_BACKOFF_MS, Math.max(retryAfterMs, exponentialMs));
        pollBackoffUntilRef.current = Date.now() + backoffMs;
        if (__DEV__) {
          console.log(
            `[useMessages] polling rate-limited (429) — backing off ${Math.ceil(backoffMs / 1000)}s`
          );
        }
      } else {
        poll429CountRef.current = 0;
        pollBackoffUntilRef.current = 0;
        console.warn('[useMessages] polling error —', error?.message || error);
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, [chatRoom?.id, filterValidMessages, shouldNotifyForRoom]);

  const loadOlderMessages = useCallback(async () => {
    if (loadingOlderMessages || !hasMoreMessages) return;
    const nextPage = currentPageRef.current + 1;
    await loadMessages(nextPage, true);
  }, [loadMessages, hasMoreMessages, loadingOlderMessages]);

  useEffect(() => {
    if (!chatRoom?.id) return;

    setCurrentPage(1);
    currentPageRef.current = 1;
    setHasMoreMessages(true);
    setMessages([]);
    setShowNewMessageBadge(false);
    lastMessageIdRef.current = null;
    isLoadingRef.current = false;

    // 1) Offline-first: show cached messages instantly
    AsyncStorage.getItem(getRoomCacheKey(chatRoom.id))
      .then((cached) => {
        if (!mountedRef.current || !cached) return;
        const parsed = JSON.parse(cached);
        const validCached = filterValidMessages(Array.isArray(parsed) ? parsed : []);
        const sortedCached = sortMessagesAsc(validCached);
        if (sortedCached.length) {
          setMessages(sortedCached);
          lastMessageIdRef.current = sortedCached[sortedCached.length - 1].id;
          setLoading(false);
        }
      })
      .catch(() => {});

    // 2) API sync in background
    loadMessages(1, false);
  }, [chatRoom?.id, loadMessages]);

  const handleScroll = useCallback(({ nativeEvent }) => {
    const isBottom =
      nativeEvent.contentOffset.y <= SCROLL_BOTTOM_THRESHOLD;

    isAtBottomRef.current = isBottom;

    setIsAtBottom((prev) => (prev === isBottom ? prev : isBottom));

    if (isBottom) {
      setShowNewMessageBadge(false);
    }
  }, []);

  return {
    messages,
    setMessages,
    loading,
    loadingOlderMessages,
    currentPage,
    hasMoreMessages,
    isAtBottom,
    showNewMessageBadge,
    setShowNewMessageBadge,
    lastMessageIdRef,
    pollingIntervalRef,
    loadMessages,
    checkForNewMessages,
    loadOlderMessages,
    handleScroll,
  };
};

export default useMessages;
