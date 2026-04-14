import { StyleSheet, Platform } from 'react-native';
import { Colors, Fonts, Spacing, Radii, Shadows } from './theme';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Returns safe-area-aware top padding for the header.
 *
 * Usage:  Pass the `top` value from `useSafeAreaInsets()` (react-native-safe-area-context)
 *         into your component, then add it to the header's paddingTop.
 *
 *   const insets = useSafeAreaInsets();
 *   <View style={[styles.header, { paddingTop: getHeaderTopPadding(insets.top) }]}>
 *
 * Why: Devices differ —
 *   • iOS notch / Dynamic Island: insets.top ≈ 44–59 px
 *   • Android status bar:         insets.top ≈ 24–32 px
 *   • Fullscreen / no status bar: insets.top = 0
 */
export const getHeaderTopPadding = (insetsTop = 0) =>
  Math.max(insetsTop, Spacing.md);

/**
 * Returns safe-area-aware bottom padding for scroll content.
 *
 * Usage:
 *   const insets = useSafeAreaInsets();
 *   <ScrollView contentContainerStyle={[
 *     styles.content,
 *     { paddingBottom: getScrollBottomPadding(insets.bottom) }
 *   ]}>
 *
 * Why: Gesture-nav Android / iOS home indicator sit at the bottom.
 *      Without this, the last item in the scroll is partially hidden.
 */
export const getScrollBottomPadding = (insetsBottom = 0) =>
  Spacing.lg + Math.max(insetsBottom, 0);

// ─────────────────────────────────────────────
// ACCENT COLOR HELPERS  (resolve rgba from theme)
// ─────────────────────────────────────────────
const accentBg        = 'rgba(79, 70, 229, 0.10)'; // Colors.accent at 10% opacity
const accentBorder    = 'rgba(79, 70, 229, 0.40)'; // Colors.accent at 40% opacity
const accentGlow      = 'rgba(79, 70, 229, 0.25)'; // Colors.accent at 25% opacity
const surfaceDark     = 'rgba(15, 23, 42, 0.98)';  // Header / card base surface
const surfaceCard     = 'rgba(15, 23, 42, 0.96)';  // Section card surface
const surfaceFeature  = 'rgba(15, 23, 42, 0.90)';  // Feature item surface
const featureBorder   = 'rgba(148, 163, 184, 0.40)';
const backBtnBorder   = 'rgba(148, 163, 184, 0.70)';

