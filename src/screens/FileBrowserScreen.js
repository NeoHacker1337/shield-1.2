// screens/FileBrowserScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import styles from '../assets/FileViewerStyles';

const ROOT_PATH = RNFS.ExternalStorageDirectoryPath;

const getFileTypeFromName = (name) => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['txt', 'md', 'log'].includes(ext)) return 'text';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'aac', 'm4a'].includes(ext)) return 'audio';
  return 'other';
};

const FileBrowserScreen = ({ navigation, route }) => {
  const [currentPath, setCurrentPath] = useState(
    route.params?.startPath || ROOT_PATH
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Read mode & callbacks from route params
  const mode = route.params?.mode || 'browse';           // 'browse' | 'restoreUnlocked' | 'restore'
  const restoreFile = route.params?.restoreFile || null; // { path, name, type, ... }
  const onRestoreComplete = route.params?.onRestoreComplete || null; // callback after restore

  const isRestoreMode = mode === 'restoreUnlocked' || mode === 'restore';

  const loadDir = useCallback(async (path) => {
    try {
      setLoading(true);
      const list = await RNFS.readDir(path);
      list.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });
      setItems(list);
      setCurrentPath(path);
    } catch (e) {
      Alert.alert('Error', 'Unable to read directory: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDir(currentPath);
  }, []);

  const goUp = () => {
    if (!currentPath || currentPath === '/' || currentPath === ROOT_PATH) return;
    const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
    loadDir(parent);
  };

  // ✅ "Restore Here" — move file into currentPath
  const handleRestoreHere = async () => {
    if (!restoreFile) {
      Alert.alert('Error', 'No file selected for restore.');
      return;
    }

    Alert.alert(
      'Restore Here',
      `Restore "${restoreFile.name}" to:\n${currentPath}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              let destPath = `${currentPath}/${restoreFile.name}`;

              // Handle name conflict
              const exists = await RNFS.exists(destPath);
              if (exists) {
                const dot = restoreFile.name.lastIndexOf('.');
                destPath = dot !== -1
                  ? `${currentPath}/${restoreFile.name.slice(0, dot)}_restored${restoreFile.name.slice(dot)}`
                  : `${currentPath}/${restoreFile.name}_restored`;
              }

              await RNFS.moveFile(restoreFile.path, destPath);

              // Scan media store on Android
              if (RNFS.scanFile) {
                try { await RNFS.scanFile(destPath); } catch { }
              }

              Alert.alert('Success', `"${restoreFile.name}" restored successfully.`);

              // Fire callback if provided (to clean up metadata in parent screen)
              if (onRestoreComplete) {
                onRestoreComplete(restoreFile.path, destPath);
              }

              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to restore: ' + err.message);
            }
          },
        },
      ]
    );
  };

  const openItem = (item) => {
    if (item.isDirectory()) {
      loadDir(item.path);
      return;
    }

    // In restore mode, tapping a file does nothing
    if (isRestoreMode) {
      Alert.alert('Select Folder', 'Navigate to a folder and tap "Restore Here".');
      return;
    }

    const fileType = getFileTypeFromName(item.name);
    navigation.navigate('FileViewer', {
      filePath: item.path,
      fileType,
      fileName: item.name,
      password: null,
      initialContent: null,
      fileId: null,
    });
  };

  const renderItem = ({ item }) => {
    const isDir = item.isDirectory();
    const isFile = !isDir;

    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          borderBottomWidth: 0.5,
          borderBottomColor: 'rgba(255,255,255,0.05)',
          // ✅ Dim files in restore mode — only folders matter
          opacity: isRestoreMode && isFile ? 0.35 : 1,
        }}
        onPress={() => openItem(item)}
        activeOpacity={0.7}
      >
        <Icon
          name={isDir ? 'folder' : 'insert-drive-file'}
          size={24}
          color={isDir ? '#FFD54F' : '#90CAF9'}
        />
        <Text
          style={{ color: 'white', marginLeft: 12, flex: 1 }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {/* ✅ Show arrow only for folders in restore mode */}
        {isRestoreMode && isDir && (
          <Icon name="chevron-right" size={20} color="#B0BEC5" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* ── Header: back + path + close ── */}
      <View style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
      }}>

        {/* ✅ Folder Up button (navigate to parent directory) */}
        <TouchableOpacity
          onPress={goUp}
          style={{ padding: 4 }}
          disabled={currentPath === ROOT_PATH || currentPath === '/'}
        >
          <Icon
            name="arrow-upward"
            size={24}
            color={currentPath === ROOT_PATH || currentPath === '/' ? '#334155' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Current path text */}
        <Text
          style={{ color: '#94A3B8', marginLeft: 8, flex: 1, fontSize: 12 }}
          numberOfLines={1}
        >
          {currentPath}
        </Text>

        {/* ✅ Close button — goes back to previous screen */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            padding: 6,
            marginLeft: 8,
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: 20,
          }}
        >
          <Icon name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>

      </View>


      {/* ✅ Restore mode banner with "Restore Here" button */}
      {isRestoreMode && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#1B263B',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.08)',
          gap: 8,
        }}>
          {/* Restoring file info */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#94A3B8', fontSize: 11, marginBottom: 2 }}>
              Restoring:
            </Text>
            <Text
              style={{ color: '#FFB300', fontSize: 13, fontWeight: '600' }}
              numberOfLines={1}
            >
              {restoreFile?.name || 'Unknown file'}
            </Text>
          </View>

          {/* ✅ Restore Here button */}
          <TouchableOpacity
            onPress={handleRestoreHere}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#4CAF50',
              paddingVertical: 9,
              paddingHorizontal: 14,
              borderRadius: 20,
              gap: 6,
              elevation: 4,
            }}
          >
            <Icon name="restore" size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
              Restore Here
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── File list ── */}
      {loading ? (
        <View style={styles.containerCentered}>
          <ActivityIndicator size="large" color="#42A5F5" />
          <Text style={styles.loadingText}>Loading files...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.path}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}

    </View>
  );
};

export default FileBrowserScreen;
