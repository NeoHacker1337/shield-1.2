import { StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },

  // ─── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    marginRight: Spacing.sm,
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xl,
    fontWeight: String(Fonts.weight.bold),
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  headerCount: {
    backgroundColor: Colors.primary + '33',
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.primary + '66',
  },
  headerCountText: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,
    fontWeight: String(Fonts.weight.bold),
    color: Colors.primary,
  },

  // ─── Filter Tabs ──────────────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: Colors.primary + '22',
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,
    color: Colors.textSecondary,
    fontWeight: String(Fonts.weight.medium),
  },
  filterTabTextActive: {
    color: Colors.primary,
  },

  // ─── List ─────────────────────────────────────────────────────────────────
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },

  // ─── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardExpired: {
    opacity: 0.65,
    borderColor: Colors.danger + '44',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  cardTitle: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.md,
    fontWeight: String(Fonts.weight.bold),
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // ─── Badges ───────────────────────────────────────────────────────────────
  activeBadge: {
    backgroundColor: Colors.success + '22',
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.success + '55',
  },
  activeBadgeText: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xs,
    color: Colors.success,
    fontWeight: String(Fonts.weight.bold),
  },
  expiredBadge: {
    backgroundColor: Colors.danger + '22',
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.danger + '55',
  },
  expiredBadgeText: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xs,
    color: Colors.danger,
    fontWeight: String(Fonts.weight.bold),
  },

  // ─── Info Rows ────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  infoLabel: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,
    color: Colors.textSecondary,
    width: 72,
    marginLeft: Spacing.xs,
  },
  infoValue: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,
    color: Colors.textPrimary,
    fontWeight: String(Fonts.weight.medium),
    flex: 1,
  },
  infoValueExpired: {
    color: Colors.danger,
  },
  eyeBtn: {
    padding: Spacing.xs,
  },

  // ─── Link Box ─────────────────────────────────────────────────────────────
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundInput,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  linkText: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xs,
    color: Colors.primary,
    flex: 1,
  },

  // ─── Action Buttons ───────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 8,
    backgroundColor: Colors.backgroundInput,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  deleteBtn: {
    borderColor: Colors.danger + '44',
    backgroundColor: Colors.danger + '11',
  },
  actionBtnText: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xs,
    color: Colors.primary,
    fontWeight: String(Fonts.weight.medium),
  },

  // ─── Empty State ──────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.lg,
    fontWeight: String(Fonts.weight.bold),
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },

  // ─── Loading State ────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});

export default styles;
