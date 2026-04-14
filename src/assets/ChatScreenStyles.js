import { StyleSheet, Platform } from 'react-native';

// ─── Design Tokens ────────────────────────────────────────────────────────────
// Centralizing brand colors here means a single change propagates everywhere.
// To retheme the app, update only this section.
const COLORS = {
  // Brand
  primaryDark:    '#075E54',   // Header, accents
  primaryMid:     '#128C7E',   // File container, audio
  primaryLight:   '#25D366',   // Send button, online dot
  primarySend:    '#00897B',   // Send button background

  // Chat backgrounds
  bgApp:          '#ECE5DD',   // Main chat background
  bgSent:         '#DCF8C6',   // Sent message bubble
  bgReceived:     '#FFFFFF',   // Received message bubble
  bgInput:        '#F0F0F0',   // Input area background
  bgTextInput:    '#FFFFFF',   // Text field background

  // Text
  textPrimary:    '#000000',
  textSecondary:  '#667781',
  textMuted:      '#888888',
  textWhite:      '#FFFFFF',
  textDanger:     '#DC2626',
  textDangerAlt:  '#e53935',

  // UI chrome
  divider:        '#E1E1E1',
  dividerLight:   '#f0f0f0',
  dividerHeavy:   '#E5E5E5',
  disabled:       '#BDBDBD',
  subtitleGreen:  '#B8E6B8',

  // Recording
  recordBg:       '#FFF5F5',
  recordBorder:   '#FFCCCC',
  recordDot:      '#e53935',

  // Media / dark overlays
  mediaDark:      '#1a1a1a',
  mediaError:     '#2a2a2a',
  overlayDark:    'rgba(0,0,0,0.95)',
  overlayMid:     'rgba(0,0,0,0.55)',
  overlayLight:   'rgba(0,0,0,0.3)',
  overlayTint:    'rgba(0,0,0,0.15)',
  overlayModal:   'rgba(0,0,0,0.5)',
  overlayModalAlt:'rgba(0,0,0,0.4)',
};

