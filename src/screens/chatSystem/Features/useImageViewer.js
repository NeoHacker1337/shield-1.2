// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/Features/useImageViewer.js     ║
// ╚══════════════════════════════════════════════════════════════╝

import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';

// ─────────────────────────────────────────────────────────────────
// HELPERS — module level, never recreated
// ─────────────────────────────────────────────────────────────────

/**
 * Sanitizes a file name to prevent path traversal attacks
 * and ensure safe filesystem usage.
 *
 * Removes: directory separators, null bytes, leading dots
 * e.g. "../../etc/passwd" → "etc_passwd"
 *      "file/name.pdf"    → "file_name.pdf"
 *
 * @param {string} fileName
 * @returns {string}
 */
const sanitizeFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    return `file_${Date.now()}`;
  }

  return fileName
    .replace(/[/\\]/g, '_')       // replace path separators
    .replace(/\.\./g, '_')        // remove path traversal sequences
    .replace(/[\x00-\x1f]/g, '')  // remove control characters
    .replace(/^\.+/, '')          // remove leading dots
    .trim() || `file_${Date.now()}`;
};

/**
 * Detects the media type from a file name or URL.
 * Used to request the correct Android 13+ permission.
 *
 * @param {string} fileName
 * @param {string} fileUrl
 * @returns {'image'|'video'|'audio'|'file'}
 */
const detectFileMediaType = (fileName, fileUrl) => {
  const name = (fileName || fileUrl || '').toLowerCase().split('?')[0];

  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(name)) return 'image';
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(name)) return 'video';
  if (/\.(mp3|wav|aac|ogg|m4a)$/.test(name)) return 'audio';
  return 'file';
};

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

/**
 * useImageViewer
 *
 * Manages full-screen image/video viewing, file opening,
 * per-message image load state, and file download with progress.
 *
 * Features:
 * - Path traversal protection on all file operations
 * - Mounted ref guard — no state updates after unmount
 * - Division by zero protection in progress calculation
 * - Duplicate download prevention
 * - Correct Android 13+ media permissions per file type
 * - Cache collision prevention using sanitized name + hash
 * - Download cancellation support via jobId tracking
 */
