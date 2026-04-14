import { useCallback } from 'react';
import { Alert } from 'react-native';
import { handleApiError } from '../../../utils/errorHandler';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

/**
 * ⚠️  TODO: Replace stub handlers with real API service calls.
 * Each action below marked TODO needs a backend integration.
 */

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

/**
 * useChatActions
 *
 * Provides all message-level and chat-level action handlers.
 * All callbacks are memoized with useCallback to prevent
 * unnecessary re-renders in child components.
 *
 * @param {object} currentUser     - Logged-in user object
 * @param {function} setMessages   - Messages state setter
 * @param {object} lastMessageIdRef - Ref tracking last message ID
 * @param {object} navigation      - React Navigation object
 */
const useChatActions = ({
  currentUser,
  setMessages,
  lastMessageIdRef,
  navigation,
}) => {

  // ─────────────────────────────────────────────────────────────────
  // INTERNAL — Delete a single message
  // ─────────────────────────────────────────────────────────────────

  /**
   * Optimistically removes a message from local state,
   * then calls the API to delete it on the server.
   * Rolls back on failure.
   *
   * TODO: Replace the placeholder API call with your real
   *       message delete service (e.g. messageService.delete(id))
   */
  const deleteMessageById = useCallback(
    async (message) => {
      // 1. Optimistic update — remove from UI immediately
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));

      try {
        // TODO: await messageService.deleteMessage(message.id);
        // Placeholder — replace with real API call
        // e.g. await api.delete(`/messages/${message.id}`);

        // ✅ Success — state already updated optimistically
      } catch (error) {
        // 2. Rollback on failure — restore the deleted message
        setMessages((prev) => {
          const alreadyExists = prev.some((msg) => msg.id === message.id);
          if (alreadyExists) return prev;
          return [...prev, message].sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );
        });

        handleApiError(error, 'Failed to delete message');
      }
    },
    [setMessages]
  );

  // ─────────────────────────────────────────────────────────────────
  // MESSAGE LONG PRESS — Edit / Delete sheet
  // ─────────────────────────────────────────────────────────────────

  /**
   * Shows an action sheet with Edit and/or Delete options
   * when the user long-presses their own message.
   *
   * - Edit is only offered for pure text messages (no file attachment)
   * - Guest messages cannot be edited or deleted
   * - Uses isOwnMessage logic consistent with ChatHelpers.isOwnMessage
   */
  const handleMessageLongPress = useCallback(
    (message, onEditPress) => {
      if (!message) return;

      const isGuest =
        message.is_guest === 1 || message.is_guest === true;

      // Consistent with ChatHelpers.isOwnMessage —
      // check both user_id and sender.id
      const isOwn =
        !isGuest &&
        (message.user_id === currentUser?.id ||
          message.sender?.id === currentUser?.id);

      if (!isOwn) return;

      const messageText =
        message.content ||
        message.message ||
        message.text ||
        message.body ||
        '';

      // Edit offered only for text-only messages
      // (messages with captions + files are excluded for now)
      const isTextOnly = !!messageText.trim() && !message.file_url;

      const buttons = [];

      if (isTextOnly) {
        buttons.push({
          text: '✏️  Edit',
          onPress: () => onEditPress?.(message),
        });
      }

      buttons.push({
        text: '🗑️  Delete',
        style: 'destructive',
        onPress: () => confirmDeleteMessage(message),
      });

      buttons.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert('Message Options', null, buttons);
    },
    [currentUser?.id]
  );

  // ─────────────────────────────────────────────────────────────────
  // DELETE CONFIRMATION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Shows a confirmation dialog before deleting a message.
   * Prevents accidental deletion.
   */
  const confirmDeleteMessage = useCallback(
    (message) => {
      Alert.alert(
        'Delete Message',
        'Are you sure you want to delete this message?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteMessageById(message),
          },
        ]
      );
    },
    [deleteMessageById]
  );

  // ─────────────────────────────────────────────────────────────────
  // CLEAR CHAT
  // ─────────────────────────────────────────────────────────────────

  /**
   * Clears all messages from the current chat after confirmation.
   * Resets lastMessageIdRef so polling restarts from the beginning.
   *
   * TODO: Add API call to clear chat on server.
   */
  const handleClearChat = useCallback(() => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to delete all messages? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            lastMessageIdRef.current = null;
            // TODO: await chatService.clearChat(chatRoom.id);
          },
        },
      ]
    );
  }, [setMessages, lastMessageIdRef]);

  // ─────────────────────────────────────────────────────────────────
  // DELETE CHAT
  // ─────────────────────────────────────────────────────────────────

  /**
   * Deletes the entire chat room after confirmation.
   * Clears local messages and navigates back.
   *
   * TODO: Add API call to delete chat room on server.
   */
  const handleDeleteChat = useCallback(() => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this entire chat? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Clear local state before navigating away
            setMessages([]);
            lastMessageIdRef.current = null;
            // TODO: await chatService.deleteChat(chatRoom.id);
            navigation.goBack();
          },
        },
      ]
    );
  }, [setMessages, lastMessageIdRef, navigation]);

  // ─────────────────────────────────────────────────────────────────
  // CALL ACTIONS
  // ─────────────────────────────────────────────────────────────────

  /**
   * TODO: Integrate with your calling SDK
   * (e.g. Agora, Twilio, WebRTC, etc.)
   */
  const handleAudioCall = useCallback(() => {
    Alert.alert(
      'Audio Call',
      'Audio calling is not yet available.',
      [{ text: 'OK', style: 'cancel' }]
    );
    // TODO: navigation.navigate('AudioCallScreen', { userId: contact.id });
  }, []);

  const handleVideoCall = useCallback(() => {
    Alert.alert(
      'Video Call',
      'Video calling is not yet available.',
      [{ text: 'OK', style: 'cancel' }]
    );
    // TODO: navigation.navigate('VideoCallScreen', { userId: contact.id });
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // NAVIGATION ACTIONS
  // ─────────────────────────────────────────────────────────────────

  /**
   * TODO: Replace alerts with real navigation targets
   */
  const handleSearch = useCallback(() => {
    Alert.alert('Search', 'Search in chat is coming soon.');
    // TODO: navigation.navigate('ChatSearchScreen', { chatRoomId });
  }, []);

  const handleMedia = useCallback(() => {
    Alert.alert('Media', 'Media viewer is coming soon.');
    // TODO: navigation.navigate('ChatMediaScreen', { chatRoomId });
  }, []);

  const handleViewContact = useCallback(() => {
    Alert.alert('Contact', 'Contact viewer is coming soon.');
    // TODO: navigation.navigate('ContactDetailScreen', { userId: contact.id });
  }, []);

  const handleNewGroup = useCallback(() => {
    Alert.alert('New Group', 'Group creation is coming soon.');
    // TODO: navigation.navigate('CreateGroupScreen');
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // MODERATION ACTIONS
  // ─────────────────────────────────────────────────────────────────

  /**
   * TODO: Each moderation action needs a real API call and
   *       should update local state to reflect the change immediately.
   */
  const handleMute = useCallback(() => {
    Alert.alert(
      'Mute Notifications',
      'Choose how long to mute notifications.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mute',
          onPress: () => {
            // TODO: await notificationService.muteChat(chatRoom.id);
            Alert.alert('Muted', 'Notifications have been muted.');
          },
        },
      ]
    );
  }, []);

  const handleReport = useCallback(() => {
    Alert.alert(
      'Report User',
      'Are you sure you want to report this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            // TODO: await moderationService.reportUser(contact.id);
            Alert.alert('Reported', 'This user has been reported. Thank you.');
          },
        },
      ]
    );
  }, []);

  const handleBlock = useCallback(() => {
    Alert.alert(
      'Block User',
      'Blocking this user will prevent them from sending you messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            // TODO: await moderationService.blockUser(contact.id);
            Alert.alert('Blocked', 'This user has been blocked.');
            navigation.goBack();
          },
        },
      ]
    );
  }, [navigation]);

  // ─────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────

  return {
    handleMessageLongPress,
    handleClearChat,
    handleDeleteChat,
    handleAudioCall,
    handleVideoCall,
    handleSearch,
    handleMedia,
    handleViewContact,
    handleNewGroup,
    handleMute,
    handleReport,
    handleBlock,
  };
};

export default useChatActions;