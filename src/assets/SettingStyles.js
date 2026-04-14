/**
 * HomeScreen / Dashboard Styles
 *
 * Safe-area integration:
 *   Install:  yarn add react-native-safe-area-context
 *   Wrap app: <SafeAreaProvider> in App.jsx
 *   Consume:  const insets = useSafeAreaInsets(); (in each screen component)
 *
 * Then apply the exported helper functions where noted.
 */
import { StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing, Radii, Shadows } from './theme';

// ─────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────

/**
 * Width of the side drawer panel.
 * Defined here (not in theme) because it is layout-specific, not a brand token.
 * Adjust to suit your design — 80% of screen width is a common mobile pattern.
 */
export const DRAWER_WIDTH = 280;

/**
 * Minimum accessible tap-target size (Apple HIG & Material Design both recommend 44pt).
 */
const MIN_TAP_TARGET = 44;

// ─────────────────────────────────────────────────────────────
// TOGGLE GEOMETRY CONSTANTS
//
// Keeping these in one place means changing the toggle size
// automatically recalculates knob travel — no manual hunting.
// ─────────────────────────────────────────────────────────────

/** Outer track dimensions */
export const TOGGLE_WIDTH    = 56;
export const TOGGLE_HEIGHT   = 32;
export const TOGGLE_PADDING  = 3;   // inner padding on each side
export const TOGGLE_RADIUS   = TOGGLE_HEIGHT / 2;

/** Knob dimensions */
export const KNOB_SIZE   = 26;
export const KNOB_RADIUS = KNOB_SIZE / 2;

/**
 * How far the knob travels when switched ON.
 *
 * Formula:  track width  −  knob size  −  (padding × 2)
 *           56           −  26         −  (3 × 2)
 *           = 24
 *
 * Bug fix: was previously hardcoded as 23, which left a 1px gap
 * between the knob and the right inner edge of the track.
 */
export const KNOB_TRAVEL = TOGGLE_WIDTH - KNOB_SIZE - TOGGLE_PADDING * 2;

// ─────────────────────────────────────────────────────────────
// SAFE-AREA HELPERS
//
// These helpers accept `insets` values from useSafeAreaInsets()
// and return the correct padding for each edge.
//
// Why functions instead of static values:
//   Insets differ per device AND per orientation.
//   Static values (e.g. paddingTop: 60) silently break on
//   devices with different status bar / notch heights.
// ─────────────────────────────────────────────────────────────

/**
 * Top padding for scrollable content areas (below the header/menu button).
 *
 * Usage in component:
 *   const insets = useSafeAreaInsets();
 *   <ScrollView contentContainerStyle={[
 *     styles.contentContainer,
 *     { paddingTop: getContentTopPadding(insets.top) }
 *   ]}>
 *
 * @param {number} insetsTop - insets.top from useSafeAreaInsets()
 * @returns {number}
 */
export const getContentTopPadding = (insetsTop = 0) =>
  // MIN_TAP_TARGET accounts for the menu button height sitting above content
  Math.max(insetsTop, 0) + MIN_TAP_TARGET + Spacing.md;

/**
 * Bottom padding for scrollable content areas.
 * Prevents last items being hidden behind gesture nav bar / home indicator.
 *
 * Usage in component:
 *   const insets = useSafeAreaInsets();
 *   <ScrollView contentContainerStyle={[
 *     styles.contentContainer,
 *     { paddingBottom: getContentBottomPadding(insets.bottom) }
 *   ]}>
 *
 * @param {number} insetsBottom - insets.bottom from useSafeAreaInsets()
 * @returns {number}
 */
export const getContentBottomPadding = (insetsBottom = 0) =>
  Spacing.xl + Math.max(insetsBottom, 0);

/**
 * Top offset for the floating menu button.
 * Pushes it below the status bar / notch on all devices.
 *
 * Usage in component:
 *   const insets = useSafeAreaInsets();
 *   <TouchableOpacity style={[
 *     styles.menuButton,
 *     { top: getMenuButtonTopOffset(insets.top) }
 *   ]}>
 *
 * @param {number} insetsTop - insets.top from useSafeAreaInsets()
 * @returns {number}
 */
export const getMenuButtonTopOffset = (insetsTop = 0) =>
  Math.max(insetsTop, Spacing.md);

