import { StyleSheet, Platform } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

const styles = StyleSheet.create({

    /* ── Layout ── */
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundDark,
    },

    /* ── Header ── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingBottom: 14,
        backgroundColor: Colors.backgroundCard,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
        zIndex: 10,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: Colors.backgroundDark + '30',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.family.primary,
        fontSize: Fonts.size.xl,
        fontWeight: String(Fonts.weight.bold),
        color: Colors.textPrimary,
        letterSpacing: 0.3,
    },
    headerCount: {
        backgroundColor: Colors.primary + '20',
        borderRadius: 10,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: Colors.primary + '40',
        minWidth: 28,
        alignItems: 'center',
    },
    headerCountText: {
        fontFamily: Fonts.family.primary,
        fontSize: Fonts.size.sm,
        fontWeight: String(Fonts.weight.bold),
        color: Colors.primary,
    },

    /* ── Filter Tabs ── */
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs + 2,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        backgroundColor: 'transparent',
    },
    filterTabActive: {
        backgroundColor: Colors.primary + '18',
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
        fontWeight: String(Fonts.weight.bold),
    },
    filterCount: {
        backgroundColor: Colors.borderLight,
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 1,
        minWidth: 20,
        alignItems: 'center',
    },
    filterCountActive: {
        backgroundColor: Colors.primary + '25',
    },
    filterCountText: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    filterCountTextActive: {
        color: Colors.primary,
    },

    /* ── List ── */
    listContent: {
        padding: Spacing.md,
        flexGrow: 1,
    },

    /* ── Card ── */
    card: {
        backgroundColor: Colors.backgroundCard,
        borderRadius: 16,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    cardExpired: {
        opacity: 0.6,
        borderColor: Colors.danger + '30',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    cardHeaderInfo: {
        flex: 1,
        marginLeft: 10,
    },
    cardIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    cardTitle: {
        fontFamily: Fonts.family.primary,
        fontSize: Fonts.size.md,
        fontWeight: String(Fonts.weight.bold),
        color: Colors.textPrimary,
        letterSpacing: 0.3,
    },
    cardSubtitle: {
        fontFamily: Fonts.family.primary,
        fontSize: Fonts.size.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },

    /* ── Badges ── */
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: Colors.success + '15',
        borderRadius: 8,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: Colors.success + '40',
    },
    activeBadgeText: {
        fontFamily: Fonts.family.primary,
        fontSize: Fonts.size.xs,
        color: Colors.success,
        fontWeight: String(Fonts.weight.bold),
    },
    expiredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: Colors.danger + '15',
        borderRadius: 8,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: Colors.danger + '40',
    },
    expiredBadgeText: {
        fontFamily: Fonts.family.primary,
        fontSize: Fonts.size.xs,
        color: Colors.danger,
        fontWeight: String(Fonts.weight.bold),
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.danger,
    },
    badgeDotActive: {
        backgroundColor: Colors.success,
    },

    /* ── Info Rows ── */
    divider: {
        height: 1,
        backgroundColor: Colors.borderLight,
        marginBottom: Spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    infoIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: Colors.backgroundDark + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    infoLabel: {
        fontFamily: Fonts.family.primary,
        fontSize: Fonts.size.sm,
        color: Colors.textSecondary,
        width: 68,
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
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    passwordText: {
        flex: 1,
        letterSpacing: 1,
    },
    eyeBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },

    /* ── Link Box ── */
    linkBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.backgroundInput,
        borderRadius: 10,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs + 3,
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

    /* ── Action Buttons ── */
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
        paddingVertical: Spacing.xs + 3,
        borderRadius: 10,
        backgroundColor: Colors.backgroundInput,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    actionBtnDisabled: {
        opacity: 0.5,
    },
    deleteBtn: {
        borderColor: Colors.danger + '30',
        backgroundColor: Colors.danger + '08',
    },
    actionBtnText: {
        fontFamily: Fonts.family.primary,
        fontSize: Fonts.size.xs,
        color: Colors.primary,
        fontWeight: String(Fonts.weight.medium),
    },

    /* ── Empty State ── */
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 32,
    },
    emptyIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: Colors.backgroundCard,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    emptyTitle: {
        fontFamily: Fonts.family.primary,
        fontSize: Fonts.size.lg,
        fontWeight: String(Fonts.weight.bold),
        color: Colors.textPrimary,
        marginBottom: 6,
    },
    emptySubtitle: {
        fontFamily: Fonts.family.primary,
        fontSize: Fonts.size.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },

    /* ── Loading State ── */
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    loadingIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    loadingText: {
        fontFamily: Fonts.family.primary,
        fontSize: Fonts.size.md,
        fontWeight: String(Fonts.weight.medium),
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    loadingSubText: {
        fontFamily: Fonts.family.primary,
        fontSize: Fonts.size.sm,
        color: Colors.textSecondary,
    },
});

export default styles;