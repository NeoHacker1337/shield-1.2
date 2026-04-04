// screens/StorageScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import { Colors, Fonts, Spacing } from '../assets/theme'; // adjust path

const ROOT_PATH = RNFS.ExternalStorageDirectoryPath + '/Documents'; // or pass via route

const getDynamicColors = (scheme) => {
  const isDark = scheme === 'dark';
  return {
    background: isDark ? Colors.backgroundDark : '#FFFFFF',
    itemBackground: isDark ? Colors.backgroundInput : '#F5F5F5',
    text: isDark ? Colors.textPrimary : '#212121',
    secondaryText: isDark ? Colors.textSecondary : '#757575',
    divider: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  };
};

const StorageScreen = ({ navigation, route }) => {
  const scheme = useColorScheme();
  const themeColors = useMemo(() => getDynamicColors(scheme), [scheme]);
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [currentPath, setCurrentPath] = useState(
    route?.params?.startPath || ROOT_PATH
  );
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadDir = async (path) => {
    try {
      setLoading(true);
      const list = await RNFS.readDir(path);
      list.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });
      setEntries(list);
      setCurrentPath(path);
    } catch (e) {
      Alert.alert('Error', 'Unable to open folder: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDir(currentPath);
  }, []);

  const goUp = () => {
    if (currentPath === '/' || currentPath === ROOT_PATH) return;
    const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
    loadDir(parent);
  };

  const openItem = (item) => {
    if (item.isDirectory()) {
      loadDir(item.path);
      return;
    }

    // Navigate to your existing FileViewerScreen
    navigation.navigate('FileViewer', {
      filePath: item.path,
      fileName: item.name,
      fileType: 'text', // or detect by extension
      password: null,
      fileId: null,
      initialContent: null,
    });
  };

  const renderItem = ({ item }) => {
    const isDir = item.isDirectory();

    return (
      <TouchableOpacity
        onPress={() => openItem(item)}
        style={styles.row}
        activeOpacity={0.7}
      >
        <View style={styles.iconWrapper}>
          <Icon
            name={isDir ? 'folder' : 'insert-drive-file'}
            size={24}
            color={isDir ? '#FFC107' : '#90CAF9'}
          />
        </View>

        <Text
          style={styles.rowLabel}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        <Icon
          name="chevron-right"
          size={22}
          color={themeColors.secondaryText}
          style={styles.chevron}
        />
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#42A5F5" />
          <Text style={styles.loadingText}>Loading files...</Text>
        </View>
      );
    }

    if (!entries.length) {
      return (
        <View style={styles.centered}>
          <Icon
            name="folder-open"
            size={40}
            color={themeColors.secondaryText}
          />
          <Text style={styles.emptyTitle}>No items found</Text>
          <Text style={styles.emptySubtitle}>
            This folder is empty.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={entries}
        keyExtractor={(item) => item.path}
        renderItem={renderItem}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Top bar inside screen */}
      <View style={styles.pathBar}>
        <TouchableOpacity onPress={goUp} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-back" size={22} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={styles.pathText} numberOfLines={1}>
          {currentPath}
        </Text>
      </View>

      {renderContent()}
    </View>
  );
};

const createStyles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },

    // Top path bar
    pathBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    pathText: {
      flex: 1,
      marginLeft: Spacing.sm,
      color: c.secondaryText,
      fontSize: Fonts.size.sm,
      fontFamily: Fonts.family.primary,
    },

    // Row: min height 48dp, full‑width touch target
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      minHeight: 48,
      backgroundColor: c.background,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    iconWrapper: {
      width: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    rowLabel: {
      flex: 1,
      color: c.text,
      fontSize: Fonts.size.md,
      fontFamily: Fonts.family.primary,
    },
    chevron: {
      marginLeft: Spacing.xs,
    },

    // States
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    loadingText: {
      marginTop: Spacing.sm,
      color: c.secondaryText,
      fontSize: Fonts.size.md,
      fontFamily: Fonts.family.primary,
    },
    emptyTitle: {
      marginTop: Spacing.sm,
      color: c.text,
      fontSize: Fonts.size.lg,
      fontFamily: Fonts.family.primary,
    },
    emptySubtitle: {
      marginTop: Spacing.xs,
      color: c.secondaryText,
      fontSize: Fonts.size.sm,
      fontFamily: Fonts.family.primary,
    },
  });

export default StorageScreen;
