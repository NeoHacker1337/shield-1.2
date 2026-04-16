import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Share,
    Clipboard,
    Alert,
    Linking,
    StatusBar,
    RefreshControl,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Fonts, Spacing } from '../../assets/theme';
import styles from '../../assets/AllInvitationsStyles';
import invitationService from '../../services/invitationService';
import { BASE_URL, DEFAULT_HEADERS, API_TIMEOUT } from '../../utils/config';

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Helper: Build a guest join link ──────────────────────────────────────────
const buildInvitationLink = (sessionToken) =>
    `${BASE_URL}/guest/chat/${sessionToken}`;

// ─── Helper: Map raw API item → UI-friendly shape ─────────────────────────────
const mapInvitation = (raw) => ({
    id: raw.id,
    appName: raw.guest_name ?? `Guest #${raw.id}`,
    room: raw.chat_room?.name ?? `Room ${raw.chat_room_id}`,
    password: raw.plainPassword ?? '****',
    expires: raw.expires_at ?? '',
    createdAt: raw.created_at ?? '',
    isActive: raw.is_active ?? true,
    sessionToken: raw.session_token,
    link: buildInvitationLink(raw.session_token),
    convertedUser: raw.converted_user,
    chatRoom: raw.chat_room,
});

// ─── Helper: Check expiry ─────────────────────────────────────────────────────
const isExpired = (expiresStr) => {
    try {
        if (!expiresStr) return false;
        const d = new Date(expiresStr);
        return !isNaN(d.getTime()) && d < new Date();
    } catch {
        return false;
    }
};

