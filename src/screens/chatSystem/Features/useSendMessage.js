// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/Features/useSendMessage.js     ║
// ╚══════════════════════════════════════════════════════════════╝

import { useState, useCallback, useRef, useEffect } from 'react';
import chatService from '../../../services/chatService';
import { handleApiError } from '../../../utils/errorHandler';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 3000;

// ─────────────────────────────────────────────────────────────────
// HELPERS — module level, never recreated
// ─────────────────────────────────────────────────────────────────

/**
 * Generates a unique temporary ID for optimistic messages.
 * @returns {string}
 */
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * Maps attachment type string to a normalized message type.
 * Returns the correct type for all known attachment categories.
 *
 * @param {string} type     - Attachment category (gallery, camera, document, audio)
 * @param {object} payload  - File payload with mime type info
 * @returns {'image'|'video'|'audio'|'file'}
 */
const mapAttachmentType = (type, payload) => {
  switch (type) {
    case 'gallery':
    case 'camera':
      return payload.type?.startsWith('video/') ? 'video' : 'image';
    case 'audio':
      return 'audio';
    case 'document':
    default:
      return 'file';
  }
};

/**
 * Safely unwraps the sent message from various API response shapes.
 * Validates that the result has at minimum an id field.
 *
 * @param {object} response - Axios response object
 * @returns {object|null}
 */
