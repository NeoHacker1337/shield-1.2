// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/Features/useReplyMessage.js    ║
// ╚══════════════════════════════════════════════════════════════╝

import { useState, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────

/**
 * Validates that a message object is suitable to be used as a reply target.
 *
 * Requirements:
 * - Must be a non-null object
 * - Must have a valid id
 * - Must have a created_at timestamp
 * - Must have either text content OR a file_url (something to preview)
 * - Must have a sender identity (user_id, sender.id, or is_guest flag)
 * - Must NOT be a deleted message (no deleted_at)
 *
 * @param {object} message
 * @returns {boolean}
 */
const isValidReplyTarget = (message) => {
  if (!message || typeof message !== 'object') return false;
  if (!message.id) return false;
  if (!message.created_at) return false;

  // Must have something to preview in the reply banner
  const hasContent =
    message.content != null ||
    message.message != null ||
    message.text != null ||
    message.body != null ||
    !!message.file_url;

  if (!hasContent) return false;

  // Must have a sender identity
  const hasSender =
    message.user_id !== undefined ||
    !!message.sender?.id ||
    message.is_guest === 1 ||
    message.is_guest === true;

  if (!hasSender) return false;

  // Cannot reply to a deleted message
  if (message.deleted_at) return false;

  return true;
};

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

/**
 * useReplyMessage
 *
 * Manages the reply-to state for the chat input.
 * Tracks which message the user is currently replying to.
 *
 * Features:
 * - Full message validation before entering reply state
 * - Guest message reply support (configurable)
 * - Ref mirror for safe async access without stale closures
 * - isReplying convenience boolean
 * - Safe cancelReply with optional post-cancel callback
 *
 * @param {object} [options]
 * @param {boolean} [options.allowGuestReply=true] - Whether guest messages can be replied to
 * @returns {{
 *   replyingTo: object|null,
 *   replyingToRef: React.MutableRefObject,
 *   isReplying: boolean,
 *   startReply: function,
 *   cancelReply: function,
 * }}
 */
const useReplyMessage = ({ allowGuestReply = true } = {}) => {
  const [replyingTo, setReplyingTo] = useState(null);

  /**
   * Ref mirror of replyingTo for use in async callbacks.
   * Prevents stale closure issues when replyingTo is accessed
   * inside useCallback handlers (e.g. handleSend).
   */
  const replyingToRef = useRef(null);

  // ── Convenience derived state ──────────────────────────────────
  const isReplying = replyingTo !== null;

  // ── Start Reply ────────────────────────────────────────────────

  /**
   * Sets the given message as the current reply target.
   *
   * Validates the message before setting state.
   * If the user is already replying to a message, silently
   * replaces it with the new target (intentional — matches WhatsApp UX).
   *
   * Guest messages are allowed by default but can be restricted
   * via the allowGuestReply option.
   *
   * @param {object} message - The message to reply to
   */
  const startReply = useCallback(
    (message) => {
      // Full validation — not just id check
      if (!isValidReplyTarget(message)) {
        if (__DEV__) {
          console.warn(
            'useReplyMessage: startReply called with invalid message —',
            message
          );
        }
        return;
      }

      // Optional: block replies to guest messages
      const isGuestMessage =
        message.is_guest === 1 || message.is_guest === true;

      if (isGuestMessage && !allowGuestReply) {
        if (__DEV__) {
          console.warn(
            'useReplyMessage: reply to guest messages is disabled'
          );
        }
        return;
      }

      // Update both state and ref atomically
      replyingToRef.current = message;
      setReplyingTo(message);
    },
    [allowGuestReply]
  );

  // ── Cancel Reply ───────────────────────────────────────────────

  /**
   * Clears the current reply target and exits reply mode.
   *
   * Accepts an optional onCancelled callback that fires after
   * state is cleared — useful for chaining with send operations.
   *
   * @param {function} [onCancelled] - Optional callback after cancel
   */
  const cancelReply = useCallback((onCancelled) => {
    replyingToRef.current = null;
    setReplyingTo(null);

    if (typeof onCancelled === 'function') {
      onCancelled();
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────

  return {
    /** The message currently being replied to, or null */
    replyingTo,

    /**
     * Ref mirror of replyingTo.
     * Use this inside async callbacks to avoid stale closures.
     * e.g. in handleSend: const reply = replyingToRef.current;
     */
    replyingToRef,

    /** true if the user is currently in reply mode */
    isReplying,

    /** Sets a message as the reply target (with full validation) */
    startReply,

    /** Clears reply state. Accepts optional post-cancel callback. */
    cancelReply,
  };
};

// Named export for unit testing / mocking
export { useReplyMessage };

export default useReplyMessage;