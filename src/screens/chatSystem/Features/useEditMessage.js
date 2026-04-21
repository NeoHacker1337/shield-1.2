// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/Features/useEditMessage.js     ║
// ╚══════════════════════════════════════════════════════════════╝

import { useState, useCallback, useRef, useEffect } from 'react';
import chatService from '../../../services/chatService';
import { handleApiError } from '../../../utils/errorHandler';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 3000;

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Extracts plain text content from a message object.
 * Checks all known content field variants.
 *
 * @param {object} message
 * @returns {string}
 */
const extractMessageText = (message) => {
  if (!message) return '';
  return (
    message.content ||
    message.message ||
    message.text ||
    message.body ||
    ''
  );
};

/**
 * Checks if a message is owned by the current user.
 * Consistent with ChatHelpers.isOwnMessage —
 * checks both user_id and sender.id.
 *
 * @param {object} message
 * @param {object} currentUser
 * @returns {boolean}
 */
const isMessageOwnedByUser = (message, currentUser) => {
  if (!message || !currentUser?.id) return false;
  return (
    message.user_id === currentUser.id ||
    message.sender?.id === currentUser.id
  );
};

/**
 * Safely unwraps an API response to get the message object.
 * Handles both { data: { data: msg } } and { data: msg } shapes.
 *
 * @param {object} response
 * @returns {object|null}
 */
const unwrapApiMessage = (response) => {
  const inner = response?.data?.data;
  if (inner && typeof inner === 'object' && inner.id) return inner;

  const outer = response?.data;
  if (outer && typeof outer === 'object' && outer.id) return outer;

  return null;
};

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

/**
 * useEditMessage
 *
 * Manages the full lifecycle of editing a chat message:
 * - startEdit: validates and opens edit mode for a message
 * - handleEdit: optimistic update → API call → confirm or rollback
 * - cancelEdit: closes edit mode cleanly
 *
 * Features:
 * - Optimistic UI update with rollback on failure
 * - Mounted ref guard — no state updates after unmount
 * - In-flight ref guard — prevents double submissions
 * - Consistent ownership check (user_id + sender.id)
 * - Max length enforcement
 *
 * @param {object} chatRoom     - Current chat room
 * @param {object} currentUser  - Logged-in user
 * @param {function} setMessages - Messages state setter
 * @param {object} [inputRef]   - Optional TextInput ref for auto-focus
 */
