import { StyleSheet, Platform } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

/**
 * Base content height of the header row (back button + title).
 * The status bar spacer height (insets.top) is added on top of this
 * dynamically in the screen component — this value represents the
 * visible content row only.
 */
export const HEADER_HEIGHT = 60;

/**
 * Centralised font-family — avoids repeating the Platform ternary on every
 * text style.
 */
const FONT_FAMILY = Platform.OS === 'ios' ? 'System' : 'Roboto';

/**
 * Shared input padding used by both subjectInput and textInput.
 * Extracted to remove duplication.
 */
const INPUT_PADDING_VERTICAL = 12;
const INPUT_PADDING_HORIZONTAL = 14;

/**
 * Shared bottom margin used by inputLabel and labelRow.
 */
const LABEL_MARGIN_BOTTOM = 6;

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },

  gradient: {
    flex: 1,
  },

  /* ===== HEADER ===== */
  /*
    Outer shell — holds the invisible status-bar spacer (height: insets.top,
    set inline) and the visible headerContent row below it.
    No fixed height here; height is determined by its two children.
  */
  header: {
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },

  /*
    Inner content row — back button and title live here.
    Fixed height so the absolute-positioned back button always centres
    within this row regardless of the inset spacer above it.
  */
  headerContent: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: FONT_FAMILY,
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
    fontFamily: FONT_FAMILY,
  },

  description: {
    fontSize: Fonts.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
    fontFamily: FONT_FAMILY,
  },

  /* ===== INPUTS ===== */
  inputContainer: {
    width: '100%',
    marginBottom: Spacing.lg,
  },

  inputLabel: {
    color: Colors.textPrimary,
    marginBottom: LABEL_MARGIN_BOTTOM,
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
    fontFamily: FONT_FAMILY,
  },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LABEL_MARGIN_BOTTOM,
  },

  subjectInput: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: 14,
    paddingVertical: INPUT_PADDING_VERTICAL,
    paddingHorizontal: INPUT_PADDING_HORIZONTAL,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    fontSize: Fonts.size.sm,
    fontFamily: FONT_FAMILY,
  },

  textInput: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: 14,
    paddingVertical: INPUT_PADDING_VERTICAL,
    paddingHorizontal: INPUT_PADDING_HORIZONTAL,
    minHeight: 130,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    fontSize: Fonts.size.sm,
    fontFamily: FONT_FAMILY,
  },

  charCount: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.xs,
    textAlign: 'right',
    fontFamily: FONT_FAMILY,
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
    fontFamily: FONT_FAMILY,
  },

  starsRow: {
    flexDirection: 'row',
  },

  /*
    Moved from an inline style inside the .map() callback so it is not
    re-created on every render cycle.
  */
  starIcon: {
    marginHorizontal: 4,
  },

  /* ===== SUBMIT BUTTON ===== */
  submitButton: {
    width: '100%',
    borderRadius: 25,
    /*
      overflow: 'hidden' is on the TouchableOpacity so the Android ripple
      effect is correctly clipped to the border radius.
    */
    overflow: 'hidden',
    marginTop: Spacing.md,
  },

  submitGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 25,
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: Fonts.weight.medium,
    marginLeft: 8,
    fontSize: Fonts.size.md,
    fontFamily: FONT_FAMILY,
  },
});