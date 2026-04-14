import { useState, useCallback } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Contacts from 'react-native-contacts';
import { pick, types, isCancel } from '@react-native-documents/picker';

// ─────────────────────────────────────────────────────────────────────────────
// DEV LOGGER — stripped from production builds automatically
// ─────────────────────────────────────────────────────────────────────────────
const devWarn = (...args) => {
  if (__DEV__) console.warn('[useAttachment]', ...args);
};

/**
 * useAttachment
 * Centralised hook for all attachment actions inside ChatScreen.
 *
 * @param {Object}   options
 * @param {Function} options.onAttach - Called as onAttach(type, payload) after
 *                                      a successful pick. Should be stable
 *                                      (wrapped in useCallback by the caller).
 *
 * @returns {{
 *   showAttachmentMenu:    boolean,
 *   setShowAttachmentMenu: Function,
 *   isAttaching:           boolean,
 *   handleAttachmentPress: Function,
 * }}
 */
const useAttachment = ({ onAttach } = {}) => {
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // FIX: Expose an in-progress flag so callers can show a spinner or
  // disable the attachment button while a pick operation is running.
  const [isAttaching, setIsAttaching] = useState(false);

  // ── PERMISSION HELPER ─────────────────────────────────────────────────────

  /**
   * Request an Android runtime permission.
   * Returns true on iOS (permissions handled natively by each library).
   *
   * FIX: Wrapped in try/catch — PermissionsAndroid.request can throw on
   * invalid permission strings or OS-level failures.
   *
   * @param {string} permission - PermissionsAndroid.PERMISSIONS.*
   * @returns {Promise<boolean>}
   */
  const requestPermission = useCallback(async (permission) => {
    if (Platform.OS !== 'android') return true;
    try {
      const result = await PermissionsAndroid.request(permission);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      devWarn('requestPermission threw:', e);
      return false;
    }
  }, []);

  // ── GALLERY ───────────────────────────────────────────────────────────────

  /**
   * Open the device image/video gallery and pass the selected asset to onAttach.
   * FIX: Added try/catch — launchImageLibrary can throw on some Android OEMs.
   * FIX: `errorCode != null` instead of truthy check to catch numeric 0.
   */
  const handleGallery = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: 1,
        quality: 0.8,
      });

      if (result.didCancel || result.errorCode != null) return;

      const asset = result.assets?.[0];
      if (asset) onAttach?.('gallery', asset);
    } catch (e) {
      devWarn('handleGallery error:', e);
      Alert.alert('Error', 'Could not open the gallery.');
    }
  }, [onAttach]);

  // ── CAMERA ────────────────────────────────────────────────────────────────

  /**
   * Request camera permission (Android) then launch the camera.
   * FIX: Added try/catch — launchCamera can throw on permission edge cases.
   * FIX: `errorCode != null` guard.
   */
  const handleCamera = useCallback(async () => {
    const granted = await requestPermission(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    if (!granted) {
      Alert.alert('Permission Denied', 'Camera permission is required.');
      return;
    }

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.didCancel || result.errorCode != null) return;

      const asset = result.assets?.[0];
      if (asset) onAttach?.('camera', asset);
    } catch (e) {
      devWarn('handleCamera error:', e);
      Alert.alert('Error', 'Could not launch the camera.');
    }
  }, [onAttach, requestPermission]);

  // ── LOCATION (stub) ───────────────────────────────────────────────────────

  /**
   * Placeholder for location sharing.
   * TODO: Replace Alert with Geolocation.getCurrentPosition() and call
   *       onAttach('location', { latitude, longitude }) on success.
   *
   * NOTE: When implementing, add `onAttach` to the dependency array.
   */
  const handleLocation = useCallback(() => {
    Alert.alert(
      'Location (Coming Soon)',
      'Real-time location sharing will be wired here.',
    );
    // onAttach?.('location', { latitude, longitude });
  }, []);

  // ── CONTACT ───────────────────────────────────────────────────────────────

  /**
   * Request contacts permission (Android) then open a contact.
   *
   * FIX: Calling Contacts.getAll() loads every contact into memory.
   * Use Contacts.openContactSelection() where available so the OS
   * handles the picker UI natively and only returns one record.
   * Falls back to getAll() + first-contact stub on platforms that
   * don't support the native picker.
   *
   * NOTE: onAttach call is intentionally commented out until a real picker
   * UI is implemented — do not uncomment the stub that sends contacts[0].
   */
  const handleContact = useCallback(async () => {
    const granted = await requestPermission(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    );
    if (!granted) {
      Alert.alert('Permission Denied', 'Contacts permission is required.');
      return;
    }

    try {
      // Prefer native contact selection (single record, no full-list load)
      if (typeof Contacts.openContactSelection === 'function') {
        const contact = await Contacts.openContactSelection();
        if (contact) {
          // TODO: Remove alert and uncomment onAttach when picker UI is ready
          const name =
            contact.displayName ||
            [contact.givenName, contact.familyName].filter(Boolean).join(' ');
          Alert.alert('Contact (Stub)', `Would share: ${name}`);
          // onAttach?.('contact', contact);
        }
        return;
      }

      // Fallback: load all (may be slow on large contact lists)
      const contacts = await Contacts.getAll();
      if (contacts.length === 0) {
        Alert.alert('No Contacts', 'No contacts found on this device.');
        return;
      }

      // TODO: Replace with a proper picker UI before calling onAttach
      const first = contacts[0];
      const name =
        first.displayName ||
        [first.givenName, first.familyName].filter(Boolean).join(' ');
      Alert.alert('Contact (Stub)', `Would share: ${name}`);
      // onAttach?.('contact', first);
    } catch (err) {
      devWarn('handleContact error:', err);
      Alert.alert('Error', 'Could not load contacts.');
    }
  }, [onAttach, requestPermission]);

  // ── DOCUMENT ──────────────────────────────────────────────────────────────

  /**
   * Open the system document picker and pass the result to onAttach.
   * FIX: Use isCancel(err) from the library instead of hardcoding the
   *      cancellation error code string, which can change across versions.
   */
  const handleDocument = useCallback(async () => {
    try {
      const [result] = await pick({
        type: [types.allFiles],
        copyTo: 'cachesDirectory',
      });
      if (result) onAttach?.('document', result);
    } catch (err) {
      // FIX: isCancel() is the library-recommended cancellation check
      if (!isCancel(err)) {
        devWarn('handleDocument error:', err);
        Alert.alert('Error', 'Could not open document picker.');
      }
    }
  }, [onAttach]);

  // ── AUDIO ─────────────────────────────────────────────────────────────────

  /**
   * Open the system audio picker and pass the result to onAttach.
   * FIX: Same isCancel() fix as handleDocument.
   */
  const handleAudio = useCallback(async () => {
    try {
      const [result] = await pick({
        type: [types.audio],
        copyTo: 'cachesDirectory',
      });
      if (result) onAttach?.('audio', result);
    } catch (err) {
      if (!isCancel(err)) {
        devWarn('handleAudio error:', err);
        Alert.alert('Error', 'Could not open audio picker.');
      }
    }
  }, [onAttach]);

  // ── MAIN DISPATCHER ───────────────────────────────────────────────────────

  /**
   * Close the attachment menu immediately (intentional — keeps UX responsive)
   * then dispatch to the appropriate handler.
   *
   * FIX: Handlers are now awaited inside an async wrapper so that any
   * uncaught rejections are surfaced rather than silently swallowed.
   * FIX: isAttaching flag set around the async operation so callers
   * can show loading indicators.
   * FIX: Unknown optionId logs a dev warning instead of silently doing nothing.
   */
  const handleAttachmentPress = useCallback(
    (optionId) => {
      // Close menu synchronously for immediate visual feedback
      setShowAttachmentMenu(false);

      const handlerMap = {
        gallery:  handleGallery,
        camera:   handleCamera,
        location: handleLocation,
        contact:  handleContact,
        document: handleDocument,
        audio:    handleAudio,
      };

      const handler = handlerMap[optionId];

      if (!handler) {
        devWarn(`Unknown attachment optionId: "${optionId}"`);
        return;
      }

      // Wrap in async IIFE so we can await the handler and manage isAttaching
      (async () => {
        setIsAttaching(true);
        try {
          await handler();
        } catch (e) {
          // Last-resort catch — each handler should handle its own errors,
          // but this prevents any unhandled promise rejection from escaping.
          devWarn('handleAttachmentPress unhandled error:', e);
        } finally {
          setIsAttaching(false);
        }
      })();
    },
    [
      handleGallery,
      handleCamera,
      handleLocation,
      handleContact,
      handleDocument,
      handleAudio,
    ],
  );

  return {
    showAttachmentMenu,
    setShowAttachmentMenu,
    isAttaching,
    handleAttachmentPress,
  };
};

export default useAttachment;