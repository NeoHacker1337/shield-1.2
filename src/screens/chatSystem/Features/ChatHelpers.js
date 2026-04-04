// ================================================================
// ChatHelpers.js
// Pure utility functions — no hooks, no state, no side effects.
// Safe to import anywhere: ChatScreen, MessageItem, ChatRoomItem, etc.
// ================================================================

// ── Display name resolution ──────────────────────────────────────

/**
 * Resolves the best display name for a chat room.
 * Priority: routeContactName → room.name → participant name → guest → fallback
 */
export const getDisplayNameFromChatRoom = (room, routeContactName, user) => {
  // 1. Use name passed via navigation route params (highest priority)
  if (routeContactName && routeContactName.trim()) {
    return routeContactName.trim();
  }

  // 2. Use room-level name (group chats or named rooms)
  if (room?.name && room.name !== null && room.name.trim()) {
    return room.name.trim();
  }

  // 3. Find the other participant's name from participants array
  if (room?.participants && Array.isArray(room.participants) && user?.id) {
    const otherParticipant = room.participants.find(
      (participant) => participant && participant.id !== user.id
    );
    if (otherParticipant?.name && otherParticipant.name.trim()) {
      return otherParticipant.name.trim();
    }

    // 3b. Try email as fallback participant identifier
    if (otherParticipant?.email && otherParticipant.email.trim()) {
      return otherParticipant.email.trim();
    }
  }

  // 4. Guest room fallback
  if (room?.type === 'guest' || room?.is_guest_room) {
    return 'Guest Chat';
  }

  // 5. Final fallback
  return 'Unknown Contact';
};

// ── Avatar helpers ───────────────────────────────────────────────

/**
 * Returns the first character of a name in uppercase for avatar display.
 * Falls back to '?' if name is empty or null.
 */
export const getContactAvatar = (name) => {
  if (!name || !name.trim()) return '?';
  return name.trim().charAt(0).toUpperCase();
};

/**
 * Generates initials from a full name (up to 2 characters).
 * e.g. "Mahender Singh" → "MS", "John" → "J"
 */
export const getInitials = (name) => {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Generates a consistent background color for avatar
 * based on the contact name using a hash function.
 */
export const getAvatarColor = (name) => {
  const colors = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7',
    '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
    '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
    '#FFC107', '#FF9800', '#FF5722', '#795548',
  ];

  if (!name || !name.trim()) return colors[0];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

// ── Time & date formatting ───────────────────────────────────────

/**
 * Formats a timestamp to 12-hour time string.
 * e.g. "2:45 PM"
 */
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

/**
 * Formats a timestamp to a date label for message group separators.
 * - Today     → "Today"
 * - Yesterday → "Yesterday"
 * - This week → "Monday", "Tuesday" etc.
 * - Older     → "12 Mar 2025"
 */
export const formatMessageDateLabel = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.round((today - msgDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' }); // e.g. "Monday"
    }

    return date.toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }); // e.g. "12 Mar 2025"
  } catch {
    return '';
  }
};

/**
 * Formats a timestamp for the chat room list (last message time).
 * - Today     → "2:45 PM"
 * - Yesterday → "Yesterday"
 * - This week → "Monday"
 * - Older     → "12/03/25"
 */
export const formatRoomLastMessageTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.round((today - msgDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }

    return date.toLocaleDateString([], {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return '';
  }
};

// ── Message grouping ─────────────────────────────────────────────

/**
 * Checks if two consecutive messages should be grouped together.
 * Groups if same sender AND within 2 minutes of each other.
 */
export const shouldGroupMessages = (currentMsg, previousMsg) => {
  if (!currentMsg || !previousMsg) return false;

  const sameUser =
    currentMsg.user_id === previousMsg.user_id &&
    currentMsg.sender?.id === previousMsg.sender?.id;

  if (!sameUser) return false;

  const timeDiff =
    Math.abs(
      new Date(currentMsg.created_at) - new Date(previousMsg.created_at)
    ) /
    1000 /
    60; // in minutes

  return timeDiff <= 2;
};

/**
 * Checks if a date separator should be shown between two messages.
 * Returns true if the messages are on different calendar days.
 */
export const shouldShowDateSeparator = (currentMsg, previousMsg) => {
  if (!previousMsg) return true; // Always show for the first message

  const currentDate = new Date(currentMsg.created_at);
  const previousDate = new Date(previousMsg.created_at);

  return (
    currentDate.getFullYear() !== previousDate.getFullYear() ||
    currentDate.getMonth() !== previousDate.getMonth() ||
    currentDate.getDate() !== previousDate.getDate()
  );
};

// ── File & media helpers ─────────────────────────────────────────

/**
 * Returns a human-readable file size string.
 * e.g. 1024 → "1.0 KB", 1048576 → "1.0 MB"
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Returns the file extension from a filename or URL.
 * e.g. "document.pdf" → "PDF", "image.jpg" → "JPG"
 */
export const getFileExtension = (fileName) => {
  if (!fileName) return '';
  const parts = fileName.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toUpperCase();
};

/**
 * Returns an icon name (MaterialIcons) based on file type/extension.
 */
export const getFileIcon = (fileName, mimeType) => {
  const ext = getFileExtension(fileName).toLowerCase();
  const mime = mimeType?.toLowerCase() || '';

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext) || mime.startsWith('image/')) {
    return 'image';
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || mime.startsWith('video/')) {
    return 'videocam';
  }
  if (['mp3', 'wav', 'aac', 'ogg', 'm4a'].includes(ext) || mime.startsWith('audio/')) {
    return 'audiotrack';
  }
  if (['pdf'].includes(ext)) return 'picture-as-pdf';
  if (['doc', 'docx'].includes(ext)) return 'description';
  if (['xls', 'xlsx'].includes(ext)) return 'table-chart';
  if (['ppt', 'pptx'].includes(ext)) return 'slideshow';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'folder-zip';
  if (['txt', 'md', 'csv'].includes(ext)) return 'article';

  return 'insert-drive-file'; // default
};

/**
 * Checks whether a message contains media (image, video, file).
 */
export const isMediaMessage = (message) => {
  return !!(message?.file_url);
};

/**
 * Returns a short preview text for a message
 * used in chat room list last message preview.
 * e.g. image → "📷 Photo", video → "🎥 Video"
 */
export const getMessagePreview = (message) => {
  if (!message) return '';

  if (message.type === 'image') return '📷 Photo';
  if (message.type === 'video') return '🎥 Video';
  if (message.type === 'audio') return '🎵 Audio';
  if (message.type === 'file' || message.type === 'doc') return '📄 File';

  const content = message.content || message.message || message.text || message.body || '';
  if (content.length > 40) return content.substring(0, 40) + '...';
  return content;
};

// ── Online status ────────────────────────────────────────────────

/**
 * NOTE: Replace with real API-based online status when backend supports it.
 * Currently returns a random boolean as a placeholder.
 */
export const getOnlineStatus = () => {
  return Math.random() > 0.5;
};

// ── Message ownership ────────────────────────────────────────────

/**
 * Checks if a message was sent by the current user.
 */
export const isOwnMessage = (message, currentUser) => {
  if (!message || !currentUser) return false;
  const isGuest = message.is_guest === 1 || message.is_guest === true;
  if (isGuest) return false;
  return (
    message.user_id === currentUser.id ||
    message.sender?.id === currentUser.id
  );
};

/**
 * Checks if a message is from a guest user.
 */
export const isGuestMessage = (message) => {
  return message?.is_guest === 1 || message?.is_guest === true;
};