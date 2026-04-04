import { StyleSheet, Platform } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },

  gradientContainer: {
    flex: 1,
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
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
    marginLeft: Spacing.md,
    letterSpacing: 0.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : Fonts.family.primary,
  },

  /* CONTENT */
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

  /* ICON + TITLE */
  iconContainer: {
    position: 'relative',
    marginBottom: Spacing.xl,
    marginTop: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBackground: {
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    borderRadius: 999,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.45)',
  },

  glowEffect: {
    position: 'absolute',
    top: -14,
    left: -14,
    right: -14,
    bottom: -14,
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    borderRadius: 999,
    zIndex: -1,
  },

  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },

  title: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : Fonts.family.primary,
  },

  titleAccent: {
    color: '#FACC15',
    textShadowColor: 'rgba(250, 204, 21, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  description: {
    fontSize: Fonts.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: Fonts.weight.normal,
    paddingHorizontal: Spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'System' : Fonts.family.primary,
  },

  /* LICENSE CARD */
  licenseCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  licenseSectionTitle: {
    fontSize: Fonts.size.sm,
    color: Colors.textSecondary,
    fontWeight: Fonts.weight.medium,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },

  licenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },

  licenseLabel: {
    fontSize: Fonts.size.xs,
    color: Colors.textSecondary,
  },

  licenseValue: {
    fontSize: Fonts.size.sm,
    color: Colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },

  licenseMonoValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: Fonts.size.xs,
  },

  licenseDivider: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },

  /* PREMIUM FEATURES */
  featureContainer: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },

  featureTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : Fonts.family.primary,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingVertical: 4,
  },

  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },

  featureTextContainer: {
    flex: 1,
  },

  featureText: {
    fontSize: Fonts.size.sm,
    color: Colors.textPrimary,
    fontWeight: Fonts.weight.medium,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : Fonts.family.primary,
  },

  featureSubtext: {
    fontSize: Fonts.size.xs,
    color: Colors.textSecondary,
    fontWeight: Fonts.weight.normal,
    fontFamily: Platform.OS === 'ios' ? 'System' : Fonts.family.primary,
  },

  /* FREE FEATURES */
  freeFeaturesContainer: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  freeFeatureItem: {
    marginBottom: 6,
  },

  freeFeatureText: {
    fontSize: Fonts.size.sm,
    color: Colors.textPrimary,
  },

  freeFeatureMeta: {
    fontSize: Fonts.size.xs,
    color: Colors.textSecondary,
  },

  /* CTA BUTTON */
  premiumButton: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
    marginBottom: Spacing.md,
  },

  premiumButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },

  premiumButtonIcon: {
    marginRight: Spacing.sm,
  },

  premiumButtonText: {
    color: '#111827',
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    marginRight: Spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'System' : Fonts.family.primary,
  },

  ctaText: {
    fontSize: Fonts.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'normal',
    fontWeight: Fonts.weight.normal,
    fontFamily: Platform.OS === 'ios' ? 'System' : Fonts.family.primary,
  },
});
