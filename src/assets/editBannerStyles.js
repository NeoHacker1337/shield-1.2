// ╔══════════════════════════════════════════════════════════════╗
// ║ FILE: src/assets/editBannerStyles.js                        ║
// ╚══════════════════════════════════════════════════════════════╝

import { StyleSheet } from 'react-native';

/**
 * Styles for the Edit Message banner shown above the input row.
 * Extracted from useEditMessage.js — styles belong in assets,
 * not in logic hooks.
 */
const editBannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7f6',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d9e8e7',
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#075E54',
    alignSelf: 'stretch',
    marginRight: 10,
  },
  textBlock: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#075E54',
  },
  preview: {
    fontSize: 13,
    color: '#667781',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  editSendButton: {
    backgroundColor: '#128C7E',
  },
});

export default editBannerStyles;