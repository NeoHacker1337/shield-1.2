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
} from 'react-native';
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
  // EFFECTS
  // ════════════════════════════════════════════════════════════

  // for Audio Recording Feature 
  const [isRecording, setIsRecording] = useState(false);
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

  // ════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ════════════════════════════════════════════════════════════

  // Spinner shown at top of inverted FlatList while loading older pages
  const renderLoadingHeader = () => {
    if (!loadingOlderMessages || !hasMoreMessages) return null;
    return (
      <View style={styles.loadingOlderContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingOlderText}>Loading older messages...</Text>
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
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>
              {formatMessageDateLabel(item.created_at)}
            </Text>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}

        {/* Message bubble */}
        <MessageItem
          item={item}
          isCurrentUser={ownMessage}
          isGuest={guestMsg}
          messageTime={messageTime}
          isImageLoading={isImageLoading(item.id)}
          isImageError={isImageError(item.id)}
          isUploading={!!uploadingFiles[item.id]}
          uploadProgress={uploadProgress[item.id]}
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
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // DERIVED DISPLAY VALUES  (from ChatHelpers)
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
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: keyboardHeight > 0 ? keyboardHeight : (insets.bottom || 0),
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >

        {/* ══════════════════════════════════════
            HEADER
        ══════════════════════════════════════ */}
        <View style={styles.header}>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={[styles.avatarContainer, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{avatarChar}</Text>
            {isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.headerStatus}>
              {isOnline ? 'Online' : 'Last seen recently'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowOptionsMenu(true)}
            style={styles.optionsButton}
          >
            <Icon name="more-vert" size={24} color="#fff" />
          </TouchableOpacity>

        </View>

        {/* ══════════════════════════════════════
            CHAT BODY
        ══════════════════════════════════════ */}
        <Pressable onPress={closeEmojiPicker} style={styles.chatContainer}>

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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
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
                <View style={styles.emptyContainer}>
                  <Icon name="chat-bubble-outline" size={52} color="#ccc" />
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubText}>
                    Start the conversation by sending a message below
                  </Text>
                </View>
              }
            />
          )}

          {/* Emoji Picker */}
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

          {/* Input Row */}
          <View style={styles.inputWrapper}>

            <TouchableOpacity
              onPress={toggleEmojiPicker}
              style={styles.emojiToggleButton}
            >
              <Icon
                name={showEmojiPicker ? 'keyboard' : 'emoji-emotions'}
                size={24}
                color="#888"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                closeEmojiPicker();
                setShowAttachmentMenu(true);
              }}
              style={styles.attachmentButton}
            >
              <Icon name="attach-file" size={24} color="#888" />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#888"
              multiline
              onFocus={closeEmojiPicker}
              blurOnSubmit={false}
            />

            {/* <TouchableOpacity
              onPress={handleSend}
              style={[
                styles.sendButton,
                (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              disabled={!newMessage.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="send" size={22} color="#fff" />
              )}
            </TouchableOpacity> */}

            {newMessage.trim() ? (
              // ✅ SEND BUTTON (when typing)
              <TouchableOpacity
                onPress={handleSend}
                style={styles.sendButton}
              >
                <Icon name="send" size={22} color="#fff" />
              </TouchableOpacity>
            ) : (
              // 🎤 MIC BUTTON (when no text)
              <TouchableOpacity
                onPress={() => setIsRecording(!isRecording)}
                style={[
                  styles.sendButton,
                  { backgroundColor: isRecording ? '#e53935' : '#25D366' }
                ]}
              >
                <Icon
                  name={isRecording ? 'stop' : 'mic'}
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
            )}


          </View>

        </Pressable>
      </KeyboardAvoidingView>

      {/* ══════════════════════════════════════
          OPTIONS MENU MODAL
      ══════════════════════════════════════ */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsMenu}>

            {/* 📞 CALL */}
            <TouchableOpacity style={styles.optionItem} onPress={handleAudioCall}>
              <Icon name="call" size={20} color="#075E54" />
              <Text style={styles.optionText}>Audio Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem} onPress={handleVideoCall}>
              <Icon name="videocam" size={20} color="#075E54" />
              <Text style={styles.optionText}>Video Call</Text>
            </TouchableOpacity>

            <View style={styles.optionDivider} />

            {/* 🔍 CHAT TOOLS */}
            <TouchableOpacity style={styles.optionItem} onPress={handleSearch}>
              <Icon name="search" size={20} color="#333" />
              <Text style={styles.optionText}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem} onPress={handleMedia}>
              <Icon name="photo-library" size={20} color="#333" />
              <Text style={styles.optionText}>Media, Links & Docs</Text>
            </TouchableOpacity>

            <View style={styles.optionDivider} />

            {/* 👤 CONTACT */}
            <TouchableOpacity style={styles.optionItem} onPress={handleViewContact}>
              <Icon name="person" size={20} color="#333" />
              <Text style={styles.optionText}>View Contact</Text>
            </TouchableOpacity>

            <View style={styles.optionDivider} />

            {/* 👥 GROUP */}
            {/* <TouchableOpacity style={styles.optionItem} onPress={handleNewGroup}>
              <Icon name="group-add" size={20} color="#333" />
              <Text style={styles.optionText}>New Group</Text>
            </TouchableOpacity> */}

            <View style={styles.optionDivider} />

            {/* 🔕 SETTINGS */}
            <TouchableOpacity style={styles.optionItem} onPress={handleMute}>
              <Icon name="volume-off" size={20} color="#333" />
              <Text style={styles.optionText}>Mute Notifications</Text>
            </TouchableOpacity>

            <View style={styles.optionDivider} />

            {/* ⚠️ DANGER */}
            <TouchableOpacity style={styles.optionItem} onPress={handleReport}>
              <Icon name="report" size={20} color="#e53935" />
              <Text style={[styles.optionText, styles.optionDestructive]}>Report</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem} onPress={handleBlock}>
              <Icon name="block" size={20} color="#e53935" />
              <Text style={[styles.optionText, styles.optionDestructive]}>Block</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.optionItem}
              onPress={() => handleClearChat(setShowOptionsMenu)}
            >
              <Icon name="cleaning-services" size={20} color="#555" />
              <Text style={styles.optionText}>Clear Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => handleDeleteChat(setShowOptionsMenu)}
            >
              <Icon name="delete-outline" size={20} color="#e53935" />
              <Text style={[styles.optionText, styles.optionDestructive]}>
                Delete Chat
              </Text>
            </TouchableOpacity> */}

          </View>
        </TouchableOpacity>
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
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={closeImage}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity style={styles.imageViewerClose} onPress={closeImage}>
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: selectedImage }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.imageViewerDownload}
            onPress={() =>
              downloadFile(selectedImage, `image_${Date.now()}.jpg`, 'viewer')
            }
          >
            <Icon name="file-download" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ══════════════════════════════════════
          FULL-SCREEN VIDEO VIEWER
      ══════════════════════════════════════ */}
      <Modal
        visible={!!selectedVideo}
        transparent
        animationType="fade"
        onRequestClose={closeVideo}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity style={styles.imageViewerClose} onPress={closeVideo}>
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {/*
            Connect react-native-video here:
            <Video
              source={{ uri: selectedVideo }}
              style={styles.fullScreenVideo}
              controls
              resizeMode="contain"
            />
          */}
          <View style={styles.videoPlayerContainer}>
            <Icon name="play-circle-outline" size={72} color="#fff" />
            <Text style={styles.videoPlaceholderText}>
              Connect react-native-video here
            </Text>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default ChatScreen;