/**
 * Returns contentContainerStyle additions for the drawer's inner scroll/content,
 * so drawer content doesn't collide with status bar (top) or gesture nav (bottom).
 *
 * Usage in component:
 *   const insets = useSafeAreaInsets();
 *   <View style={[styles.drawerInnerContent, getDrawerInsets(insets)]}>
 *
 * @param {{ top: number, bottom: number }} insets
 * @returns {{ paddingTop: number, paddingBottom: number }}
 */
export const getDrawerInsets = (insets = { top: 0, bottom: 0 }) => ({
  paddingTop:    Math.max(insets.top,    Spacing.lg),
  paddingBottom: Math.max(insets.bottom, Spacing.lg),
});

// ─────────────────────────────────────────────────────────────
// SHARED STYLE FRAGMENTS
// (not valid StyleSheet entries on their own — spread into rules)
// ─────────────────────────────────────────────────────────────

/**
 * Shared shadow for toggle switches.
 * Only the `shadowColor` differs between variants — spread this and override.
 *
 * Before: identical shadow block copy-pasted in `toggleOn` and `toggleOnAppIcon`.
 * After:  defined once, overridden only where needed.
 */
const toggleShadow = {
  shadowOffset:  { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius:  6,
  elevation:     5,
};

// ─────────────────────────────────────────────────────────────
// STYLESHEET
// ─────────────────────────────────────────────────────────────
export default StyleSheet.create({

  // ── LAYOUT ────────────────────────────────────────────────

  /**
   * Root container for the screen.
   *
   * Bug fix: `mainContent` was a 100% duplicate of `container`.
   * Removed `mainContent` — use `container` everywhere instead.
   * If you need a semantic distinction (e.g. for animated transitions),
   * add it back explicitly rather than duplicating styles.
   */
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },

  // ── DRAWER ────────────────────────────────────────────────

  /**
   * Full-screen semi-transparent overlay behind the open drawer.
   * Tapping it should close the drawer.
   */
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlayDark,
    zIndex: 98,
  },

  /**
   * The sliding drawer panel itself.
   *
   * NOTE: Apply `getDrawerInsets(insets)` to the *inner content* view
   * inside the drawer (not to this container) so padding adjusts to
   * safe areas while the background color still fills edge-to-edge.
   *
   * Width is controlled by the DRAWER_WIDTH export above so animated
   * open/close logic can reference the same value.
   */
  drawerContainer: {
    position:        'absolute',
    top:             0,
    bottom:          0,
    left:            0,
    width:           DRAWER_WIDTH,
    backgroundColor: Colors.backgroundInput,
    zIndex:          99,
    borderRightWidth: 1,
    borderRightColor: Colors.borderLight,
    // Shadow: using #000 base color is standard practice.
    // A colored shadow (Colors.primary) is decorative — kept but noted.
    ...Shadows.card,
    shadowColor:    Colors.primary,  // intentional brand accent shadow
    shadowOffset:   { width: 4, height: 0 },
  },

  /**
   * Inner content wrapper for the drawer.
   * Apply getDrawerInsets(insets) here in your component.
   */
  drawerInnerContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },

  // ── MENU BUTTON ───────────────────────────────────────────

  /**
   * Floating hamburger / menu button overlaid on screen content.
   *
   * Bug fix: `top` and `left` were hardcoded to 16 — collides with
   * status bar on many devices. Apply `getMenuButtonTopOffset(insets.top)`
   * to override `top` dynamically in your component.
   *
   * Min size set to MIN_TAP_TARGET (44pt) to meet accessibility guidelines.
   */
  menuButton: {
    position:        'absolute',
    top:             Spacing.md,      // override with getMenuButtonTopOffset(insets.top)
    left:            Spacing.md,
    zIndex:          10,
    minWidth:        MIN_TAP_TARGET,
    minHeight:       MIN_TAP_TARGET,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius:    Radii.md,
  },

  // ── CONTENT AREA ──────────────────────────────────────────

  /**
   * contentContainer: applied to ScrollView's contentContainerStyle.
   *
   * Bug fixes:
   *   1. `paddingTop: 60`  → static value replaced with getContentTopPadding()
   *   2. `paddingBottom: 40` → static value replaced with getContentBottomPadding()
   *   3. `minHeight: screenHeight` → stale after rotation; replaced with
   *      `flexGrow: 1` which achieves the same "fill the scroll area" effect
   *      without depending on a dimension snapshot.
   */
  contentContainer: {
    flexGrow:          1,                // fills scroll area; replaces minHeight: screenHeight
    paddingHorizontal: Spacing.lg,
    paddingTop:        MIN_TAP_TARGET + Spacing.lg,  // static fallback; override with helper
    paddingBottom:     Spacing.xl,                   // static fallback; override with helper
  },

  // ── TYPOGRAPHY ────────────────────────────────────────────

  headerTitle: {
    color:        Colors.textPrimary,
    fontSize:     Fonts.size.xl,
    fontWeight:   Fonts.weight.bold,
    fontFamily:   Fonts.family.primary,
    marginBottom: Spacing.lg,
    textAlign:    'center',
  },

  sectionTitle: {
    color:        Colors.textSecondary,
    fontSize:     Fonts.size.lg,
    fontWeight:   Fonts.weight.bold,
    fontFamily:   Fonts.family.primary,
    marginBottom: Spacing.md,
  },

  // ── SECTIONS ──────────────────────────────────────────────

  section: {
    marginBottom: Spacing.xl,
  },

  // ── SECURITY CARDS ────────────────────────────────────────

  securityCards: {
    gap: Spacing.sm,
  },

  /**
   * Individual security feature row card.
   * Shadow uses Colors.primary as accent — intentional decorative choice.
   */
  securityCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radii.lg,
    padding:         Spacing.lg,
    borderWidth:     1,
    borderColor:     Colors.borderLight,
    shadowColor:     Colors.primary,
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.2,
    shadowRadius:    16,
    elevation:       10,
  },

  /**
   * Flex container for title + toggle, sitting to the right of the icon.
   */
  securityText: {
    flex:           1,
    marginLeft:     Spacing.md,
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },

  /**
   * Bug fix: added `flexShrink: 1` so long titles compress rather than
   * overflowing into the toggle area on narrow screens.
   */
  securityTitle: {
    color:      Colors.textPrimary,
    fontSize:   Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
    flexShrink: 1,   // prevents overflow into toggle on narrow screens
    marginRight: Spacing.sm,
  },

  // ── TOGGLE SWITCH ─────────────────────────────────────────

  toggleContainer: {
    flexDirection: 'row',
    alignItems:    'center',
  },

  toggleText: {
    color:       Colors.textSecondary,
    fontSize:    Fonts.size.sm,
    fontWeight:  Fonts.weight.medium,
    fontFamily:  Fonts.family.primary,
    marginRight: Spacing.sm,
  },

  /**
   * Toggle track (the pill background).
   * Dimensions driven by TOGGLE_* constants above.
   */
  toggleSwitch: {
    width:          TOGGLE_WIDTH,
    height:         TOGGLE_HEIGHT,
    borderRadius:   TOGGLE_RADIUS,
    justifyContent: 'center',
    padding:        TOGGLE_PADDING,
  },

  /**
   * ON state — primary blue.
   * Shadow extracted to `toggleShadow` to avoid duplication with toggleOnAppIcon.
   */
  toggleOn: {
    backgroundColor: Colors.primary,
    ...toggleShadow,
    shadowColor: Colors.primary,
  },

  /**
   * ON state — warning/amber variant (e.g. app icon customisation toggle).
   * Shares shadow shape with `toggleOn`; only color differs.
   */
  toggleOnAppIcon: {
    backgroundColor: Colors.warning,
    ...toggleShadow,
    shadowColor: Colors.warning,
  },

  /** OFF state — dark background with subtle border */
  toggleOff: {
    backgroundColor: Colors.backgroundDark,
    borderWidth:     1,
    borderColor:     Colors.borderLight,
  },

  /** Knob base — shared geometry */
  toggleKnob: {
    width:           KNOB_SIZE,
    height:          KNOB_SIZE,
    borderRadius:    KNOB_RADIUS,
    backgroundColor: Colors.textPrimary,
  },

  /**
   * Bug fix: was `translateX: 23`.
   *
   * Correct value = TOGGLE_WIDTH - KNOB_SIZE - (TOGGLE_PADDING * 2)
   *               = 56 - 26 - 6 = 24
   *
   * The knob was stopping 1px short of the right inner edge.
   * Now uses the KNOB_TRAVEL constant so geometry stays consistent
   * if toggle dimensions are ever changed.
   */
  knobOn: {
    transform: [{ translateX: KNOB_TRAVEL }],
  },

  /** OFF state — knob at left edge with muted color */
  knobOff: {
    transform:       [{ translateX: 0 }],
    backgroundColor: Colors.textSecondary,
  },
});