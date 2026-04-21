// screens/FileViewerScreen.js
import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import styles from '../assets/FileViewerStyles';
import fileManager from '../services/fileManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Image Gallery Component ---
const ImageGallery = ({ filePath, fileName }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <View style={styles.imageGalleryContainer}>
      {!imageError ? (
        <>
          <Image
            source={{ uri: `file://${filePath}` }}
            style={styles.galleryImage}
            resizeMode="contain"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
          {imageLoading && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="large" color="#42A5F5" />
              <Text style={styles.loadingText}>Loading image...</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.imageErrorContainer}>
          <Icon name="broken-image" size={64} color="#EF5350" />
          <Text style={styles.imageErrorText}>Cannot display image</Text>
          <Text style={styles.imageErrorSubtext}>{fileName}</Text>
        </View>
      )}
    </View>
  );
};

// --- Unhandled File Viewer ---
const UnhandledFileViewer = ({ fileType, filePath, fileName }) => {
  const openInExternalApp = async () => {
    try {
      const fileUrl = Platform.OS === 'android' ? `file://${filePath}` : filePath;
      const canOpen = await Linking.canOpenURL(fileUrl);
      if (canOpen) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert('Error', `No app available to open this ${fileType} file.`);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not open file. You may need to install an appropriate app.'
      );
    }
  };

  const getIconForType = (type) =>
    ({
      pdf: 'picture-as-pdf',
      document: 'description',
      spreadsheet: 'grid-on',
      presentation: 'slideshow',
      audio: 'audiotrack',
      video: 'movie',
      archive: 'archive',
    }[type] || 'insert-drive-file');

  const getColorForType = (type) =>
    ({
      pdf: '#F44336',
      document: '#2196F3',
      spreadsheet: '#0F9D58',
      presentation: '#FF9800',
      audio: '#E91E63',
      video: '#3F51B5',
      archive: '#795548',
    }[type] || '#607D8B');

  return (
    <View style={styles.unhandledContainer}>
      <Icon
        name={getIconForType(fileType)}
        size={80}
        color={getColorForType(fileType)}
      />
      <Text style={styles.unhandledTitle}>
        {fileType.charAt(0).toUpperCase() + fileType.slice(1)} File
      </Text>
      <Text style={styles.unhandledFileName}>{fileName}</Text>
      <TouchableOpacity style={styles.openButton} onPress={openInExternalApp}>
        <Icon name="open-in-new" size={20} color="#FFFFFF" />
        <Text style={styles.openButtonText}>Open in External App</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- Main FileViewerScreen Component ---
const FileViewerScreen = ({ route, navigation }) => {
  const {
    filePath,
    fileType,
    fileName,
    password,
    onDelete,
    initialContent,
    onSave,
    fileId,
  } = route.params;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [serverId, setServerId] = useState(null);

  // For text editing
  const [fileContent, setFileContent] = useState(initialContent || '');
  const [editedContent, setEditedContent] = useState(initialContent || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const displayedContentRef = useRef(initialContent || '');
  const intervalRef = useRef(null);

  // --- Set up header buttons ---
  useLayoutEffect(() => {
    navigation.setOptions({
      title: fileName,
      headerRight: () => (
        <View style={styles.headerButtonsContainer}>
          {fileType === 'text' && !isEditing && (
            <TouchableOpacity
              onPress={() => {
                setEditedContent(fileContent);
                setIsEditing(true);
              }}
              style={styles.editButton}
            >
              <Icon name="edit" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {fileType === 'text' && isEditing && (
            <>
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={styles.cancelButton}
              >
                <Icon name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={styles.saveButton}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size={20} color="#1B263B" />
                ) : (
                  <Icon name="save" size={20} color="#1B263B" />
                )}
              </TouchableOpacity>
            </>
          )}

          {password && (
  <>
    {/* Restore Button */}
    <TouchableOpacity
      onPress={handleRestorePress}
      style={{ marginRight: 15 }}
    >
      <Icon name="restore" size={22} color="#42A5F5" />
    </TouchableOpacity>

    {/* Delete Button */}
    <TouchableOpacity
      onPress={handleDeletePress}
      style={styles.deleteButton}
    >
      <Icon name="delete" size={20} color="#d32f2f" />
    </TouchableOpacity>
  </>
)}

        </View>
      ),
    });
  }, [navigation, fileType, isEditing, isSaving, fileContent, editedContent, password]);

  // Load file content for .txt
  useEffect(() => {
    if (fileType === 'text' && !initialContent) {
      setLoading(true);
      RNFS.readFile(filePath, 'utf8')
        .then((content) => {
          setFileContent(content);
          setEditedContent(content);
          displayedContentRef.current = content;
          setLoading(false);
        })
        .catch((err) => {
          setError('Could not open file: ' + err.message);
          setLoading(false);
        });
    } else if (fileType === 'text' && initialContent) {
      setFileContent(initialContent);
      setEditedContent(initialContent);
      displayedContentRef.current = initialContent;
    }
  }, [filePath, fileType, initialContent]);

  // Live change detection for text files
  useEffect(() => {
    if (fileType !== 'text') return;

    const checkFileChanges = async () => {
      if (isEditing || isSaving) return;
      try {
        const currentContent = await RNFS.readFile(filePath, 'utf8');
        if (currentContent !== displayedContentRef.current) {
          Alert.alert(
            'File Changed',
            'This file has been modified by another application. Reload?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reload',
                onPress: () => {
                  setFileContent(currentContent);
                  setEditedContent(currentContent);
                  displayedContentRef.current = currentContent;
                },
              },
            ]
          );
        }
      } catch (_) {
        // ignore
      }
    };

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(checkFileChanges, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [filePath, fileType, isEditing, isSaving, fileId]);

  // Load serverId from AsyncStorage
  useEffect(() => {
    const loadServerId = async () => {
      try {
        const stored = await AsyncStorage.getItem('fileServerIds');
        const map = stored ? JSON.parse(stored) : {};
        if (map[filePath]) {
          setServerId(map[filePath]);
        }
      } catch (err) {
        console.error('Failed to load serverId:', err);
      }
    };
    loadServerId();
  }, [filePath]);

   // ===============================
  // RESTORE FILE
  // ===============================
  const handleRestore = async () => {
    try {
      Alert.alert(
        'Restore File',
        'Restore this file back to normal storage?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            onPress: async () => {
              setLoading(true);

              const restorePath =
                RNFS.ExternalStorageDirectoryPath +
                '/Download/' +
                fileName.replace('.shield', '');

              await RNFS.moveFile(hiddenPath, restorePath);

              if (Platform.OS === 'android') {
                try {
                  await RNFS.scanFile(restorePath);
                } catch {}
              }

              setLoading(false);

              Alert.alert('Restored', 'File restored successfully');

              navigation.goBack();
            },
          },
        ]
      );
    } catch (e) {
      setLoading(false);
      Alert.alert('Error', 'Restore failed');
    }
  };

    // ===============================
  // REMOVE PASSWORD ONLY
  // ===============================
  const handleRemovePassword = async () => {
    Alert.alert(
      'Remove Password',
      'Remove protection but keep file hidden?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]
    );
  };


  // --- Save handler for .txt edits with server sync ---
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (fileId) {
        const response = await fileManager.updateFilePassword(
          fileId,
          fileName,
          editedContent,
          password
        );

        if (!response.success) {
          Alert.alert('Error', response.error || 'Update failed on server');
          setIsSaving(false);
          return;
        }
      } else {
        console.warn('No fileId found - file was not saved to server');
      }

      await RNFS.writeFile(filePath, editedContent, 'utf8');
      setFileContent(editedContent);
      displayedContentRef.current = editedContent;
      setIsEditing(false);

      Alert.alert(
        'Success',
        fileId ? 'File updated successfully!' : 'File saved locally (no server id).'
      );
      if (onSave) onSave(editedContent);
    } catch (error) {
      Alert.alert('Error', 'Failed to update file: ' + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(fileContent);
    setIsEditing(false);
  };

  // --- Delete flows ---
  const handleDeletePress = () => {
    setDeleteModalVisible(true);
  };

  const handlePasswordConfirm = async () => {
    if (!deletePasswordInput.trim()) {
      Alert.alert('Error', 'Please enter the password');
      return;
    }

    if (deletePasswordInput === password) {
      setDeleteModalVisible(false);
      setDeletePasswordInput('');

      Alert.alert(
        'Final Confirmation',
        `Are you absolutely sure you want to delete "${fileName}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete Forever', style: 'destructive', onPress: confirmDeletion },
        ]
      );
    } else {
      Alert.alert('Error', 'Incorrect password. Deletion cancelled.');
      setDeletePasswordInput('');
    }
  };

  const confirmDeletion = async () => {
    try {
      if (fileId) {
        const response = await fileManager.deleteFile(fileId);
        if (!response.success) throw new Error(response.error || 'Server delete failed');
      }

      await RNFS.unlink(filePath);
      if (onDelete) await onDelete(filePath, password);

      // cleanup AsyncStorage
      try {
        const s = await AsyncStorage.getItem('fileServerIds');
        const map = s ? JSON.parse(s) : {};
        if (map && map[filePath]) {
          delete map[filePath];
          await AsyncStorage.setItem('fileServerIds', JSON.stringify(map));
        }
      } catch (err) {
        // ignore
      }

      Alert.alert('Success', `"${fileName}" has been deleted successfully.`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete file: ' + err.message);
    }
  };

  const renderFileContent = () => {
    switch (fileType) {
      case 'image':
        return <ImageGallery filePath={filePath} fileName={fileName} />;
      case 'text':
        return isEditing ? (
          <TextInput
            style={styles.editableContent}
            multiline
            value={editedContent}
            onChangeText={setEditedContent}
            placeholder="Enter text content..."
            placeholderTextColor="#666"
            autoFocus
          />
        ) : (
          <ScrollView style={styles.contentContainer}>
            <Text style={styles.contentText}>{fileContent}</Text>
          </ScrollView>
        );
      default:
        // you can extend: pdf/audio/video custom viewers here
        return (
          <UnhandledFileViewer
            fileType={fileType}
            filePath={filePath}
            fileName={fileName}
          />
        );
    }
  };

  if (loading) {
    return (
      <View style={styles.containerCentered}>
        <ActivityIndicator size="large" color="#42A5F5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.containerCentered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderFileContent()}

      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setDeletePasswordInput('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon
              name="warning"
              size={48}
              color="#ff6b35"
              style={{ alignSelf: 'center', marginBottom: 16 }}
            />

            <Text style={styles.modalTitle}>Confirm Deletion</Text>
            <Text style={styles.modalSubtitle}>
              Enter the password for "{fileName}" to permanently delete this file.
            </Text>

            <View style={styles.passwordInputContainer}>
              <Icon
                name="lock"
                size={20}
                color="#B0BEC5"
                style={styles.passwordIcon}
              />
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter password"
                placeholderTextColor="#666"
                secureTextEntry
                value={deletePasswordInput}
                onChangeText={setDeletePasswordInput}
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeletePasswordInput('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmDeleteButton]}
                onPress={handlePasswordConfirm}
              >
                <Text style={styles.modalButtonText}>Delete Forever</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default FileViewerScreen;
