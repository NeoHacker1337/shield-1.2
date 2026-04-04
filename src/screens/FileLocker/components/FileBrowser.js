import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import styles from '../../../assets/FileLockerStyles';

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileType = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const types = {
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', bmp: 'image',
    webp: 'image', heic: 'image', pdf: 'pdf', doc: 'document', docx: 'document',
    xls: 'spreadsheet', xlsx: 'spreadsheet', mp3: 'audio', wav: 'audio',
    mp4: 'video', mov: 'video', zip: 'archive', rar: 'archive',
  };
  return types[ext] || 'file';
};

const FileBrowser = ({ visible, basePath, onSelect, onClose, mode }) => {
  const [currentPath, setCurrentPath] = useState(basePath);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isRestoreMode = mode === 'restoreUnlocked' || mode === 'restore';
  const isAtRoot = currentPath === basePath;

  const getParentDirectory = (path) => {
    if (path === '/') return '/';
    const parts = path.replace(/\/+$/, '').split('/');
    if (parts.length <= 1) return '/';
    parts.pop();
    return parts.join('/') || '/';
  };

  const getCurrentFolderName = (path) => {
    if (!path) return 'Storage';
    const parts = path.replace(/\/+$/, '').split('/');
    return parts[parts.length - 1] || 'Storage';
  };

  const getBreadcrumbs = () => {
    if (!currentPath || !basePath) return [];
    const relative = currentPath.replace(basePath, '');
    const parts = relative.split('/').filter(Boolean);
    const crumbs = [{ name: getCurrentFolderName(basePath), path: basePath }];
    let built = basePath;
    for (const part of parts) {
      built = `${built}/${part}`;
      crumbs.push({ name: part, path: built });
    }
    return crumbs;
  };

  useEffect(() => {
    if (visible && currentPath) {
      loadFiles(currentPath);
    } else {
      setCurrentPath(basePath);
    }
  }, [visible, currentPath, basePath]);

  const loadFiles = async (path) => {
    setLoading(true);
    setError(null);
    try {
      if (!path || path.includes('/Android/data/')) {
        throw new Error('Access to this directory is restricted');
      }
      const exists = await RNFS.exists(path);
      if (!exists) throw new Error(`Path does not exist: ${path}`);

      const items = await RNFS.readDir(path);
      const accessibleItems = items.filter(item => {
        const restrictedPaths = ['android/data', 'android/obb', '.android_secure'];
        return !restrictedPaths.some(r => item.path.toLowerCase().includes(r));
      });

      const sortedItems = accessibleItems.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      const formatted = sortedItems.map(item => ({
        name: item.name,
        path: item.path,
        isDirectory: item.isDirectory(),
        size: item.isFile() ? formatFileSize(item.size) : '',
        mtime: new Date(item.mtime).toLocaleDateString(),
        type: item.isDirectory() ? 'folder' : getFileType(item.name),
      }));
      setFiles(formatted);
    } catch (err) {
      let msg = err.message;
      if (msg.includes('Android/data') || msg.includes('restricted'))
        msg = 'This directory is restricted by Android';
      else if (msg.includes('ENOENT'))
        msg = 'Directory not found or access denied';
      setError(msg);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item) => {
    if (item.isDirectory) {
      setCurrentPath(item.path);
    } else {
      if (isRestoreMode) {
        return;
      }
      onSelect(item);
    }
  };

  const renderItem = ({ item }) => {
    const allImages = files.length > 0 && files.every(f => f.type === 'image' && !f.isDirectory);
    const showImagePreview = allImages && item.type === 'image' && !item.isDirectory;

    return (
      <TouchableOpacity
        style={showImagePreview ? styles.dcimImageItem : styles.browserFileItem}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        {showImagePreview ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: `file://${item.path}` }} style={styles.imagePreview} resizeMode="cover" />
          </View>
        ) : (
          <>
            <Icon
              name={item.isDirectory ? 'folder' : 'insert-drive-file'}
              size={26}
              color={item.isDirectory ? '#FFB300' : '#607D8B'}
              style={styles.browserFileIcon}
            />
            <View style={styles.browserFileInfo}>
              <Text style={styles.browserFileName} numberOfLines={1}>{item.name}</Text>
              {!item.isDirectory && (
                <Text style={styles.browserFileMeta}>{item.size} • {item.mtime}</Text>
              )}
            </View>
            {item.isDirectory && <Icon name="chevron-right" size={20} color="#666" />}
          </>
        )}
      </TouchableOpacity>
    );
  };

  const breadcrumbs = getBreadcrumbs();

  if (!visible) return null;

  return (
    <View style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0B1724', zIndex: 200 }}>
      {/* Header Row 1 */}
      <View style={styles.browserHeader}>
        <TouchableOpacity
          onPress={() => isAtRoot ? onClose() : setCurrentPath(getParentDirectory(currentPath))}
          style={styles.browserCloseButton}
        >
          <Icon name={isAtRoot ? 'close' : 'arrow-back'} size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.browserPathText} numberOfLines={1}>
          {getCurrentFolderName(currentPath)}
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.browserCloseButton}>
          <Icon name="close" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Breadcrumbs */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1B263B' }}>
        {breadcrumbs.map((crumb, index) => (
          <TouchableOpacity key={crumb.path} onPress={() => setCurrentPath(crumb.path)} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: index === breadcrumbs.length - 1 ? '#FFF' : '#94A3B8', fontSize: 12 }}>
              {crumb.name}
            </Text>
            {index < breadcrumbs.length - 1 && (
              <Icon name="chevron-right" size={14} color="#94A3B8" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Restore Banner */}
      {isRestoreMode && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' }}>
          <Text style={{ color: '#94A3B8', fontSize: 13 }}>Navigate to destination folder</Text>
          <TouchableOpacity
            onPress={() => onSelect({ path: currentPath, isDirectory: true, name: getCurrentFolderName(currentPath) })}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, gap: 6 }}
          >
            <Icon name="restore" size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 13 }}>Restore Here</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={18} color="#FCA5A5" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* File List */}
      {loading ? (
        <View style={styles.browserLoadingContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={{ color: '#94A3B8', marginTop: 8 }}>Loading...</Text>
        </View>
      ) : files.length === 0 ? (
        <View style={styles.browserLoadingContainer}>
          <Text style={{ color: '#94A3B8' }}>This folder is empty</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={item => item.path}
          renderItem={renderItem}
          contentContainerStyle={[styles.browserListContainer, { paddingBottom: 40 }]}
          numColumns={files.length > 0 && files.every(f => f.type === 'image' && !f.isDirectory) ? 2 : 1}
          key={files.length > 0 && files.every(f => f.type === 'image' && !f.isDirectory) ? 'grid' : 'list'}
        />
      )}
    </View>
  );
};

export default FileBrowser;
