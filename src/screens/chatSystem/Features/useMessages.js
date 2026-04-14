// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/Features/useMessages.js        ║
// ╚══════════════════════════════════════════════════════════════╝

import { useState, useCallback, useRef, useEffect } from 'react';
import chatService from '../../../services/chatService';
import { handleApiError } from '../../../utils/errorHandler';

// ─────────────────────────────────────────────────────────────────
// HELPERS — module level, never recreated
// ─────────────────────────────────────────────────────────────────

/**
 * Safely unwraps messages array from various API response shapes.
 * Handles:
 *   { data: { success, data: { data: [] } } }  — paginated
 *   { data: { data: [] } }                      — simple wrapper
 *   { data: [] }                                — bare array
 *
 * @param {object} response - Axios response object
 * @returns {{ messages: any[], pagination: object|null }}
 */
const unwrapMessagesResponse = (response) => {
  // Shape 1: paginated { data: { success, data: { data: [], current_page, ... } } }
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

  // Shape 2: simple wrapper { data: { data: [] } }
  if (Array.isArray(response?.data?.data)) {
    return { messages: response.data.data, pagination: null };
  }

  // Shape 3: bare array { data: [] }
  if (Array.isArray(response?.data)) {
    return { messages: response.data, pagination: null };
  }

  return { messages: [], pagination: null };
};

/**
 * Validates a single message object.
 * A valid message must have:
 * - an id
 * - a created_at timestamp
 * - either text content OR a file_url
 * - a sender identity (user_id, is_guest, or sender.id)
 *
 * @param {object} msg
 * @returns {boolean}
 */
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

/**
 * Sorts messages in ascending order (oldest → newest).
 * Uses created_at timestamp for correct ordering with UUID-based IDs.
 *
 * @param {object[]} msgs
 * @returns {object[]}
 */
const sortMessagesAsc = (msgs) =>
  [...msgs].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

/**
 * Deduplicates a message array by id, keeping the latest version.
 *
 * @param {object[]} msgs
 * @returns {object[]}
 */
const deduplicateMessages = (msgs) => {
  const seen = new Map();
  // Iterate in order — later entries overwrite earlier ones (keep latest)
  for (const msg of msgs) {
    seen.set(msg.id, msg);
  }
  return Array.from(seen.values());
};

// ─────────────────────────────────────────────────────────────────
// SCROLL THRESHOLD
// ─────────────────────────────────────────────────────────────────
const SCROLL_BOTTOM_THRESHOLD = 50; // px from bottom to consider "at bottom"

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

/**
 * useMessages
 *
 * Manages the full message list lifecycle for a chat room:
 * - Initial load with pagination
 * - Polling for new messages
 * - Load older messages (pagination)
 * - Scroll position tracking
 * - New message badge
 *
 * @param {object} chatRoom    - Current chat room object
 * @param {object} currentUser - Currently logged-in user
 */