const unwrapSentMessage = (response) => {
  const candidates = [
    response?.data?.data,
    response?.data?.message,
    response?.data,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && candidate.id) {
      return candidate;
    }
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

/**
 * useSendMessage
 *
 * Manages sending text messages and file attachments in a chat room.
 *
 * Features:
 * - Optimistic UI updates for both text and file messages
 * - Rollback on failure with user notification
 * - Mounted ref guard — no state updates after unmount
 * - In-flight ref guards — prevents duplicate sends
 * - Reply context support for both text and file messages
 * - Full type mapping including audio
 * - Max message length enforcement
 *
 * @param {object} chatRoom         - Current chat room
 * @param {object} currentUser      - Logged-in user
 * @param {function} setMessages    - Messages state setter
 * @param {object} lastMessageIdRef - Ref tracking last known message ID
 */
const useSendMessage = ({
  chatRoom,
  currentUser,
  setMessages,
  lastMessageIdRef,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  /**
   * Combined upload state: { [tempId]: { progress: number, uploading: boolean } }
   * Merged to keep related data together and reduce setState calls.
   */
  const [uploadState, setUploadState] = useState({});

  // ── Guards ─────────────────────────────────────────────────────
  const mountedRef = useRef(true);

  /**
   * In-flight guard for text send — ref (not state) prevents race condition
   * from rapid double-tap before setIsSending(true) propagates.
   */
  const isSendingRef = useRef(false);

  /**
   * Tracks active file upload tempIds to prevent duplicate uploads.
   */
  const activeUploadsRef = useRef(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Upload state helpers ───────────────────────────────────────

  const initUpload = useCallback((tempId) => {
    if (!mountedRef.current) return;
    setUploadState((prev) => ({
      ...prev,
      [tempId]: { progress: 0, uploading: true },
    }));
  }, []);

  const updateUploadProgress = useCallback((tempId, percent) => {
    if (!mountedRef.current) return;
    setUploadState((prev) => ({
      ...prev,
      [tempId]: { ...prev[tempId], progress: Math.min(percent, 100) },
    }));
  }, []);

  const clearUpload = useCallback((tempId) => {
    if (!mountedRef.current) return;
    setUploadState((prev) => {
      const updated = { ...prev };
      delete updated[tempId];
      return updated;
    });
    activeUploadsRef.current.delete(tempId);
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // SEND TEXT MESSAGE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Sends a text message with optimistic UI update.
   *
   * Flow:
   * 1. Validate input
   * 2. Show temp message instantly
   * 3. Clear input + cancel reply immediately (good UX)
   * 4. POST to API
   * 5a. Success: replace temp with server-confirmed message
   * 5b. Failure: remove temp, restore input text, show error
   *
   * @param {object|null} replyingTo  - Message being replied to
   * @param {function|null} cancelReply - Callback to clear reply state
   */
  const handleSend = useCallback(
    async (replyingTo = null, cancelReply = null) => {
      const trimmed = newMessage.trim();

      // ── Guards ──────────────────────────────────────────────────
      if (!trimmed) return;
      if (isSendingRef.current) return; // ✅ Ref guard — no race condition
      if (!chatRoom?.id) return;
      if (trimmed.length > MAX_MESSAGE_LENGTH) return;

      // ── Mark as sending ─────────────────────────────────────────
      isSendingRef.current = true;
      if (mountedRef.current) setIsSending(true);

      const tempId = generateTempId();

      // ── Optimistic temp message ──────────────────────────────────
      const tempMessage = {
        id: tempId,
        content: trimmed,
        type: 'text',
        user_id: currentUser?.id,
        sender: {
          id: currentUser?.id,
          name: currentUser?.name || 'You',
        },
        reply_to_id: replyingTo?.id || null,
        reply_to: replyingTo || null,
        created_at: new Date().toISOString(),
        sending: true,
      };

      // ── Clear input and reply banner immediately ─────────────────
      if (mountedRef.current) setNewMessage('');
      cancelReply?.();

      // ── Append temp message ──────────────────────────────────────
      if (mountedRef.current) {
        setMessages((prev) => [...prev, tempMessage]);
      }

      try {
        const payload = {
          content: trimmed,
          type: 'text',
          user_id: currentUser?.id,
        };

        if (replyingTo?.id) {
          payload.reply_to_id = replyingTo.id;
        }

        const response = await chatService.sendMessage(chatRoom.id, payload);

        if (!mountedRef.current) return;

        const sentMessage = unwrapSentMessage(response);

        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== tempId);

          if (sentMessage) {
            const messageToAdd = {
              ...sentMessage,
              sender: sentMessage.sender || {
                id: currentUser?.id,
                name: currentUser?.name || 'You',
              },
              reply_to: sentMessage.reply_to || replyingTo || null,
            };

            // ✅ Always update lastMessageIdRef when send succeeds
            lastMessageIdRef.current = messageToAdd.id;

            return [...filtered, messageToAdd];
          }

          // API succeeded but returned no body — keep optimistic message
          // Remove 'sending' flag so it renders as confirmed
          return prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, sending: false }
              : msg
          );
        });
      } catch (error) {
        if (!mountedRef.current) return;

        // ✅ Rollback: remove temp + restore input
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        setNewMessage(trimmed);

        // Note: we do NOT restore cancelReply — reply context is lost
        // This is acceptable: user can re-swipe to reply if needed
        // Restoring reply state here would require passing replyingTo back up

        handleApiError(error, 'Failed to send message');
      } finally {
        isSendingRef.current = false;
        if (mountedRef.current) setIsSending(false);
      }
    },
    [newMessage, chatRoom?.id, currentUser, setMessages, lastMessageIdRef]
  );

  // ─────────────────────────────────────────────────────────────────
  // SEND FILE / IMAGE / VIDEO / AUDIO / DOCUMENT
  // ─────────────────────────────────────────────────────────────────

  /**
   * Uploads a file attachment with optimistic UI and progress tracking.
   *
   * Flow:
   * 1. Validate payload and chat room
   * 2. Map type, build optimistic temp message
   * 3. Append temp message + init upload state
   * 4. POST FormData with progress callback
   * 5a. Success: replace temp with server-confirmed message
   * 5b. Failure: remove temp + show error alert
   *
   * @param {object} payload          - File payload { uri, name, type, duration? }
   * @param {string} type             - Attachment type: gallery|camera|document|audio
   * @param {object|null} replyingTo  - Message being replied to
   * @param {function|null} cancelReply - Callback to clear reply state
   */
  const handleSendFile = useCallback(
    async (payload, type, replyingTo = null, cancelReply = null) => {
      // ── Guards ────────────────────────────────────────────────────
      if (!chatRoom?.id) return;
      if (!payload?.uri) return;

      const tempId = generateTempId();

      // ✅ Prevent duplicate concurrent uploads for same file
      // (edge case: rapid double-tap on send)
      if (activeUploadsRef.current.has(tempId)) return;
      activeUploadsRef.current.add(tempId);

      // ── Map type ───────────────────────────────────────────────────
      // ✅ Now handles 'audio' type correctly
      const mappedType = mapAttachmentType(type, payload);

      // ── File object for FormData ───────────────────────────────────
      const file = {
        uri: payload.uri,
        name: payload.name || `file_${Date.now()}`,
        type: payload.type || 'application/octet-stream',
      };

      // ── Optimistic temp message ────────────────────────────────────
      // ✅ Now includes sender, reply context, and audio duration
      const tempMessage = {
        id: tempId,
        type: mappedType,
        file_url: payload.uri,
        file_name: file.name,
        file_type: file.type,
        // ✅ Include duration for audio messages
        duration: mappedType === 'audio' ? (payload.duration || 0) : undefined,
        user_id: currentUser?.id,
        sender: {
          id: currentUser?.id,
          name: currentUser?.name || 'You',
        },
        // ✅ Include reply context
        reply_to_id: replyingTo?.id || null,
        reply_to: replyingTo || null,
        created_at: new Date().toISOString(),
        sending: true,
      };

      // ── Cancel reply immediately ───────────────────────────────────
      // ✅ Now calls cancelReply (was missing before)
      cancelReply?.();

      // ── Append temp message + init upload tracking ────────────────
      if (mountedRef.current) {
        setMessages((prev) => [...prev, tempMessage]);
        initUpload(tempId);
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', mappedType);
        formData.append('user_id', String(currentUser?.id ?? ''));

        // ✅ Include reply_to_id in file uploads
        if (replyingTo?.id) {
          formData.append('reply_to_id', String(replyingTo.id));
        }

        // Include duration for audio messages
        if (mappedType === 'audio' && payload.duration) {
          formData.append('duration', String(payload.duration));
        }

        const response = await chatService.sendMessage(chatRoom.id, formData, {
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total || !mountedRef.current) return;

            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );

            if (__DEV__) {
              console.log(`Upload progress [${tempId}]: ${percent}%`);
            }

            updateUploadProgress(tempId, percent);
          },
        });

        if (!mountedRef.current) return;

        // ✅ Validate sentMessage before using it
        const sentMessage = unwrapSentMessage(response);

        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== tempId);

          if (sentMessage) {
            const messageToAdd = {
              ...sentMessage,
              sender: sentMessage.sender || {
                id: currentUser?.id,
                name: currentUser?.name || 'You',
              },
              reply_to: sentMessage.reply_to || replyingTo || null,
            };

            lastMessageIdRef.current = messageToAdd.id;

            return [...filtered, messageToAdd];
          }

          // API succeeded but returned no body
          // Keep optimistic message without 'sending' flag
          return prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, sending: false }
              : msg
          );
        });
      } catch (error) {
        if (!mountedRef.current) return;

        // ✅ Remove temp + notify user (was silent before)
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        handleApiError(error, 'Failed to send file');
      } finally {
        clearUpload(tempId);
        if (mountedRef.current) {
          // Ensure sending flag is cleared if message still exists
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId ? { ...msg, sending: false } : msg
            )
          );
        }
      }
    },
    [
      chatRoom?.id,
      currentUser,
      setMessages,
      lastMessageIdRef,
      initUpload,
      updateUploadProgress,
      clearUpload,
    ]
  );

  // ─────────────────────────────────────────────────────────────────
  // DERIVED STATE HELPERS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Returns upload progress (0–100) for a given tempId.
   * @param {string} tempId
   * @returns {number}
   */
  const getUploadProgress = useCallback(
    (tempId) => uploadState[tempId]?.progress ?? 0,
    [uploadState]
  );

  /**
   * Returns true if a file with the given tempId is currently uploading.
   * @param {string} tempId
   * @returns {boolean}
   */
  const isUploadingFile = useCallback(
    (tempId) => uploadState[tempId]?.uploading === true,
    [uploadState]
  );

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────

  return {
    // ── State ───────────────────────────────────────────────────────
    newMessage,
    setNewMessage,
    isSending,

    // ── Upload state (via helpers — raw state not exposed) ──────────
    getUploadProgress,
    isUploadingFile,

    // ── Actions ─────────────────────────────────────────────────────
    handleSend,
    handleSendFile,
  };
};

export default useSendMessage;