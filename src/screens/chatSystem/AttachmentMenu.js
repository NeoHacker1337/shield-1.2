import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

/**
 * ATTACHMENT_OPTIONS
 * Add / remove options here without touching any other file.
 */
export const ATTACHMENT_OPTIONS = [
  { id: 'gallery', icon: 'photo-library', label: 'Gallery', color: '#1A73E8', bg: '#E8F0FE' },
  // { id: 'camera',    icon: 'camera-alt',        label: 'Camera',    color: '#E91E63', bg: '#FCE4EC' },
  // { id: 'location',  icon: 'location-on',       label: 'Location',  color: '#00897B', bg: '#E0F2F1' },
  // { id: 'contact',   icon: 'person',            label: 'Contact',   color: '#1E88E5', bg: '#E3F2FD' },
  { id: 'document', icon: 'insert-drive-file', label: 'Document', color: '#7E57C2', bg: '#EDE7F6' },
  { id: 'audio', icon: 'headset', label: 'Audio', color: '#F4511E', bg: '#FBE9E7' },
];

/**
 * AttachmentMenu
 *
 * Props:
 *  - visible         {boolean}
 *  - onClose         {() => void}
 *  - onSelectOption  {(optionId: string) => void}
 */
const AttachmentMenu = ({ visible, onClose, onSelectOption }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Dimmed backdrop — tap to dismiss */}
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Sheet itself — stops touch propagation */}
        <Pressable style={styles.sheet} onPress={() => { }}>
          {/* Drag handle */}
          <View style={styles.handle} />

          <Text style={styles.title}>Share</Text>

          {/* 4-column icon grid */}
          <View style={styles.grid}>
            {ATTACHMENT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.item}
                activeOpacity={0.7}
                onPress={() => onSelectOption(option.id)}
              >
                <View style={[styles.iconBox, { backgroundColor: option.bg }]}>
                  <Icon name={option.icon} size={28} color={option.color} />
                </View>
                <Text style={styles.label}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

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
    paddingBottom: 32,
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
    width: '25%',
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

export default AttachmentMenu;