// ─── Format date for display ──────────────────────────────────────────────────
const formatDate = (dateStr) => {
    try {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
};

// ─── Filter Tab Component ─────────────────────────────────────────────────────
const FilterTab = memo(({ label, value, count, isActive, onPress }) => (
    <TouchableOpacity
        style={[styles.filterTab, isActive && styles.filterTabActive]}
        onPress={() => onPress(value)}
        activeOpacity={0.7}
        accessibilityLabel={`Filter by ${label}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}>
        <Text
            style={[
                styles.filterTabText,
                isActive && styles.filterTabTextActive,
            ]}>
            {label}
        </Text>
        {count !== undefined && (
            <View
                style={[
                    styles.filterCount,
                    isActive && styles.filterCountActive,
                ]}>
                <Text
                    style={[
                        styles.filterCountText,
                        isActive && styles.filterCountTextActive,
                    ]}>
                    {count}
                </Text>
            </View>
        )}
    </TouchableOpacity>
));

FilterTab.displayName = 'FilterTab';

// ─── Invitation Card ──────────────────────────────────────────────────────────
const InvitationCard = memo(({ item, onCopyLink, onShare, onOpen, onDelete }) => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const expired = isExpired(item.expires);

    const togglePassword = useCallback(() => {
        setPasswordVisible((prev) => !prev);
    }, []);

    const handleCopy = useCallback(() => {
        onCopyLink(item.link);
    }, [item.link, onCopyLink]);

    const handleShare = useCallback(() => {
        onShare(item);
    }, [item, onShare]);

    const handleOpen = useCallback(() => {
        onOpen(item.link);
    }, [item.link, onOpen]);

    const handleDelete = useCallback(() => {
        onDelete(item.id);
    }, [item.id, onDelete]);

    return (
        <View
            style={[styles.card, expired && styles.cardExpired]}
            accessible
            accessibilityLabel={`Invitation for ${item.appName}, ${expired ? 'expired' : 'active'}`}>

            {/* Card Header */}
            <View style={styles.cardHeader}>
                <View style={styles.cardIconWrap}>
                    <Icon name="shield" size={20} color={Colors.primary} />
                </View>
                <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.appName}
                    </Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>
                        Created {formatDate(item.createdAt)}
                    </Text>
                </View>
                {expired ? (
                    <View style={styles.expiredBadge}>
                        <View style={styles.badgeDot} />
                        <Text style={styles.expiredBadgeText}>Expired</Text>
                    </View>
                ) : (
                    <View style={styles.activeBadge}>
                        <View style={[styles.badgeDot, styles.badgeDotActive]} />
                        <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                )}
            </View>

            <View style={styles.divider} />

            {/* Room */}
            <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                    <Icon name="meeting-room" size={14} color={Colors.textSecondary} />
                </View>
                <Text style={styles.infoLabel}>Room</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                    {item.room}
                </Text>
            </View>

            {/* Password */}
            <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                    <Icon name="lock" size={14} color={Colors.textSecondary} />
                </View>
                <Text style={styles.infoLabel}>Password</Text>
                <View style={styles.passwordRow}>
                    <Text
                        style={[styles.infoValue, styles.passwordText]}
                        numberOfLines={1}>
                        {passwordVisible ? item.password : '••••••'}
                    </Text>
                    <TouchableOpacity
                        onPress={togglePassword}
                        style={styles.eyeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.6}
                        accessibilityLabel={
                            passwordVisible ? 'Hide password' : 'Show password'
                        }
                        accessibilityRole="button">
                        <Icon
                            name={passwordVisible ? 'visibility-off' : 'visibility'}
                            size={16}
                            color={Colors.primary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Expires */}
            <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                    <Icon
                        name="schedule"
                        size={14}
                        color={expired ? Colors.danger : Colors.warning}
                    />
                </View>
                <Text style={styles.infoLabel}>Expires</Text>
                <Text
                    style={[
                        styles.infoValue,
                        expired && styles.infoValueExpired,
                    ]}
                    numberOfLines={1}>
                    {formatDate(item.expires)}
                </Text>
            </View>

            {/* Link */}
            <View style={styles.linkBox}>
                <Icon name="link" size={14} color={Colors.primary} />
                <Text
                    style={styles.linkText}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                    selectable>
                    {item.link}
                </Text>
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleCopy}
                    activeOpacity={0.7}
                    accessibilityLabel="Copy invitation link"
                    accessibilityRole="button">
                    <Icon name="content-copy" size={15} color={Colors.primary} />
                    <Text style={styles.actionBtnText}>Copy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleShare}
                    activeOpacity={0.7}
                    accessibilityLabel="Share invitation"
                    accessibilityRole="button">
                    <Icon name="share" size={15} color={Colors.secondary} />
                    <Text style={[styles.actionBtnText, { color: Colors.secondary }]}>
                        Share
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.actionBtn,
                        expired && styles.actionBtnDisabled,
                    ]}
                    onPress={handleOpen}
                    disabled={expired}
                    activeOpacity={0.7}
                    accessibilityLabel="Open invitation link"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: expired }}>
                    <Icon
                        name="open-in-browser"
                        size={15}
                        color={expired ? Colors.textSecondary : Colors.info}
                    />
                    <Text
                        style={[
                            styles.actionBtnText,
                            {
                                color: expired
                                    ? Colors.textSecondary
                                    : Colors.info,
                            },
                        ]}>
                        Open
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                    accessibilityLabel="Delete invitation"
                    accessibilityRole="button">
                    <Icon name="delete-outline" size={15} color={Colors.danger} />
                    <Text style={[styles.actionBtnText, { color: Colors.danger }]}>
                        Delete
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

InvitationCard.displayName = 'InvitationCard';

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AllInvitationsScreen = ({ navigation }) => {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    const insets = useSafeAreaInsets();

    const fetchInvitations = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            // Service already returns the inner array: response.data.data.data
            const rawList = await invitationService.getAllInvitations();

            console.log('Raw invitation list:', JSON.stringify(rawList));

            // Ensure it's an array before mapping
            const safeList = Array.isArray(rawList) ? rawList : [];
            const mapped = safeList.map(mapInvitation);

            console.log('Mapped invitations:', mapped.length);
            setInvitations(mapped);
        } catch (error) {
            console.error('fetchInvitations error:', error.message);

            // Show more specific error messages
            let errorMessage = 'Failed to load invitations. Please try again.';

            if (error.message?.includes('Network Error')) {
                errorMessage =
                    'Network error. Please check:\n\n' +
                    '• Your internet connection\n' +
                    '• The API server is reachable\n' +
                    '• VPN is connected (if required)';
            } else if (error.response?.status === 401) {
                errorMessage = 'Session expired. Please log in again.';
            } else if (error.response?.status === 403) {
                errorMessage =
                    'You do not have permission to view invitations.';
            }

            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);

    const onRefresh = useCallback(
        () => fetchInvitations(true),
        [fetchInvitations],
    );

    const handleCopyLink = useCallback((link) => {
        if (!link) return;
        Clipboard.setString(link);
        Alert.alert('Copied!', 'Invitation link copied to clipboard.');
    }, []);

    const handleShare = useCallback(async (item) => {
        if (!item) return;
        try {
            const message =
                `${item.appName}\n` +
                `Room: ${item.room}\n` +
                `Password: ${item.password}\n` +
                `Expires: ${formatDate(item.expires)}\n` +
                `Join: ${item.link}`;
            await Share.share({ message, title: 'Invitation Details' });
        } catch (e) {
            console.error('Share error:', e.message);
        }
    }, []);

    const handleOpen = useCallback((link) => {
        if (!link) return;
        Linking.openURL(link).catch(() =>
            Alert.alert('Error', 'Cannot open this link.'),
        );
    }, []);

    const handleDelete = useCallback((id) => {
        if (!id) return;
        Alert.alert(
            'Delete Invitation',
            'Are you sure you want to delete this invitation?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await invitationService.deleteInvitation(id);
                            setInvitations((prev) =>
                                prev.filter((i) => i.id !== id),
                            );
                        } catch {
                            Alert.alert(
                                'Error',
                                'Failed to delete invitation.',
                            );
                        }
                    },
                },
            ],
        );
    }, []);

    const handleFilterChange = useCallback((value) => {
        setFilter(value);
    }, []);

    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    /* ── Computed filter counts ── */
    const filterCounts = useMemo(() => {
        const active = invitations.filter(
            (inv) => !isExpired(inv.expires),
        ).length;
        const expired = invitations.length - active;
        return {
            all: invitations.length,
            active,
            expired,
        };
    }, [invitations]);

    /* ── Filtered list ── */
    const filtered = useMemo(() => {
        return invitations.filter((inv) => {
            if (filter === 'active') return !isExpired(inv.expires);
            if (filter === 'expired') return isExpired(inv.expires);
            return true;
        });
    }, [invitations, filter]);

    /* ── Render item (stable reference) ── */
    const renderItem = useCallback(
        ({ item }) => (
            <InvitationCard
                item={item}
                onCopyLink={handleCopyLink}
                onShare={handleShare}
                onOpen={handleOpen}
                onDelete={handleDelete}
            />
        ),
        [handleCopyLink, handleShare, handleOpen, handleDelete],
    );

    const keyExtractor = useCallback((item) => String(item.id), []);

    /* ── Header Component (shared between loading and main) ── */
    const HeaderBar = (
        <View
            style={[
                styles.header,
                {
                    paddingTop: insets.top + 12,
                },
            ]}>
            <TouchableOpacity
                onPress={handleGoBack}
                style={styles.backButton}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Go back"
                accessibilityRole="button">
                <Icon name="arrow-back" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>

            <Text
                style={styles.headerTitle}
                numberOfLines={1}
                accessibilityRole="header">
                All Invitations
            </Text>

            {!loading && (
                <View style={styles.headerCount}>
                    <Text style={styles.headerCountText}>
                        {invitations.length}
                    </Text>
                </View>
            )}
        </View>
    );

    /* ── Loading state ── */
    if (loading) {
        return (
            <View style={styles.container}>
                <StatusBar
                    backgroundColor={Colors.backgroundDark}
                    barStyle="light-content"
                    translucent={false}
                />
                {HeaderBar}
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingIconWrap}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                    <Text style={styles.loadingText}>
                        Loading invitations…
                    </Text>
                    <Text style={styles.loadingSubText}>
                        Please wait while we fetch your data
                    </Text>
                </View>
            </View>
        );
    }

    /* ── Main render ── */
    return (
        <View style={styles.container}>
            <StatusBar
                backgroundColor={Colors.backgroundDark}
                barStyle="light-content"
                translucent={false}
            />

            {HeaderBar}

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                <FilterTab
                    label="All"
                    value="all"
                    count={filterCounts.all}
                    isActive={filter === 'all'}
                    onPress={handleFilterChange}
                />
                <FilterTab
                    label="Active"
                    value="active"
                    count={filterCounts.active}
                    isActive={filter === 'active'}
                    onPress={handleFilterChange}
                />
                <FilterTab
                    label="Expired"
                    value="expired"
                    count={filterCounts.expired}
                    isActive={filter === 'expired'}
                    onPress={handleFilterChange}
                />
            </View>

            {/* Invitation List */}
            <FlatList
                data={filtered}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={[
                    styles.listContent,
                    {
                        paddingBottom: Math.max(32, insets.bottom + 24),
                    },
                ]}
                showsVerticalScrollIndicator={false}
                bounces={true}
                overScrollMode="always"
                removeClippedSubviews={Platform.OS === 'android'}
                maxToRenderPerBatch={8}
                windowSize={7}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                        progressViewOffset={0}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconWrap}>
                            <Icon
                                name="mail-outline"
                                size={48}
                                color={Colors.textSecondary}
                            />
                        </View>
                        <Text style={styles.emptyTitle}>
                            No Invitations Found
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {filter === 'active'
                                ? 'No active invitations at the moment.'
                                : filter === 'expired'
                                    ? 'No expired invitations found.'
                                    : 'Invitations you create will appear here.'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

export default AllInvitationsScreen;