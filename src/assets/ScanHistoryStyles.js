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
  header: {
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.sm,
    marginTop: Spacing.xs,
    fontFamily: Fonts.family.primary,
  },
  historyContainer: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundInput,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  historyContent: {
    flex: 1,
  },
  historyDate: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    marginBottom: 4,
    fontFamily: Fonts.family.primary,
  },
  historyResult: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.sm,
    fontFamily: Fonts.family.primary,
  },
  threatsFound: {
    color: Colors.warning,
    fontSize: Fonts.size.sm,
    marginTop: Spacing.xs,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
  },
});
