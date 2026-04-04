import { StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.backgroundInput,
    marginBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    marginTop: Spacing.md,
    fontFamily: Fonts.family.primary,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
    fontFamily: Fonts.family.primary,
  },
  settingsContainer: {
    paddingHorizontal: Spacing.lg,
  },
  settingItem: {
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
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
    marginBottom: 4,
    fontFamily: Fonts.family.primary,
  },
  settingSubtitle: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.sm,
    fontFamily: Fonts.family.primary,
  },
});
