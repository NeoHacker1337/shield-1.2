import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import styles from '../../assets/ChatScreenStyles';

const MessageItem = React.memo(({ item, isCurrentUser, onImagePress }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!item) return null;

  // ✅ AUTO DETECT DATA
  const messageText =
    item.content || item.message || item.text || item.body;

  const fileUrl = item.file_url;

  // =========================
  // 🔹 TEXT MESSAGE
  // =========================
  if (messageText && !fileUrl) {
    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser
            ? styles.currentUserMessageContainer
            : styles.otherUserMessageContainer,
        ]}
      >
        <Text style={styles.messageText}>{messageText}</Text>
      </View>
    );
  }

  // =========================
  // 🔹 IMAGE MESSAGE
  // =========================
  if (fileUrl && fileUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser
            ? styles.currentUserMessageContainer
            : styles.otherUserMessageContainer,
        ]}
      >
        <TouchableOpacity
          onPress={() => onImagePress?.(fileUrl)}
          activeOpacity={0.9}
        >
          {loading && (
            <View style={styles.loader}>
              <ActivityIndicator color="#fff" />
            </View>
          )}

          {error ? (
            <View style={styles.fileErrorContainer}>
              <Icon name="broken-image" size={40} color="#999" />
              <Text style={styles.fileErrorText}>Image not available</Text>
            </View>
          ) : (
            <Image
              source={{ uri: fileUrl }}
              style={styles.chatImage}
              resizeMode="cover"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // =========================
  // 🔹 VIDEO MESSAGE
  // =========================
  if (fileUrl && fileUrl.match(/\.(mp4|mov|avi)$/i)) {
    return (
      <View style={styles.videoContainer}>
        <Video
          source={{ uri: fileUrl }}
          style={styles.video}
          controls
          resizeMode="cover"
        />
      </View>
    );
  }

  // =========================
  // 🔹 AUDIO MESSAGE
  // =========================
  if (fileUrl && fileUrl.match(/\.(mp3|wav|aac)$/i)) {
    return (
      <TouchableOpacity
        style={styles.audioContainer}
        onPress={() => Linking.openURL(fileUrl)}
      >
        <Icon name="play-arrow" size={30} color="#fff" />
        <Text style={styles.audioText}>Play Audio</Text>
      </TouchableOpacity>
    );
  }

  // =========================
  // 🔹 FILE MESSAGE (PDF/DOC/etc.)
  // =========================
  if (fileUrl) {
    return (
      <TouchableOpacity
        style={styles.fileContainer}
        onPress={() => Linking.openURL(fileUrl)}
      >
        <Icon name="insert-drive-file" size={30} color="#fff" />
        <Text style={styles.fileName} numberOfLines={1}>
          {item.file_name || 'Open File'}
        </Text>
      </TouchableOpacity>
    );
  }

  // =========================
  // 🔹 FALLBACK
  // =========================
  return (
    <View style={styles.fileErrorContainer}>
      <Icon name="error-outline" size={30} color="red" />
      <Text>Unsupported message</Text>
    </View>
  );
});

export default MessageItem;