// ─────────────────────────────────────────────
// STYLESHEET
// ─────────────────────────────────────────────
export default StyleSheet.create({

  // ── LAYOUT ──────────────────────────────────

  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },

  gradientContainer: {
    flex: 1,
  },

  // ── HEADER ──────────────────────────────────
  /**
   * NOTE: Add dynamic `paddingTop` in your component via `getHeaderTopPadding(insets.top)`.
   * The static paddingBottom is kept here; paddingTop is intentionally omitted
   * so callers must supply it — failing loudly rather than silently clipping content.
   */
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing.md,
    paddingBottom:    Spacing.md,
    backgroundColor:  surfaceDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    ...Shadows.header,
  },

  backButton: {
    width:           36,
    height:          36,
    borderRadius:    18,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: surfaceDark,
    borderWidth:     1,
    borderColor:     backBtnBorder,
  },

  headerTitle: {
    color:        Colors.textPrimary,
    fontSize:     Fonts.size.lg,
    fontWeight:   Fonts.weight.bold,
    fontFamily:   Fonts.family.primary,
    marginLeft:   Spacing.md,
    letterSpacing: 0.4,
  },

  // ── CONTENT ─────────────────────────────────

  scrollView: {
    flex: 1,
  },

  /**
   * NOTE: Add dynamic `paddingBottom` via `getScrollBottomPadding(insets.bottom)`.
   */
  content: {
    flexGrow:  1,
    padding:   Spacing.lg,
    alignItems: 'center',
  },

  contentContainer: {
    alignItems: 'center',
    width:      '100%',
    maxWidth:   420,
  },

  // ── LOGO ────────────────────────────────────
  /**
   * `overflow: 'hidden'` on logoContainer clips the glow layer correctly on Android.
   *  Previously `zIndex: -1` on glowEffect was used, which is unreliable on Android
   *  because Android doesn't support negative z-index in the same way as iOS/web.
   *  The glow is now rendered BEFORE the logoBackground in JSX so it sits behind it
   *  naturally in paint order, with `position: 'absolute'` still doing the positioning.
   */
  logoContainer: {
    marginBottom: Spacing.xl,
    marginTop:    Spacing.md,
    alignItems:   'center',
    justifyContent: 'center',
    // Do NOT set overflow:'hidden' here — it would clip the glow that intentionally
    // bleeds outside logoBackground. The glow relies on JSX paint order instead.
  },

  logoBackground: {
    backgroundColor: accentBg,
    borderRadius:    Radii.pill,
    padding:         Spacing.lg,
    borderWidth:     1,
    borderColor:     accentBorder,
  },

  /**
   * Render this BEFORE <logoBackground> in JSX (sibling, not child) so it
   * paints underneath without needing zIndex: -1.
   *
   *   <View style={styles.logoContainer}>
   *     <View style={styles.glowEffect} />        ← rendered first (behind)
   *     <View style={styles.logoBackground}>
   *       <Icon ... />
   *     </View>
   *   </View>
   */
  glowEffect: {
    position:        'absolute',
    top:             -(Spacing.sm + Spacing.xs),   // -14
    left:            -(Spacing.sm + Spacing.xs),   // -14
    right:           -(Spacing.sm + Spacing.xs),   // -14
    bottom:          -(Spacing.sm + Spacing.xs),   // -14
    backgroundColor: accentGlow,
    borderRadius:    Radii.pill,
    // zIndex: -1 intentionally removed — use JSX render order instead
  },

  // ── TITLE ───────────────────────────────────

  titleContainer: {
    alignItems:   'center',
    marginBottom: Spacing.xl,
  },

  appName: {
    fontSize:      Fonts.size.xl,
    fontWeight:    Fonts.weight.bold,
    fontFamily:    Fonts.family.primary,
    color:         Colors.textPrimary,
    marginBottom:  Spacing.xs + 2, // ≈ 6 — closest token combination
    textAlign:     'center',
    letterSpacing: -0.3,
  },

  appNameAccent: {
    color:            Colors.primary,
    textShadowColor:  'rgba(79, 70, 229, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  versionText: {
    fontSize:   Fonts.size.xs,
    fontWeight: Fonts.weight.normal,
    fontFamily: Fonts.family.primary,
    color:      Colors.textSecondary,
    textAlign:  'center',
  },

  // ── SECTION CARDS ───────────────────────────

  sectionCard: {
    backgroundColor: surfaceCard,
    borderRadius:    Radii.xl,
    padding:         Spacing.lg,
    marginBottom:    Spacing.md + Spacing.xs,  // 20
    width:           '100%',
    borderWidth:     1,
    borderColor:     Colors.borderLight,
    ...Shadows.card,
  },

  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   Spacing.md,
  },

  sectionTitle: {
    fontSize:   Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
    color:      Colors.textPrimary,
    marginLeft: Spacing.sm,
  },

  description: {
    fontSize:   Fonts.size.sm,
    fontWeight: Fonts.weight.normal,
    fontFamily: Fonts.family.primary,
    color:      Colors.textSecondary,
    textAlign:  'left',
    lineHeight: 20,
  },

  // ── FEATURES GRID ───────────────────────────
  /**
   * `gap` (React Native ≥ 0.71) handles spacing more reliably than
   * manual `marginBottom` on items. Falls back gracefully on older RN
   * because undefined gap is simply ignored.
   *
   * `width: '48%'` is kept for broad compatibility but guarded with
   * `minWidth: 120` so very narrow phones don't over-compress items.
   */
  featuresGrid: {
    flexDirection:   'row',
    flexWrap:        'wrap',
    justifyContent:  'space-between',
    marginTop:       Spacing.md,
    gap:             Spacing.sm,  // RN ≥ 0.71; ignored on older versions
  },

  featureItem: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: surfaceFeature,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.sm + 2,  // 10 — close to sm without a new token
    borderRadius:    Radii.md,
    width:           '48%',
    minWidth:        120,               // guard against very narrow screens
    borderWidth:     1,
    borderColor:     featureBorder,
    marginBottom:    Spacing.sm,        // fallback when `gap` is unsupported
  },

  featureText: {
    fontSize:   Fonts.size.xs,
    fontWeight: Fonts.weight.normal,
    fontFamily: Fonts.family.primary,
    color:      Colors.textSecondary,
    marginLeft: Spacing.xs + 2,  // 6
    flexShrink: 1,               // prevents text overflow on narrow items
  },

  // ── CONTACT ─────────────────────────────────

  contactText: {
    fontSize:     Fonts.size.sm,
    fontFamily:   Fonts.family.primary,
    color:        Colors.textSecondary,
    textAlign:    'left',
    marginBottom: Spacing.md,
    lineHeight:   20,
  },

  contactLinkContainer: {
    marginVertical: Spacing.sm,
    backgroundColor: accentBg,
    borderRadius:   Radii.md,
    padding:        Spacing.md,
    borderWidth:    1,
    borderColor:    accentBorder,
  },

  contactLinkContent: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
  },

  contactLink: {
    fontSize:   Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
    color:      Colors.primary,
    marginLeft: Spacing.sm,
  },

  // ── FOOTER ──────────────────────────────────

  footerSpacer: {
    height: Spacing.lg,
  },

  footerLine: {
    width:           '60%',
    alignSelf:       'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom:    Spacing.sm,
  },

  copyrightContainer: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   Spacing.lg,
  },

  copyrightText: {
    fontSize:   Fonts.size.xs,
    fontWeight: Fonts.weight.normal,
    fontFamily: Fonts.family.primary,
    color:      Colors.textSecondary,
    marginLeft: Spacing.xs + 2,  // 6
  },
});