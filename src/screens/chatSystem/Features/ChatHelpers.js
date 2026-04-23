// ================================================================
// ChatHelpers.js
// Pure utility functions — no hooks, no state, no side effects.
// Safe to import anywhere: ChatScreen, MessageItem, ChatRoomItem, etc.
// ================================================================

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

/** Maximum time gap (minutes) to group consecutive messages together */
const MESSAGE_GROUP_THRESHOLD_MINUTES = 2;

/** Avatar background color palette */
const AVATAR_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFC107', '#FF9800', '#FF5722', '#795548',
];

// ─────────────────────────────────────────────────────────────────
// INTERNAL HELPERS (not exported)
// ─────────────────────────────────────────────────────────────────

/**
 * Safely parses a timestamp into a Date object.
 * Returns null if the timestamp is invalid.
 * @param {string|number|Date} timestamp
 * @returns {Date|null}
 */
const safeParseDate = (timestamp) => {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Returns midnight (00:00:00.000) of the given date's calendar day.
 * Used to compute whole-day differences without DST issues.
 * @param {Date} date
 * @returns {Date}
 */
const toMidnight = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Returns the difference in whole calendar days between two dates.
 * Uses floor (not round) to avoid DST-related off-by-one errors.
 * @param {Date} laterDate
 * @param {Date} earlierDate
 * @returns {number}
 */
const calendarDayDiff = (laterDate, earlierDate) => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(
    (toMidnight(laterDate) - toMidnight(earlierDate)) / msPerDay
  );
};

/**
 * Strips query parameters from a URL for extension matching.
 * e.g. "file.pdf?token=abc" → "file.pdf"
 * @param {string} url
 * @returns {string}
 */
const stripQueryParams = (url) => {
  if (!url) return '';
  try {
    return url.split('?')[0].toLowerCase();
  } catch {
    return url.toLowerCase();
  }
};


// ─────────────────────────────────────────────────────────────────
// AVATAR HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Returns the first character of a name in uppercase for avatar display.
 * Falls back to '?' for empty or null input.
 *
 * @param {string} name
 * @returns {string}
 */
export const getContactAvatar = (name) => {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
};

/**
 * Generates initials from a full name (up to 2 characters).
 * Handles multiple spaces between words correctly.
 * e.g. "Mahender Singh" → "MS", "John" → "J"
 *
 * @param {string} name
 * @returns {string}
 */
export const getInitials = (name) => {
  const trimmed = name?.trim();
  if (!trimmed) return '?';

  // Split on any whitespace (handles double spaces, tabs, etc.)
  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
};

/**
 * Generates a consistent background color for an avatar
 * based on the contact name using a djb2-style hash.
 *
 * @param {string} name
 * @returns {string} Hex color string
 */
