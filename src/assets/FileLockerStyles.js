import { StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

const { width } = Dimensions.get('window');
const guidelineBaseWidth = 475;
const scale = size => (width / guidelineBaseWidth) * size;

const styles = StyleSheet.create({

  // ─── LAYOUT ───────────────────────────────────────────────────────────────

  safeArea: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    paddingTop: 0,
  },

  mainContent: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 20,
  },

  centeredContainer: {
    alignItems: 'center',
  },

  // ─── MENU & DRAWER ────────────────────────────────────────────────────────

  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : Spacing.md,
    left: Spacing.md,
    zIndex: 10,
    padding: Spacing.sm + 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
  },

  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlayDark,
    zIndex: 98,
  },

  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Colors.backgroundInput,
    zIndex: 99,
    borderRightWidth: 1,
    borderRightColor: Colors.borderLight,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight,
  },

  // ─── CARD ─────────────────────────────────────────────────────────────────

  card: {
    width: '100%',
    backgroundColor: Colors.backgroundInput,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  // ─── TYPOGRAPHY ───────────────────────────────────────────────────────────

  title: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    marginBottom: Spacing.xs + 4,
    textAlign: 'center',
    fontFamily: Fonts.family.primary,
  },

  subtitle: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.md,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    fontFamily: Fonts.family.primary,
  },

  // ─── INPUT ────────────────────────────────────────────────────────────────

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  inputIcon: {
    marginRight: Spacing.sm + 4,
  },

  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: scale(Fonts.size.md),
    lineHeight: scale(Fonts.size.md * 1.3),
    paddingVertical: scale(6),
    minHeight: scale(40),
    fontFamily: Fonts.family.primary,
  },

  // ─── BUTTON ───────────────────────────────────────────────────────────────

  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  buttonText: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
  },

  buttonIcon: {
    marginLeft: Spacing.sm,
  },

  // ─── BOTTOM SECTION ───────────────────────────────────────────────────────

  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.md,
    backgroundColor: Colors.backgroundCard,
    borderTopWidth: 1,
    borderColor: Colors.borderLight,
  },

  bottomButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 10,
  },

  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: 50,
    justifyContent: 'center',
    backgroundColor: Colors.textSecondary,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  browseButton: {
    backgroundColor: Colors.info,
  },

  fileButton: {
    backgroundColor: Colors.success,
  },

  bottomButtonText: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
    marginLeft: Spacing.sm,
    fontFamily: Fonts.family.primary,
  },

  // ─── FILE ITEM ────────────────────────────────────────────────────────────

  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundInput,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm + 4,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  fileIcon: {
    marginRight: Spacing.md,
  },

  fileInfo: {
    flex: 1,
  },

  fileNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  fileName: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    flexShrink: 1,
    fontFamily: Fonts.family.primary,
  },

  fileMeta: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.xs,
    marginTop: Spacing.xs,
    fontFamily: Fonts.family.primary,
  },

  lockIcon: {
    marginLeft: Spacing.sm,
  },

  // ─── EMPTY STATE ──────────────────────────────────────────────────────────

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.md,
    marginTop: Spacing.md,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
  },

  // ─── MODAL ────────────────────────────────────────────────────────────────

  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },

  modalTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.lg + 2,
    fontWeight: Fonts.weight.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm + 4,
    fontFamily: Fonts.family.primary,
  },

  modalFileName: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontFamily: Fonts.family.primary,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm + 4,
    marginTop: 20,
  },

  modalButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.overlayDark,
    padding: 20,
  },

  alertMessage: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontFamily: Fonts.family.primary,
    lineHeight: 20,
  },

  // ─── PASSWORD INPUT ───────────────────────────────────────────────────────

  passwordInput: {
    backgroundColor: Colors.backgroundCard,
    color: Colors.textPrimary,
    borderRadius: 12,
    padding: Spacing.sm + 6,
    marginBottom: Spacing.md,
    fontSize: Fonts.size.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    fontFamily: Fonts.family.primary,
  },

  passwordUsedText: {
    color: Colors.danger,
    fontSize: Fonts.size.xs,
    marginTop: -8,
    marginBottom: Spacing.sm + 4,
    textAlign: 'center',
    fontFamily: Fonts.family.primary,
  },

  // ─── BUTTONS (CANCEL / CONFIRM / REMOVE) ──────────────────────────────────

  cancelButton: {
    backgroundColor: Colors.danger,
  },

  confirmButton: {
    backgroundColor: Colors.success,
  },

  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: Fonts.weight.medium,
    fontSize: Fonts.size.md,
    fontFamily: Fonts.family.primary,
  },

  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: Fonts.weight.medium,
    fontSize: Fonts.size.md,
    fontFamily: Fonts.family.primary,
  },

  removePasswordButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  removePasswordText: {
    color: Colors.danger,
    textAlign: 'center',
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
  },

  restoreButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    alignItems: 'center',
  },

  restoreButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ─── OVERLAY ──────────────────────────────────────────────────────────────

  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(61, 52, 52, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },

  overlayContent: {
    width: '85%',
    backgroundColor: Colors.backgroundInput,
    borderRadius: Spacing.md,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },

  overlayTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    marginBottom: Spacing.sm + 4,
    textAlign: 'center',
    fontFamily: Fonts.family.primary,
  },

  overlayText: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.md,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    fontFamily: Fonts.family.primary,
  },

  overlayInput: {
    backgroundColor: Colors.backgroundCard,
    color: Colors.textPrimary,
    borderRadius: 12,
    padding: Spacing.md,
    width: '100%',
    fontSize: Fonts.size.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    fontFamily: Fonts.family.primary,
  },

  overlayButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.sm + 4,
  },

  overlayButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },

  overlayCancelButton: {
    backgroundColor: Colors.textSecondary,
  },

  overlaySubmitButton: {
    backgroundColor: Colors.primary,
  },

  overlayButtonText: {
    color: '#FFFFFF',
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
  },

  // ─── PROCESSING OVERLAY ───────────────────────────────────────────────────

  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },

  processingBox: {
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },

  processingText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },

  // ─── STORAGE SELECTION MODAL ──────────────────────────────────────────────

  storageModalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    width: '90%',
    maxWidth: 420,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },

  storageModalTitle: {
    color: '#FFFFFF',
    fontSize: Fonts.size.xl + 4,
    fontWeight: Fonts.weight.bold,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
    fontFamily: Fonts.family.primary,
  },

  storageModalSubtitle: {
    color: '#94A3B8',
    fontSize: Fonts.size.sm + 1,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontFamily: Fonts.family.primary,
  },

  storageOptionsContainer: {
    maxHeight: 420,
  },

  storageOptionEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },

  storageOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  storageOptionContent: {
    flex: 1,
  },

  storageOptionTitle: {
    color: '#FFFFFF',
    fontSize: Fonts.size.md + 1,
    fontWeight: Fonts.weight.semiBold,
    marginBottom: 2,
    fontFamily: Fonts.family.primary,
  },

  storageOptionDescription: {
    color: '#CBD5E1',
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.regular,
    fontFamily: Fonts.family.primary,
  },

  storageCancelButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.danger,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },

  storageCancelButtonText: {
    color: '#FFFFFF',
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    letterSpacing: 0.4,
    fontFamily: Fonts.family.primary,
  },

  // ─── FILE BROWSER ─────────────────────────────────────────────────────────

  browserContainer: {
    flex: 1,
    backgroundColor: '#0B1724',
  },

  browserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B263B',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },

  browserCloseButton: {
    padding: 8,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },

  browserPathText: {
    color: '#FFFFFF',
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Fonts.family.primary,
  },

  browserListContainer: {
    padding: 8,
  },

  browserLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1724',
  },

  browserFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B263B',
    padding: 16,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  browserFileIcon: {
    marginRight: 12,
  },

  browserFileInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  browserFileName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: Fonts.family.primary,
  },

  browserFileMeta: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Fonts.family.primary,
  },

  // ─── DCIM / IMAGE GRID ────────────────────────────────────────────────────

  dcimImageItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    backgroundColor: '#1B263B',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dcimFileName: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    fontFamily: Fonts.family.primary,
  },

  imagePreviewContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },

  imagePreview: {
    width: '100%',
    height: '100%',
  },

  imageOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },

  // ─── ERROR ────────────────────────────────────────────────────────────────

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#EF4444',
    borderLeftColor: '#EF5350',
  },

  errorText: {
    color: '#FCA5A5',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
    fontFamily: Fonts.family.primary,
  },

  // ─── QUICK TOGGLE ─────────────────────────────────────────────────────────

  quickToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
  },

  quickToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },

  toggleOn: {
    backgroundColor: Colors.success,
  },

  toggleOff: {
    backgroundColor: Colors.danger,
  },

  quickCloseButton: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2E3B55',
    alignItems: 'center',
  },

  quickCloseText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default styles;