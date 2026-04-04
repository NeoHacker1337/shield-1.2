import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

const { height: screenHeight } = Dimensions.get('window');

export default StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    minHeight: screenHeight,
  },
  container: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm + 2,
    marginRight: Spacing.md,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
  },
  progressTextActive: {
    color: Colors.textPrimary,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: Spacing.md - 6,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    padding: Spacing.xl,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.xxl,
    fontWeight: Fonts.weight.bold,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Fonts.family.primary,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
    fontFamily: Fonts.family.primary,
  },
  methodContainer: {
    marginBottom: Spacing.lg,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: Spacing.sm + 4,
  },
  methodButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
  },
  methodText: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    marginLeft: Spacing.sm + 4,
    fontFamily: Fonts.family.primary,
  },
  methodTextActive: {
    color: Colors.primary,
  },
  questionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  questionText: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.md,
    textAlign: 'center',
    fontFamily: Fonts.family.primary,
  },
  input: {
    backgroundColor: Colors.backgroundInput,
    color: Colors.textPrimary,
    padding: 18,
    borderRadius: 16,
    fontSize: Fonts.size.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    fontFamily: Fonts.family.primary,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundInput,
    borderRadius: 16,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  passwordInput: {
    flex: 1,
    color: Colors.textPrimary,
    padding: 18,
    fontSize: Fonts.size.lg,
    fontFamily: Fonts.family.primary,
  },
  eyeButton: {
    padding: 18,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.bold,
    letterSpacing: 0.5,
    fontFamily: Fonts.family.primary,
  },
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    color: Colors.primary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
  },
});
