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
  statusCard: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  statusTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.bold,
    marginTop: Spacing.md,
    fontFamily: Fonts.family.primary,
  },
  statusSubtitle: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.sm,
    marginTop: Spacing.sm,
    fontFamily: Fonts.family.primary,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    width: '48%',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  actionText: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    marginTop: Spacing.sm,
    fontFamily: Fonts.family.primary,
  },
});