const useMessages = ({ chatRoom, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessageBadge, setShowNewMessageBadge] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────
  const lastMessageIdRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  /**
   * Guards against concurrent loads (initial + polling overlap).
   * Using a ref (not state) avoids re-render on set.
   */
  const isLoadingRef = useRef(false);

  /**
   * Guards against state updates after unmount.
   */
  const mountedRef = useRef(true);

  /**
   * Tracks isAtBottom without stale closure issues in polling callback.
   * Updated synchronously in handleScroll.
   */
  const isAtBottomRef = useRef(true);

  /**
   * Tracks currentPage in a ref to avoid stale closure in loadOlderMessages.
   */
  const currentPageRef = useRef(1);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clean up polling interval on unmount
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // FILTER VALID MESSAGES
  // ─────────────────────────────────────────────────────────────────

  /**
   * Filters an array to only valid messages.
   * Extracted to module-level isValidMessage for reuse.
   */
  const filterValidMessages = useCallback((messagesArray) => {
    if (!Array.isArray(messagesArray)) return [];
    return messagesArray.filter(isValidMessage);
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // LOAD MESSAGES (initial + pagination)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Loads messages for the current chat room.
   *
   * @param {number} page          - Page number to load (1 = latest)
   * @param {boolean} isLoadingMore - true = loading older messages (prepend)
   */
  const loadMessages = useCallback(
    async (page = 1, isLoadingMore = false) => {
      if (!chatRoom?.id) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      // Prevent overlapping loads
      if (isLoadingRef.current && !isLoadingMore) return;
      isLoadingRef.current = true;

      try {
        if (mountedRef.current) {
          if (!isLoadingMore) setLoading(true);
          else setLoadingOlderMessages(true);
        }

        const response = await chatService.getRoomMessages(chatRoom.id, page);

        if (!mountedRef.current) return;

        // ✅ Single place for response unwrapping
        const { messages: messagesData, pagination } =
          unwrapMessagesResponse(response);

        const validMessages = filterValidMessages(messagesData);

        // ✅ Sort by timestamp, not by ID (safe for UUID-based IDs)
        const sortedMessages = sortMessagesAsc(validMessages);

        if (isLoadingMore && page > 1) {
          // Prepend older messages, deduplicate
          setMessages((prev) => {
            const combined = [...sortedMessages, ...prev];
            return deduplicateMessages(combined);
          });
        } else {
          // Fresh load — replace all messages
          setMessages(sortedMessages);

          if (sortedMessages.length > 0) {
            lastMessageIdRef.current =
              sortedMessages[sortedMessages.length - 1].id;
          }
        }

        // Update pagination state + ref
        if (pagination) {
          setCurrentPage(pagination.currentPage);
          currentPageRef.current = pagination.currentPage;
          setHasMoreMessages(pagination.hasNextPage);
        } else {
          setHasMoreMessages(false);
        }
      } catch (error) {
        if (!mountedRef.current) return;
        console.warn('useMessages: loadMessages error —', error);
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

  // ─────────────────────────────────────────────────────────────────
  // POLLING — check for new messages
  // ─────────────────────────────────────────────────────────────────

  /**
   * Polls for new messages since the last known message ID.
   * Called on a 3-second interval from ChatScreen.
   *
   * Uses isAtBottomRef (not isAtBottom state) to avoid stale closures.
   * Uses isLoadingRef to prevent overlap with loadMessages.
   */
  const checkForNewMessages = useCallback(async () => {
    if (!chatRoom?.id || isLoadingRef.current) return;
    if (!mountedRef.current) return;

    isLoadingRef.current = true;

    try {
      const response = await chatService.getRoomMessages(chatRoom.id, 1);

      if (!mountedRef.current) return;

      // ✅ Reuse shared response unwrapping helper
      const { messages: messagesData } = unwrapMessagesResponse(response);

      if (!messagesData.length) return;

      const validMessages = filterValidMessages(messagesData);
      const sortedMessages = sortMessagesAsc(validMessages);
      const latestMessage = sortedMessages[sortedMessages.length - 1];

      if (!latestMessage) return;
      if (lastMessageIdRef.current === latestMessage.id) return;

      // Only keep messages newer than last known ID
      const newMessages = sortedMessages.filter(
        (msg) =>
          !lastMessageIdRef.current ||
          msg.id > lastMessageIdRef.current
      );

      if (!newMessages.length) return;

      setMessages((prevMessages) => {
        const existingIds = new Set(prevMessages.map((m) => m.id));
        const uniqueNew = newMessages.filter((m) => !existingIds.has(m.id));

        if (!uniqueNew.length) return prevMessages;

        // ✅ Use ref for isAtBottom — no stale closure
        if (!isAtBottomRef.current) {
          setShowNewMessageBadge(true);
        }

        return [...prevMessages, ...uniqueNew];
      });

      lastMessageIdRef.current = latestMessage.id;
    } catch (error) {
      if (!mountedRef.current) return;
      // Polling errors are expected (e.g. network blip) — warn only
      console.warn('useMessages: polling error —', error?.message || error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [chatRoom?.id, filterValidMessages]);
  // ✅ isAtBottom removed from deps — using isAtBottomRef instead

  // ─────────────────────────────────────────────────────────────────
  // LOAD OLDER MESSAGES (pagination)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Loads the next page of older messages and prepends them.
   * Uses currentPageRef to avoid stale page number from closure.
   */
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlderMessages || !hasMoreMessages) return;

    // ✅ Use ref for current page — avoids stale closure
    const nextPage = currentPageRef.current + 1;
    await loadMessages(nextPage, true);
  }, [loadMessages, hasMoreMessages, loadingOlderMessages]);
  // ✅ currentPage removed from deps — using currentPageRef instead

  // ─────────────────────────────────────────────────────────────────
  // CHAT ROOM CHANGE — reset + reload
  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!chatRoom?.id) return;

    // Reset all state for new chat room
    setCurrentPage(1);
    currentPageRef.current = 1;
    setHasMoreMessages(true);
    setMessages([]);
    setShowNewMessageBadge(false);
    lastMessageIdRef.current = null;
    isLoadingRef.current = false;

    loadMessages(1, false);
  }, [chatRoom?.id, loadMessages]); // ✅ loadMessages added to deps

  // ─────────────────────────────────────────────────────────────────
  // SCROLL HANDLER (inverted FlatList)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Handles scroll events from the inverted FlatList.
   * y=0 in an inverted list = user is at the BOTTOM (newest messages).
   *
   * Updates both state (for re-render) and ref (for polling closure).
   * Uses functional setState to avoid unnecessary re-renders when
   * isAtBottom value hasn't actually changed.
   */
  const handleScroll = useCallback(({ nativeEvent }) => {
    const isBottom =
      nativeEvent.contentOffset.y <= SCROLL_BOTTOM_THRESHOLD;

    // ✅ Update ref synchronously — used by checkForNewMessages
    isAtBottomRef.current = isBottom;

    // ✅ Only update state if value changed — prevents unnecessary re-renders
    setIsAtBottom((prev) => {
      if (prev === isBottom) return prev;
      return isBottom;
    });

    if (isBottom) {
      setShowNewMessageBadge(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────

  return {
    // ── State ───────────────────────────────────────────────────────
    messages,
    setMessages,
    loading,
    loadingOlderMessages,
    currentPage,
    hasMoreMessages,
    isAtBottom,
    showNewMessageBadge,
    setShowNewMessageBadge,

    // ── Refs (for ChatScreen polling interval management) ───────────
    lastMessageIdRef,
    pollingIntervalRef,

    // ── Actions ─────────────────────────────────────────────────────
    loadMessages,
    checkForNewMessages,
    loadOlderMessages,
    handleScroll,
  };
};

export default useMessages;