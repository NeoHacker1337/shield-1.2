import { StyleSheet } from 'react-native';

const BRAND_BLUE = '#0D47C9';

export const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: BRAND_BLUE,
    },
    container: {
        flex: 1,
        backgroundColor: BRAND_BLUE,
    },
    header: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        marginHorizontal: 8,
    },
    headerRightSpace: {
        width: 40,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingVertical: 28,
        alignItems: 'center',
        elevation: 8,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: BRAND_BLUE,
        marginBottom: 8,
    },
    cardDescription: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        marginBottom: 24,
    },
    qrContainer: {
        width: '100%',
        minHeight: 300,
        borderRadius: 16,
        backgroundColor: '#F8F9FB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorContainer: {
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 15,
        color: '#999',
        marginTop: 10,
    },
    linkContainer: {
        marginTop: 20,
        width: '100%',
        backgroundColor: '#F0F4FF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    linkLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: BRAND_BLUE,
        marginBottom: 4,
    },
    linkText: {
        fontSize: 13,
        color: '#555',
        textAlign: 'center',
    },
});