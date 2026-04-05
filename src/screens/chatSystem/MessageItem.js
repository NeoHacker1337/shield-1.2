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
// AUDIO PLAYER STYLES — defined BEFORE AudioPlayer to avoid ReferenceError
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
// FIXES APPLIED:
//   1. Removed broken preload useEffect (caused infinite loop + stale closure
//      + false "file not found" errors on valid files)
//   2. Removed localDuration state (preload remnant)
//   3. Added initialDuration prop — pass item.duration (seconds from server)
//      so timer shows before first play
//   4. rawDuration/rawPosition use > 0 guard instead of || to handle -1
//      returned by Android MediaPlayer when metadata is missing
//   5. lastDurationRef persists duration across stop/reset cycles
//   6. Styles defined before component (no ReferenceError)
// ─────────────────────────────────────────────────────────────────────────────
const AudioPlayer = ({
  fileUrl,
  ownMessage,
  messageTime,
  renderStatusFn,
  initialDuration = 0,   // seconds from server (item.duration)
}) => {
  const {
    state,
    startPlayer,
    pausePlayer,
    resumePlayer,
    stopPlayer,
    seekToPlayer,
  } = useSound({ subscriptionDuration: 0.1 }); // 100 ms position updates

  const [isPlaying,   setIsPlaying]   = useState(false);
  const [hasStarted,  setHasStarted]  = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError,    setHasError]    = useState(false);

  const waveWidth = useRef(0);

  // initialDuration from server is in seconds → convert to ms once at mount
  const lastDurationRef = useRef(initialDuration > 0 ? initialDuration * 1000 : 0);

  // Safe state extraction — treat -1 (Android MediaPlayer unknown) same as 0
  const rawDuration    = (state?.duration        > 0) ? state.duration        : 0;
  const rawPosition    = (state?.currentPosition > 0) ? state.currentPosition : 0;

  // Persist the best duration we have ever seen (survives stop/reset)
  if (rawDuration > 0) {
    lastDurationRef.current = rawDuration;
  }

  const duration        = lastDurationRef.current || rawDuration;
  const currentPosition = rawPosition;
  const progress        = duration > 0 ? Math.min(currentPosition / duration, 1) : 0;

  // Format ms → m:ss
  const fmt = (ms) => {
    if (!ms || ms <= 0) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Timer display logic
  const displayTime =
    hasStarted && currentPosition > 0
      ? `${fmt(currentPosition)} / ${fmt(duration)}`  // "0:05 / 0:23" while playing
      : duration > 0
        ? fmt(duration)                                // "0:23" idle/ended
        : '--:--';                                     // unknown before first play

  // ── Detect playback ended ───────────────────────────────────────────────
  useEffect(() => {
    if (
      isPlaying &&
      duration > 0 &&
      currentPosition > 0 &&
      currentPosition >= duration - 400   // 400 ms buffer
    ) {
      setIsPlaying(false);
      stopPlayer().catch(() => {});
    }
  }, [currentPosition, duration, isPlaying]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopPlayer().catch(() => {});
    };
  }, []);

  // ── Play / Pause handler ────────────────────────────────────────────────
  const handlePlayPause = useCallback(async () => {
    if (!isPlaying) {
      if (!hasStarted || currentPosition <= 0) {
        // First play OR replay after audio ended
        setIsBuffering(true);
        try {
          await startPlayer(fileUrl);
          setHasStarted(true);
          setIsPlaying(true);
        } catch (e) {
          console.error('Play error:', e);
          setHasError(true);
        } finally {
          setIsBuffering(false);
        }
      } else {
        // Resume from pause — no loader needed
        try {
          await resumePlayer();
          setIsPlaying(true);
        } catch (e) {
          console.error('Resume error:', e);
        }
      }
    } else {
      try {
        await pausePlayer();
        setIsPlaying(false);
      } catch (e) {
        console.error('Pause error:', e);
      }
    }
  }, [isPlaying, hasStarted, currentPosition, fileUrl, startPlayer, resumePlayer, pausePlayer]);

  // ── Seek by tapping waveform ────────────────────────────────────────────
  const handleWaveformPress = useCallback(async (evt) => {
    if (waveWidth.current === 0 || duration === 0) return;
    const tapX   = evt.nativeEvent.locationX;
    const ratio  = Math.max(0, Math.min(tapX / waveWidth.current, 1));
    const seekMs = Math.floor(ratio * duration);
    try {
      await seekToPlayer(seekMs);
    } catch (e) {
      console.error('Seek error:', e);
    }
  }, [duration, seekToPlayer]);

  const activeBar   = ownMessage ? '#075E54' : '#25D366';
  const inactiveBar = ownMessage ? 'rgba(7,94,84,0.25)' : 'rgba(37,211,102,0.25)';
  const timeColor   = '#667781';

  // ── Error state ─────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <View style={audioPlayerStyles.errorWrapper}>
        <Icon name="error-outline" size={18} color="#e53935" />
        <Text style={audioPlayerStyles.errorText}>File no longer exists</Text>
      </View>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
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
            onLayout={(e) => { waveWidth.current = e.nativeEvent.layout.width; }}
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
const MessageItem = React.memo(({
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
  const [error,   setError]   = useState(false);

  if (!item) return null;

  const messageText = item.content || item.message || item.text || item.body;
  const fileUrl     = item.file_url;

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
      <TouchableOpacity onLongPress={onLongPress} activeOpacity={0.85} delayLongPress={300}>
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
              onLoadStart={() => { setLoading(true);  onImageLoadStart?.(); }}
              onLoadEnd={()   => { setLoading(false); onImageLoadEnd?.();   }}
              onError={()     => { setLoading(false); setError(true); onImageError?.(); }}
            />
          )}
          {isDownloading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.uploadText}>{downloadProgress || 0}%</Text>
              {downloadProgress > 0 && (
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
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
            <Icon name="play-circle-filled" size={48} color="rgba(255,255,255,0.9)" />
          </View>
          {renderFooter()}
        </View>
      </TouchableOpacity>
    );
  }

  // ── AUDIO (Voice message) ────────────────────────────────────────────────
  if (
    (fileUrl && fileUrl.match(/\.(mp3|wav|aac|ogg|m4a)$/i)) ||
    (item.type      && item.type.startsWith('audio/'))      ||
    item.type === 'audio'                                    ||
    (item.file_type && item.file_type.startsWith('audio/')) ||
    (item.file_name && item.file_name.match(/\.(mp3|wav|aac|ogg|m4a)$/i))
  ) {
    return (
      <TouchableOpacity onLongPress={onLongPress} activeOpacity={1} delayLongPress={300}>
        <View style={bubbleStyle}>
          <View style={[styles.messageTail, tailStyle]} />
          <AudioPlayer
            fileUrl={fileUrl}
            ownMessage={ownMessage}
            messageTime={messageTime}
            renderStatusFn={renderStatus}
            // item.duration = seconds stored by server when recording is uploaded
            // Without this, timer shows '--:--' until user presses play (acceptable)
            initialDuration={item.duration || item.audio_duration || 0}
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
        onPress={() => onFilePress ? onFilePress() : Linking.openURL(fileUrl)}
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
});

export default MessageItem;