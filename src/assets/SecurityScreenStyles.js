/**
 * SecurityScreen Styles
 *
 * Safe-area integration via react-native-safe-area-context.
 *
 * In your SecurityScreen component:
 *   const insets = useSafeAreaInsets();
 *
 * Then apply the exported helpers where noted in the comments below.
 */
import { StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing, Radii, Shadows } from './theme';

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Width of the side drawer.
 * Export this so SecurityScreen's animation logic uses the same value.
 */
export const DRAWER_WIDTH = 280;

/**
 * Minimum accessible tap-target (Apple HIG + Material Design: 44pt).
 */
const MIN_TAP_TARGET = 44;

// ─────────────────────────────────────────────────────────────────────────────
// SAFE-AREA HELPERS
//
// Pass values from useSafeAreaInsets() into these helpers in your component.
// They replace the previous hardcoded paddingTop: 60 / paddingBottom: 40.
//
// Why not static values?
//   Status bar height, notch height, and gesture nav bar height all vary
//   per device and orientation. Static values silently break on many devices.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Top padding for the scroll content area (below status bar + menu button).
 *
 * Usage:
 *   <ScrollView contentContainerStyle={[
 *     styles.contentContainer,
 *     { paddingTop: getContentTopPadding(insets.top) }
 *   ]}>
 *
 * @param {number} insetsTop  — insets.top from useSafeAreaInsets()
 * @returns {number}
 */
export const getContentTopPadding = (insetsTop = 0) =>
  Math.max(insetsTop, 0) + MIN_TAP_TARGET + Spacing.md;

/**
 * Bottom padding for the scroll content area (above gesture nav bar).
 *
 * Usage:
 *   <ScrollView contentContainerStyle={[
 *     styles.contentContainer,
 *     { paddingBottom: getContentBottomPadding(insets.bottom) }
 *   ]}>
 *
 * @param {number} insetsBottom  — insets.bottom from useSafeAreaInsets()
 * @returns {number}
 */
export const getContentBottomPadding = (insetsBottom = 0) =>
  Spacing.xl + Math.max(insetsBottom, 0);

/**
 * Top offset for the floating menu button.
 *
 * Usage:
 *   <TouchableOpacity style={[
 *     styles.menuButton,
 *     { top: getMenuButtonTopOffset(insets.top) }
 *   ]}>
 *
 * @param {number} insetsTop  — insets.top from useSafeAreaInsets()
 * @returns {number}
 */
export const getMenuButtonTopOffset = (insetsTop = 0) =>
  Math.max(insetsTop, Spacing.md);

/**
 * Safe-area insets for the inner content of the drawer.
 * Apply to the inner View *inside* drawerContainer so the background
 * fills edge-to-edge while content avoids the status bar and gesture nav.
 *
 * Usage:
 *   <View style={[styles.drawerInnerContent, getDrawerInsets(insets)]}>
 *
 * @param {{ top: number, bottom: number }} insets
 * @returns {{ paddingTop: number, paddingBottom: number }}
 */
export const getDrawerInsets = (insets = { top: 0, bottom: 0 }) => ({
  paddingTop:    Math.max(insets.top,    Spacing.lg),
  paddingBottom: Math.max(insets.bottom, Spacing.lg),
});

