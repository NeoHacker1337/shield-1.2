// ╔══════════════════════════════════════════════════════════════╗
// ║  FILE: src/screens/chatSystem/MessageItem.js                 ║
// ╚══════════════════════════════════════════════════════════════╝

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
// FIXME: Replace with your actual audio library
import { useSound } from 'react-native-nitro-sound';
import styles from '../../assets/ChatScreenStyles';

// ─────────────────────────────────────────────────────────────────────────────
// WAVEFORM BARS — 30 bars with varying heights (WhatsApp-style visual)
// ─────────────────────────────────────────────────────────────────────────────
const WAVEFORM = [
  10, 16, 22, 14, 28, 18, 32, 20, 14, 26,
  30, 16, 22, 28, 12, 24, 32, 18, 10, 24,
  28, 14, 20, 32, 16, 22, 26, 12, 20, 16,
];

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
//
// CRITICAL FIXES:
// 1. Properly persists duration from async library metadata
// 2. Handles unit conversion (library may return ms or seconds)
// 3. Syncs ref when initialDuration prop updates
// 4. Robust play/pause logic for replay scenarios
// 5. Shows "0:00" instead of "--:--" when duration is truly unknown
// ─────────────────────────────────────────────────────────────────────────────
const AudioPlayer = ({
  fileUrl,
  ownMessage,
  messageTime,
  renderStatusFn,
  initialDuration = 0, // seconds from server
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

  const waveWidth = useRef(0);

  // Convert initialDuration (seconds) to milliseconds
  const lastDurationRef = useRef(initialDuration > 0 ? initialDuration * 1000 : 0);

  // CRITICAL: Sync ref when initialDuration changes (e.g., message updates)
  useEffect(() => {
    if (initialDuration > 0) {
      lastDurationRef.current = initialDuration * 1000;
    }
  }, [initialDuration]);

  // ── SAFE STATE EXTRACTION ────────────────────────────────────────────────
  const rawDuration = state?.duration; // Library may return ms or seconds
  const rawPosition = state?.currentPosition;

  // CRITICAL: Persist valid duration with unit normalization
  useEffect(() => {
    if (typeof rawDuration === 'number' && rawDuration > 0) {
      // Normalize to milliseconds (assume < 1000 is seconds)
      const normalizedDuration = rawDuration < 1000 ? rawDuration * 1000 : rawDuration;
      lastDurationRef.current = normalizedDuration;
    }
  }, [rawDuration]);

  // Calculate final duration (prioritize persisted value)
  const duration = (() => {
    if (lastDurationRef.current > 0) return lastDurationRef.current;
    if (typeof rawDuration === 'number' && rawDuration > 0) {
      return rawDuration < 1000 ? rawDuration * 1000 : rawDuration;
    }
    return 0;
  })();

  const currentPosition = (() => {
    if (typeof rawPosition === 'number' && rawPosition > 0) {
      return rawPosition < 1000 ? rawPosition * 1000 : rawPosition;
    }
    return 0;
  })();

  const progress = duration > 0 ? Math.min(currentPosition / duration, 1) : 0;

  // ── FORMAT HELPER ────────────────────────────────────────────────────────
  const fmt = (ms) => {
    if (!ms || isNaN(ms) || ms <= 0) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── TIMER DISPLAY LOGIC ────────────────────────────────────────────────
  const displayTime =
    hasStarted && currentPosition > 0
      ? `${fmt(currentPosition)} / ${fmt(duration)}`
      : duration > 0
      ? fmt(duration)
      : '0:00'; // Changed from '--:--' to show 0:00 when unknown

  // ── DETECT PLAYBACK ENDED ────────────────────────────────────────────────
  useEffect(() => {
    if (
      isPlaying &&
      duration > 0 &&
      currentPosition > 0 &&
      currentPosition >= duration * 0.99 // Changed to 99% threshold
    ) {
      setIsPlaying(false);
      stopPlayer().catch(() => {});
    }
  }, [currentPosition, duration, isPlaying]);

  // ── CLEANUP ON UNMOUNT ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopPlayer().catch(() => {});
      setHasStarted(false);
      setIsPlaying(false);
    };
  }, [stopPlayer]);

  // ── PLAY / PAUSE HANDLER ────────────────────────────────────────────────
  const handlePlayPause = useCallback(async () => {
    if (!isPlaying) {
      // Resume from pause
      if (hasStarted && currentPosition > 0 && currentPosition < duration) {
        try {
          await resumePlayer();
          setIsPlaying(true);
        } catch (e) {
          console.error('Resume error:', e);
        }
      } else {
        // First play or restart after completion
        setIsBuffering(true);
        try {
          // Reset if restarting
          if (hasStarted) {
            await stopPlayer();
          }
          await startPlayer(fileUrl);
          setHasStarted(true);
          setIsPlaying(true);
        } catch (e) {
          console.error('Play error:', e);
          setHasError(true);
        } finally {
          setIsBuffering(false);
        }
      }
    } else {
      // Pause
      try {
        await pausePlayer();
        setIsPlaying(false);
      } catch (e) {
        console.error('Pause error:', e);
      }
    }
  }, [
    isPlaying,
    hasStarted,
    currentPosition,
    duration,
    fileUrl,
    startPlayer,
    resumePlayer,
    pausePlayer,
    stopPlayer,
  ]);

  // ── SEEK BY TAPPING WAVEFORM ────────────────────────────────────────────
  const handleWaveformPress = useCallback(
    async (evt) => {
      if (waveWidth.current === 0 || duration === 0) return;
      const tapX = evt.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(tapX / waveWidth.current, 1));
      const seekMs = Math.floor(ratio * duration);
      try {
        await seekToPlayer(seekMs);
      } catch (e) {
        console.error('Seek error:', e);
      }
    },
    [duration, seekToPlayer]
  );

  const activeBar = ownMessage ? '#075E54' : '#25D366';
  const inactiveBar = ownMessage ? 'rgba(7,94,84,0.25)' : 'rgba(37,211,102,0.25)';
  const timeColor = '#667781';

  // ── ERROR STATE ──────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <View style={audioPlayerStyles.errorWrapper}>
        <Icon name="error-outline" size={18} color="#e53935" />
        <Text style={audioPlayerStyles.errorText}>File no longer exists</Text>
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

        {/* Waveform + progress track */}
        <View style={audioPlayerStyles.waveColumn}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleWaveformPress}
            onLayout={(e) => {
              waveWidth.current = e.nativeEvent.layout.width;
            }}
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

          {/* Time + message footer */}
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

        {/* Mic badge */}
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
    isImageError: imageError,
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    if (!item) return null;

    const messageText = item.content || item.message || item.text || item.body;
    const fileUrl = item.file_url;

    const bubbleStyle = [
      styles.messageContainer,
      ownMessage
        ? styles.currentUserMessageContainer
        : styles.otherUserMessageContainer,
      guestMsg && styles.guestMessageContainer,
    ];

    const tailStyle = ownMessage
      ? styles.currentUserMessageTail
      : styles.otherUserMessageTail;

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

    const renderFooter = () => (
      <View style={styles.messageFooter}>
        <Text style={styles.messageTime}>{messageTime}</Text>
        {renderStatus()}
      </View>
    );

    // ── TEXT ────────────────────────────────────────────────────────────────
    if (messageText && !fileUrl) {
      return (
        <TouchableOpacity
          onLongPress={onLongPress}
          activeOpacity={0.85}
          delayLongPress={300}
        >
          <View style={bubbleStyle}>
            <View style={[styles.messageTail, tailStyle]} />
            <Text style={styles.messageText}>{messageText}</Text>
            {renderFooter()}
          </View>
        </TouchableOpacity>
      );
    }

    // ── IMAGE ────────────────────────────────────────────────────────────────
    if (fileUrl && fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return (
        <TouchableOpacity
          onLongPress={onLongPress}
          onPress={() => onImagePress?.(fileUrl)}
          activeOpacity={0.9}
          delayLongPress={300}
          style={{ alignSelf: ownMessage ? 'flex-end' : 'flex-start' }}
        >
          <View style={styles.imageWrapper}>
            {(loading || isImageLoading) && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            {imageError || error ? (
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
                  setLoading(true);
                  onImageLoadStart?.();
                }}
                onLoadEnd={() => {
                  setLoading(false);
                  onImageLoadEnd?.();
                }}
                onError={() => {
                  setLoading(false);
                  setError(true);
                  onImageError?.();
                }}
              />
            )}
            {isDownloading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.uploadText}>{downloadProgress || 0}%</Text>
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

    // ── VIDEO ────────────────────────────────────────────────────────────────
    if (fileUrl && fileUrl.match(/\.(mp4|mov|avi|mkv)$/i)) {
      return (
        <TouchableOpacity
          onLongPress={onLongPress}
          onPress={() => onVideoPress?.(fileUrl)}
          activeOpacity={0.9}
          delayLongPress={300}
        >
          <View style={bubbleStyle}>
            <View style={styles.videoContainer}>
              <Icon
                name="play-circle-filled"
                size={48}
                color="rgba(255,255,255,0.9)"
              />
            </View>
            {renderFooter()}
          </View>
        </TouchableOpacity>
      );
    }

    // ── AUDIO (Voice message) ────────────────────────────────────────────────
    if (
      (fileUrl && fileUrl.match(/\.(mp3|wav|aac|ogg|m4a)$/i)) ||
      (item.type && item.type.startsWith('audio/')) ||
      item.type === 'audio' ||
      (item.file_type && item.file_type.startsWith('audio/')) ||
      (item.file_name && item.file_name.match(/\.(mp3|wav|aac|ogg|m4a)$/i))
    ) {
      return (
        <TouchableOpacity
          onLongPress={onLongPress}
          activeOpacity={1}
          delayLongPress={300}
        >
          <View style={bubbleStyle}>
            <View style={[styles.messageTail, tailStyle]} />
            <AudioPlayer
              fileUrl={fileUrl}
              ownMessage={ownMessage}
              messageTime={messageTime}
              renderStatusFn={renderStatus}
              initialDuration={Number(item.duration || item.audio_duration || 0)}
            />
          </View>
        </TouchableOpacity>
      );
    }

    // ── FILE (PDF / DOC / ZIP) ───────────────────────────────────────────────
    if (fileUrl) {
      return (
        <TouchableOpacity
          onLongPress={onLongPress}
          onPress={() =>
            onFilePress ? onFilePress() : Linking.openURL(fileUrl)
          }
          activeOpacity={0.85}
          delayLongPress={300}
        >
          <View style={bubbleStyle}>
            <View style={styles.fileMessageContainer}>
              <Icon name="insert-drive-file" size={28} color="#075E54" />
              <Text style={styles.fileMessageName} numberOfLines={2}>
                {item.file_name || 'Open File'}
              </Text>
              <TouchableOpacity onPress={onDownloadPress}>
                <Icon name="download" size={22} color="#075E54" />
              </TouchableOpacity>
            </View>
            {renderFooter()}
          </View>
        </TouchableOpacity>
      );
    }

    // ── FALLBACK ─────────────────────────────────────────────────────────────
    return (
      <View style={bubbleStyle}>
        <Text style={styles.messageText}>Unsupported message</Text>
        {renderFooter()}
      </View>
    );
  }
);

export default MessageItem;