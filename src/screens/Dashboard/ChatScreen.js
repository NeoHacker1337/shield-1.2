import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
  Pressable,
  Image,
  PermissionsAndroid,
} from 'react-native';
import Sound, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVEncoderAudioQualityIOSType,

} from 'react-native-nitro-sound';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import authService from '../../services/AuthService';
import { handleApiError } from '../../utils/errorHandler';
import styles from '../../assets/ChatScreenStyles';
import AttachmentMenu from '../chatSystem/AttachmentMenu';
import useAttachment from '../chatSystem/useAttachment';
import MessageItem from '../chatSystem/MessageItem';

// ── All 8 Feature hooks & helpers ──────────────────────────────
import useKeyboard from '../chatSystem/Features/useKeyboard';
import useContactName from '../chatSystem/Features/useContactName';
import useMessages from '../chatSystem/Features/useMessages';
import useSendMessage from '../chatSystem/Features/useSendMessage';
import useChatActions from '../chatSystem/Features/useChatActions';
import useEmojiPicker from '../chatSystem/Features/useEmojiPicker';
import useImageViewer from '../chatSystem/Features/useImageViewer';
import {
  getDisplayNameFromChatRoom,
  getContactAvatar,
  getAvatarColor,
  getOnlineStatus,
  formatMessageTime,
  formatMessageDateLabel,
  shouldShowDateSeparator,
  isOwnMessage,
  isGuestMessage,
} from '../chatSystem/Features/ChatHelpers';

const { width } = Dimensions.get('window');

const ChatScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();

  const {
    chatRoom: initialChatRoom,
    currentUser: initialCurrentUser,
    contactName,
  } = route.params || {};

  // ── Local screen state ───────────────────────────────────────
  const [chatRoom, setChatRoom] = useState(initialChatRoom);
  const [currentUser, setCurrentUser] = useState(initialCurrentUser);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const flatListRef = useRef(null);



  // ════════════════════════════════════════════════════════════
  // HOOK 0 — Initialize current user if not passed via route
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    const initializeUser = async () => {
      try {
        if (!currentUser) {
          const user = await authService.getCurrentUser();
          setCurrentUser(user);
        }
      } catch (error) {
        handleApiError(error, 'Failed to get current user');
      }
    };
    initializeUser();
  }, [currentUser]);

  // ════════════════════════════════════════════════════════════
  // HOOK 1 — useKeyboard
  // Tracks real keyboard height for paddingBottom fix
  // ════════════════════════════════════════════════════════════
  const { keyboardHeight } = useKeyboard();

  // ════════════════════════════════════════════════════════════
  // HOOK 2 — useContactName
  // Resolves contact name from device contacts by email
  // ════════════════════════════════════════════════════════════
  const { localContactName } = useContactName({ chatRoom, currentUser });

  // ════════════════════════════════════════════════════════════
  // HOOK 3 — useMessages
  // Handles load, polling, pagination, scroll badge
  // ════════════════════════════════════════════════════════════
  const {
    messages,
    setMessages,
    loading,
    loadingOlderMessages,
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
  } = useMessages({ chatRoom, currentUser });

  // ════════════════════════════════════════════════════════════
  // HOOK 4 — useSendMessage
  // Handles text send + file/image/video upload with progress
  // ════════════════════════════════════════════════════════════
  const {
    newMessage,
    setNewMessage,
    isSending,
    uploadProgress,
    uploadingFiles,
    handleSend,
    handleSendFile,
  } = useSendMessage({ chatRoom, currentUser, setMessages, lastMessageIdRef });

  // ════════════════════════════════════════════════════════════
  // HOOK 5 — useChatActions
  // Long-press delete message, clear chat, delete chat
  // ════════════════════════════════════════════════════════════
  const {
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
  } = useChatActions({ currentUser, setMessages, lastMessageIdRef, navigation });

  // ════════════════════════════════════════════════════════════
  // HOOK 6 — useEmojiPicker
  // Emoji state, categories, add emoji, toggle
  // ════════════════════════════════════════════════════════════
  const {
    showEmojiPicker,
    setShowEmojiPicker,
    activeCategory,
    setActiveCategory,
    categoryTabs,
    addEmoji,
    getActiveEmojis,
    toggleEmojiPicker,
    closeEmojiPicker,
  } = useEmojiPicker(setNewMessage);

  // ════════════════════════════════════════════════════════════
  // HOOK 7 — useImageViewer
  // Full-screen image/video viewer, download, per-message tracking
  // ════════════════════════════════════════════════════════════
  const {
    selectedImage,
    selectedVideo,
    openImage,
    closeImage,
    openVideo,
    closeVideo,
    openFile,
    onImageLoadStart,
    onImageLoadEnd,
    onImageError,
    isImageLoading,
    isImageError,
    isDownloading,
    getDownloadProgress,
    downloadFile,
  } = useImageViewer();

  // ════════════════════════════════════════════════════════════
  // HOOK 8 — useAttachment
  // Gallery / Camera / Document picker → triggers handleSendFile
  // ════════════════════════════════════════════════════════════
  const {
    showAttachmentMenu,
    setShowAttachmentMenu,
    handleAttachmentPress,
  } = useAttachment({
    onAttach: async (type, payload) => {
      try {
        if (!chatRoom?.id) return;
        handleSendFile(payload, type);
      } catch (error) {
        console.log('Attachment send error:', error);
      }
    },
  });

  // ════════════════════════════════════════════════════════════
  // AUDIO RECORDING STATE
  // ════════════════════════════════════════════════════════════
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00');
  const [recordedFilePath, setRecordedFilePath] = useState(null);
  const recordTimerRef = useRef(null);
  const recordSecondsRef = useRef(0);

  // ════════════════════════════════════════════════════════════
  // EFFECTS
  // ════════════════════════════════════════════════════════════

  // Start polling every 3 seconds once chat is loaded
  useEffect(() => {
    if (chatRoom?.id && !loading) {
      pollingIntervalRef.current = setInterval(checkForNewMessages, 3000);
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [chatRoom?.id, loading, checkForNewMessages]);

  // Auto-scroll to bottom when a new message arrives
  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Reload messages fresh when chatRoom changes
  useEffect(() => {
    if (chatRoom?.id) {
      loadMessages(1, false);
    }
  }, [chatRoom?.id]);

  // Cleanup polling interval on screen unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        Sound.stopRecorder().catch(() => { });
        Sound.removeRecordBackListener();
      }
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    };
  }, []);

  // ════════════════════════════════════════════════════════════
  // AUDIO RECORDING HELPERS
  // ════════════════════════════════════════════════════════════

  // Request mic permission (Android)
  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Shield needs microphone access to record audio messages.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const formatRecordTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecordTimer = () => {
    recordSecondsRef.current = 0;
    setRecordTime('00:00');
    recordTimerRef.current = setInterval(() => {
      recordSecondsRef.current += 1;
      setRecordTime(formatRecordTime(recordSecondsRef.current));
    }, 1000);
  };

  const stopRecordTimer = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    recordSecondsRef.current = 0;
    setRecordTime('00:00');
  };

  // 🎙 Start Recording
  const onStartRecord = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      // ✅ Keep only Android settings (remove iOS-only AVEncodingOption)
      const audioSet = {
        AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
        AudioSourceAndroid: AudioSourceAndroidType.MIC,
        AudioSamplingRate: 44100,
        AudioEncodingBitRate: 128000,
        AudioChannels: 1,
        // iOS settings — only added when running on iOS
        ...(Platform.OS === 'ios' && {
          AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
          AVNumberOfChannelsKeyIOS: 2,
          AVFormatIDKeyIOS: 'aac',  // ✅ use plain string, not AVEncodingOption.aac
        }),
      };

      const filePath = await Sound.startRecorder(undefined, audioSet, true);
      setRecordedFilePath(filePath);
      setIsRecording(true);
      startRecordTimer();
    } catch (error) {
      console.error('Start record error:', error);
    }
  };

  // ✅ Stop & Send Recording
  const onStopAndSendRecord = async () => {
    try {
      const filePath = await Sound.stopRecorder();
      Sound.removeRecordBackListener();
      const durationSeconds = recordSecondsRef.current;
      stopRecordTimer();
      setIsRecording(false);
      setRecordedFilePath(null);

      if (filePath && chatRoom?.id) {
        const payload = {
          uri: filePath,
          name: `voice_${Date.now()}.aac`,
          type: 'audio/aac',
          duration: durationSeconds,
        };

        handleSendFile(payload, 'audio');
      }
    } catch (error) {
      console.error('Stop record error:', error);
      setIsRecording(false);
      stopRecordTimer();
    }
  };


  // ✖ Cancel Recording (discard)
  const onCancelRecord = async () => {
    try {
      await Sound.stopRecorder();
      Sound.removeRecordBackListener();
    } catch (error) {
      console.error('Cancel record error:', error);
    } finally {
      stopRecordTimer();
      setIsRecording(false);
      setRecordedFilePath(null);
    }
  };

  // ════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ════════════════════════════════════════════════════════════

  // Spinner shown at top of inverted FlatList while loading older pages
  const renderLoadingHeader = () => {
    if (!loadingOlderMessages || !hasMoreMessages) return null;
    return (
      <View style={styles.loadingHeaderContainer}>
        <ActivityIndicator size="small" color="#888" />
        <Text style={styles.loadingHeaderText}>Loading older messages...</Text>
      </View>
    );
  };

  // Each message row — date separator + MessageItem
  const renderMessageItem = ({ item, index }) => {
    if (!item || !item.id) return null;

    // Because FlatList is inverted, previous message is at index+1
    const prevItem = messages[messages.length - 1 - (index + 1)] || null;
    const showDate = shouldShowDateSeparator(item, prevItem);
    const messageTime = formatMessageTime(item.created_at);
    const ownMessage = isOwnMessage(item, currentUser);
    const guestMsg = isGuestMessage(item);

    return (
      <>
        {/* Date separator — Today / Yesterday / Monday / 12 Mar 2025 */}
        {showDate && (
          <View style={styles.dateSeparatorContainer}>
            <Text style={styles.dateSeparatorText}>{formatMessageDateLabel(item.created_at)}</Text>
          </View>
        )}

        {/* Message bubble */}
        <MessageItem
          item={item}
          currentUser={currentUser}
          messageTime={messageTime}
          ownMessage={ownMessage}
          guestMsg={guestMsg}
          isImageLoading={isImageLoading(item.id)}
          isImageError={isImageError(item.id)}
          isDownloading={isDownloading(item.id)}
          downloadProgress={getDownloadProgress(item.id)}
          onLongPress={() => handleMessageLongPress(item)}
          onImagePress={() => openImage(item.file_url)}
          onVideoPress={() => openVideo(item.file_url)}
          onFilePress={() => openFile(item.file_url, item.file_name)}
          onDownloadPress={() => downloadFile(item.file_url, item.file_name, item.id)}
          onImageLoadStart={() => onImageLoadStart(item.id)}
          onImageLoadEnd={() => onImageLoadEnd(item.id)}
          onImageError={() => onImageError(item.id)}
        />
      </>
    );
  };

  // ════════════════════════════════════════════════════════════
  // EARLY RETURN — full-screen loader before chatRoom is ready
  // ════════════════════════════════════════════════════════════
  if (loading && !chatRoom) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // DERIVED DISPLAY VALUES (from ChatHelpers)
  // ════════════════════════════════════════════════════════════
  const baseDisplayName = getDisplayNameFromChatRoom(chatRoom, contactName, currentUser);
  const displayName = localContactName || baseDisplayName;
  const avatarChar = getContactAvatar(displayName);
  const avatarColor = getAvatarColor(displayName);
  const isOnline = getOnlineStatus();

  // ════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View
        style={[
          styles.fullContainer,
          {
            paddingBottom:
              keyboardHeight > 0 ? keyboardHeight : (insets.bottom || 0),
          },
        ]}
      >

        {/* ══════════════════════════════════════
          HEADER
        ══════════════════════════════════════ */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.headerAvatarContainer}>
              <View
                style={[
                  styles.headerAvatar,
                  isOnline && styles.onlineAvatar,
                  { backgroundColor: avatarColor },
                ]}
              >
                <Text style={styles.headerAvatarText}>{avatarChar}</Text>
              </View>
              {isOnline && <View style={styles.headerOnlineIndicator} />}
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{displayName}</Text>
              <Text style={styles.headerSubtitle}>
                {isOnline ? 'Online' : 'Last seen recently'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowOptionsMenu(true)}
              style={styles.headerActionButton}
            >
              <Icon name="more-vert" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════════════════════════════════════
          CHAT BODY
        ══════════════════════════════════════ */}
        <View style={styles.chatContainer}>

          {/* New message badge */}
          {showNewMessageBadge && (
            <TouchableOpacity
              style={styles.newMessageBadge}
              onPress={() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                setShowNewMessageBadge(false);
              }}
            >
              <Icon name="arrow-downward" size={14} color="#fff" />
              <Text style={styles.newMessageBadgeText}>New Messages</Text>
            </TouchableOpacity>
          )}

          {/* Messages FlatList */}
          {loading ? (
            <View style={styles.messagesLoadingContainer}>
              <ActivityIndicator size="large" color="#075E54" />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={[...messages].reverse()}
              renderItem={renderMessageItem}
              keyExtractor={(item, index) =>
                item.id ? item.id.toString() : `temp-${index}`
              }
              inverted
              extraData={currentUser}
              contentContainerStyle={styles.messageList}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              onScroll={handleScroll}
              onEndReached={() => {
                if (hasMoreMessages && !loadingOlderMessages && messages.length > 0) {
                  loadOlderMessages();
                }
              }}
              onEndReachedThreshold={0.2}
              ListFooterComponent={renderLoadingHeader}
              ListEmptyComponent={
                <View style={styles.emptyMessagesContainer}>
                  <Text style={styles.emptyMessagesText}>No messages yet</Text>
                  <Text style={styles.emptyMessagesSubtext}>
                    Start the conversation by sending a message below
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* ══════════════════════════════════════
          EMOJI PICKER
        ══════════════════════════════════════ */}
        {showEmojiPicker && (
          <View style={styles.emojiPicker}>
            <FlatList
              data={categoryTabs}
              horizontal
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              style={styles.emojiCategoryRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setActiveCategory(item.key)}
                  style={[
                    styles.emojiCategoryTab,
                    activeCategory === item.key && styles.emojiCategoryTabActive,
                  ]}
                >
                  <Text style={styles.emojiCategoryLabel}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <FlatList
              data={getActiveEmojis()}
              numColumns={8}
              keyExtractor={(item, index) => `emoji-${item}-${index}`}
              showsVerticalScrollIndicator={false}
              style={styles.emojiGrid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => addEmoji(item)}
                  style={styles.emojiButton}
                >
                  <Text style={styles.emojiText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* ══════════════════════════════════════
  AUDIO RECORDING BAR
══════════════════════════════════════ */}
        {isRecording && (
          <View style={styles.recordingContainer}>

            {/* ✖ Cancel */}
            <TouchableOpacity
              onPress={onCancelRecord}
              style={styles.recordingCancelBtn}
            >
              <Icon name="delete" size={26} color="#e53935" />
            </TouchableOpacity>

            {/* 🔴 Dot + Label + Timer */}
            <View style={styles.recordingIndicatorRow}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording</Text>
              <Text style={styles.recordingTimer}>{recordTime}</Text>
            </View>

            {/* ✅ Send */}
            <TouchableOpacity
              onPress={onStopAndSendRecord}
              style={styles.recordingSendBtn}
            >
              <Icon name="send" size={22} color="#fff" />
            </TouchableOpacity>

          </View>
        )}

        {/* ══════════════════════════════════════
          INPUT ROW
          Hidden while recording
        ══════════════════════════════════════ */}
        {!isRecording && (
          <View style={styles.inputWrapper}>
            <TouchableOpacity
              onPress={() => {
                closeEmojiPicker();
                setShowAttachmentMenu(true);
              }}
              style={styles.attachmentButton}
            >
              <Icon name="attach-file" size={24} color="#667781" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleEmojiPicker}
              style={styles.emojiToggleButton}
            >
              <Icon name="emoji-emotions" size={24} color="#667781" />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={(text) => {
                setNewMessage(text);
                closeEmojiPicker();
              }}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              maxLength={5000}
              onFocus={closeEmojiPicker}
            />

            {newMessage.trim() ? (
              // ✅ SEND BUTTON (when typing)
              <TouchableOpacity
                onPress={handleSend}
                style={styles.sendButton}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="send" size={22} color="#fff" />
                )}
              </TouchableOpacity>
            ) : (
              // 🎤 MIC BUTTON (when no text) — tap to start recording
              <TouchableOpacity
                onPress={onStartRecord}
                style={[styles.sendButton, { backgroundColor: '#25D366' }]}
              >
                <Icon name="mic" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════
          OPTIONS MENU MODAL
        ══════════════════════════════════════ */}
        <Modal
          visible={showOptionsMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOptionsMenu(false)}
        >
          <Pressable
            style={styles.optionsModalOverlay}
            onPress={() => setShowOptionsMenu(false)}
          >
            <View style={styles.optionsMenuContainer}>

              {/* 📞 CALL */}
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={handleAudioCall}
              >
                <Icon name="call" size={20} color="#075E54" style={styles.optionsMenuIcon} />
                <Text style={styles.optionsMenuText}>Audio Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={handleVideoCall}
              >
                <Icon name="videocam" size={20} color="#075E54" style={styles.optionsMenuIcon} />
                <Text style={styles.optionsMenuText}>Video Call</Text>
              </TouchableOpacity>

              {/* 🔍 CHAT TOOLS */}
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={handleSearch}
              >
                <Icon name="search" size={20} color="#075E54" style={styles.optionsMenuIcon} />
                <Text style={styles.optionsMenuText}>Search</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={handleMedia}
              >
                <Icon name="perm-media" size={20} color="#075E54" style={styles.optionsMenuIcon} />
                <Text style={styles.optionsMenuText}>Media, Links & Docs</Text>
              </TouchableOpacity>

              {/* 👤 CONTACT */}
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={handleViewContact}
              >
                <Icon name="person" size={20} color="#075E54" style={styles.optionsMenuIcon} />
                <Text style={styles.optionsMenuText}>View Contact</Text>
              </TouchableOpacity>

              {/* 👥 GROUP */}
              {/* <TouchableOpacity style={styles.optionsMenuItem} onPress={handleNewGroup}>
                <Icon name="group-add" size={20} color="#075E54" style={styles.optionsMenuIcon} />
                <Text style={styles.optionsMenuText}>New Group</Text>
              </TouchableOpacity> */}

              {/* 🔕 SETTINGS */}
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={handleMute}
              >
                <Icon name="notifications-off" size={20} color="#075E54" style={styles.optionsMenuIcon} />
                <Text style={styles.optionsMenuText}>Mute Notifications</Text>
              </TouchableOpacity>

              {/* ⚠️ DANGER */}
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={handleReport}
              >
                <Icon name="flag" size={20} color="#DC2626" style={styles.optionsMenuIcon} />
                <Text style={[styles.optionsMenuText, styles.deleteMenuText]}>Report</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={handleBlock}
              >
                <Icon name="block" size={20} color="#DC2626" style={styles.optionsMenuIcon} />
                <Text style={[styles.optionsMenuText, styles.deleteMenuText]}>Block</Text>
              </TouchableOpacity>

              {/* <TouchableOpacity style={styles.optionsMenuItem} onPress={() => handleClearChat(setShowOptionsMenu)}>
                <Icon name="delete-sweep" size={20} color="#DC2626" style={styles.optionsMenuIcon} />
                <Text style={[styles.optionsMenuText, styles.deleteMenuText]}>Clear Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionsMenuItem} onPress={() => handleDeleteChat(setShowOptionsMenu)}>
                <Icon name="delete" size={20} color="#DC2626" style={styles.optionsMenuIcon} />
                <Text style={[styles.optionsMenuText, styles.deleteMenuText]}>Delete Chat</Text>
              </TouchableOpacity> */}

            </View>
          </Pressable>
        </Modal>

        {/* ══════════════════════════════════════
          ATTACHMENT MENU
        ══════════════════════════════════════ */}
        <AttachmentMenu
          visible={showAttachmentMenu}
          onClose={() => setShowAttachmentMenu(false)}
          onSelectOption={handleAttachmentPress}
        />

        {/* ══════════════════════════════════════
          FULL-SCREEN IMAGE VIEWER
        ══════════════════════════════════════ */}
        <Modal visible={!!selectedImage} transparent animationType="fade">
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={closeImage}
            >
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imageViewerDownload}
              onPress={() =>
                downloadFile(selectedImage, `image_${Date.now()}.jpg`, 'viewer')
              }
            >
              <Icon name="download" size={26} color="#fff" />
            </TouchableOpacity>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullScreenImage}
                resizeMode="contain"
                onLoadStart={() => onImageLoadStart('viewer')}
                onLoadEnd={() => onImageLoadEnd('viewer')}
                onError={() => onImageError('viewer')}
              />
            )}
          </View>
        </Modal>

        {/* ══════════════════════════════════════
          FULL-SCREEN VIDEO VIEWER
        ══════════════════════════════════════ */}
        <Modal visible={!!selectedVideo} transparent animationType="fade">
          <View style={styles.fullScreenContainer}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={closeVideo}
            >
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
            {/*
              Connect react-native-video here:
              <Video source={{ uri: selectedVideo }} style={styles.fullScreenVideo} controls />
            */}
            <Text style={styles.videoPlaceholderText}>
              Connect react-native-video here
            </Text>
          </View>
        </Modal>

      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;
