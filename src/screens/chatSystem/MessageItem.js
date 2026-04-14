import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSound } from 'react-native-nitro-sound';
import styles from '../../assets/ChatScreenStyles';
import ReplyBanner from './ReplyBanner';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const LONG_PRESS_DELAY = 300;

const WAVEFORM = [
  10, 16, 22, 14, 28, 18, 32, 20, 14, 26,
  30, 16, 22, 28, 12, 24, 32, 18, 10, 24,
  28, 14, 20, 32, 16, 22, 26, 12, 20, 16,
];

// Extracted to avoid inline style recreation on every render
const videoFileNameStyle = {
  color: '#fff',
  fontSize: 11,
  marginTop: 4,
  opacity: 0.85,
};

const editedTextBaseStyle = {
  fontSize: 10,
  fontStyle: 'italic',
  marginRight: 4,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — defined outside components so they are never recreated
// ─────────────────────────────────────────────────────────────────────────────

/** Format milliseconds to m:ss string */
const fmtMs = (ms) => {
  if (!ms || isNaN(ms) || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Normalize duration to milliseconds.
 * Server may return seconds (e.g. 45) or milliseconds (e.g. 45000).
 * Threshold of 3600 (1 hour in seconds): values above it are treated as ms.
 */
const normalizeToMs = (value) => {
  if (!value || isNaN(value) || value <= 0) return 0;
  return value > 3600 ? value : value * 1000;
};

/**
 * Safely parse a duration value to a number.
 * Returns 0 if the value is null, undefined, or NaN.
 */
const safeDuration = (value) => {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
};

/**
 * Detect media type from URL and item metadata.
 * Returns: 'image' | 'video' | 'audio' | 'file' | 'text' | 'unknown'
 */
const detectMediaType = (item) => {
  const fileUrl = item?.file_url || '';
  const fileType = item?.file_type || item?.mime_type || item?.type || '';
  const fileName = item?.file_name || '';
  const messageText = item?.content || item?.message || item?.text || item?.body;

  if (!fileUrl && messageText) return 'text';

  // Strip query params for extension matching
  const url = fileUrl.split('?')[0].toLowerCase();

  if (
    fileType.startsWith('audio/') ||
    item?.type === 'audio' ||
    /\.(mp3|wav|aac|ogg|m4a)$/.test(url) ||
    /\.(mp3|wav|aac|ogg|m4a)$/i.test(fileName)
  ) return 'audio';

  if (
    fileType.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(url)
  ) return 'image';

  if (
    fileType.startsWith('video/') ||
    /\.(mp4|mov|avi|mkv|webm)$/.test(url)
  ) return 'video';

  if (fileUrl) return 'file';

  return 'unknown';
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO PLAYER STYLES
// ─────────────────────────────────────────────────────────────────────────────
const audioPlayerStyles = {
  wrapper: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 220,
    maxWidth: 280,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#075E54',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  waveColumn: {
    flex: 1,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    gap: 2,
    paddingVertical: 2,
  },
  waveBar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  micBadge: {
    position: 'absolute',
    bottom: 24,
    left: 28,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  errorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 6,
    minWidth: 180,
  },
  errorText: {
    fontSize: 13,
    color: '#e53935',
    fontStyle: 'italic',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO PLAYER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AudioPlayer = ({
  fileUrl,
  ownMessage,
  messageTime,
  renderStatusFn,
  initialDuration = 0,
}) => {
  const {
    state,
    startPlayer,
    pausePlayer,
    resumePlayer,
    stopPlayer,
    seekToPlayer,
  } = useSound({ subscriptionDuration: 0.1 });

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Refs for values that must not trigger re-renders or cause stale closures
  const isPausedRef = useRef(false);
  const waveWidthRef = useRef(0);
  const mountedRef = useRef(true);
  const stopPlayerRef = useRef(stopPlayer);

  // Keep stopPlayerRef in sync with the latest stopPlayer reference
  useEffect(() => {
    stopPlayerRef.current = stopPlayer;
  }, [stopPlayer]);

  // Track mounted state to guard all async setState calls
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── DURATION MANAGEMENT ──────────────────────────────────────────────────
  const lastDurationRef = useRef(normalizeToMs(initialDuration));

  useEffect(() => {
    const normalized = normalizeToMs(initialDuration);
    if (normalized > 0) {
      lastDurationRef.current = normalized;
    }
  }, [initialDuration]);

  const rawDuration = state?.duration;
  const rawPosition = state?.currentPosition;

  useEffect(() => {
    if (typeof rawDuration === 'number' && rawDuration > 0) {
      const normalized = normalizeToMs(rawDuration);
      if (normalized > lastDurationRef.current) {
        lastDurationRef.current = normalized;
      }
    }
  }, [rawDuration]);

  const duration = useMemo(() => {
    if (lastDurationRef.current > 0) return lastDurationRef.current;
    if (typeof rawDuration === 'number' && rawDuration > 0) {
      return normalizeToMs(rawDuration);
    }
    return 0;
  }, [rawDuration]);

  const currentPosition = useMemo(() => {
    if (typeof rawPosition === 'number' && rawPosition > 0) {
      return normalizeToMs(rawPosition);
    }
    return 0;
  }, [rawPosition]);

  const progress =
    duration > 0 ? Math.min(currentPosition / duration, 1) : 0;

  const displayTime = useMemo(() => {
    if (hasStarted && currentPosition > 0) {
      return `${fmtMs(currentPosition)} / ${fmtMs(duration)}`;
    }
    return duration > 0 ? fmtMs(duration) : '0:00';
  }, [hasStarted, currentPosition, duration]);

  // ── PLAYBACK END DETECTION ───────────────────────────────────────────────
  // FIX: Separate the "trigger" flag from the "reset" to avoid same-cycle loop.
  const didAutoStopRef = useRef(false);

  useEffect(() => {
    const nearEnd =
      duration > 0 &&
      currentPosition > 0 &&
      currentPosition >= duration - 200; // within 200 ms of end

    if (isPlaying && nearEnd && !didAutoStopRef.current) {
      // Mark first so no re-entry occurs even if effect fires again
      // before setState flushes
      didAutoStopRef.current = true;

      stopPlayerRef.current().catch(() => {});

      if (mountedRef.current) {
        setIsPlaying(false);
        setHasStarted(false);
        isPausedRef.current = false;
        // Reset AFTER state updates are queued — not in the same synchronous block
        // This prevents the effect from seeing didAutoStopRef.current = false
        // while currentPosition is still >= duration - 200
        setTimeout(() => {
          didAutoStopRef.current = false;
        }, 0);
      }
    }
  }, [currentPosition, duration, isPlaying]);

  // ── CLEANUP ON UNMOUNT ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // Uses ref so this always calls the latest stopPlayer
      stopPlayerRef.current().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PLAY / PAUSE HANDLER ─────────────────────────────────────────────────
  const handlePlayPause = useCallback(async () => {
    if (!mountedRef.current) return;

    if (!isPlaying) {
      // ── RESUME from pause
      if (isPausedRef.current) {
        try {
          await resumePlayer();
          if (mountedRef.current) {
            setIsPlaying(true);
            isPausedRef.current = false;
          }
        } catch (e) {
          console.error('Resume error:', e);
        }
        return;
      }

      // ── FRESH PLAY or RESTART
      if (mountedRef.current) setIsBuffering(true);

      try {
        if (hasStarted) {
          // Restart: stop current playback before re-starting
          await stopPlayerRef.current();
          if (mountedRef.current) setHasStarted(false);
        }

        await startPlayer(fileUrl);

        if (mountedRef.current) {
          setHasStarted(true);
          setIsPlaying(true);
          setHasError(false);
          didAutoStopRef.current = false;
          isPausedRef.current = false;
        }
      } catch (e) {
        console.error('Play error:', e);
        if (mountedRef.current) setHasError(true);
      } finally {
        if (mountedRef.current) setIsBuffering(false);
      }
    } else {
      // ── PAUSE
      try {
        await pausePlayer();
        if (mountedRef.current) {
          setIsPlaying(false);
          isPausedRef.current = true;
        }
      } catch (e) {
        console.error('Pause error:', e);
      }
    }
  }, [isPlaying, hasStarted, fileUrl, startPlayer, resumePlayer, pausePlayer]);

  // ── SEEK ─────────────────────────────────────────────────────────────────
  const handleWaveformPress = useCallback(
    async (evt) => {
      if (waveWidthRef.current === 0 || duration === 0) return;
      const tapX = evt.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(tapX / waveWidthRef.current, 1));
      const seekMs = Math.floor(ratio * duration);
      try {
        await seekToPlayer(seekMs);
      } catch (e) {
        console.error('Seek error:', e);
      }
    },
    [duration, seekToPlayer],
  );

  // FIX: onLayout belongs on a View, not on the TouchableOpacity that also
  // handles press events — moved to a wrapping View around the waveform bars.
  const handleWaveformLayout = useCallback((e) => {
    waveWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  const activeBar = ownMessage ? '#075E54' : '#25D366';
  const inactiveBar = ownMessage
    ? 'rgba(7,94,84,0.25)'
    : 'rgba(37,211,102,0.25)';
  const timeColor = '#667781';

  // ── ERROR STATE ──────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <View style={audioPlayerStyles.errorWrapper}>
        <Icon name="error-outline" size={18} color="#e53935" />
        <Text style={audioPlayerStyles.errorText}>
          Audio file not available
        </Text>
      </View>
    );
  }

  // ── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <View style={audioPlayerStyles.wrapper}>
      <View style={audioPlayerStyles.row}>
        {/* Play / Pause button */}
        <TouchableOpacity
          onPress={handlePlayPause}
          style={audioPlayerStyles.playBtn}
          activeOpacity={0.8}
          disabled={isBuffering}
        >
          {isBuffering ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Icon
              name={isPlaying ? 'pause' : 'play-arrow'}
              size={24}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>

        {/* Waveform column */}
        <View style={audioPlayerStyles.waveColumn}>
          {/*
           * FIX: onLayout is now on the wrapping View so it captures the
           * column width correctly and doesn't conflict with touch events.
           * The TouchableOpacity inside handles seek presses only.
           */}
          <View onLayout={handleWaveformLayout}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleWaveformPress}
              style={audioPlayerStyles.waveform}
            >
              {WAVEFORM.map((barH, i) => {
                const barProgress = (i + 1) / WAVEFORM.length;
                const played = barProgress <= progress;
                return (
                  <View
                    key={i}
                    style={[
                      audioPlayerStyles.waveBar,
                      {
                        height: barH,
                        backgroundColor: played ? activeBar : inactiveBar,
                      },
                    ]}
                  />
                );
              })}
            </TouchableOpacity>
          </View>

          {/* Footer: playback time + message time + delivery status */}
          <View style={audioPlayerStyles.footer}>
            <Text style={[audioPlayerStyles.timeText, { color: timeColor }]}>
              {displayTime}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={styles.messageTime}>{messageTime}</Text>
              {renderStatusFn?.()}
            </View>
          </View>
        </View>

        {/* Voice message mic badge */}
        <View style={audioPlayerStyles.micBadge}>
          <Icon name="mic" size={11} color="#fff" />
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE ITEM
// ─────────────────────────────────────────────────────────────────────────────
const MessageItem = React.memo(
  ({
    item,
    ownMessage,
    guestMsg,
    messageTime,
    isImageLoading,
    isImageError: imageErrorProp,
    isDownloading,
    downloadProgress,
    onLongPress,
    onImagePress,
    onVideoPress,
    onFilePress,
    onDownloadPress,
    onImageLoadStart,
    onImageLoadEnd,
    onImageError,
  }) => {
    const [localImageLoading, setLocalImageLoading] = useState(false);
    const [localImageError, setLocalImageError] = useState(false);

    // ── GUARD: Must come AFTER all hook calls (Rules of Hooks) ───────────
    // All useState calls are above; this early return is now safe.
    if (!item) return null;

    const fileUrl = item.file_url;
    const messageText =
      item.content || item.message || item.text || item.body || '';

    // ── Detect type once ─────────────────────────────────────────────────
    const mediaType = detectMediaType(item);

    // ── Shared bubble style ──────────────────────────────────────────────
    const bubbleStyle = [
      styles.messageContainer,
      ownMessage
        ? styles.currentUserMessageContainer
        : styles.otherUserMessageContainer,
      guestMsg && styles.guestMessageContainer,
    ];

    // ── Read status icon ─────────────────────────────────────────────────
    const renderStatus = () => {
      if (!ownMessage) return null;
      const isRead = item.status === 'read' || !!item.read_at;
      return (
        <Icon
          name="done-all"
          size={14}
          color={isRead ? '#53BDEB' : '#667781'}
          style={styles.messageStatus}
        />
      );
    };

    // ── Message footer (time + edited badge + status) ────────────────────
    const renderFooter = () => (
      <View style={styles.messageFooter}>
        {!!item.is_edited && (
          <Text
            style={[
              editedTextBaseStyle,
              // Only color varies per bubble type — avoids full inline object
              { color: ownMessage ? 'rgba(0,0,0,0.5)' : '#888' },
            ]}
          >
            Edited
          </Text>
        )}
        <Text style={styles.messageTime}>{messageTime}</Text>
        {renderStatus()}
      </View>
    );

    // ── Reply preview ────────────────────────────────────────────────────
    const renderReplyBanner = () => {
      if (!item.reply_to) return null;

      const senderName =
        item.reply_to?.sender?.name ||
        item.reply_to?.sender?.username ||
        (item.reply_to?.user_id === item.user_id ? 'You' : 'Contact');

      return (
        <ReplyBanner
          message={item.reply_to}
          senderName={senderName}
          showClose={false}
          compact
          ownMessage={ownMessage}
        />
      );
    };

    // ── Safe file open (with error handling) ─────────────────────────────
    const handleOpenFile = async () => {
      try {
        if (onFilePress) {
          onFilePress();
        } else {
          const supported = await Linking.canOpenURL(fileUrl);
          if (supported) {
            await Linking.openURL(fileUrl);
          } else {
            console.warn('Cannot open URL:', fileUrl);
          }
        }
      } catch (e) {
        console.error('Failed to open file URL:', e);
      }
    };

    // ════════════════════════════════════════════════════════════════════
    // TEXT MESSAGE
    // ════════════════════════════════════════════════════════════════════
    if (mediaType === 'text') {
      return (
        <TouchableOpacity
          onLongPress={onLongPress}
          delayLongPress={LONG_PRESS_DELAY}
          activeOpacity={0.85}
          style={bubbleStyle}
        >
          {renderReplyBanner()}
          <Text
            style={
              ownMessage
                ? styles.currentUserMessageText
                : styles.otherUserMessageText
            }
          >
            {messageText}
          </Text>
          {renderFooter()}
        </TouchableOpacity>
      );
    }

    // ════════════════════════════════════════════════════════════════════
    // IMAGE MESSAGE
    // ════════════════════════════════════════════════════════════════════
    if (mediaType === 'image') {
      const showError = imageErrorProp || localImageError;
      const showLoader = (localImageLoading || isImageLoading) && !showError;

      return (
        <TouchableOpacity
          onLongPress={onLongPress}
          onPress={() => onImagePress?.()}
          activeOpacity={0.9}
          delayLongPress={LONG_PRESS_DELAY}
          style={{ alignSelf: ownMessage ? 'flex-end' : 'flex-start' }}
        >
          <View style={styles.imageWrapper}>
            {showLoader && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}

            {showError ? (
              <View style={styles.fileErrorContainer}>
                <Icon name="broken-image" size={32} color="#999" />
                <Text style={styles.fileErrorText}>Image not available</Text>
              </View>
            ) : (
              <Image
                source={{ uri: fileUrl }}
                style={styles.chatImage}
                resizeMode="cover"
                onLoadStart={() => {
                  setLocalImageLoading(true);
                  onImageLoadStart?.();
                }}
                onLoadEnd={() => {
                  setLocalImageLoading(false);
                  onImageLoadEnd?.();
                }}
                onError={() => {
                  setLocalImageLoading(false);
                  setLocalImageError(true);
                  onImageError?.();
                }}
              />
            )}

            {isDownloading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.uploadText}>
                  {downloadProgress || 0}%
                </Text>
                {downloadProgress > 0 && (
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${downloadProgress}%` },
                      ]}
                    />
                  </View>
                )}
              </View>
            )}

            <View style={styles.imageFooter}>
              <Text style={styles.imageTime}>{messageTime}</Text>
              {renderStatus()}
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // ════════════════════════════════════════════════════════════════════
    // VIDEO MESSAGE
    // ════════════════════════════════════════════════════════════════════
    if (mediaType === 'video') {
      return (
        <TouchableOpacity
          onLongPress={onLongPress}
          onPress={() => onVideoPress?.()}
          activeOpacity={0.9}
          delayLongPress={LONG_PRESS_DELAY}
        >
          <View style={bubbleStyle}>
            <View style={styles.videoContainer}>
              <Icon
                name="play-circle-filled"
                size={48}
                color="rgba(255,255,255,0.9)"
              />
              {item.file_name ? (
                <Text style={videoFileNameStyle} numberOfLines={1}>
                  {item.file_name}
                </Text>
              ) : null}
            </View>
            {renderFooter()}
          </View>
        </TouchableOpacity>
      );
    }

    // ════════════════════════════════════════════════════════════════════
    // AUDIO / VOICE MESSAGE
    // ════════════════════════════════════════════════════════════════════
    if (mediaType === 'audio') {
      return (
        <TouchableOpacity
          onLongPress={onLongPress}
          activeOpacity={0.85}  // FIX: was 1 (invisible feedback)
          delayLongPress={LONG_PRESS_DELAY}
        >
          <View style={bubbleStyle}>
            <AudioPlayer
              fileUrl={fileUrl}
              ownMessage={ownMessage}
              messageTime={messageTime}
              renderStatusFn={renderStatus}
              initialDuration={safeDuration(
                item.duration ?? item.audio_duration ?? 0
              )}
            />
          </View>
        </TouchableOpacity>
      );
    }

    // ════════════════════════════════════════════════════════════════════
    // FILE MESSAGE (PDF / DOC / ZIP etc.)
    // FIX: Removed nested TouchableOpacity for download button.
    // Download action is now triggered via a plain pressable View with
    // hitSlop, which avoids broken touch propagation on Android.
    // ════════════════════════════════════════════════════════════════════
    if (mediaType === 'file') {
      return (
        <TouchableOpacity
          onLongPress={onLongPress}
          onPress={handleOpenFile}
          activeOpacity={0.85}
          delayLongPress={LONG_PRESS_DELAY}
        >
          <View style={bubbleStyle}>
            <View style={styles.fileMessageContainer}>
              <Icon name="insert-drive-file" size={28} color="#075E54" />
              <Text style={styles.fileMessageName} numberOfLines={2}>
                {item.file_name || 'Open File'}
              </Text>
              {/*
               * FIX: Use a plain View with onStartShouldSetResponder instead
               * of a nested TouchableOpacity to avoid Android touch conflicts.
               */}
              <View
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onStartShouldSetResponder={() => true}
                onResponderGrant={onDownloadPress}
              >
                <Icon name="download" size={22} color="#075E54" />
              </View>
            </View>
            {renderFooter()}
          </View>
        </TouchableOpacity>
      );
    }

    // ════════════════════════════════════════════════════════════════════
    // FALLBACK — unsupported type
    // ════════════════════════════════════════════════════════════════════
    return (
      <View style={bubbleStyle}>
        <Text style={styles.messageText}>
          {messageText || 'Unsupported message'}
        </Text>
        {renderFooter()}
      </View>
    );
  },
);

// Set display name for easier identification in React DevTools
MessageItem.displayName = 'MessageItem';

export default MessageItem;