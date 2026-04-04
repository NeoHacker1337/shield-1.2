import { StyleSheet, Platform } from 'react-native';

const styles = StyleSheet.create({

  // ─────────────────────────────────────────────
  // EXISTING STYLES (unchanged)
  // ─────────────────────────────────────────────

  fullContainer: {
    flex: 1,
    backgroundColor: '#075E54',
  },

  statusBarSpacer: {
    backgroundColor: '#075E54',
  },

  chatContainer: {
  flex: 1,
  backgroundColor: '#ECE5DD',
  paddingHorizontal: 6,
},

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECE5DD',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54',
    paddingHorizontal: 12,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
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
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },

  onlineAvatar: {
    borderWidth: 2,
    borderColor: '#25D366',
  },

  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  headerOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#25D366',
    borderWidth: 2,
    borderColor: '#075E54',
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  headerSubtitle: {
    color: '#B8E6B8',
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

  messageContainer: {
  marginVertical: 4,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 12,
  maxWidth: '80%',
},

currentUserMessageContainer: {
  alignSelf: 'flex-end',
  backgroundColor: '#DCF8C6',
  borderTopRightRadius: 0,
},

otherUserMessageContainer: {
  alignSelf: 'flex-start',
  backgroundColor: '#FFFFFF',
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
    color: '#075E54',
  },

  messageText: {
    fontSize: 16,
    color: '#000',
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
    color: '#667781',
    marginRight: 4,
  },

  messageStatus: {
    marginLeft: 2,
  },

  inputWrapper: {
    backgroundColor: '#F0F0F0',
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    minHeight: 56,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    minHeight: 56,
    backgroundColor: '#F0F0F0',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
    maxHeight: 120,
    marginHorizontal: 4,
    textAlignVertical: 'center',
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#E1E1E1',
  },

  sendButton: {
    backgroundColor: '#00897B',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    alignSelf: 'flex-end',
    marginBottom: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  sendButtonDisabled: {
    backgroundColor: '#BDBDBD',
    elevation: 0,
  },

  emojiContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
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

  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingRight: 12,
  },

  optionsMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    minWidth: 180,
    elevation: 8,
    shadowColor: '#000',
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
    borderBottomColor: '#E5E5E5',
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
    color: '#DC2626',
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
    color: '#075E54',
    marginTop: 16,
    textAlign: 'center',
  },

  emptyMessagesSubtext: {
    fontSize: 14,
    color: '#667781',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
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
    borderTopColor: '#DCF8C6',
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
    borderTopColor: '#FFFFFF',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },


  // ─────────────────────────────────────────────
  // IMAGE MESSAGE STYLES (missing — add these)
  // ─────────────────────────────────────────────

  imageWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    maxWidth: 240,
    backgroundColor: '#1a1a1a',
  },

  uploadOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    zIndex: 5,
  },

  uploadText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
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
    backgroundColor: '#25D366',
    borderRadius: 2,
  },

  fileErrorContainer: {
    width: 220,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
  },

  fileErrorText: {
    color: '#999',
    fontSize: 13,
    marginTop: 6,
  },

  imageLoader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },

  chatImage: {
    width: 220,
    height: 200,
  },

  imageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 6,
    paddingBottom: 4,
    paddingTop: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

  imageTime: {
    color: '#fff',
    fontSize: 11,
  },

  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#128C7E',
    borderRadius: 8,
    padding: 10,
    maxWidth: 220,
    gap: 8,
  },

  fileName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fullScreenImage: {
    width: '100%',
    height: '80%',
  },

  newMessageBadge: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: '#075E54',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    elevation: 5,
  },

  newMessageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },


  newMessageBadge: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#075E54',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 5,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },






  retryButton: {
    marginTop: 8,
    backgroundColor: '#075E54',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },






  videoContainer: {
    width: 220,
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
  },

  video: {
    width: '100%',
    height: '100%',
  },

  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54',
    padding: 10,
    borderRadius: 10,
  },

  audioText: {
    color: '#fff',
    marginLeft: 10,
  },





  loader: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },





  // ─────────────────────────────────────────────
  // NEW STYLES — added for refactored ChatScreen
  // ─────────────────────────────────────────────

  container: {
    flex: 1,
    backgroundColor: '#075E54',
  },

  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 10,
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  onlineIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#25D366',
    borderWidth: 2,
    borderColor: '#075E54',
  },

  headerInfo: {
    flex: 1,
  },

  headerName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },

  headerStatus: {
    color: '#B8E6B8',
    fontSize: 12,
    marginTop: 1,
  },

  optionsButton: {
    padding: 8,
  },

  // Date separator
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

  dateSeparatorText: {
    fontSize: 11,
    color: '#667781',
    marginHorizontal: 8,
    backgroundColor: '#D9D9D9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },


  // Loading older messages
  loadingOlderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },

  loadingOlderText: {
    fontSize: 12,
    color: '#888',
  },

  // Empty state (refactored)
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
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // Emoji picker — category tabs + grid
  emojiPicker: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
    maxHeight: 280,
  },

  emojiCategoryRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },

  emojiCategoryTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 3,
  },

  emojiCategoryTabActive: {
    backgroundColor: '#DCF8C6',
  },

  emojiCategoryLabel: {
    fontSize: 20,
  },

  emojiGrid: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },

  // Options modal (refactored)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 70,
    paddingRight: 10,
  },

  optionsMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 6,
    minWidth: 170,
    elevation: 8,
    shadowColor: '#000',
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
    color: '#e53935',
  },

  optionDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 10,
  },

  // Full-screen image viewer modal
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
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

  // Full-screen video viewer
  videoPlayerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  videoPlaceholderText: {
    color: '#aaa',
    fontSize: 13,
  },

  fullScreenVideo: {
    width: '100%',
    height: '80%',
  },

  // Message image
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },

  // Image error fallback
  imageErrorContainer: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  imageErrorText: {
    color: '#999',
    fontSize: 12,
    marginTop: 6,
  },

  // File message row
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

  // Upload progress text
  uploadProgressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  newMessageBadge: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: '#075E54',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    elevation: 5,
  },
  newMessageBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emojiCategoryRow: {
    maxHeight: 40,
    marginBottom: 6,
  },
  emojiCategoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: '#F0F0F0',
  },
  emojiCategoryTabActive: {
    backgroundColor: '#075E54',
  },
  emojiGrid: {
    maxHeight: 200,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
recordingContainer: {
  backgroundColor: '#ffe6e6',
  padding: 8,
  alignItems: 'center',
},

recordingText: {
  color: '#e53935',
  fontWeight: '600',
},
});

export default styles;