const styles = StyleSheet.create({

  // ── Screen containers ───────────────────────────────────────────────────────
  // Note: fullContainer's backgroundColor (#075E54) intentionally "bleeds"
  // into the status bar area on Android during screen transitions.
  // screenContainer covers the rest with the chat wallpaper color.
  fullContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },

  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },

  statusBarSpacer: {
    backgroundColor: COLORS.primaryDark,
  },

  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
    paddingHorizontal: 6,
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgApp,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  backButton: {
    padding: 8,
    marginRight: 4,
  },

  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },

  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  onlineAvatar: {
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },

  headerAvatarText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },

  headerOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,          // 12 / 2 = 6 ✅ exact circle
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },

  headerSubtitle: {
    color: COLORS.subtitleGreen,
    fontSize: 13,
    marginTop: 2,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerActionButton: {
    padding: 8,
    marginLeft: 4,
  },

  // Alternate header styles kept for compatibility with legacy screens
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 10,
  },

  avatarText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },

  onlineIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 5.5,        // ✅ Fixed: 11 / 2 = 5.5 for a true circle (was 6)
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
  },

  headerInfo: {
    flex: 1,
  },

  headerName: {
    color: COLORS.textWhite,
    fontSize: 17,
    fontWeight: 'bold',
  },

  headerStatus: {
    color: COLORS.subtitleGreen,
    fontSize: 12,
    marginTop: 1,
  },

  optionsButton: {
    padding: 8,
  },

  // ── Messages ────────────────────────────────────────────────────────────────
  messagesLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  messageList: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexGrow: 1,
  },

  loadingHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },

  loadingHeaderText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  loadingOlderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },

  loadingOlderText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  emptyMessagesText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: 16,
    textAlign: 'center',
  },

  emptyMessagesSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },

  emptySubText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // ── Date separator ──────────────────────────────────────────────────────────
  dateSeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 16,
  },

  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  dateSeparatorWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },

  dateSeparatorText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    backgroundColor: '#D9D9D9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
  },

  // ── Message bubbles ─────────────────────────────────────────────────────────
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: '80%',
  },

  currentUserMessageContainer: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.bgSent,
    borderTopRightRadius: 0,
  },

  otherUserMessageContainer: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bgReceived,
    borderTopLeftRadius: 0,
  },

  sendingMessageContainer: {
    opacity: 0.7,
  },

  guestMessageContainer: {
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },

  senderName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
    color: COLORS.primaryDark,
  },

  messageText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 21,
    marginBottom: 2,
  },

  sendingMessageText: {
    color: '#555',
  },

  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },

  messageTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginRight: 4,
  },

  messageStatus: {
    marginLeft: 2,
  },

  messageTail: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
  },

  currentUserMessageTail: {
    right: -8,
    borderTopWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: COLORS.bgSent,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },

  otherUserMessageTail: {
    left: -8,
    borderTopWidth: 10,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 10,
    borderTopColor: COLORS.bgReceived,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },

  // ── Input area ──────────────────────────────────────────────────────────────
  // Note: `inputWrapper` and `inputContainer` serve different layout contexts
  // (inputWrapper is used inside bottomInputWrapper with a border;
  //  inputContainer is used standalone). Both are kept for compatibility.
  bottomInputWrapper: {
    backgroundColor: COLORS.bgApp,
  },

  inputWrapper: {
    backgroundColor: COLORS.bgInput,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'android' ? 10 : 6,
    minHeight: 56,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    minHeight: 56,
    backgroundColor: COLORS.bgInput,
  },

  emojiToggleButton: {
    padding: 6,
    marginRight: 4,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },

  attachmentButton: {
    padding: 6,
    marginRight: 2,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },

  textInput: {
    flex: 1,
    backgroundColor: COLORS.bgTextInput,
    borderRadius: 21,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
    maxHeight: 120,
    marginHorizontal: 4,
    textAlignVertical: 'center',
    minHeight: 42,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },

  sendButton: {
    backgroundColor: COLORS.primarySend,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    alignSelf: 'flex-end',
    marginBottom: 4,
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  sendButtonDisabled: {
    backgroundColor: COLORS.disabled,
    elevation: 0,
  },

  micButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },

  // ── Emoji picker ─────────────────────────────────────────────────────────────
  emojiContainer: {
    backgroundColor: COLORS.bgTextInput,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },

  emojiPicker: {
    backgroundColor: COLORS.bgTextInput,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    maxHeight: 280,
  },

  emojiCategoryRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 4,
    paddingHorizontal: 6,
    maxHeight: 40,
    marginBottom: 6,
  },

  emojiCategoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: COLORS.bgInput,
  },

  emojiCategoryTabActive: {
    backgroundColor: COLORS.primaryDark,
  },

  emojiCategoryLabel: {
    fontSize: 20,
  },

  emojiGrid: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    maxHeight: 200,
  },

  emojiButton: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },

  emojiText: {
    fontSize: 26,
  },

  // ── Audio recording ─────────────────────────────────────────────────────────
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgTextInput,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 56,
  },

  recordingCancelBtn: {
    padding: 8,
    marginRight: 6,
    alignSelf: 'center',
  },

  recordingIndicatorRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.recordBg,
    borderRadius: 21,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 42,
    borderWidth: 1,
    borderColor: COLORS.recordBorder,
    marginHorizontal: 4,
  },

  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.recordDot,
    marginRight: 8,
  },

  recordingText: {
    color: COLORS.recordDot,
    fontWeight: '600',
    fontSize: 14,
  },

  recordingTimer: {
    color: '#333',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },

  recordingSendBtn: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    alignSelf: 'flex-end',
    marginBottom: 4,
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  // ── Attachment / file / media ────────────────────────────────────────────────
  imageWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    maxWidth: 240,
    backgroundColor: COLORS.mediaDark,
  },

  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlayMid,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    zIndex: 5,
  },

  uploadText: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },

  uploadProgressText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },

  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: 6,
  },

  progressFill: {
    height: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 2,
  },

  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },

  loader: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.overlayLight,
  },

  chatImage: {
    width: 220,
    height: 200,
  },

  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },

  imageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 6,
    paddingBottom: 4,
    paddingTop: 2,
    backgroundColor: COLORS.overlayTint,
  },

  imageTime: {
    color: COLORS.textWhite,
    fontSize: 11,
  },

  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryMid,
    borderRadius: 8,
    padding: 10,
    maxWidth: 220,
    gap: 8,
  },

  fileName: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  fileMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 8,
    gap: 8,
    minWidth: 160,
    maxWidth: 220,
  },

  fileMessageName: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },

  fileErrorContainer: {
    width: 220,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.mediaError,
    borderRadius: 10,
  },

  fileErrorText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 6,
  },

  imageErrorContainer: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: COLORS.mediaError,
    justifyContent: 'center',
    alignItems: 'center',
  },

  imageErrorText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 6,
  },

  retryButton: {
    marginTop: 8,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  retryText: {
    color: COLORS.textWhite,
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Video ────────────────────────────────────────────────────────────────────
  videoContainer: {
    width: 220,
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
    // ✅ Center children so videoPlayButton can use default flow positioning
    //    instead of fragile absolute top/left percentage calculations.
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  // ✅ Fixed: removed `top: '50%'` + `left: '50%'` + transform offset pattern.
  //    The parent (videoContainer) centers its children via justifyContent /
  //    alignItems, so absolute positioning with inset: 0 + auto margin is more
  //    robust and doesn't break if the container size changes.
  videoPlayButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    // No manual top/left — parent's justifyContent/alignItems centers this
  },

  video: {
    width: '100%',
    height: '100%',
  },

  videoLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },

  // ── Audio ────────────────────────────────────────────────────────────────────
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    padding: 10,
    borderRadius: 10,
  },

  audioText: {
    color: COLORS.textWhite,
    marginLeft: 10,
  },

  // ── Image / video viewer (fullscreen) ────────────────────────────────────────
  fullScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
  },

  imageViewerOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
  },

  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },

  imageViewerDownload: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },

  fullScreenImage: {
    width: '100%',
    height: '80%',
  },

  // ✅ Fixed: removed duplicate definition. Keeping the more complete version
  //    (height: '100%' + backgroundColor) as that is the intended fullscreen
  //    video player style. The earlier height: '80%' version is discarded.
  fullScreenVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },

  videoPlayerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  videoPlaceholderText: {
    color: '#aaa',
    fontSize: 13,
  },

  // ── Options modal ─────────────────────────────────────────────────────────────
  // Note: optionsModalOverlay / optionsMenuContainer are the primary (new) styles.
  //       modalOverlay / optionsMenu / optionItem etc. are kept for legacy screens.
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayModal,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingRight: 12,
  },

  optionsMenuContainer: {
    backgroundColor: COLORS.bgTextInput,
    borderRadius: 8,
    minWidth: 180,
    elevation: 8,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },

  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.dividerHeavy,
  },

  optionsMenuIcon: {
    marginRight: 14,
  },

  optionsMenuText: {
    fontSize: 16,
    color: '#262626',
    fontWeight: '500',
  },

  deleteMenuText: {
    color: COLORS.textDanger,
  },

  // Legacy modal styles — kept for compatibility with older screens
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayModalAlt,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 70,
    paddingRight: 10,
  },

  optionsMenu: {
    backgroundColor: COLORS.bgTextInput,
    borderRadius: 10,
    paddingVertical: 6,
    minWidth: 170,
    elevation: 8,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 10,
  },

  optionIcon: {
    marginRight: 4,
  },

  optionText: {
    fontSize: 15,
    color: '#333',
  },

  optionDestructive: {
    color: COLORS.textDangerAlt,
  },

  optionDivider: {
    height: 1,
    backgroundColor: COLORS.dividerLight,
    marginHorizontal: 10,
  },

  // ── New message badge ─────────────────────────────────────────────────────────
  newMessageBadge: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // ✅ Fixed: removed duplicate `newMessageText` (was identical to this).
  //    Consolidate all badge label usage to `newMessageBadgeText`.
  newMessageBadgeText: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: '600',
  },

});

export default styles;