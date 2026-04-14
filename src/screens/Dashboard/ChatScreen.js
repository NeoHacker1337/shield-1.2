import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Pressable,
  Image,
  PermissionsAndroid,
  StatusBar,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Video from 'react-native-video';
import useKeyboard from '../chatSystem/Features/useKeyboard';
import Sound, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVEncoderAudioQualityIOSType,
} from 'react-native-nitro-sound';
import Icon from 'react-native-vector-icons/MaterialIcons';
import authService from '../../services/AuthService';
import { handleApiError } from '../../utils/errorHandler';
import styles from '../../assets/ChatScreenStyles';
import AttachmentMenu from '../chatSystem/AttachmentMenu';
import useAttachment from '../chatSystem/useAttachment';
import MessageItem from '../chatSystem/MessageItem';
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

const ChatScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();

  const {
    chatRoom: initialChatRoom,
    currentUser: initialCurrentUser,
    contactName,
  } = route.params || {};

  const [chatRoom, setChatRoom] = useState(initialChatRoom);
  const [currentUser, setCurrentUser] = useState(initialCurrentUser);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  // ✅ Use your keyboard hook
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();

  // ════════════════════════════════════════════════════════════
  // INITIALIZE USER
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
  // ALL HOOKS
  // ════════════════════════════════════════════════════════════
  const { localContactName } = useContactName({ chatRoom, currentUser });

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

  const {
    newMessage,
    setNewMessage,
    isSending,
    handleSend,
    handleSendFile,
  } = useSendMessage({ chatRoom, currentUser, setMessages, lastMessageIdRef });

  const {
    handleMessageLongPress,
    handleAudioCall,
    handleVideoCall,
    handleSearch,
    handleMedia,
    handleViewContact,
    handleMute,
    handleReport,
    handleBlock,
  } = useChatActions({
    currentUser,
    setMessages,
    lastMessageIdRef,
    navigation,
  });

  const {
    showEmojiPicker,
    activeCategory,
    setActiveCategory,
    categoryTabs,
    addEmoji,
    getActiveEmojis,
    toggleEmojiPicker,
    closeEmojiPicker,
  } = useEmojiPicker(setNewMessage);

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

  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages.length, isAtBottom]);

  useEffect(() => {
    if (chatRoom?.id) {
      loadMessages(1, false);
    }
  }, [chatRoom?.id]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (isRecording) {
        Sound.stopRecorder().catch(() => { });
        Sound.removeRecordBackListener();
      }
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording]);

  // ✅ Auto scroll on keyboard open
  useEffect(() => {
    if (isKeyboardVisible) {
      setTimeout(() => {
        scrollToBottom(false);
      }, 100);
    }
  }, [isKeyboardVisible, scrollToBottom]);

  // ════════════════════════════════════════════════════════════
  // SCROLL
  // ════════════════════════════════════════════════════════════
  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({
        offset: 0,
        animated,
      });
    });
  }, []);

  // ════════════════════════════════════════════════════════════
  // AUDIO HELPERS
  // ════════════════════════════════════════════════════════════
  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'App needs microphone access to record audio messages.',
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

  const onStartRecord = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;
    try {
      const audioSet = {
        AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
        AudioSourceAndroid: AudioSourceAndroidType.MIC,
        AudioSamplingRate: 44100,
        AudioEncodingBitRate: 128000,
        AudioChannels: 1,
        ...(Platform.OS === 'ios' && {
          AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
          AVNumberOfChannelsKeyIOS: 2,
          AVFormatIDKeyIOS: 'aac',
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
  const renderLoadingHeader = () => {
    if (!loadingOlderMessages || !hasMoreMessages) return null;
    return (
      <View style={styles.loadingHeaderContainer}>
        <ActivityIndicator size="small" color="#888" />
        <Text style={styles.loadingHeaderText}>Loading older messages...</Text>
      </View>
    );
  };

  const renderMessageItem = ({ item, index }) => {
    if (!item || !item.id) return null;
    const prevItem = messages[messages.length - 1 - (index + 1)] || null;
    const showDate = shouldShowDateSeparator(item, prevItem);
    const messageTime = formatMessageTime(item.created_at);
    const ownMessage = isOwnMessage(item, currentUser);
    const guestMsg = isGuestMessage(item);

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparatorWrapper}>
            <Text style={styles.dateSeparatorText}>
              {formatMessageDateLabel(item.created_at)}
            </Text>
          </View>
        )}
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
          onDownloadPress={() =>
            downloadFile(item.file_url, item.file_name, item.id)
          }
          onImageLoadStart={() => onImageLoadStart(item.id)}
          onImageLoadEnd={() => onImageLoadEnd(item.id)}
          onImageError={() => onImageError(item.id)}
        />
      </>
    );
  };

  // ════════════════════════════════════════════════════════════
  // EARLY RETURN
  // ════════════════════════════════════════════════════════════
  if (loading && !chatRoom) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  const baseDisplayName = getDisplayNameFromChatRoom(
    chatRoom,
    contactName,
    currentUser,
  );
  const displayName = localContactName || baseDisplayName;
  const avatarChar = getContactAvatar(displayName);
  const avatarColor = getAvatarColor(displayName);
  const isOnline = getOnlineStatus();

  // ════════════════════════════════════════════════════════════
  // RENDER EMOJI PICKER
  // ════════════════════════════════════════════════════════════
  const renderEmojiPicker = () => {
    if (!showEmojiPicker) return null;
    return (
      <View style={styles.emojiPickerContainer}>
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
    );
  };

  // ════════════════════════════════════════════════════════════
  // RENDER INPUT ROW
  // ════════════════════════════════════════════════════════════
  const renderInputRow = () => {
    if (isRecording) {
      return (
        <View style={styles.recordingContainer}>
          <TouchableOpacity
            onPress={onCancelRecord}
            style={styles.recordingCancelBtn}
          >
            <Icon name="delete" size={26} color="#e53935" />
          </TouchableOpacity>
          <View style={styles.recordingIndicatorRow}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording</Text>
            <Text style={styles.recordingTimer}>{recordTime}</Text>
          </View>
          <TouchableOpacity
            onPress={onStopAndSendRecord}
            style={styles.recordingSendBtn}
          >
            <Icon name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          backgroundColor: '#ECE5DD',
          paddingHorizontal: 6,
          paddingTop: 6,
          paddingBottom: 8,
        }}
      >
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
          ref={inputRef}
          style={[
            styles.textInput,
            {
              flex: 1,
              maxHeight: 100,
              minHeight: 40,
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: Platform.OS === 'ios' ? 10 : 8,
              fontSize: 16,
              color: '#333',
            },
          ]}
          value={newMessage}
          onChangeText={(text) => {
            setNewMessage(text);
            closeEmojiPicker();
          }}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
          maxLength={5000}
          onFocus={() => {
            closeEmojiPicker();
            setTimeout(() => scrollToBottom(false), 150);
          }}
        />

        {newMessage.trim() ? (
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
          <TouchableOpacity onPress={onStartRecord} style={styles.micButton}>
            <Icon name="mic" size={24} color="#667781" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: '#075E54' }}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>

        <View style={{ flex: 1, backgroundColor: '#ECE5DD' }}>
          {/* ══════════ HEADER ══════════ */}
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

          {/* ══════════ MESSAGES AREA ══════════ */}
          <View style={{ flex: 1, backgroundColor: '#ECE5DD' }}>
            {showNewMessageBadge && (
              <TouchableOpacity
                style={styles.newMessageBadge}
                onPress={() => {
                  scrollToBottom();
                  setShowNewMessageBadge(false);
                }}
              >
                <Icon name="arrow-downward" size={14} color="#fff" />
                <Text style={styles.newMessageBadgeText}>New Messages</Text>
              </TouchableOpacity>
            )}

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
                contentContainerStyle={[
                  styles.messageList,
                  {
                    paddingBottom: showEmojiPicker
                      ? Math.max(insets.bottom, 2)
                      : isKeyboardVisible
                        ? 0
                        : 4,
                  },
                ]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                scrollEventThrottle={16}
                onScroll={handleScroll}
                onEndReached={() => {
                  if (
                    hasMoreMessages &&
                    !loadingOlderMessages &&
                    messages.length > 0
                  ) {
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

          {/* ══════════ INPUT + EMOJI AREA ══════════ */}
          {renderEmojiPicker()}

          <View
            style={[
              styles.bottomInputWrapper,
              { paddingBottom: 0 }
            ]}
          >
            {renderInputRow()}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ══════════ ALL MODALS ══════════ */}
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
            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={handleAudioCall}
            >
              <Icon
                name="call"
                size={20}
                color="#075E54"
                style={styles.optionsMenuIcon}
              />
              <Text style={styles.optionsMenuText}>Audio Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={handleVideoCall}
            >
              <Icon
                name="videocam"
                size={20}
                color="#075E54"
                style={styles.optionsMenuIcon}
              />
              <Text style={styles.optionsMenuText}>Video Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={handleSearch}
            >
              <Icon
                name="search"
                size={20}
                color="#075E54"
                style={styles.optionsMenuIcon}
              />
              <Text style={styles.optionsMenuText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={handleMedia}
            >
              <Icon
                name="perm-media"
                size={20}
                color="#075E54"
                style={styles.optionsMenuIcon}
              />
              <Text style={styles.optionsMenuText}>Media, Links & Docs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={handleViewContact}
            >
              <Icon
                name="person"
                size={20}
                color="#075E54"
                style={styles.optionsMenuIcon}
              />
              <Text style={styles.optionsMenuText}>View Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={handleMute}
            >
              <Icon
                name="notifications-off"
                size={20}
                color="#075E54"
                style={styles.optionsMenuIcon}
              />
              <Text style={styles.optionsMenuText}>Mute Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={handleReport}
            >
              <Icon
                name="flag"
                size={20}
                color="#DC2626"
                style={styles.optionsMenuIcon}
              />
              <Text style={[styles.optionsMenuText, styles.deleteMenuText]}>
                Report
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={handleBlock}
            >
              <Icon
                name="block"
                size={20}
                color="#DC2626"
                style={styles.optionsMenuIcon}
              />
              <Text style={[styles.optionsMenuText, styles.deleteMenuText]}>
                Block
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <AttachmentMenu
        visible={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onSelectOption={handleAttachmentPress}
      />

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

      <Modal visible={!!selectedVideo} transparent animationType="fade">
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={closeVideo}
          >
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {selectedVideo && (
            <Video
              source={{ uri: selectedVideo }}
              style={styles.fullScreenVideo}
              resizeMode="contain"
              controls={true}
              paused={false}
              repeat={false}
              onError={(error) => console.log('Video error:', error)}
              onLoadStart={() => console.log('Video loading...')}
              onLoad={() => console.log('Video loaded')}
            />
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default ChatScreen;