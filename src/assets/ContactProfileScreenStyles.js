import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const profileStyles = StyleSheet.create({
  // ─── Container ───
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54',
    height: 56,
    paddingHorizontal: 4,
  },
  headerBackButton: {
    padding: 12,
  },
  headerMenuButton: {
    padding: 12,
  },

  // ─── Profile Section ───
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 48,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  phoneNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  displayNameText: {
    fontSize: 15,
    color: '#667781',
    marginBottom: 2,
  },
  onlineStatusText: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 2,
  },

  // ─── Action Buttons ───
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    gap: 32,
  },
  actionButton: {
    alignItems: 'center',
    minWidth: 56,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FAF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E0F2EF',
  },
  actionLabel: {
    fontSize: 12,
    color: '#128C7E',
    fontWeight: '500',
  },

  // ─── Section Divider ───
  sectionDivider: {
    height: 8,
    backgroundColor: '#F3F4F6',
  },

  // ─── Settings Section ───
  settingsSection: {
    backgroundColor: '#FFFFFF',
  },

  // ─── Menu Item ───
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    minHeight: 56,
  },
  menuIconContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#667781',
    marginTop: 2,
  },

  // ─── Custom Modal ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.82,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 14,
    color: '#667781',
    lineHeight: 20,
  },
  modalOptionsContainer: {
    paddingVertical: 8,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  modalOptionPressed: {
    backgroundColor: '#F3F4F6',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#128C7E',
    fontWeight: '500',
  },
  modalOptionTextDestructive: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 8,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 14,
    color: '#667781',
    fontWeight: '600',
  },
  modalConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#128C7E',
  },
  modalConfirmButtonDestructive: {
    backgroundColor: '#DC2626',
  },
  modalConfirmText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ─── Radio Option (for disappearing messages) ───
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioOuterInactive: {
    borderColor: '#D1D5DB',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#128C7E',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
});

export default profileStyles;