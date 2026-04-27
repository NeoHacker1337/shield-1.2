 
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { handleApiError } from '../../../utils/errorHandler';

// 🚨 GLOBAL FLAG (future-safe for call system)
const ENABLE_LOCAL_CALL_LOGIC = false;

const useChatActions = ({
  currentUser,
  chatRoom,
  setMessages,
  lastMessageIdRef,
  navigation,
}) => {

  // ─────────────────────────────────────────────────────────────
  // DELETE MESSAGE
  // ─────────────────────────────────────────────────────────────
  const deleteMessageById = useCallback(
    async (message) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));

      try {
        // TODO: API call
      } catch (error) {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === message.id);
          if (exists) return prev;

          return [...prev, message].sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );
        });

        handleApiError(error, 'Failed to delete message');
      }
    },
    [setMessages]
  );

  // ─────────────────────────────────────────────────────────────
  // LONG PRESS
  // ─────────────────────────────────────────────────────────────
  const handleMessageLongPress = useCallback(
    (message, onEditPress) => {
      if (!message) return;

      const isGuest =
        message.is_guest === 1 || message.is_guest === true;

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

  // ─────────────────────────────────────────────────────────────
  // CLEAR CHAT
  // ─────────────────────────────────────────────────────────────
  const handleClearChat = useCallback(() => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to delete all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            lastMessageIdRef.current = null;
          },
        },
      ]
    );
  }, [setMessages, lastMessageIdRef]);

  // ─────────────────────────────────────────────────────────────
  // DELETE CHAT
  // ─────────────────────────────────────────────────────────────
  const handleDeleteChat = useCallback(() => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            lastMessageIdRef.current = null;

            // ✅ SAFE NAVIGATION
            if (navigation?.canGoBack?.()) {
              navigation.goBack();
            } else {
              navigation.replace?.('MainTabs');
            }
          },
        },
      ]
    );
  }, [setMessages, lastMessageIdRef, navigation]);

  // ─────────────────────────────────────────────────────────────
  // 📞 CALL ACTIONS (FIXED FOR GLOBAL SYSTEM)
  // ─────────────────────────────────────────────────────────────

  const handleAudioCall = useCallback(() => {
    if (!ENABLE_LOCAL_CALL_LOGIC) {
      console.log('[useChatActions] AudioCall triggered — global system will handle');

      if (!chatRoom?.id || !currentUser?.id) {
        Alert.alert('Audio Call', 'This chat is not ready for calling yet.');
        return;
      }

      // Pass the full call context expected by AudioCallScreen.
      navigation?.navigate?.('AudioCall', {
        roomId: chatRoom.id,
        userId: currentUser.id,
        isCaller: true,
      });

      return;
    }

    Alert.alert(
      'Audio Call',
      'Audio calling is not yet available.',
      [{ text: 'OK', style: 'cancel' }]
    );
  }, [chatRoom?.id, currentUser?.id, navigation]);

  const handleVideoCall = useCallback(() => {
    Alert.alert(
      'Video Call',
      'Video calling is not yet available.',
      [{ text: 'OK', style: 'cancel' }]
    );
  }, []);

  // ─────────────────────────────────────────────────────────────
  // NAVIGATION ACTIONS
  // ─────────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    Alert.alert('Search', 'Search in chat is coming soon.');
  }, []);

  const handleMedia = useCallback(() => {
    Alert.alert('Media', 'Media viewer is coming soon.');
  }, []);

  const handleViewContact = useCallback(() => {
    Alert.alert('Contact', 'Contact viewer is coming soon.');
  }, []);

  const handleNewGroup = useCallback(() => {
    Alert.alert('New Group', 'Group creation is coming soon.');
  }, []);

  // ─────────────────────────────────────────────────────────────
  // MODERATION
  // ─────────────────────────────────────────────────────────────
  const handleMute = useCallback(() => {
    Alert.alert('Mute Notifications', 'Muted.');
  }, []);

  const handleReport = useCallback(() => {
    Alert.alert('Reported', 'User reported.');
  }, []);

  const handleBlock = useCallback(() => {
    Alert.alert(
      'Block User',
      'Blocking user...',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            if (navigation?.canGoBack?.()) {
              navigation.goBack();
            }
          },
        },
      ]
    );
  }, [navigation]);

  // ─────────────────────────────────────────────────────────────
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
