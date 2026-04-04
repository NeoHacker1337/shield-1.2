import { StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

const HEADER_HEIGHT = 60;

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },

  gradient: {
    flex: 1,
  },

  /* ===== HEADER ===== */
  header: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },

  backButton: {
    position: 'absolute',
    left: Spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.7)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },

  headerTitle: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.bold,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },

  /* ===== CONTENT ===== */
  scrollContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  content: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },

  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    width: '100%',
  },

  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(66, 165, 245, 0.12)',
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    marginBottom: Spacing.md,
  },

  title: {
    fontSize: Fonts.size.xl,
    color: Colors.textPrimary,
    fontWeight: Fonts.weight.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },

  description: {
    fontSize: Fonts.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },

  inputContainer: {
    width: '100%',
    marginBottom: Spacing.lg,
  },

  inputLabel: {
    color: Colors.textPrimary,
    marginBottom: 6,
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
  },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  subjectInput: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  textInput: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 130,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },

  charCount: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.xs,
    textAlign: 'right',
  },

  /* ===== RATING ===== */
  starContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    width: '100%',
  },

  ratingLabel: {
    color: Colors.textPrimary,
    marginBottom: 8,
    fontSize: Fonts.size.sm,
  },

  starsRow: {
    flexDirection: 'row',
  },

  /* ===== SUBMIT BUTTON ===== */
  submitButton: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },

  submitGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: Fonts.weight.medium,
    marginLeft: 8,
    fontSize: Fonts.size.md,
  },
});
