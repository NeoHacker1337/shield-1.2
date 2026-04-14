// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/screens/chatSystem/AttachmentMenu.js              ║
// ╚══════════════════════════════════════════════════════════════╝

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ─────────────────────────────────────────────────────────────────
// ATTACHMENT OPTIONS
// Add / remove options here without touching any other file.
// Set enabled: false to disable an option without removing its config.
// ─────────────────────────────────────────────────────────────────

/**
 * @typedef {object} AttachmentOption
 * @property {string} id      - Unique identifier passed to onSelectOption
 * @property {string} icon    - MaterialIcons icon name
 * @property {string} label   - Display label shown below icon
 * @property {string} color   - Icon color (hex)
 * @property {string} bg      - Icon background color (hex)
 * @property {boolean} [enabled] - Set false to hide option (default: true)
 */

/** @type {AttachmentOption[]} */
export const ATTACHMENT_OPTIONS = [
  {
    id: 'gallery',
    icon: 'photo-library',
    label: 'Gallery',
    color: '#1A73E8',
    bg: '#E8F0FE',
    enabled: true,
  },
  {
    id: 'camera',
    icon: 'camera-alt',
    label: 'Camera',
    color: '#E91E63',
    bg: '#FCE4EC',
    enabled: false, // TODO: Enable when camera permission flow is ready
  },
  {
    id: 'document',
    icon: 'insert-drive-file',
    label: 'Document',
    color: '#7E57C2',
    bg: '#EDE7F6',
    enabled: true,
  },
  {
    id: 'audio',
    icon: 'headset',
    label: 'Audio',
    color: '#F4511E',
    bg: '#FBE9E7',
    enabled: true,
  },
  {
    id: 'location',
    icon: 'location-on',
    label: 'Location',
    color: '#00897B',
    bg: '#E0F2F1',
    enabled: false, // TODO: Enable when location service is integrated
  },
  {
    id: 'contact',
    icon: 'person',
    label: 'Contact',
    color: '#1E88E5',
    bg: '#E3F2FD',
    enabled: false, // TODO: Enable when contacts picker is implemented
  },
];

// Only show enabled options
const VISIBLE_OPTIONS = ATTACHMENT_OPTIONS.filter(
  (opt) => opt.enabled !== false
);

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const COLUMNS = 4;
const SHEET_ANIMATION_DURATION = 250;

// ─────────────────────────────────────────────────────────────────
// ATTACHMENT MENU COMPONENT
// ─────────────────────────────────────────────────────────────────

/**
 * AttachmentMenu
 *
 * Bottom sheet modal for selecting attachment type.
 *
 * @param {object} props
 * @param {boolean} props.visible         - Controls modal visibility
 * @param {function} props.onClose        - Called when menu should close
 * @param {function} props.onSelectOption - Called with option id on selection
 * @param {string} [props.title]          - Optional sheet title (default: 'Share')
 */
const AttachmentMenu = ({
  visible,
  onClose,
  onSelectOption,
  title = 'Share',
}) => {
  const insets = useSafeAreaInsets();

  /**
   * Local modal visibility state with delayed hide.
   * Keeps the modal mounted during the close animation
   * so the slide-down animation plays before unmounting.
   */
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Sync external visible prop with animation ──────────────────
  useEffect(() => {
    if (visible) {
      // Show: mount modal then slide up
      setModalVisible(true);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: SHEET_ANIMATION_DURATION,
        useNativeDriver: true,
      }).start();
    } else {
      // Hide: slide down then unmount modal
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: SHEET_ANIMATION_DURATION,
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, slideAnim]);

  const sheetTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  // ── Safe close handlers ────────────────────────────────────────

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  /**
   * Handles option selection:
   * 1. Closes the menu
   * 2. Calls onSelectOption with the selected id
   *
   * Close first to give immediate visual feedback.
   */
  const handleSelect = useCallback(
    (optionId) => {
      handleClose();
      // Small delay lets close animation start before any heavy work
      setTimeout(() => {
        onSelectOption?.(optionId);
      }, 50);
    },
    [handleClose, onSelectOption]
  );

  /**
   * Stops touch propagation to the overlay behind the sheet.
   * Uses onStartShouldSetResponder — more reliable than empty onPress.
   */
  const sheetResponder = {
    onStartShouldSetResponder: () => true,
  };

  if (!modalVisible) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none" // ✅ We handle animation manually
      onRequestClose={handleClose} // ✅ Android back button
      statusBarTranslucent
    >
      {/* Dimmed backdrop — tap to dismiss */}
      <Pressable
        style={styles.overlay}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Close attachment menu"
      >
        {/* Sheet — stops propagation via responder system */}
        <Animated.View
          style={[
            styles.sheet,
            {
              // ✅ Safe area bottom padding
              paddingBottom: Math.max(insets.bottom, 16) + 16,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
          {...sheetResponder}
        >
          {/* Drag handle — decorative */}
          <View
            style={styles.handle}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* ✅ Flexible grid — adapts to any number of options */}
          <View style={styles.grid}>
            {VISIBLE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.item,
                  // ✅ Dynamic width based on column count
                  { width: `${100 / COLUMNS}%` },
                ]}
                activeOpacity={0.7}
                onPress={() => handleSelect(option.id)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityHint={`Send a ${option.label.toLowerCase()}`}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: option.bg },
                  ]}
                >
                  <Icon
                    name={option.icon}
                    size={28}
                    color={option.color}
                  />
                </View>
                <Text style={styles.label}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    // paddingBottom is set dynamically using safe area insets
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    // Width set dynamically in JSX based on COLUMNS constant
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#EEEEEE',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default React.memo(AttachmentMenu);