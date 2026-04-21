import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from 'react';
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
  PanResponder,
  Animated,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useActiveRoom } from '../../context/ActiveRoomContext';
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
import useEditMessage from '../chatSystem/Features/useEditMessage';
import useReplyMessage from '../chatSystem/Features/useReplyMessage';
import ReplyBanner from '../chatSystem/ReplyBanner';

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

const SWIPE_THRESHOLD = 60;
const MAX_SWIPE_DISTANCE = 80;

const SwipeableMessageRow = memo(
  ({
    item,
    prevItem,
    currentUser,
    startReply,
    handleMessageLongPress,
    startEdit,
    isImageLoading,
    isImageError,
    isDownloading,
    getDownloadProgress,
    openImage,
    openVideo,
    openFile,
    downloadFile,
    onImageLoadStart,
    onImageLoadEnd,
    onImageError,
  }) => {
    const translateX = useRef(new Animated.Value(0)).current;

    const ownMessage = isOwnMessage(item, currentUser);
    const guestMsg = isGuestMessage(item);
    const showDate = shouldShowDateSeparator(item, prevItem);
    const messageTime = formatMessageTime(item.created_at);

    const resetPosition = useCallback(() => {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }).start();
    }, [translateX]);


    // Slide Righ + Left Side Tag Reply
    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,

        onPanResponderMove: (_, g) => {
          // Allow both directions
          if (g.dx !== 0) {
            const clamped = Math.max(
              -MAX_SWIPE_DISTANCE,
              Math.min(g.dx, MAX_SWIPE_DISTANCE)
            );
            translateX.setValue(clamped);
          }
        },

        onPanResponderRelease: (_, g) => {
          // Trigger reply on BOTH sides
          if (Math.abs(g.dx) >= SWIPE_THRESHOLD) {
            startReply(item);
          }
          resetPosition();
        },

        onPanResponderTerminate: resetPosition,
      })
    ).current;

    const replyIconOpacity = translateX.interpolate({
      inputRange: [0, SWIPE_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    const replyIconOpacityLeft = translateX.interpolate({
      inputRange: [0, SWIPE_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    const replyIconOpacityRight = translateX.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <>


        <View style={{ position: 'relative' }}>

          {showDate && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>
                {formatMessageDateLabel(item.created_at)}
              </Text>
            </View>
          )}
          {/* LEFT SIDE ICON (already موجود) */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              opacity: replyIconOpacity,
              zIndex: 0,
              marginTop: -10,
            }}
          >
            <Icon name="reply" size={20} color="#075E54" />
          </Animated.View>

          {/* ✅ ADD THIS RIGHT SIDE ICON HERE */}
          <Animated.View
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              opacity: replyIconOpacityRight,
              zIndex: 0,
              marginTop: -10,
            }}
          >
            <Icon name="reply" size={20} color="#075E54" />
          </Animated.View>

          <Animated.View
            style={{ transform: [{ translateX }] }}
            {...panResponder.panHandlers}
          >
            <MessageItem
              item={item}
              ownMessage={ownMessage}
              guestMsg={guestMsg}
              messageTime={messageTime}
              isImageLoading={isImageLoading(item.id)}
              isImageError={isImageError(item.id)}
              isDownloading={isDownloading(item.id)}
              downloadProgress={getDownloadProgress(item.id)}
              onLongPress={() => handleMessageLongPress(item, startEdit)}
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
          </Animated.View>
        </View>
      </>
    );
  }
);

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
  const isRecordingRef = useRef(false);
  const mountedRef = useRef(true);


  const { setActiveRoom, clearActiveRoom } = useActiveRoom();
  // ✅ FIX 1: Destructure keyboardHeight too
  const { isKeyboardVisible, keyboardHeight } = useKeyboard();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (currentUser) return;

    authService
      .getCurrentUser()
      .then(user => {
        if (user && mountedRef.current) {
          setCurrentUser(user);
        }
      })
      .catch(err => handleApiError(err, 'Failed to get current user'));
  }, [currentUser]);

  // Audio Call Feature 


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
    checkForNewMessages,
    loadOlderMessages,
    handleScroll,
  } = useMessages({ chatRoom, currentUser, navigation });

  const {
    newMessage,
    setNewMessage,
    isSending,
    handleSend,
    handleSendFile,
  } = useSendMessage({ chatRoom, currentUser, setMessages, lastMessageIdRef });

  const {
    editingMessage,
    editText,
    setEditText,
    isEditing,
    startEdit,
    handleEdit,
    cancelEdit,
  } = useEditMessage({ chatRoom, currentUser, setMessages });

  const {
    replyingTo,
    startReply,
    cancelReply,
  } = useReplyMessage();

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
        handleSendFile(payload, type, replyingTo, cancelReply);
      } catch (error) {
        console.log('Attachment send error:', error);
      }
    },
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00');
  const recordTimerRef = useRef(null);
  const recordSecondsRef = useRef(0);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({
        offset: 0,
        animated,
      });
    });
  }, []);

  useEffect(() => {
    if (!chatRoom?.id || loading) return;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    pollingIntervalRef.current = setInterval(() => {
      checkForNewMessages();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [chatRoom?.id, loading, checkForNewMessages, pollingIntervalRef]);

  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          scrollToBottom();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [messages.length, isAtBottom, scrollToBottom]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        Sound.stopRecorder().catch(() => { });
        Sound.removeRecordBackListener();
      }

      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [pollingIntervalRef]);

  useEffect(() => {
    if (isKeyboardVisible) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          scrollToBottom(false);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isKeyboardVisible, scrollToBottom]);


  useEffect(() => {
    if (!chatRoom?.id) return;

    setActiveRoom(chatRoom.id);
    saveRoomToWatchList(chatRoom.id);

    return () => {
      clearActiveRoom();
    };
  }, [chatRoom?.id]);

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'App needs microphone access to record audio messages.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const formatRecordTime = seconds => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecordTimer = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
    }

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

      await Sound.startRecorder(undefined, audioSet, true);
      setIsRecording(true);
      startRecordTimer();
      closeEmojiPicker();
    } catch (error) {
      console.error('Start record error:', error);
      setIsRecording(false);
      stopRecordTimer();
    }
  };

  const onStopAndSendRecord = async () => {
    try {
      const filePath = await Sound.stopRecorder();
      Sound.removeRecordBackListener();

      const durationSeconds = recordSecondsRef.current;

      stopRecordTimer();
      setIsRecording(false);

      if (filePath && chatRoom?.id) {
        const payload = {
          uri: filePath,
          name: `voice_${Date.now()}.aac`,
          type: 'audio/aac',
          duration: durationSeconds,
        };

        handleSendFile(payload, 'audio', replyingTo, cancelReply);
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
    }
  };


  // for calling feature 

  // ✅ FIXED — Saves room ID safely and consistently
  const saveRoomToWatchList = async (roomId) => {
    try {
      const existing = await AsyncStorage.getItem('watched_room_ids');

      let rooms = [];
      if (existing) {
        try {
          rooms = JSON.parse(existing);
        } catch (e) {
          console.log('[GLOBAL] Corrupted watch list — resetting');
          rooms = [];
        }
      }

      const roomIdStr = String(roomId); // ✅ FIX — normalize

      if (!rooms.includes(roomIdStr)) {
        rooms.push(roomIdStr);
        await AsyncStorage.setItem('watched_room_ids', JSON.stringify(rooms));
        console.log('[GLOBAL] Room added to watch list:', roomIdStr);
      }
    } catch (e) {
      console.log('[GLOBAL] Error saving room:', e?.message);
    }
  };

  const handleOptionPress = useCallback(action => {
    setShowOptionsMenu(false);
    requestAnimationFrame(() => {
      action?.();
    });
  }, []);

  const renderLoadingHeader = () => {
    if (!loadingOlderMessages || !hasMoreMessages) return null;

    return (
      <View style={styles.loadingHeaderContainer}>
        <ActivityIndicator size="small" color="#888" />
        <Text style={styles.loadingHeaderText}>Loading older messages...</Text>
      </View>
    );
  };

  const reversedMessages = React.useMemo(
    () => [...messages].reverse(),
    [messages]
  );

  const renderMessageItem = useCallback(
    ({ item, index }) => {
      if (!item || !item.id) return null;

      const prevItem = reversedMessages[index + 1] || null;

      return (
        <SwipeableMessageRow
          item={item}
          prevItem={prevItem}
          currentUser={currentUser}
          startReply={startReply}
          handleMessageLongPress={handleMessageLongPress}
          startEdit={startEdit}
          isImageLoading={isImageLoading}
          isImageError={isImageError}
          isDownloading={isDownloading}
          getDownloadProgress={getDownloadProgress}
          openImage={openImage}
          openVideo={openVideo}
          openFile={openFile}
          downloadFile={downloadFile}
          onImageLoadStart={onImageLoadStart}
          onImageLoadEnd={onImageLoadEnd}
          onImageError={onImageError}
        />
      );
    },
    [
      reversedMessages,
      currentUser,
      startReply,
      handleMessageLongPress,
      startEdit,
      isImageLoading,
      isImageError,
      isDownloading,
      getDownloadProgress,
      openImage,
      openVideo,
      openFile,
      downloadFile,
      onImageLoadStart,
      onImageLoadEnd,
      onImageError,
    ]
  );

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
    currentUser
  );
  const displayName = localContactName || baseDisplayName;
  const avatarChar = getContactAvatar(displayName);
  const avatarColor = getAvatarColor(displayName);
  const isOnline = getOnlineStatus();

  // ✅ FIX 2: Compute bottom padding — only apply safe area when keyboard is HIDDEN
  const bottomPadding = isKeyboardVisible ? 0 : insets.bottom;

  const renderEmojiPicker = () => {
    if (!showEmojiPicker) return null;

    return (
      <View style={styles.emojiPickerContainer}>
        <FlatList
          data={categoryTabs}
          horizontal
          keyExtractor={item => item.key}
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

    const inEditMode = !!editingMessage;
    const inputValue = inEditMode ? editText : newMessage;
    const trimmedValue = inputValue.trim();

    return (
      <View
        style={{
          flexDirection: 'column',
          backgroundColor: '#ECE5DD',
          paddingHorizontal: 6,
          paddingTop: 6,
          paddingBottom: 8,
        }}
      >
        {inEditMode && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f0f7f6',
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 10,
              marginBottom: 6,
              borderBottomWidth: 1,
              borderBottomColor: '#d9e8e7',
            }}
          >
            <View
              style={{
                width: 3,
                borderRadius: 2,
                backgroundColor: '#075E54',
                alignSelf: 'stretch',
                marginRight: 10,
              }}
            />

            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 2,
                }}
              >
                <Icon name="edit" size={13} color="#075E54" />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#075E54',
                    marginLeft: 4,
                  }}
                >
                  Edit Message
                </Text>
              </View>
              <Text
                style={{ fontSize: 13, color: '#667781' }}
                numberOfLines={1}
              >
                {editingMessage?.content ||
                  editingMessage?.message ||
                  editingMessage?.text ||
                  ''}
              </Text>
            </View>

            <TouchableOpacity
              onPress={cancelEdit}
              style={{ padding: 4, marginLeft: 8 }}
            >
              <Icon name="close" size={20} color="#667781" />
            </TouchableOpacity>
          </View>
        )}

        {replyingTo && !inEditMode && (
          <ReplyBanner
            message={replyingTo}
            senderName={
              replyingTo.sender?.name ||
              (replyingTo.user_id === currentUser?.id ? 'You' : 'Contact')
            }
            showClose
            onCancel={cancelReply}
            compact={false}
          />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
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
            value={inputValue}
            onChangeText={(text) => {
              if (inEditMode) {
                setEditText(text);
              } else {
                setNewMessage(text);
              }
              closeEmojiPicker();
            }}
            placeholder={inEditMode ? 'Edit message...' : 'Type a message...'}
            placeholderTextColor="#999"
            multiline
            maxLength={5000}
            onFocus={() => {
              closeEmojiPicker();
              setTimeout(() => scrollToBottom(false), 150);
            }}
          />

          {trimmedValue ? (
            <TouchableOpacity
              onPress={
                inEditMode
                  ? handleEdit
                  : () => handleSend(replyingTo, cancelReply)
              }
              style={[
                styles.sendButton,
                inEditMode && { backgroundColor: '#128C7E' },
              ]}
              disabled={inEditMode ? isEditing : isSending}
            >
              {inEditMode ? isEditing : isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="send" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            !inEditMode && (
              <TouchableOpacity onPress={onStartRecord} style={styles.micButton}>
                <Icon name="mic" size={24} color="#667781" />
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // ✅ FIXED RETURN — Layout changes only
  // ═══════════════════════════════════════════════════════════

  return (
    // ✅ FIX 3: Plain View instead of SafeAreaView
    //    SafeAreaView bottom edge was conflicting with KeyboardAvoidingView
    <View style={{ flex: 1, backgroundColor: '#075E54' }}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />

      {/* ✅ FIX 4: Manual top safe area spacer */}
      <View style={{ height: insets.top, backgroundColor: '#075E54' }} />

      {/* ✅ FIX 5: Platform-specific KAV behavior + correct offset */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={{ flex: 1, backgroundColor: '#ECE5DD' }}>
          {/* ─── Header (unchanged) ─── */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerContent}
              activeOpacity={0.7}
              onPress={() => {
                navigation.navigate('ContactProfile', {
                  name: displayName,
                  avatar: avatarChar,
                  isOnline: isOnline,

                  chatRoom,
                  currentUser,
                });
              }}
            >
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
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setShowOptionsMenu(true)}
                style={styles.headerActionButton}
              >
                <Icon name="more-vert" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>


          {/* ─── Messages Area (unchanged) ─── */}
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
                data={reversedMessages}
                renderItem={renderMessageItem}
                keyExtractor={(item, index) =>
                  item.id ? item.id.toString() : `temp-${index}`
                }
                inverted
                extraData={currentUser}
                contentContainerStyle={styles.messageList}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={
                  Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                }
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
                // ✅ FIX 6: Prevents iOS content inset conflicts
                automaticallyAdjustContentInsets={false}
              />
            )}
          </View>

          {/* ─── Emoji Picker (unchanged) ─── */}
          {renderEmojiPicker()}

          {/* ✅ FIX 7: Input wrapper with conditional bottom padding */}
          <View
            style={[
              styles.bottomInputWrapper,
              {
                paddingBottom: bottomPadding,
                backgroundColor: '#ECE5DD',
              },
            ]}
          >
            {renderInputRow()}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ─── All Modals (unchanged) ─── */}
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
              onPress={() => handleOptionPress(handleAudioCall)}
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
              onPress={() => handleOptionPress(handleVideoCall)}
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
              onPress={() => handleOptionPress(handleSearch)}
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
              onPress={() => handleOptionPress(handleMedia)}
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
              onPress={() => handleOptionPress(handleViewContact)}
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
              onPress={() => handleOptionPress(handleMute)}
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
              onPress={() => handleOptionPress(handleReport)}
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
              onPress={() => handleOptionPress(handleBlock)}
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
              controls
              paused={false}
              repeat={false}
              onError={error => console.log('Video error:', error)}
              onLoadStart={() => console.log('Video loading...')}
              onLoad={() => console.log('Video loaded')}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

export default ChatScreen;