const useImageViewer = () => {
  // ── Viewer state ─────────────────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

  /**
   * selectedFile tracks the currently opening file.
   * true = file is being downloaded/opened, null = idle
   * Used to show a loading indicator in the UI.
   */
  const [isOpeningFile, setIsOpeningFile] = useState(false);

  // ── Per-message image load tracking ─────────────────────────────
  const [imageErrorIds, setImageErrorIds] = useState(new Set());
  const [imageLoadingIds, setImageLoadingIds] = useState(new Set());

  // ── Download state ───────────────────────────────────────────────
  const [downloadingIds, setDownloadingIds] = useState(new Set());
  const [downloadProgressMap, setDownloadProgressMap] = useState({});

  // ── Guards ───────────────────────────────────────────────────────
  const mountedRef = useRef(true);

  /** Maps messageId → RNFS jobId for cancellation support */
  const downloadJobsRef = useRef(new Map());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel any in-flight downloads on unmount
      downloadJobsRef.current.forEach((jobId) => {
        RNFS.stopDownload(jobId);
      });
      downloadJobsRef.current.clear();
    };
  }, []);

  // ── Safe state setters ───────────────────────────────────────────

  const safeSet = useCallback((setter, value) => {
    if (mountedRef.current) setter(value);
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // PERMISSION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Requests storage/media permission appropriate for the
   * Android version and file type being downloaded.
   *
   * - Android 13+ (API 33+): granular media permissions
   *   (READ_MEDIA_IMAGES / READ_MEDIA_VIDEO / READ_MEDIA_AUDIO)
   * - Android < 13: WRITE_EXTERNAL_STORAGE
   * - iOS: no permission needed for downloads to DocumentDirectory
   *
   * @param {'image'|'video'|'audio'|'file'} mediaType
   * @returns {Promise<boolean>}
   */
  const requestStoragePermission = useCallback(
    async (mediaType = 'file') => {
      if (Platform.OS !== 'android') return true;

      try {
        // Android 13+ — granular permissions
        if (Platform.Version >= 33) {
          let permission;

          switch (mediaType) {
            case 'video':
              permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO;
              break;
            case 'audio':
              permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO;
              break;
            case 'image':
            default:
              permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
              break;
          }

          // Check first to avoid repeated dialogs
          const alreadyGranted = await PermissionsAndroid.check(permission);
          if (alreadyGranted) return true;

          const result = await PermissionsAndroid.request(permission, {
            title: 'Media Permission',
            message: 'Permission is needed to save files to your device.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          });

          return result === PermissionsAndroid.RESULTS.GRANTED;
        }

        // Android < 13
        const alreadyGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        if (alreadyGranted) return true;

        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'Permission is needed to save files to your device.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );

        return result === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.warn('useImageViewer: permission request error —', error);
        return false;
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────
  // IMAGE VIEWER
  // ─────────────────────────────────────────────────────────────────

  /** Opens the full-screen image viewer */
  const openImage = useCallback((uri) => {
    if (!uri) return;
    setSelectedImage(uri);
  }, []);

  /** Closes the full-screen image viewer */
  const closeImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // VIDEO VIEWER
  // ─────────────────────────────────────────────────────────────────

  /** Opens the full-screen video viewer */
  const openVideo = useCallback((uri) => {
    if (!uri) return;
    setSelectedVideo(uri);
  }, []);

  /** Closes the full-screen video viewer */
  const closeVideo = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // FILE VIEWER
  // ─────────────────────────────────────────────────────────────────

  /**
   * Downloads a file to the app cache (if not already cached)
   * then opens it with the device's default app.
   *
   * @param {string} fileUrl  - Remote URL of the file
   * @param {string} fileName - Original file name
   */
  const openFile = useCallback(
    async (fileUrl, fileName) => {
      if (!fileUrl) return;

      // ✅ Sanitize fileName to prevent path traversal
      const safeFileName = sanitizeFileName(fileName);

      // ✅ Include URL hash in cache path to prevent collisions
      const urlHash = fileUrl
        .split('')
        .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)
        .toString(36)
        .replace('-', 'n');

      const localPath = `${RNFS.CachesDirectoryPath}/${urlHash}_${safeFileName}`;

      if (mountedRef.current) setIsOpeningFile(true);

      try {
        const exists = await RNFS.exists(localPath);

        if (!exists) {
          const download = RNFS.downloadFile({
            fromUrl: fileUrl,
            toFile: localPath,
            progress: (res) => {
              // Progress feedback during cache download (for large files)
              if (res.contentLength > 0) {
                const pct = Math.round(
                  (res.bytesWritten / res.contentLength) * 100
                );
                console.log(`Caching file: ${pct}%`);
              }
            },
          });

          const result = await download.promise;

          if (result.statusCode !== 200) {
            throw new Error(
              `Cache download failed with status ${result.statusCode}`
            );
          }
        }

        await FileViewer.open(localPath, { showOpenWithDialog: true });
      } catch (error) {
        if (!mountedRef.current) return;

        // Differentiate between "no app found" and download errors
        const isNoAppError =
          error?.message?.includes('No activity found') ||
          error?.message?.includes('No application') ||
          error?.code === 'RNFileViewer.NoAppFound';

        if (isNoAppError) {
          Alert.alert(
            'Cannot Open File',
            'No app is installed on your device to open this file type.'
          );
        } else {
          console.warn('useImageViewer: file open error —', error);
          Alert.alert('Error', 'Could not open this file. Please try again.');
        }
      } finally {
        if (mountedRef.current) setIsOpeningFile(false);
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────
  // IMAGE LOAD TRACKING
  // ─────────────────────────────────────────────────────────────────

  /** Marks a message image as currently loading */
  const onImageLoadStart = useCallback((id) => {
    if (!id) return;
    setImageLoadingIds((prev) => new Set(prev).add(id));
  }, []);

  /** Marks a message image as finished loading */
  const onImageLoadEnd = useCallback((id) => {
    if (!id) return;
    setImageLoadingIds((prev) => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
  }, []);

  /** Marks a message image as errored and removes from loading set */
  const onImageError = useCallback((id) => {
    if (!id) return;
    setImageLoadingIds((prev) => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
    setImageErrorIds((prev) => new Set(prev).add(id));
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // FILE DOWNLOAD
  // ─────────────────────────────────────────────────────────────────

  /**
   * Downloads a file to device storage with progress tracking.
   * - Requests appropriate permissions per file type and Android version
   * - Prevents duplicate concurrent downloads for same messageId
   * - Optimistic progress updates with cleanup on completion/failure
   * - Supports cancellation via RNFS job tracking
   *
   * @param {string} fileUrl    - Remote URL of the file
   * @param {string} fileName   - Desired file name
   * @param {string|number} messageId - Message ID (used as download key)
   */
  const downloadFile = useCallback(
    async (fileUrl, fileName, messageId) => {
      if (!fileUrl || !messageId) return;

      // ✅ Prevent duplicate concurrent downloads
      if (downloadJobsRef.current.has(messageId)) {
        console.warn('useImageViewer: download already in progress for', messageId);
        return;
      }

      // ✅ Detect media type for correct permission request
      const mediaType = detectFileMediaType(fileName, fileUrl);

      const hasPermission = await requestStoragePermission(mediaType);

      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Storage permission is needed to download files.',
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

      if (!mountedRef.current) return;

      // ✅ Sanitize file name
      const safeFileName = sanitizeFileName(fileName);

      // Mark as downloading
      setDownloadingIds((prev) => new Set(prev).add(messageId));
      setDownloadProgressMap((prev) => ({ ...prev, [messageId]: 0 }));

      try {
        const downloadDir =
          Platform.OS === 'ios'
            ? RNFS.DocumentDirectoryPath
            : RNFS.DownloadDirectoryPath;

        const destPath = `${downloadDir}/${safeFileName}`;

        const downloadTask = RNFS.downloadFile({
          fromUrl: fileUrl,
          toFile: destPath,
          progress: (res) => {
            if (!mountedRef.current) return;

            // ✅ Guard against division by zero
            if (res.contentLength > 0) {
              const percent = Math.round(
                (res.bytesWritten / res.contentLength) * 100
              );
              setDownloadProgressMap((prev) => ({
                ...prev,
                [messageId]: Math.min(percent, 100),
              }));
            }
          },
        });

        // ✅ Track job ID for cancellation
        downloadJobsRef.current.set(messageId, downloadTask.jobId);

        const result = await downloadTask.promise;

        if (!mountedRef.current) return;

        if (result.statusCode === 200) {
          Alert.alert(
            'Download Complete',
            `"${safeFileName}" has been saved to your downloads.`
          );
        } else {
          throw new Error(
            `Download failed with status ${result.statusCode}`
          );
        }
      } catch (error) {
        if (!mountedRef.current) return;

        // Don't show error if download was intentionally cancelled
        const isCancelled =
          error?.message?.includes('cancelled') ||
          error?.message?.includes('aborted');

        if (!isCancelled) {
          console.warn('useImageViewer: download error —', error);
          Alert.alert(
            'Download Failed',
            'Could not download the file. Please try again.'
          );
        }
      } finally {
        // ✅ Always clean up — even if unmounted
        downloadJobsRef.current.delete(messageId);

        if (mountedRef.current) {
          setDownloadingIds((prev) => {
            const updated = new Set(prev);
            updated.delete(messageId);
            return updated;
          });
          setDownloadProgressMap((prev) => {
            const updated = { ...prev };
            delete updated[messageId];
            return updated;
          });
        }
      }
    },
    [requestStoragePermission]
  );

  /**
   * Cancels an in-progress download for a given messageId.
   *
   * @param {string|number} messageId
   */
  const cancelDownload = useCallback((messageId) => {
    const jobId = downloadJobsRef.current.get(messageId);
    if (jobId != null) {
      RNFS.stopDownload(jobId);
      downloadJobsRef.current.delete(messageId);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // CHECKER HELPERS
  // ─────────────────────────────────────────────────────────────────

  /** Returns true if the image for the given message ID is loading */
  const isImageLoading = useCallback(
    (id) => imageLoadingIds.has(id),
    [imageLoadingIds]
  );

  /** Returns true if the image for the given message ID has errored */
  const isImageError = useCallback(
    (id) => imageErrorIds.has(id),
    [imageErrorIds]
  );

  /** Returns true if a file download is in progress for the given message ID */
  const isDownloading = useCallback(
    (id) => downloadingIds.has(id),
    [downloadingIds]
  );

  /** Returns the download progress (0–100) for the given message ID */
  const getDownloadProgress = useCallback(
    (id) => downloadProgressMap[id] ?? 0,
    [downloadProgressMap]
  );

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────
  return {
    // ── Viewer state ────────────────────────────────────────────────
    selectedImage,
    selectedVideo,
    isOpeningFile,   // ✅ renamed from selectedFile — reflects actual usage

    // ── Image viewer ────────────────────────────────────────────────
    openImage,
    closeImage,

    // ── Video viewer ────────────────────────────────────────────────
    openVideo,
    closeVideo,

    // ── File viewer ─────────────────────────────────────────────────
    openFile,

    // ── Image load event handlers ───────────────────────────────────
    onImageLoadStart,
    onImageLoadEnd,
    onImageError,

    // ── Download ────────────────────────────────────────────────────
    downloadFile,
    cancelDownload,

    // ── Checker helpers (functions — not raw state) ─────────────────
    // ✅ Raw Sets/Maps NOT exposed — use these helpers instead
    isImageLoading,
    isImageError,
    isDownloading,
    getDownloadProgress,
  };
};

export default useImageViewer;