// ─────────────────────────────────────────────────────────────────────────────
// STYLESHEET
// ─────────────────────────────────────────────────────────────────────────────
export default StyleSheet.create({

  // ── LAYOUT ────────────────────────────────────────────────────────────────

  /**
   * Root screen container.
   *
   * Bug fix: `mainContent` was a 100% duplicate of `container` — removed.
   * Use `container` as the root View and `scrollView` for the ScrollView.
   */
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },

  /**
   * Style for the ScrollView wrapper element.
   * Replaces the removed `mainContent` duplicate.
   */
  scrollView: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },

  // ── DRAWER ────────────────────────────────────────────────────────────────

  /**
   * Full-screen semi-transparent overlay behind the open drawer.
   *
   * Render this always (not conditionally) and toggle `pointerEvents`
   * so the Animated.Value always has a mounted target:
   *
   *   <Animated.View
   *     style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
   *     pointerEvents={drawerOpen ? 'auto' : 'none'}
   *   />
   */
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlayDark,
    zIndex: 98,
  },

  /**
   * The sliding drawer panel.
   *
   * NOTE: Do NOT add paddingTop/Bottom here — apply getDrawerInsets(insets)
   * to `drawerInnerContent` instead so the background fills edge-to-edge.
   */
  drawerContainer: {
    position:         'absolute',
    top:              0,
    bottom:           0,
    left:             0,
    width:            DRAWER_WIDTH,
    backgroundColor:  Colors.backgroundInput,
    zIndex:           99,
    borderRightWidth: 1,
    borderRightColor: Colors.borderLight,
    // Intentional brand-colored shadow — decorative accent
    ...Shadows.card,
    shadowColor:  Colors.primary,
    shadowOffset: { width: 4, height: 0 },
  },

  /**
   * Inner content wrapper for the drawer.
   * Apply getDrawerInsets(insets) to this in your component.
   */
  drawerInnerContent: {
    flex:              1,
    paddingHorizontal: Spacing.md,
  },

  // ── MENU BUTTON ───────────────────────────────────────────────────────────

  /**
   * Floating hamburger button overlaid on screen content.
   *
   * Bug fix: `top: 16` was hardcoded — override with getMenuButtonTopOffset(insets.top).
   * Min size ensures 44pt accessibility tap target regardless of icon size.
   */
  menuButton: {
    position:        'absolute',
    top:             Spacing.md,      // static fallback; override with getMenuButtonTopOffset(insets.top)
    left:            Spacing.md,
    zIndex:          10,
    minWidth:        MIN_TAP_TARGET,
    minHeight:       MIN_TAP_TARGET,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius:    Radii.md,
  },

  // ── CONTENT AREA ──────────────────────────────────────────────────────────

  /**
   * Applied to ScrollView's contentContainerStyle.
   *
   * Bug fixes:
   *   1. `paddingTop: 60`      — static; override with getContentTopPadding(insets.top)
   *   2. `paddingBottom: 40`   — static; override with getContentBottomPadding(insets.bottom)
   *   3. `minHeight: screenHeight` — stale after rotation; replaced with flexGrow: 1
   */
  contentContainer: {
    flexGrow:          1,
    paddingHorizontal: Spacing.lg,
    paddingTop:        MIN_TAP_TARGET + Spacing.lg,  // static fallback
    paddingBottom:     Spacing.xl,                   // static fallback
  },

  // ── TYPOGRAPHY ────────────────────────────────────────────────────────────

  headerTitle: {
    color:        Colors.textPrimary,
    fontSize:     Fonts.size.xl,
    fontWeight:   Fonts.weight.bold,
    fontFamily:   Fonts.family.primary,
    marginBottom: Spacing.lg,
    textAlign:    'center',
  },

  // ── SECURITY CARDS ────────────────────────────────────────────────────────

  card: {
    backgroundColor: Colors.backgroundInput,
    borderRadius:    Radii.lg,              // was: 16 (magic number)
    padding:         Spacing.xl,
    marginBottom:    Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.borderLight,
    // Intentional brand-colored shadow
    ...Shadows.card,
    shadowColor: Colors.primary,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  Spacing.sm,
  },

  cardTitle: {
    color:      Colors.textPrimary,
    fontSize:   Fonts.size.lg,
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
    marginLeft: Spacing.sm,
  },

  cardDescription: {
    color:        Colors.textSecondary,
    fontSize:     Fonts.size.sm,
    fontFamily:   Fonts.family.primary,
    lineHeight:   22,
    marginBottom: Spacing.md,
  },

  passwordStatus: {
    flexDirection:   'row',
    alignItems:      'center',
    marginBottom:    Spacing.md,
    padding:         Spacing.md,        // was: Spacing.sm + 4 (inline arithmetic)
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius:    Radii.sm,
  },

  statusText: {
    marginLeft: Spacing.sm,
    fontSize:   Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
  },

  // ── CARD BUTTONS ──────────────────────────────────────────────────────────

  /**
   * Primary action button within a card (single full-width button).
   */
  cardButton: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: Colors.primary,
    borderRadius:    Radii.md,
    paddingVertical: Spacing.md,
    // Intentional brand-colored shadow
    shadowColor:     Colors.primary,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.3,
    shadowRadius:    8,
    elevation:       6,
  },

  /** Variant: passcode / success-state button */
  passcodeButton: {
    backgroundColor: Colors.success,
  },

  cardButtonText: {
    color:      Colors.textPrimary,
    fontSize:   Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
    marginLeft: Spacing.sm,
  },

  /**
   * Row of two side-by-side action buttons (e.g. Change + Remove).
   */
  cardActions: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    gap:            Spacing.sm,
  },

  /**
   * Individual button within cardActions.
   *
   * Bug fix: missing `shadowOffset` — iOS ignores shadow without it.
   */
  cardActionButton: {
    flex:            1,
    flexDirection:   'row',
    justifyContent:  'center',
    alignItems:      'center',
    borderRadius:    Radii.md,
    paddingVertical: Spacing.md,
    shadowColor:     Colors.primary,
    shadowOffset:    { width: 0, height: 4 },  // was missing — shadow invisible on iOS
    shadowOpacity:   0.2,
    shadowRadius:    6,
    elevation:       4,
  },

  changeButton: {
    backgroundColor: Colors.warning,
  },

  removeButton: {
    backgroundColor: Colors.danger,
  },

  cardActionButtonText: {
    color:      Colors.textPrimary,
    fontSize:   Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
    marginLeft: Spacing.sm,
  },

  // ── ERROR ─────────────────────────────────────────────────────────────────

  errorText: {
    color:           Colors.danger,
    textAlign:       'center',
    marginBottom:    Spacing.sm,
    fontSize:        Fonts.size.sm,
    fontWeight:      Fonts.weight.medium,
    fontFamily:      Fonts.family.primary,
    backgroundColor: 'rgba(239, 83, 80, 0.2)',
    padding:         Spacing.sm,
    borderRadius:    Radii.sm,             // was: 8 (magic number)
  },

  // ── MODALS ────────────────────────────────────────────────────────────────

  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent:  'center',
    alignItems:      'center',
  },

  /**
   * Base modal container (password modal).
   *
   * Bug fix: `modalContent` and `passcodeModalContent` shared 6/7 properties.
   * Merged into one base style. Use `passcodeModalContent` only to override
   * `maxWidth` for the narrower passcode modal:
   *
   *   // Password modal:
   *   <View style={styles.modalContent}>
   *
   *   // Passcode modal:
   *   <View style={[styles.modalContent, styles.passcodeModalContent]}>
   */
  modalContent: {
    backgroundColor: Colors.backgroundInput,
    borderRadius:    Radii.lg,
    padding:         Spacing.lg,
    width:           '90%',
    maxWidth:        400,
    // Intentional brand-colored shadow
    ...Shadows.card,
    shadowColor:     Colors.primary,
  },

  /**
   * Override: narrows maxWidth for the passcode/PIN modal.
   * Spread over modalContent: [styles.modalContent, styles.passcodeModalContent]
   */
  passcodeModalContent: {
    maxWidth: 350,
  },

  modalTitle: {
    color:        Colors.textPrimary,
    fontSize:     Fonts.size.lg,
    fontWeight:   Fonts.weight.bold,
    fontFamily:   Fonts.family.primary,
    textAlign:    'center',
    marginBottom: Spacing.sm,
  },

  modalDescription: {
    color:        Colors.textSecondary,
    fontSize:     Fonts.size.sm,
    fontFamily:   Fonts.family.primary,
    textAlign:    'center',
    marginBottom: Spacing.md,
    lineHeight:   20,
  },

  // ── PASSWORD INPUT ────────────────────────────────────────────────────────

  passwordInputContainer: {
    position:     'relative',
    marginBottom: Spacing.md,
  },

  passwordInput: {
    backgroundColor: Colors.backgroundCard,
    color:           Colors.textPrimary,
    borderRadius:    Radii.md,
    padding:         Spacing.md,
    paddingRight:    50,
    fontSize:        Fonts.size.md,
    fontFamily:      Fonts.family.primary,
    borderWidth:     1,
    borderColor:     Colors.borderLight,
  },

  passwordToggle: {
    position: 'absolute',
    right:    Spacing.md - Spacing.xs,   // 14 — close to md without a new token
    top:      Spacing.md - Spacing.xs,   // 14
    padding:  Spacing.xs,
  },

  // ── MODAL BUTTONS ─────────────────────────────────────────────────────────

  /**
   * Base button row for modals.
   *
   * Bug fix: `modalButtons` and `passcodeModalButtons` shared 3/4 properties.
   * Use `passcodeModalButtons` as an override for the passcode variant:
   *
   *   // Password modal:
   *   <View style={styles.modalButtons}>
   *
   *   // Passcode modal:
   *   <View style={[styles.modalButtons, styles.passcodeModalButtons]}>
   */
  modalButtons: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    gap:            Spacing.sm,
    marginTop:      Spacing.md,
  },

  /**
   * Override: reduces top margin for the passcode modal button row.
   * Spread over modalButtons: [styles.modalButtons, styles.passcodeModalButtons]
   */
  passcodeModalButtons: {
    marginTop: Spacing.xs,
  },

  modalButton: {
    flex:            1,
    paddingVertical: Spacing.md,
    borderRadius:    Radii.md,
    alignItems:      'center',
    shadowColor:     Colors.primary,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.2,
    shadowRadius:    6,
    elevation:       4,
  },

  cancelButton: {
    backgroundColor: Colors.textSecondary,
  },

  confirmButton: {
    backgroundColor: Colors.primary,
  },

  /**
   * Bug fix: `cancelButtonText` and `confirmButtonText` were 100% identical.
   * Merged into a single `modalButtonText` style.
   *
   * Usage:
   *   <Text style={styles.modalButtonText}>Cancel</Text>
   *   <Text style={styles.modalButtonText}>Confirm</Text>
   */
  modalButtonText: {
    color:      Colors.textPrimary,
    fontSize:   Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
  },

  // ── PASSCODE / PIN UI ─────────────────────────────────────────────────────

  passcodeDotsContainer: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
    gap:            Spacing.md,
  },

  passcodeDot: {
    width:        16,
    height:       16,
    borderRadius: Radii.pill,   // fully circular — cleaner than hardcoded 8
    borderWidth:  2,
    borderColor:  Colors.tertiary,
  },

  passcodeDotFilled: {
    backgroundColor: Colors.tertiary,
  },

  keypadContainer: {
    alignItems: 'center',
    marginTop:  Spacing.md,
  },

  keypadRow: {
    flexDirection: 'row',
    marginBottom:  Spacing.sm,
    gap:           Spacing.md,
  },

  keypadButton: {
    width:           60,
    height:          60,
    borderRadius:    30,
    backgroundColor: Colors.backgroundCard,
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.borderLight,
  },

  /** Invisible placeholder / backspace key — same size, no background */
  keypadButtonGhost: {
    width:           60,
    height:          60,
    borderRadius:    30,
    backgroundColor: Colors.transparent,
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     0,
  },

  keypadButtonText: {
    color:      Colors.textPrimary,
    fontSize:   Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
  },

  // ── FORGOT BUTTON ─────────────────────────────────────────────────────────

  /**
   * Bug fix: was using raw magic number `10` and raw color `#FF5252`.
   * Now uses theme tokens throughout.
   */
  forgotButton: {
    marginTop: Spacing.sm + 2,   // 10 — closest token combination
    alignSelf: 'flex-end',
  },

  forgotButtonText: {
    color:      Colors.danger,             // was: '#FF5252' (raw value)
    fontSize:   Fonts.size.xs + 1,        // 13 — between xs(12) and sm(14)
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
  },
});