const useEditMessage = ({
  chatRoom,
  currentUser,
  setMessages,
  inputRef,
}) => {
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // ── Guards ───────────────────────────────────────────────────────
  const mountedRef = useRef(true);

  /**
   * isEditingRef is used as an in-flight guard instead of relying
   * on the isEditing state value inside callbacks.
   * This prevents double-submission from rapid taps.
   */
  const isEditingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Safe state setters ───────────────────────────────────────────

  const safeSetIsEditing = useCallback((value) => {
    isEditingRef.current = value;
    if (mountedRef.current) setIsEditing(value);
  }, []);

  const safeSetMessages = useCallback(
    (updater) => {
      if (mountedRef.current) setMessages(updater);
    },
    [setMessages]
  );

  // ── Cancel editing ───────────────────────────────────────────────

  /**
   * Cancels edit mode and resets all edit state.
   * Safe to call at any point — including during API flight.
   */
  const cancelEdit = useCallback(() => {
    if (!mountedRef.current) return;
    setEditingMessage(null);
    setEditText('');
    // Note: we do NOT reset isEditing here if an API call is in-flight
    // The finally block in handleEdit will reset it when complete
  }, []);

  // ── Start editing ────────────────────────────────────────────────

  /**
   * Opens edit mode for a message.
   * Validates ownership, guest status, and message type.
   * Only text-only messages (no file attachments) are editable.
   *
   * @param {object} message - The message to edit
   */
  const startEdit = useCallback(
    (message) => {
      if (!message) return;

      const isGuest =
        message.is_guest === 1 || message.is_guest === true;

      // Consistent ownership check — matches ChatHelpers.isOwnMessage
      const isOwn = isMessageOwnedByUser(message, currentUser);

      const messageText = extractMessageText(message);

      // Guard: only own, non-guest, text-only messages are editable
      if (!isOwn || isGuest || !messageText.trim() || message.file_url) {
        return;
      }

      setEditingMessage(message);
      setEditText(messageText);

      // Auto-focus input if ref is provided
      // Small delay lets the banner render before focus
      if (inputRef?.current) {
        setTimeout(() => {
          if (mountedRef.current) {
            inputRef.current?.focus();
          }
        }, 50);
      }
    },
    [currentUser, inputRef]
  );

  // ── Submit edit ──────────────────────────────────────────────────

  /**
   * Submits the edited message.
   *
   * Flow:
   * 1. Validate input (empty, unchanged, too long)
   * 2. Optimistic update in UI
   * 3. Close edit banner immediately (good UX)
   * 4. API call to persist change
   * 5a. On success: replace optimistic data with server response
   * 5b. On failure: rollback to original message + show error
   */
  const handleEdit = useCallback(async () => {
    const trimmedText = editText.trim();

    // ── Guards ─────────────────────────────────────────────────────
    if (!trimmedText) return;
    if (isEditingRef.current) return; // Use ref, not state — prevents race condition
    if (!editingMessage || !chatRoom?.id) return;

    // Max length enforcement
    if (trimmedText.length > MAX_MESSAGE_LENGTH) {
      handleApiError(
        new Error('Message too long'),
        `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`
      );
      return;
    }

    const originalText = extractMessageText(editingMessage).trim();

    // No change — just close edit mode
    if (trimmedText === originalText) {
      cancelEdit();
      return;
    }

    // ── Capture values before any state changes ────────────────────
    // IMPORTANT: capture these BEFORE cancelEdit() or any setState
    // to avoid stale closure issues
    const messageIdBeingEdited = editingMessage.id;
    const originalMessage = { ...editingMessage };

    // ── Step 1: Mark as editing ────────────────────────────────────
    safeSetIsEditing(true);

    // ── Step 2: Optimistic update ──────────────────────────────────
    // Use captured messageIdBeingEdited (not editingMessage.id)
    // to avoid any closure staleness after cancelEdit
    safeSetMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageIdBeingEdited
          ? {
              ...msg,
              content: trimmedText,
              message: trimmedText,   // update all known text fields
              text: trimmedText,
              is_edited: true,
              updated_at: new Date().toISOString(),
              editing: true,          // UI loading indicator flag
            }
          : msg
      )
    );

    // ── Step 3: Close edit banner immediately ──────────────────────
    cancelEdit();

    try {
      // ── Step 4: API call ─────────────────────────────────────────
      const response = await chatService.editMessage(
        chatRoom.id,
        messageIdBeingEdited,
        { content: trimmedText }
      );

      if (!mountedRef.current) return;

      // ── Step 5a: Replace optimistic with server-confirmed message ─
      const updatedMessage = unwrapApiMessage(response);

      safeSetMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageIdBeingEdited) return msg;

          if (updatedMessage) {
            return {
              ...updatedMessage,
              is_edited: true,
              editing: false,
            };
          }

          // API succeeded but returned no body — keep optimistic data
          return {
            ...msg,
            editing: false,
          };
        })
      );
    } catch (error) {
      if (!mountedRef.current) return;

      // ── Step 5b: Rollback on failure ──────────────────────────────
      safeSetMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageIdBeingEdited
            ? { ...originalMessage, editing: false }
            : msg
        )
      );

      handleApiError(error, 'Failed to edit message');
    } finally {
      safeSetIsEditing(false);
    }
  }, [
    editText,
    editingMessage,
    chatRoom?.id,
    safeSetMessages,
    safeSetIsEditing,
    cancelEdit,
  ]);
  // ✅ isEditing removed from deps — using isEditingRef instead

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────
  return {
    editingMessage,
    editText,
    setEditText,
    isEditing,
    startEdit,
    handleEdit,
    cancelEdit,
  };
};

export default useEditMessage;