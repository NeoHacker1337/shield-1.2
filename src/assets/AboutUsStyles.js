import { StyleSheet, Platform } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

/**
 * Centralised font-family value so every text style doesn't need to repeat
 * the same Platform ternary inline.
 */
const FONT_FAMILY = Platform.OS === 'ios' ? 'System' : 'Roboto';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },

  gradientContainer: {
    flex: 1,
  },

  /* ─── HEADER ─────────────────────────────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },

  backButton: {
    padding: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.7)',
  },

  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.bold,
    marginLeft: 16,
    letterSpacing: 0.4,
    fontFamily: FONT_FAMILY,
  },

  /* ─── CONTENT ────────────────────────────────────────────────────────────── */
  scrollView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    padding: Spacing.lg,
    alignItems: 'center',
  },

  contentContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
  },

  /* ─── LOGO ───────────────────────────────────────────────────────────────── */
  logoContainer: {
    position: 'relative',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoBackground: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 999,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.4)',
  },

  /**
   * The glow sits behind logoBackground because it is rendered first in the
   * JSX tree (natural stacking order). Removed `zIndex: -1` which caused
   * the element to disappear beneath the parent on Android.
   */
  glowEffect: {
    position: 'absolute',
    top: -14,
    left: -14,
    right: -14,
    bottom: -14,
    backgroundColor: 'rgba(79, 70, 229, 0.25)',
    borderRadius: 999,
  },

  /* Extracted from inline JSX to keep the component markup clean */
  logoImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },

  /* ─── TITLE ──────────────────────────────────────────────────────────────── */
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },

  appName: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
    fontFamily: FONT_FAMILY,
  },

  appNameAccent: {
    color: Colors.primary,
    textShadowColor: 'rgba(79, 70, 229, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  versionText: {
    fontSize: Fonts.size.xs,
    color: Colors.textSecondary,
    fontWeight: Fonts.weight.normal,
    textAlign: 'center',
    fontFamily: FONT_FAMILY,
  },

  /* ─── SECTION CARDS ──────────────────────────────────────────────────────── */
  sectionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
    fontFamily: FONT_FAMILY,
  },

  description: {
    fontSize: Fonts.size.sm,
    color: Colors.textSecondary,
    textAlign: 'left',
    lineHeight: 20,
    fontWeight: Fonts.weight.normal,
    fontFamily: FONT_FAMILY,
  },

  /* ─── FEATURES GRID ──────────────────────────────────────────────────────── */
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    width: '48%',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    marginBottom: 8,
  },

  featureText: {
    fontSize: Fonts.size.xs,
    color: Colors.textSecondary,
    marginLeft: 6,
    fontWeight: Fonts.weight.normal,
    fontFamily: FONT_FAMILY,
  },

  /* ─── CONTACT (styles kept; section currently commented out in JSX) ───────── */
  contactText: {
    fontSize: Fonts.size.sm,
    color: Colors.textSecondary,
    textAlign: 'left',
    marginBottom: Spacing.md,
    lineHeight: 20,
    fontFamily: FONT_FAMILY,
  },

  contactLinkContainer: {
    marginVertical: Spacing.sm,
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.4)',
  },

  contactLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  contactLink: {
    fontSize: Fonts.size.sm,
    color: Colors.primary,
    fontWeight: Fonts.weight.medium,
    marginLeft: Spacing.sm,
    fontFamily: FONT_FAMILY,
  },

  /* ─── FOOTER ─────────────────────────────────────────────────────────────── */
  footerSpacer: {
    height: Spacing.lg,
  },

  footerLine: {
    width: '60%',
    alignSelf: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },

  copyrightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },

  copyrightText: {
    fontSize: Fonts.size.xs,
    color: Colors.textSecondary,
    fontWeight: Fonts.weight.normal,
    marginLeft: 6,
    fontFamily: FONT_FAMILY,
  },
});