export const getAvatarColor = (name) => {
  const trimmed = name?.trim();
  if (!trimmed) return AVATAR_COLORS[0];

  // djb2 hash — stays positive by using unsigned right shift
  let hash = 5381;
  for (let i = 0; i < trimmed.length; i++) {
    // >>> 0 converts to unsigned 32-bit integer, preventing negative values
    hash = ((hash << 5) + hash + trimmed.charCodeAt(i)) >>> 0;
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

// ─────────────────────────────────────────────────────────────────
// TIME & DATE FORMATTING
// ─────────────────────────────────────────────────────────────────

/**
 * Formats a timestamp to a consistent 12-hour time string.
 * e.g. "2:45 PM"
 *
 * @param {string|number|Date} timestamp
 * @returns {string}
 */
export const formatMessageTime = (timestamp) => {
  const date = safeParseDate(timestamp);
  if (!date) return '';

  // Manual formatting ensures consistency across all device locales
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12; // convert 0 → 12 for midnight

  return `${displayHour}:${minutes} ${period}`;
};

/**
 * Shared date label logic used by both formatMessageDateLabel
 * and formatRoomLastMessageTime.
 *
 * @param {Date} date - The message date
 * @param {Date} now - Reference date (typically new Date())
 * @returns {{ diffDays: number, date: Date }}
 */
const getDateLabelContext = (date, now) => {
  const diffDays = calendarDayDiff(now, date);
  return { diffDays, date };
};

/**
 * Formats a timestamp to a date label for message group separators.
 * - Today     → "Today"
 * - Yesterday → "Yesterday"
 * - This week → "Monday", "Tuesday" etc.
 * - Older     → "12 Mar 2025"
 *
 * @param {string|number|Date} timestamp
 * @returns {string}
 */
export const formatMessageDateLabel = (timestamp) => {
  const date = safeParseDate(timestamp);
  if (!date) return '';

  const { diffDays } = getDateLabelContext(date, new Date());

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Formats a timestamp for the chat room list (last message time).
 * - Today     → "2:45 PM"
 * - Yesterday → "Yesterday"
 * - This week → "Monday"
 * - Older     → "12/03/25"
 *
 * @param {string|number|Date} timestamp
 * @returns {string}
 */
export const formatRoomLastMessageTime = (timestamp) => {
  const date = safeParseDate(timestamp);
  if (!date) return '';

  const { diffDays } = getDateLabelContext(date, new Date());

  if (diffDays === 0) return formatMessageTime(date);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
};

// ─────────────────────────────────────────────────────────────────
// MESSAGE GROUPING
// ─────────────────────────────────────────────────────────────────

/**
 * Checks if two consecutive messages should be grouped together.
 * Groups if same sender AND sent within MESSAGE_GROUP_THRESHOLD_MINUTES.
 *
 * @param {object} currentMsg
 * @param {object} previousMsg
 * @returns {boolean}
 */
export const shouldGroupMessages = (currentMsg, previousMsg) => {
  if (!currentMsg || !previousMsg) return false;

  // Check sender identity — prefer user_id, fall back to sender.id
  // Uses OR so either field matching is sufficient
  const currentId = currentMsg.user_id ?? currentMsg.sender?.id;
  const previousId = previousMsg.user_id ?? previousMsg.sender?.id;

  if (!currentId || !previousId || currentId !== previousId) return false;

  const currentDate = safeParseDate(currentMsg.created_at);
  const previousDate = safeParseDate(previousMsg.created_at);

  if (!currentDate || !previousDate) return false;

  const diffMinutes =
    Math.abs(currentDate - previousDate) / (1000 * 60);

  return diffMinutes <= MESSAGE_GROUP_THRESHOLD_MINUTES;
};

/**
 * Checks if a date separator should be shown between two messages.
 * Returns true if the messages are on different calendar days.
 *
 * @param {object} currentMsg
 * @param {object|null} previousMsg
 * @returns {boolean}
 */
export const shouldShowDateSeparator = (currentMsg, previousMsg) => {
  // Always show separator before the very first message
  if (!previousMsg) return true;

  const currentDate = safeParseDate(currentMsg?.created_at);
  const previousDate = safeParseDate(previousMsg?.created_at);

  // If either date is invalid, show separator to be safe
  if (!currentDate || !previousDate) return true;

  return (
    currentDate.getFullYear() !== previousDate.getFullYear() ||
    currentDate.getMonth() !== previousDate.getMonth() ||
    currentDate.getDate() !== previousDate.getDate()
  );
};

// ─────────────────────────────────────────────────────────────────
// FILE & MEDIA HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable file size string.
 * e.g. 1024 → "1.0 KB", 1048576 → "1.0 MB"
 *
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (typeof bytes !== 'number' || bytes < 0 || isNaN(bytes)) return '0 B';
  if (bytes === 0) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    sizes.length - 1
  );

  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Returns the file extension from a filename or URL.
 * Safely handles URLs with query parameters.
 * e.g. "document.pdf?token=abc" → "PDF"
 *
 * @param {string} fileName
 * @returns {string}
 */
export const getFileExtension = (fileName) => {
  if (!fileName) return '';

  // Strip query params before extracting extension
  const clean = stripQueryParams(fileName);
  const parts = clean.split('.');

  if (parts.length < 2) return '';

  const ext = parts[parts.length - 1];
  // Ensure no fragment identifiers (#) are included
  return ext.split('#')[0].toUpperCase();
};

/**
 * Returns an icon name (MaterialIcons) based on file type/extension.
 *
 * @param {string} fileName
 * @param {string} mimeType
 * @returns {string} MaterialIcons icon name
 */
export const getFileIcon = (fileName, mimeType) => {
  const ext = getFileExtension(fileName).toLowerCase();
  const mime = mimeType?.toLowerCase() || '';

  if (
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) ||
    mime.startsWith('image/')
  ) return 'image';

  if (
    ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) ||
    mime.startsWith('video/')
  ) return 'videocam';

  if (
    ['mp3', 'wav', 'aac', 'ogg', 'm4a'].includes(ext) ||
    mime.startsWith('audio/')
  ) return 'audiotrack';

  if (ext === 'pdf') return 'picture-as-pdf';
  if (['doc', 'docx'].includes(ext)) return 'description';
  if (['xls', 'xlsx'].includes(ext)) return 'table-chart';
  if (['ppt', 'pptx'].includes(ext)) return 'slideshow';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'folder-zip';
  if (['txt', 'md', 'csv'].includes(ext)) return 'article';

  return 'insert-drive-file';
};

