import { Alert } from 'react-native';
import { handleApiError } from '../../../utils/errorHandler';

const useChatActions = ({ currentUser, setMessages, lastMessageIdRef, navigation }) => {

  // ── Message delete ─────────────────────────────
  const handleMessageLongPress = (message) => {
    const isGuest = message.is_guest === 1 || message.is_guest === true;

    if (!isGuest && message.user_id === currentUser?.id) {
      Alert.alert(
        'Delete Message',
        'Are you sure you want to delete this message?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteMessage(message),
          },
        ]
      );
    }
  };

  const deleteMessage = async (message) => {
    try {
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
      Alert.alert('Success', 'Message deleted');
    } catch (error) {
      handleApiError(error, 'Failed to delete message');
    }
  };

  // ── Chat actions ───────────────────────────────
  const handleClearChat = (setShowOptionsMenu) => {
    setShowOptionsMenu(false);

    Alert.alert('Clear Chat', 'Delete all messages?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMessages([]);
          lastMessageIdRef.current = null;
        },
      },
    ]);
  };

  const handleDeleteChat = (setShowOptionsMenu) => {
    setShowOptionsMenu(false);

    Alert.alert('Delete Chat', 'Delete entire chat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  // ── New Features ───────────────────────────────
  const handleAudioCall = () => Alert.alert('Audio Call', 'Starting...');
  const handleVideoCall = () => Alert.alert('Video Call', 'Starting...');
  const handleSearch = () => Alert.alert('Search', 'Search in chat');
  const handleMedia = () => Alert.alert('Media', 'Open media screen');
  const handleViewContact = () => Alert.alert('Contact', 'View contact details');
  const handleNewGroup = () => Alert.alert('Group', 'Create new group');
  const handleMute = () => Alert.alert('Mute', 'Notifications muted');
  const handleReport = () => Alert.alert('Report', 'User reported');
  const handleBlock = () => Alert.alert('Block', 'User blocked');

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