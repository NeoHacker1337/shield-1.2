import { StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  scrollView: {
    flex: 1,
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.medium,
    marginBottom: Spacing.md,
    fontFamily: Fonts.family.primary,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundInput,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.md,
    flex: 1,
    marginLeft: Spacing.md,
    fontFamily: Fonts.family.primary,
  },
});
