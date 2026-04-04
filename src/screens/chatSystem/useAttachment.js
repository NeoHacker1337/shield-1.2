import { useState, useCallback } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Contacts from 'react-native-contacts';
import { pick, types } from '@react-native-documents/picker';

/**
 * useAttachment
 * Centralised hook for all attachment actions inside ChatScreen.
 *
 * Usage:
 *   const { showAttachmentMenu, setShowAttachmentMenu, handleAttachmentPress } = useAttachment({ onAttach });
 *
 * onAttach(type, payload) is called after a successful pick so ChatScreen
 * can forward the data to the chat service.
 */
const useAttachment = ({ onAttach } = {}) => {
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // ── helpers ──────────────────────────────────────────────────────────────
  const requestPermission = useCallback(async (permission) => {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  // ── Gallery ───────────────────────────────────────────────────────────────
  const handleGallery = useCallback(async () => {
    const options = {
      mediaType: 'mixed',
      selectionLimit: 1,
      quality: 0.8,
    };
    const result = await launchImageLibrary(options);
    if (result.didCancel || result.errorCode) return;
    const asset = result.assets?.[0];
    if (asset) onAttach?.('gallery', asset);
  }, [onAttach]);

  // ── Camera ────────────────────────────────────────────────────────────────
  const handleCamera = useCallback(async () => {
    const granted = await requestPermission(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (!granted) {
      Alert.alert('Permission Denied', 'Camera permission is required.');
      return;
    }
    const options = { mediaType: 'photo', quality: 0.8, saveToPhotos: false };
    const result = await launchCamera(options);
    if (result.didCancel || result.errorCode) return;
    const asset = result.assets?.[0];
    if (asset) onAttach?.('camera', asset);
  }, [onAttach, requestPermission]);

  // ── Location (static stub — wire Geolocation later) ───────────────────────
  const handleLocation = useCallback(() => {
    // TODO: Replace with real Geolocation.getCurrentPosition() call
    Alert.alert(
      'Location (Coming Soon)',
      'Real-time location sharing will be wired here.',
    );
    // onAttach?.('location', { latitude, longitude });
  }, []);

  // ── Contact ───────────────────────────────────────────────────────────────
  const handleContact = useCallback(async () => {
    const granted = await requestPermission(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    );
    if (!granted) {
      Alert.alert('Permission Denied', 'Contacts permission is required.');
      return;
    }
    try {
      const contacts = await Contacts.getAll();
      if (contacts.length === 0) {
        Alert.alert('No Contacts', 'No contacts found on this device.');
        return;
      }
      // TODO: Open a contact-picker UI and pass the selected contact.
      // For now, we pick the first contact as a stub.
      const first = contacts[0];
      const name =
        first.displayName ||
        [first.givenName, first.familyName].filter(Boolean).join(' ');
      Alert.alert('Contact (Stub)', `Would share: ${name}`);
      // onAttach?.('contact', first);
    } catch (err) {
      Alert.alert('Error', 'Could not load contacts.');
    }
  }, [onAttach, requestPermission]);

  // ── Document ──────────────────────────────────────────────────────────────
  const handleDocument = useCallback(async () => {
    try {
      const [result] = await pick({
        type: [types.allFiles],
        copyTo: 'cachesDirectory',
      });
      if (result) onAttach?.('document', result);
    } catch (err) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert('Error', 'Could not open document picker.');
      }
    }
  }, [onAttach]);

  // ── Audio ─────────────────────────────────────────────────────────────────
  const handleAudio = useCallback(async () => {
    try {
      const [result] = await pick({
        type: [types.audio],
        copyTo: 'cachesDirectory',
      });
      if (result) onAttach?.('audio', result);
    } catch (err) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert('Error', 'Could not open audio picker.');
      }
    }
  }, [onAttach]);

  // ── Main dispatcher ───────────────────────────────────────────────────────
  const handleAttachmentPress = useCallback(
    (optionId) => {
      setShowAttachmentMenu(false);
      switch (optionId) {
        case 'gallery':   handleGallery();   break;
        case 'camera':    handleCamera();    break;
        case 'location':  handleLocation();  break;
        case 'contact':   handleContact();   break;
        case 'document':  handleDocument();  break;
        case 'audio':     handleAudio();     break;
        default: break;
      }
    },
    [handleGallery, handleCamera, handleLocation, handleContact, handleDocument, handleAudio],
  );

  return {
    showAttachmentMenu,
    setShowAttachmentMenu,
    handleAttachmentPress,
  };
};

export default useAttachment;