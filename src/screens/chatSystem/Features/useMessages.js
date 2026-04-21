
// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/Features/useMessages.js        ║
// ╚══════════════════════════════════════════════════════════════╝

import { useState, useCallback, useRef, useEffect } from 'react';
import chatService from '../../../services/chatService';
import { handleApiError } from '../../../utils/errorHandler';
import { startCallListener, stopCallListener } from '../../../services/callListener';

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
            return deduplicateMessages(combined);
          });
        } else {
          setMessages(sortedMessages);
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

        return [...prevMessages, ...uniqueNew];
      });

      lastMessageIdRef.current = latestMessage.id;
    } catch (error) {
      console.warn('[useMessages] polling error —', error?.message || error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [chatRoom?.id, filterValidMessages]);

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
