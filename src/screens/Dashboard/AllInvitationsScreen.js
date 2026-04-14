import React, { useState, useCallback, useEffect } from 'react';
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
    SafeAreaView,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../assets/theme';
import styles from '../../assets/AllInvitationsStyles';
import invitationService from '../../services/invitationService';

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_URL = 'https://app.nativeapp.com.my';

// ─── Helper: Build a guest join link ──────────────────────────────────────────
const buildInvitationLink = (sessionToken) =>
    `${BASE_URL}/guest/join/${sessionToken}`;

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
        const d = new Date(expiresStr);
        return !isNaN(d.getTime()) && d < new Date();
    } catch {
        return false;
    }
};

// ─── Format date for display ──────────────────────────────────────────────────
const formatDate = (dateStr) => {
    try {
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

// ─── Invitation Card ──────────────────────────────────────────────────────────
const InvitationCard = ({ item, onCopyLink, onShare, onOpen, onDelete }) => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const expired = isExpired(item.expires);

    return (
        <View style={[styles.card, expired && styles.cardExpired]}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
                <View style={styles.cardIconWrap}>
                    <Icon name="shield" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.cardTitle}>{item.appName}</Text>
                    <Text style={styles.cardSubtitle}>
                        Created {formatDate(item.createdAt)}
                    </Text>
                </View>
                {expired ? (
                    <View style={styles.expiredBadge}>
                        <Text style={styles.expiredBadgeText}>Expired</Text>
                    </View>
                ) : (
                    <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                )}
            </View>

            <View style={styles.divider} />

            {/* Room */}
            <View style={styles.infoRow}>
                <Icon name="meeting-room" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoLabel}>Room</Text>
                <Text style={styles.infoValue}>{item.room}</Text>
            </View>

            {/* Password */}
            <View style={styles.infoRow}>
                <Icon name="lock" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoLabel}>Password</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={[styles.infoValue, { flex: 1 }]}>
                        {passwordVisible ? item.password : '••••'}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setPasswordVisible(!passwordVisible)}
                        style={styles.eyeBtn}
                    >
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
                <Icon
                    name="schedule"
                    size={16}
                    color={expired ? Colors.danger : Colors.warning}
                />
                <Text style={styles.infoLabel}>Expires</Text>
                <Text style={[styles.infoValue, expired && styles.infoValueExpired]}>
                    {formatDate(item.expires)}
                </Text>
            </View>

            {/* Link */}
            <View style={styles.linkBox}>
                <Icon name="link" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
                    {item.link}
                </Text>
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onCopyLink(item.link)}>
                    <Icon name="content-copy" size={16} color={Colors.primary} />
                    <Text style={styles.actionBtnText}>Copy</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => onShare(item)}>
                    <Icon name="share" size={16} color={Colors.secondary} />
                    <Text style={[styles.actionBtnText, { color: Colors.secondary }]}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => onOpen(item.link)}
                    disabled={expired}
                >
                    <Icon
                        name="open-in-browser"
                        size={16}
                        color={expired ? Colors.textSecondary : Colors.info}
                    />
                    <Text
                        style={[
                            styles.actionBtnText,
                            { color: expired ? Colors.textSecondary : Colors.info },
                        ]}
                    >
                        Open
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => onDelete(item.id)}
                >
                    <Icon name="delete-outline" size={16} color={Colors.danger} />
                    <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AllInvitationsScreen = ({ navigation }) => {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

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
                errorMessage = 'You do not have permission to view invitations.';
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

    const onRefresh = useCallback(() => fetchInvitations(true), [fetchInvitations]);

    const handleCopyLink = (link) => {
        Clipboard.setString(link);
        Alert.alert('Copied!', 'Invitation link copied to clipboard.');
    };

    const handleShare = async (item) => {
        const message =
            `${item.appName}\n` +
            `Room: ${item.room}\n` +
            `Password: ${item.password}\n` +
            `Expires: ${formatDate(item.expires)}\n` +
            `Join: ${item.link}`;
        await Share.share({ message });
    };

    const handleOpen = (link) => {
        Linking.openURL(link).catch(() =>
            Alert.alert('Error', 'Cannot open this link.'),
        );
    };

    const handleDelete = (id) => {
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
                            setInvitations((prev) => prev.filter((i) => i.id !== id));
                        } catch {
                            Alert.alert('Error', 'Failed to delete invitation.');
                        }
                    },
                },
            ],
        );
    };

    const filtered = invitations.filter((inv) => {
        if (filter === 'active') return !isExpired(inv.expires);
        if (filter === 'expired') return isExpired(inv.expires);
        return true;
    });

    const FilterTab = ({ label, value }) => (
        <TouchableOpacity
            style={[styles.filterTab, filter === value && styles.filterTabActive]}
            onPress={() => setFilter(value)}
        >
            <Text
                style={[
                    styles.filterTabText,
                    filter === value && styles.filterTabTextActive,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar backgroundColor={Colors.backgroundDark} barStyle="light-content" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>All Invitations</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading invitations...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor={Colors.backgroundDark} barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Invitations</Text>
                <View style={styles.headerCount}>
                    <Text style={styles.headerCountText}>{invitations.length}</Text>
                </View>
            </View>

            <View style={styles.filterRow}>
                <FilterTab label="All" value="all" />
                <FilterTab label="Active" value="active" />
                <FilterTab label="Expired" value="expired" />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Icon name="mail-outline" size={64} color={Colors.borderLight} />
                        <Text style={styles.emptyTitle}>No Invitations Found</Text>
                        <Text style={styles.emptySubtitle}>
                            Invitations you create will appear here.
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <InvitationCard
                        item={item}
                        onCopyLink={handleCopyLink}
                        onShare={handleShare}
                        onOpen={handleOpen}
                        onDelete={handleDelete}
                    />
                )}
            />
        </SafeAreaView>
    );
};

export default AllInvitationsScreen;