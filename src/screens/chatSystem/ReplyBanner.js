import React, { useState, memo, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const ACCENT_COLOR = '#075E54';

const IMAGE_SIZE = {
  compact: 36,
  normal: 46,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — defined outside components so they are never recreated
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip query params before running extension matching.
 * Handles CDN / signed URLs correctly.
 *
 * @param {string|null|undefined} url
 * @returns {string}
 */
const getCleanUrl = (url) => {
  // FIX: Removed dead try/catch — String.split never throws.
  if (!url) return '';
  return url.split('?')[0].toLowerCase();
};

/**
 * Detect media type from a message object.
 * Checks file_type / mime_type / type / file_name / URL extension.
 *
 * @param {Object|null} message
 * @returns {'image'|'video'|'audio'|'file'|'text'}
 */
const detectReplyType = (message) => {
  if (!message) return 'text';

  const url = getCleanUrl(message.file_url);
  const fileType = message.file_type || message.mime_type || message.type || '';
  // FIX: Removed `hasText` — it was computed but never used.
  const fileName = (message.file_name || '').toLowerCase();

  // Check audio first — prevents aac/ogg from matching image/video patterns
  // FIX: Use RegExp.test() instead of .match() for boolean checks —
  // faster (no array allocation, stops at first match) and semantically correct.
  if (
    fileType === 'audio' ||
    fileType.startsWith('audio/') ||
    /\.(mp3|wav|aac|ogg|m4a)$/.test(url) ||
    /\.(mp3|wav|aac|ogg|m4a)$/.test(fileName)
  ) return 'audio';

  if (
    fileType.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(url)
  ) return 'image';

  if (
    fileType.startsWith('video/') ||
    /\.(mp4|mov|avi|mkv|webm)$/.test(url)
  ) return 'video';

  if (message.file_url) return 'file';

  return 'text';
};

/**
 * Derive preview text for the reply banner based on message content and type.
 *
 * @param {Object} message
 * @param {'image'|'video'|'audio'|'file'|'text'} mediaType
 * @returns {string}
 */
const getPreviewText = (message, mediaType) => {
  const rawText =
    message.content ||
    message.message ||
    message.text ||
    message.body ||
    '';

  const trimmed = rawText.trim();
  if (trimmed) return trimmed;

  switch (mediaType) {
    case 'image': return '📷  Photo';
    case 'video': return '🎥  Video';
    case 'audio': return '🎙️  Voice message';
    case 'file':  return `📄  ${message.file_name || 'File'}`;
    default:      return 'Message';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// THUMBNAIL — with error fallback
// ─────────────────────────────────────────────────────────────────────────────
const ImageThumbnail = memo(({ uri, compact }) => {
  const [hasError, setHasError] = useState(false);
  const size = compact ? IMAGE_SIZE.compact : IMAGE_SIZE.normal;

  // FIX: Compute image style with useMemo so the style object is stable
  // across renders when size doesn't change, instead of being a new inline
  // object every time.
  const imageStyle = useMemo(
    () => ({ width: size, height: size, borderRadius: 2 }),
    [size],
  );

  if (hasError) {
    return (
      <View
        style={[styles.thumbnailFallback, { width: size, height: size }]}
        accessibilityLabel="Image not available"
      >
        <Icon name="broken-image" size={16} color="#999" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={imageStyle}
      resizeMode="cover"
      onError={() => setHasError(true)}
      // FIX: Added accessibility hint for screen readers
      accessibilityLabel="Reply image thumbnail"
      accessibilityRole="image"
    />
  );
});

// FIX: Set displayName so memo-wrapped component shows clearly in DevTools
ImageThumbnail.displayName = 'ImageThumbnail';

ImageThumbnail.propTypes = {
  uri: PropTypes.string.isRequired,
  compact: PropTypes.bool,
};

// ─────────────────────────────────────────────────────────────────────────────
// REPLY BANNER
// ─────────────────────────────────────────────────────────────────────────────
const ReplyBanner = ({
  message,
  // FIX: Default value moved to destructuring instead of inline in JSX
  senderName = 'Contact',
  showClose = false,
  onCancel,
  compact = false,
  ownMessage = false,
}) => {
  if (!message) return null;

  const mediaType = detectReplyType(message);
  const previewText = getPreviewText(message, mediaType);

  // ── Derive variant styles once per render ────────────────────────────────
  // FIX: Replaced three separate ternary chains with a single computed
  // variant block — easier to read, only evaluated once per render.
  const isInsideBubble = compact && ownMessage;

  const senderColor = isInsideBubble
    ? 'rgba(255,255,255,0.95)'
    : ACCENT_COLOR;

  const previewColor = isInsideBubble
    ? 'rgba(255,255,255,0.75)'
    : '#667781';

  const bgColor = isInsideBubble
    ? 'rgba(0,0,0,0.12)'
    : compact
      ? 'rgba(0,0,0,0.06)'
      : '#f0f7f6';

  const variantStyles = compact ? styles.variant.compact : styles.variant.normal;

  const containerStyle = [
    styles.container,
    variantStyles.container,
    { backgroundColor: bgColor },
  ];

  return (
    <View style={containerStyle}>
      {/* Left accent bar */}
      <View style={styles.accentBar} />

      {/* Thumbnail — only rendered for image replies with a valid URL */}
      {mediaType === 'image' && message.file_url && (
        <ImageThumbnail uri={message.file_url} compact={compact} />
      )}

      {/* Content: sender name + message preview */}
      <View style={[styles.contentWrapper, variantStyles.contentWrapper]}>
        <Text
          style={[styles.senderName, variantStyles.senderName, { color: senderColor }]}
          numberOfLines={1}
        >
          {senderName}
        </Text>

        <Text
          style={[styles.previewText, variantStyles.previewText, { color: previewColor }]}
          numberOfLines={1}
        >
          {previewText}
        </Text>
      </View>

      {/* Close / cancel button — only shown in the message input area */}
      {showClose && (
        <TouchableOpacity
          onPress={onCancel}
          style={styles.closeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Cancel reply"
          accessibilityRole="button"
        >
          <Icon name="close" size={18} color="#667781" />
        </TouchableOpacity>
      )}
    </View>
  );
};

ReplyBanner.propTypes = {
  message: PropTypes.shape({
    file_url: PropTypes.string,
    file_type: PropTypes.string,
    mime_type: PropTypes.string,
    type: PropTypes.string,
    file_name: PropTypes.string,
    content: PropTypes.string,
    message: PropTypes.string,
    text: PropTypes.string,
    body: PropTypes.string,
  }),
  senderName: PropTypes.string,
  showClose: PropTypes.bool,
  // FIX: onCancel should be required when showClose is true — document that
  // contract even if we can't enforce it purely with PropTypes
  onCancel: PropTypes.func,
  compact: PropTypes.bool,
  ownMessage: PropTypes.bool,
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: ACCENT_COLOR,
    borderRadius: 1.5,
  },
  contentWrapper: {
    flex: 1,
  },
  senderName: {
    fontWeight: '700',
    marginBottom: 2,
  },
  // FIX: Removed empty `previewText: {}` — an empty style entry adds noise
  // and no value. Base styles only; size is applied via variant below.
  previewText: {
    lineHeight: 18,
  },
  closeButton: {
    padding: 8,
  },
  thumbnailFallback: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
  },

  // FIX: Replaced repeated `compact ? styles.X : styles.Y` ternaries in JSX
  // with a single `variant` block. Each variant is a full style set, selected
  // once at the top of the component and reused across all elements.
  variant: {
    compact: StyleSheet.create({
      container: {
        borderRadius: 6,
      },
      contentWrapper: {
        paddingVertical: 5,
        paddingHorizontal: 7,
      },
      senderName: {
        fontSize: 11,
      },
      previewText: {
        fontSize: 12,
      },
    }),
    normal: StyleSheet.create({
      container: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d9e8e7',
      },
      contentWrapper: {
        paddingVertical: 8,
        paddingHorizontal: 10,
      },
      senderName: {
        fontSize: 12,
      },
      previewText: {
        fontSize: 13,
      },
    }),
  },
});

// FIX: Export the memo-wrapped version directly.
// The component is named `ReplyBanner` (not an anonymous function)
// so DevTools will still show it as `memo(ReplyBanner)` clearly.
export default memo(ReplyBanner);