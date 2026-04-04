import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Fonts, Spacing } from './theme.js';

const { width, height } = Dimensions.get('window');

export default StyleSheet.create({

  // Safe Area & Container
  safeArea: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  // Header with Back Button
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
  },

  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backArrow: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginLeft: -2,
  },

  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.bold,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },

  headerSpacer: {
    width: 44,
  },

  // Icon Section
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },

  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.borderAccent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  iconText: {
    fontSize: 36,
  },

  // Title Section
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },

  mainTitle: {
    fontSize: Fonts.size.xxl,
    fontWeight: Fonts.weight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },

  subTitle: {
    fontSize: Fonts.size.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },

  // Question Cards
  questionCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },

  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },

  questionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },

  questionNumberText: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.bold,
    color: Colors.textPrimary,
  },

  questionLabel: {
    fontSize: Fonts.size.xs,
    color: Colors.secondary,
    fontWeight: Fonts.weight.bold,
    letterSpacing: 1,
  },

  questionText: {
    fontSize: Fonts.size.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    lineHeight: 24,
    fontWeight: Fonts.weight.medium,
  },

  // Input Field
  input: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Fonts.size.md,
    color: Colors.textPrimary,
    fontFamily: Fonts.family.primary,
  },

  // Verify Button
  verifyButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  verifyButtonDisabled: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.5,
    shadowOpacity: 0,
  },

  verifyButtonText: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.bold,
    color: Colors.backgroundDark,
    letterSpacing: 1.5,
  },

  // Cancel Button
  cancelButton: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },

  cancelText: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
  },

  // Footer
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },

  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },

  securityIcon: {
    fontSize: 14,
    marginRight: 6,
  },

  footerText: {
    color: Colors.secondary,
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.bold,
    letterSpacing: 0.5,
  },

});