/**
 * Detects the media type of a message.
 * Checks type field, file_type, mime_type, file_url extension, and file_name.
 * Returns: 'image' | 'video' | 'audio' | 'file' | 'text'
 *
 * @param {object} message
 * @returns {'image'|'video'|'audio'|'file'|'text'}
 */
export const detectMediaType = (message) => {
  if (!message) return 'text';

  const url = stripQueryParams(message.file_url || '');
  const fileType = (
    message.file_type ||
    message.mime_type ||
    message.type ||
    ''
  ).toLowerCase();
  const fileName = (message.file_name || '').toLowerCase();

  // Audio — check before image/video to avoid aac URL edge cases
  if (
    fileType === 'audio' ||
    fileType.startsWith('audio/') ||
    url.match(/\.(mp3|wav|aac|ogg|m4a)$/) ||
    fileName.match(/\.(mp3|wav|aac|ogg|m4a)$/)
  ) return 'audio';

  if (
    fileType === 'image' ||
    fileType.startsWith('image/') ||
    url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)
  ) return 'image';

  if (
    fileType === 'video' ||
    fileType.startsWith('video/') ||
    url.match(/\.(mp4|mov|avi|mkv|webm)$/)
  ) return 'video';

  if (message.file_url?.trim()) return 'file';

  return 'text';
};

/**
 * Checks whether a message contains valid media (image, video, audio, file).
 *
 * @param {object} message
 * @returns {boolean}
 */
export const isMediaMessage = (message) => {
  return !!message?.file_url?.trim();
};

/**
 * Returns a short preview text for a message,
 * used in the chat room list for last message preview.
 * Checks both message.type and file metadata for accurate detection.
 *
 * @param {object} message
 * @returns {string}
 */
export const getMessagePreview = (message) => {
  if (!message) return '';

  // Use unified media type detection
  const mediaType = detectMediaType(message);

  if (mediaType === 'image') return '📷 Photo';
  if (mediaType === 'video') return '🎥 Video';
  if (mediaType === 'audio') return '🎙️ Voice message';
  if (mediaType === 'file') return `📄 ${message.file_name || 'File'}`;

  const content = (
    message.content ||
    message.message ||
    message.text ||
    message.body ||
    ''
  ).trim();

  if (!content) return '';

  // Truncate long messages for preview
  return content.length > 40 ? `${content.substring(0, 40)}...` : content;
};

// ─────────────────────────────────────────────────────────────────
// ONLINE STATUS
// ─────────────────────────────────────────────────────────────────

/**
 * Returns the online status of a contact.
 *
 * ⚠️  TODO: Replace with real API/WebSocket-based status
 *           when backend supports presence detection.
 *
 * @param {string|number} _userId - Reserved for future API integration
 * @returns {boolean}
 */
export const getOnlineStatus = (_userId) => {
  // PLACEHOLDER — always returns false until real presence API is available
  // Returning random caused UI flickering on every render
  return false;
};

// ─────────────────────────────────────────────────────────────────
// MESSAGE OWNERSHIP
// ─────────────────────────────────────────────────────────────────

/**
 * Checks if a message was sent by the current user.
 * Guest messages are never considered "own" messages.
 *
 * @param {object} message
 * @param {object} currentUser
 * @returns {boolean}
 */
export const isOwnMessage = (message, currentUser) => {
  if (!message || !currentUser) return false;

  // Guest messages are never treated as own messages
  if (message.is_guest === 1 || message.is_guest === true) return false;

  // Check both user_id and sender.id for compatibility
  return (
    message.user_id === currentUser.id ||
    message.sender?.id === currentUser.id
  );
};

/**
 * Checks if a message is from a guest user.
 *
 * @param {object} message
 * @returns {boolean}
 */
export const isGuestMessage = (message) => {
  return message?.is_guest === 1 || message?.is_guest === true;
};