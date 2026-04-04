import { useState, useCallback, useRef, useEffect } from 'react';
import chatService from '../../../services/chatService';
import { handleApiError } from '../../../utils/errorHandler';

const useMessages = ({ chatRoom, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessageBadge, setShowNewMessageBadge] = useState(false);

  const lastMessageIdRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // ── Filter only valid messages ─────────────────────────────────
  const filterValidMessages = useCallback((messagesArray) => {
    if (!Array.isArray(messagesArray)) return [];

    return messagesArray.filter((msg) => {
      const messageContent = msg.content || msg.message || msg.text || msg.body;

      return (
        msg &&
        msg.id &&
        msg.created_at &&
        (
          // Allow text messages
          (messageContent !== undefined && messageContent !== null) ||
          // Allow image / file messages
          msg.file_url
        ) &&
        (
          msg.user_id !== undefined ||
          msg.is_guest === 1 ||
          msg.sender?.id
        )
      );
    });
  }, []);

  // ── Load messages (initial + pagination) ───────────────────────
  const loadMessages = useCallback(
    async (page = 1, isLoadingMore = false) => {
      if (!chatRoom?.id) {
        setLoading(false);
        return;
      }

      try {
        if (!isLoadingMore) setLoading(true);
        else setLoadingOlderMessages(true);

        const response = await chatService.getRoomMessages(chatRoom.id, page);

        let messagesData = [];
        let paginationInfo = null;

        if (response?.data?.success && response?.data?.data?.data) {
          messagesData = response.data.data.data;
          paginationInfo = {
            currentPage: response.data.data.current_page,
            lastPage: response.data.data.last_page,
            hasNextPage: response.data.data.next_page_url !== null,
            total: response.data.data.total,
          };
        } else if (Array.isArray(response?.data?.data)) {
          messagesData = response.data.data;
        } else if (Array.isArray(response?.data)) {
          messagesData = response.data;
        }

        const validMessages = filterValidMessages(messagesData);

        // Sort ASC (old → new)
        const sortedMessages = [...validMessages].sort((a, b) => a.id - b.id);

        if (isLoadingMore && page > 1) {
          // Prepend older messages and remove duplicates
          setMessages((prev) => {
            const combined = [...sortedMessages, ...prev];
            return combined.filter(
              (msg, index, arr) =>
                arr.findIndex((m) => m.id === msg.id) === index
            );
          });
        } else {
          // Fresh load — replace messages
          setMessages(sortedMessages);
          if (sortedMessages.length > 0) {
            lastMessageIdRef.current =
              sortedMessages[sortedMessages.length - 1].id;
          }
        }

        if (paginationInfo) {
          setCurrentPage(paginationInfo.currentPage);
          setHasMoreMessages(paginationInfo.hasNextPage);
        } else {
          setHasMoreMessages(false);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        handleApiError(error, 'Failed to load messages');
        if (!isLoadingMore) setMessages([]);
      } finally {
        if (!isLoadingMore) setLoading(false);
        else setLoadingOlderMessages(false);
      }
    },
    [chatRoom?.id, filterValidMessages]
  );

  // ── Polling — check for new messages every 3 seconds ──────────
  const checkForNewMessages = useCallback(async () => {
    if (!chatRoom?.id || loading) return;

    try {
      const response = await chatService.getRoomMessages(chatRoom.id, 1);

      let messagesData = [];

      if (response?.data?.success && response?.data?.data?.data) {
        messagesData = response.data.data.data;
      } else if (Array.isArray(response?.data?.data)) {
        messagesData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        messagesData = response.data;
      }

      if (messagesData.length > 0) {
        const validMessages = filterValidMessages(messagesData);

        // Sort ASC (old → new)
        const sortedMessages = [...validMessages].sort((a, b) => a.id - b.id);

        // Latest message is always the last item
        const latestMessage = sortedMessages[sortedMessages.length - 1];

        if (latestMessage && lastMessageIdRef.current !== latestMessage.id) {
          // Only pick messages newer than the last known ID
          const newMessages = sortedMessages.filter(
            (msg) =>
              !lastMessageIdRef.current ||
              msg.id > lastMessageIdRef.current
          );

          if (newMessages.length > 0) {
            setMessages((prevMessages) => {
              const existingIds = new Set(prevMessages.map((msg) => msg.id));
              const uniqueNewMessages = newMessages.filter(
                (msg) => !existingIds.has(msg.id)
              );

              if (uniqueNewMessages.length > 0) {
                // Show badge if user has scrolled up
                if (!isAtBottom) {
                  setShowNewMessageBadge(true);
                }
                // Append new messages at the END (ASC order)
                return [...prevMessages, ...uniqueNewMessages];
              }

              return prevMessages;
            });

            lastMessageIdRef.current = latestMessage.id;
          }
        }
      }
    } catch (error) {
      console.log('Polling error:', error);
    }
  }, [chatRoom?.id, loading, filterValidMessages, isAtBottom]);

  // ── Load next page (older messages) ───────────────────────────
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlderMessages || !hasMoreMessages) return;
    const nextPage = currentPage + 1;
    await loadMessages(nextPage, true);
  }, [loadMessages, currentPage, hasMoreMessages, loadingOlderMessages]);

  // ── Reset + reload when chatRoom changes ───────────────────────
  useEffect(() => {
    if (chatRoom?.id) {
      setCurrentPage(1);
      setHasMoreMessages(true);
      setMessages([]);
      lastMessageIdRef.current = null;
      loadMessages(1, false);
    }
  }, [chatRoom?.id]);

  // ── Scroll handler (inverted FlatList) ────────────────────────
  // y=0 means user is at the BOTTOM (newest) because list is inverted
  const handleScroll = useCallback(({ nativeEvent }) => {
    const { contentOffset } = nativeEvent;
    const isBottom = contentOffset.y <= 50;
    setIsAtBottom(isBottom);
    if (isBottom) setShowNewMessageBadge(false);
  }, []);

  return {
    // State
    messages,
    setMessages,
    loading,
    loadingOlderMessages,
    hasMoreMessages,
    isAtBottom,
    showNewMessageBadge,
    setShowNewMessageBadge,
    // Refs
    lastMessageIdRef,
    pollingIntervalRef,
    // Actions
    loadMessages,
    checkForNewMessages,
    loadOlderMessages,
    handleScroll,
  };
};

export default useMessages;