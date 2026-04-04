import { useState, useCallback } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';

const useImageViewer = () => {
  // ── Full-screen image viewer state ────────────────────────────
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // ── Per-message image load tracking ──────────────────────────
  const [imageErrorIds, setImageErrorIds] = useState(new Set());
  const [imageLoadingIds, setImageLoadingIds] = useState(new Set());

  // ── Download state ────────────────────────────────────────────
  const [downloadingIds, setDownloadingIds] = useState(new Set());
  const [downloadProgress, setDownloadProgress] = useState({});

  // ── Open full-screen image viewer ─────────────────────────────
  const openImage = useCallback((uri) => {
    if (!uri) return;
    setSelectedImage(uri);
  }, []);

  // ── Close full-screen image viewer ────────────────────────────
  const closeImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // ── Open full-screen video viewer ─────────────────────────────
  const openVideo = useCallback((uri) => {
    if (!uri) return;
    setSelectedVideo(uri);
  }, []);

  // ── Close full-screen video viewer ────────────────────────────
  const closeVideo = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  // ── Open file with device default app ─────────────────────────
  const openFile = useCallback(async (fileUrl, fileName) => {
    if (!fileUrl) return;
    try {
      setSelectedFile({ url: fileUrl, name: fileName });

      const localPath = `${RNFS.CachesDirectoryPath}/${fileName || 'file'}`;
      const exists = await RNFS.exists(localPath);

      if (!exists) {
        await RNFS.downloadFile({
          fromUrl: fileUrl,
          toFile: localPath,
        }).promise;
      }

      await FileViewer.open(localPath, { showOpenWithDialog: true });
    } catch (error) {
      console.log('File open error:', error);
      Alert.alert('Error', 'Could not open this file.');
    } finally {
      setSelectedFile(null);
    }
  }, []);

  // ── Image load start (show spinner) ───────────────────────────
  const onImageLoadStart = useCallback((id) => {
    setImageLoadingIds((prev) => new Set(prev).add(id));
  }, []);

  // ── Image load end (hide spinner) ─────────────────────────────
  const onImageLoadEnd = useCallback((id) => {
    setImageLoadingIds((prev) => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
  }, []);

  // ── Image load error (show fallback) ──────────────────────────
  const onImageError = useCallback((id) => {
    // Remove from loading set first
    setImageLoadingIds((prev) => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
    // Mark as errored to show fallback UI
    setImageErrorIds((prev) => new Set(prev).add(id));
  }, []);

  // ── Request storage permission (Android) ──────────────────────
  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      // Android 13+ uses granular media permissions
      if (Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }

      // Android 12 and below
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.log('Permission request error:', error);
      return false;
    }
  };

  // ── Download image / file to device storage ───────────────────
  const downloadFile = useCallback(async (fileUrl, fileName, messageId) => {
    if (!fileUrl || !messageId) return;

    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Storage permission is required to download files.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return;
    }

    // Mark this message as downloading
    setDownloadingIds((prev) => new Set(prev).add(messageId));
    setDownloadProgress((prev) => ({ ...prev, [messageId]: 0 }));

    try {
      const cleanFileName = fileName || `download_${Date.now()}`;

      // iOS → DocumentDirectory, Android → DownloadDirectoryPath
      const downloadDir =
        Platform.OS === 'ios'
          ? RNFS.DocumentDirectoryPath
          : RNFS.DownloadDirectoryPath;

      const destPath = `${downloadDir}/${cleanFileName}`;

      const downloadResult = RNFS.downloadFile({
        fromUrl: fileUrl,
        toFile: destPath,
        progress: (res) => {
          const percent = Math.round((res.bytesWritten / res.contentLength) * 100);
          setDownloadProgress((prev) => ({ ...prev, [messageId]: percent }));
        },
      });

      const result = await downloadResult.promise;

      if (result.statusCode === 200) {
        Alert.alert('Downloaded', `"${cleanFileName}" saved to your downloads.`);
      } else {
        throw new Error(`Download failed with status ${result.statusCode}`);
      }
    } catch (error) {
      console.log('Download error:', error);
      Alert.alert('Download Failed', 'Could not download the file. Please try again.');
    } finally {
      // Always clean up downloading state
      setDownloadingIds((prev) => {
        const updated = new Set(prev);
        updated.delete(messageId);
        return updated;
      });
      setDownloadProgress((prev) => {
        const updated = { ...prev };
        delete updated[messageId];
        return updated;
      });
    }
  }, []);

  // ── Check if a message image is loading ───────────────────────
  const isImageLoading = useCallback(
    (id) => imageLoadingIds.has(id),
    [imageLoadingIds]
  );

  // ── Check if a message image has errored ──────────────────────
  const isImageError = useCallback(
    (id) => imageErrorIds.has(id),
    [imageErrorIds]
  );

  // ── Check if a file is downloading ────────────────────────────
  const isDownloading = useCallback(
    (id) => downloadingIds.has(id),
    [downloadingIds]
  );

  // ── Get download progress for a message ───────────────────────
  const getDownloadProgress = useCallback(
    (id) => downloadProgress[id] ?? 0,
    [downloadProgress]
  );

  return {
    // Viewer state
    selectedImage,
    selectedVideo,
    selectedFile,

    // Image tracking
    imageErrorIds,
    imageLoadingIds,

    // Download state
    downloadingIds,
    downloadProgress,

    // Image viewer actions
    openImage,
    closeImage,

    // Video viewer actions
    openVideo,
    closeVideo,

    // File viewer actions
    openFile,

    // Image load event handlers
    onImageLoadStart,
    onImageLoadEnd,
    onImageError,

    // Download action
    downloadFile,

    // Helper checkers
    isImageLoading,
    isImageError,
    isDownloading,
    getDownloadProgress,
  };
};

export default useImageViewer;