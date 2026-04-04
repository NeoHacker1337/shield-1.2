import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert, Platform, PermissionsAndroid,
  Share, Animated, Vibration,
} from 'react-native';
import * as Keychain from 'react-native-keychain';
import NetInfo from '@react-native-community/netinfo';
import Contacts from 'react-native-contacts';
import chatService from '../../services/chatService';
import authService from '../../services/AuthService';
import contactSyncService from '../../services/contactSyncService';
import { verifyValue } from '../../services/HashService';
import {
  loadLocalMeta,
  saveLocalMeta,
  syncMetaToAPI,
  addToSyncQueue,
  flushSyncQueue,
  mergeServerMeta,
} from './metaSyncService';

const CHAT_LOCK_SERVICE = 'shield-chat-lock';
import { verifyPin } from '../../services/pinService';
export default function useChatSystem(navigation) {

  // ── Core ──────────────────────────────────────────────────────────────────
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [localRoomNames, setLocalRoomNames] = useState({});
  const [roomMeta, setRoomMeta] = useState({});
  const [isOnline, setIsOnline] = useState(true);

  // ── Contacts ──────────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Menus ─────────────────────────────────────────────────────────────────
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [showSelectionDotMenu, setShowSelectionDotMenu] = useState(false);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selectedRooms, setSelectedRooms] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // ── Lock PIN ──────────────────────────────────────────────────────────────
  const [showLockPinModal, setShowLockPinModal] = useState(false);
  const [lockTargetRoom, setLockTargetRoom] = useState(null);
  const [lockPinInput, setLockPinInput] = useState('');
  const [lockPinError, setLockPinError] = useState('');
  const lockShakeAnim = useRef(new Animated.Value(0)).current;

  // ── Locked Chats password modal ───────────────────────────────────────────
  const [showLockedChatsModal, setShowLockedChatsModal] = useState(false);
  const [lockedChatsPinInput, setLockedChatsPinInput] = useState('');
  const [lockedChatsPinError, setLockedChatsPinError] = useState('');
  const lockedChatsShakeAnim = useRef(new Animated.Value(0)).current;

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchMode, setSearchMode] = useState(false);
  const [showLockedChats, setShowLockedChats] = useState(false);


  const contactMapRef = useRef(null);
  const prevRoomIdsRef = useRef('');
  const lastFetchRef = useRef(0);

  // ══════════════════════════════════════════════════════════════════════════
  // EFFECT 1 — Restore roomMeta from AsyncStorage on mount (RUNS FIRST)
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const restoreLocalMeta = async () => {
      const local = await loadLocalMeta();
      if (Object.keys(local).length > 0) {
        setRoomMeta(local); // UI shows locks/pins instantly
      }
    };
    restoreLocalMeta();
  }, []); // empty deps = runs once on mount

  // ══════════════════════════════════════════════════════════════════════════
  // EFFECT 2 — Watch network, flush queue when back online
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      if (online) {
        flushSyncQueue(); // silently retry all queued meta updates
      }
    });
    return () => unsubscribe();
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // EFFECT 3 — Initialize: get user + load chat rooms
  // ══════════════════════════════════════════════════════════════════════════
  const loadChatRooms = useCallback(async () => {
    try {
      const res = await chatService.getChatRooms();
      setChatRooms(res.data || res);
    } catch { /* silent — user already has local data */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
        if (user) await loadChatRooms();
      } catch {
        Alert.alert('Error', 'Failed to initialize chat system.');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadChatRooms]);

  useFocusEffect(useCallback(() => {
    const now = Date.now();
    if (currentUser && !loading && (now - lastFetchRef.current > 30000)) {
      lastFetchRef.current = now;
      loadChatRooms();
    }
  }, [currentUser, loadChatRooms, loading]));

  // ══════════════════════════════════════════════════════════════════════════
  // EFFECT 4 — Merge server meta after chatRooms loads
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (chatRooms.length === 0) return;
    const currentIds = chatRooms.map(r => r.id).join(',');
    if (currentIds === prevRoomIdsRef.current) return;
    prevRoomIdsRef.current = currentIds;

    const mergeWithServer = async () => {
      const local = await loadLocalMeta();
      const merged = mergeServerMeta(local, chatRooms);
      setRoomMeta(merged);
      await saveLocalMeta(merged);
    };
    mergeWithServer();
  }, [chatRooms]);

  // ══════════════════════════════════════════════════════════════════════════
  // EFFECT 5 — Resolve device contact names
  // ══════════════════════════════════════════════════════════════════════════ 
  useEffect(() => {
    (async () => {
      try {
        if (!currentUser || !chatRooms.length) return;

        // Already loaded contacts this session — just remap rooms
        if (contactMapRef.current) {
          const map = {};
          chatRooms.forEach(room => {
            if (!Array.isArray(room.participants)) return;
            const other = room.participants.find(p => p && p.id !== currentUser.id);
            if (!other) return;
            const email = (other.email || other.email_address || other.emailAddress)?.trim().toLowerCase();
            if (email) {
              const n = contactMapRef.current.get(email);
              if (n) map[room.id] = n;
            }
          });
          setLocalRoomNames(map);
          return;
        }

        // First time — request permission and read device contacts
        let ok = true;
        if (Platform.OS === 'android') {
          const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
          ok = r === PermissionsAndroid.RESULTS.GRANTED;
        }
        if (!ok) { setLocalRoomNames({}); return; }

        const devContacts = await Contacts.getAll();
        const emailToName = new Map();
        devContacts.forEach(c => {
          if (!Array.isArray(c.emailAddresses)) return;
          const name = (c.displayName || [c.givenName, c.familyName].filter(Boolean).join(' ')).trim();
          if (!name) return;
          c.emailAddresses.forEach(e => {
            const em = e.email?.trim().toLowerCase();
            if (em && !emailToName.has(em)) emailToName.set(em, name);
          });
        });

        // Cache so we never call Contacts.getAll() again this session
        contactMapRef.current = emailToName;

        const map = {};
        chatRooms.forEach(room => {
          if (!Array.isArray(room.participants)) return;
          const other = room.participants.find(p => p && p.id !== currentUser.id);
          if (!other) return;
          const email = (other.email || other.email_address || other.emailAddress)?.trim().toLowerCase();
          if (email) {
            const n = emailToName.get(email);
            if (n) map[room.id] = n;
          }
        });
        setLocalRoomNames(map);
      } catch {
        setLocalRoomNames({});
      }
    })();
  }, [chatRooms, currentUser]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChatRooms();
    setRefreshing(false);
  }, [loadChatRooms]);

  // ── Search handlers ───────────────────────────────────────────────────────
  const openSearch = () => {
    setSearchMode(true);
    setSearchQuery('');
  };

  const closeSearch = () => {
    setSearchMode(false);
    setSearchQuery('');
    setShowLockedChats(false);
  };

  const handleChatSearch = async (text) => {

    setSearchQuery(text);

    // Hide locked chats by default
    setShowLockedChats(false);

    // Must be exactly 6 digits
    if (!/^\d{6}$/.test(text)) return;

    try {

      const creds = await Keychain.getGenericPassword({
        service: CHAT_LOCK_SERVICE
      });

      if (!creds) return;

      if (text === creds.password) {
        setShowLockedChats(true);
      }

    } catch (e) {
      setShowLockedChats(false);
    }

  };


  // ══════════════════════════════════════════════════════════════════════════
  // META HELPERS — Local first, silent API sync
  // ══════════════════════════════════════════════════════════════════════════

  const persistMeta = (updatedMeta, roomId) => {
    // Save locally
    saveLocalMeta(updatedMeta);
    // Silently try API
    syncMetaToAPI(roomId, updatedMeta[roomId]).then(success => {
      if (!success) addToSyncQueue(roomId, updatedMeta[roomId]);
    });
  };

  const toggleMeta = (roomId, key) => {
    setRoomMeta(prev => {
      const updated = {
        ...prev,
        [roomId]: { ...prev[roomId], [key]: !prev[roomId]?.[key] },
      };
      persistMeta(updated, roomId);
      return updated;
    });
  };

  const toggleMetaForSet = (ids, key) => {
    setRoomMeta(prev => {
      const updated = { ...prev };
      ids.forEach(id => {
        updated[id] = { ...updated[id], [key]: !updated[id]?.[key] };
      });
      // Persist each changed room
      saveLocalMeta(updated);
      ids.forEach(id => {
        syncMetaToAPI(id, updated[id]).then(success => {
          if (!success) addToSyncQueue(id, updated[id]);
        });
      });
      return updated;
    });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SELECTION MODE
  // ══════════════════════════════════════════════════════════════════════════

  const handleLongPress = room => {
    if (!selectionMode) { setSelectionMode(true); setSelectedRooms(new Set([room.id])); }
    else toggleRoomSelection(room.id);
  };

  const toggleRoomSelection = roomId => {
    setSelectedRooms(prev => {
      const next = new Set(prev);
      next.has(roomId) ? next.delete(roomId) : next.add(roomId);
      if (next.size === 0) exitSelection();
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedRooms(new Set());
    setShowSelectionDotMenu(false);
  };

  // ── Selection actions ─────────────────────────────────────────────────────
  const onSelectionPin = () => { toggleMetaForSet(selectedRooms, 'pinned'); exitSelection(); };
  const onSelectionMute = () => { toggleMetaForSet(selectedRooms, 'muted'); exitSelection(); };
  const onSelectionArchive = () => { toggleMetaForSet(selectedRooms, 'archived'); exitSelection(); };

  const onSelectionViewContact = () => {
    setShowSelectionDotMenu(false);
    if (selectedRooms.size !== 1) { Alert.alert('Info', 'Select only one chat.'); return; }
    const id = [...selectedRooms][0];
    const room = chatRooms.find(r => r.id === id);
    const other = room?.participants?.find(p => p.id !== currentUser?.id);
    if (!other) { Alert.alert('Info', 'No contact info available.'); exitSelection(); return; }
    Alert.alert(
      localRoomNames[id] || room.name || 'Contact',
      [
        other.email && `📧 Email: ${other.email}`,
        other.phone && `📞 Phone: ${other.phone}`,
        other.username && `👤 Username: ${other.username}`,
      ].filter(Boolean).join('\n') || 'No details.',
      [{ text: 'Close', onPress: exitSelection }]
    );
  };

  const onSelectionLockChat = () => {
    setShowSelectionDotMenu(false);
    if (selectedRooms.size !== 1) { Alert.alert('Info', 'Select only one chat to lock/unlock.'); return; }
    const room = chatRooms.find(r => r.id === [...selectedRooms][0]);
    if (!room) return;
    setLockTargetRoom(room);
    setLockPinInput('');
    setLockPinError('');
    setShowLockPinModal(true);
  };

  const onSelectionFavorite = () => {
    setShowSelectionDotMenu(false);
    selectedRooms.forEach(id => toggleMeta(id, 'favorite'));
    exitSelection();
  };

  const onSelectionClearChat = () => {
    setShowSelectionDotMenu(false);
    if (selectedRooms.size !== 1) { Alert.alert('Info', 'Select only one chat to clear.'); return; }
    const id = [...selectedRooms][0];
    const name = localRoomNames[id] || chatRooms.find(r => r.id === id)?.name || 'this chat';
    Alert.alert('Clear Chat', `Clear all messages in "${name}"?`, [
      { text: 'Cancel', style: 'cancel', onPress: exitSelection },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          try {
            await chatService.clearChatRoom?.(id);
            setChatRooms(p => p.map(r => r.id === id ? { ...r, last_message: null, unread_count: 0 } : r));
            Alert.alert('Done', 'Chat cleared.');
          } catch { Alert.alert('Error', 'Could not clear chat.'); }
          finally { exitSelection(); }
        }
      },
    ]);
  };

  const onSelectionBlock = () => {
    setShowSelectionDotMenu(false);
    const ids = [...selectedRooms];
    const allBlocked = ids.every(id => roomMeta[id]?.blocked);
    Alert.alert(
      `${allBlocked ? 'Unblock' : 'Block'} ${ids.length} contact${ids.length > 1 ? 's' : ''}?`,
      allBlocked ? 'They will be able to message you again.' : "You won't receive messages from them.",
      [
        { text: 'Cancel', style: 'cancel', onPress: exitSelection },
        {
          text: allBlocked ? 'Unblock' : 'Block',
          style: allBlocked ? 'default' : 'destructive',
          onPress: () => {
            ids.forEach(id => toggleMeta(id, 'blocked'));
            exitSelection();
          },
        },
      ]
    );
  };

  const onSelectionDelete = () => {
    setShowSelectionDotMenu(false);
    Alert.alert('Delete Chats', `Delete ${selectedRooms.size} chat${selectedRooms.size > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel', onPress: exitSelection },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await Promise.all([...selectedRooms].map(id => chatService.deleteChatRoom(id)));
            setChatRooms(p => p.filter(r => !selectedRooms.has(r.id)));
            // Clean up meta for deleted rooms
            setRoomMeta(prev => {
              const updated = { ...prev };
              selectedRooms.forEach(id => delete updated[id]);
              saveLocalMeta(updated);
              return updated;
            });
          } catch { Alert.alert('Error', 'Could not delete chats.'); }
          finally { exitSelection(); }
        }
      },
    ]);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // LOCK PIN
  // ══════════════════════════════════════════════════════════════════════════

  const shakeAnim = (anim) => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(anim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const confirmLockPin = async () => {

    if (lockPinInput.length !== 6) {
      setLockPinError('Enter all 6 digits');
      shakeAnim(lockShakeAnim);
      return;
    }

    try {

      const valid = await verifyPin(CHAT_LOCK_SERVICE, lockPinInput);

      if (!valid) {
        setLockPinError('Incorrect PIN. Try again.');
        setLockPinInput('');
        shakeAnim(lockShakeAnim);
        return;
      }

      // Toggle lock state
      toggleMeta(lockTargetRoom.id, 'locked');

      setShowLockPinModal(false);
      setLockPinInput('');

      const isNowLocked = !roomMeta?.[lockTargetRoom.id]?.locked;

      Alert.alert(
        'Success',
        `Chat ${isNowLocked ? 'locked 🔒' : 'unlocked 🔓'}.`
      );

      exitSelection();

    } catch {

      setLockPinError('Failed to verify PIN.');
      shakeAnim(lockShakeAnim);

    }

  };
  // ══════════════════════════════════════════════════════════════════════════
  // LOCKED CHATS ACCESS PIN
  // ══════════════════════════════════════════════════════════════════════════

  const confirmLockedChatsPin = async () => {

    if (lockedChatsPinInput.length !== 6) {
      setLockedChatsPinError('Enter all 6 digits');
      shakeAnim(lockedChatsShakeAnim);
      return;
    }

    try {

      const valid = await verifyPin(CHAT_LOCK_SERVICE, lockedChatsPinInput);

      if (!valid) {
        setLockedChatsPinError('Incorrect PIN. Try again.');
        setLockedChatsPinInput('');
        shakeAnim(lockedChatsShakeAnim);
        return;
      }

      // PIN correct
      setShowLockedChatsModal(false);
      setLockedChatsPinInput('');
      setLockedChatsPinError('');

      // reveal locked chats in search
      setShowLockedChats(true);

    } catch {
      setLockedChatsPinError('Failed to verify PIN.');
      shakeAnim(lockedChatsShakeAnim);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // NORMAL HEADER MENU
  // ══════════════════════════════════════════════════════════════════════════

  const handleSyncContacts = () => {
    setShowMenuModal(false);
    Alert.alert('Sync Contacts', 'Read phone contacts and sync with server. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sync', onPress: async () => {
          try {
            setSyncingContacts(true);
            const result = await contactSyncService.syncContactsWithProgress(() => { });
            if (result.success) {
              Alert.alert('Success', `Synced ${result.synced_count} of ${result.total_sent} contacts.`,
                [{ text: 'OK', onPress: loadContacts }]);
            } else { Alert.alert('Info', result.message); }
          } catch (e) { Alert.alert('Error', e.message || 'Failed to sync.'); }
          finally { setSyncingContacts(false); }
        }
      },
    ]);
  };

  const handleInviteForChat = async () => {
    try {
      if (!currentUser) { Alert.alert('Error', 'User not logged in'); return; }
      const res = await chatService.inviteGuestForChat(currentUser.name || currentUser.username);
      const d = res?.data || res;
      if (!d?.invite_url) { Alert.alert('Error', 'Invite link not received'); return; }
      await Share.share({
        title: 'Shield Chat Invitation',
        message: `🔐 Shield Chat Invitation\n\n📍 Room: ${d.room_name}\n🔑 Password: ${d.password}\n⏳ Expires: ${d.expires_at ? new Date(d.expires_at).toLocaleString() : 'N/A'}\n\nJoin:\n${d.invite_url}`,
      });
    } catch { Alert.alert('Error', 'Failed to generate invite link'); }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // CONTACTS
  // ══════════════════════════════════════════════════════════════════════════

  const loadContacts = async () => {
    if (!currentUser) return;
    try {
      setContactsLoading(true);
      const res = await chatService.getContacts(currentUser.id);
      const data = res?.data || [];
      const self = {
        id: currentUser.id,
        name: currentUser.name || currentUser.username || 'You',
        email: currentUser.email || '',
        is_current_user: true,
      };
      const all = [self, ...data.filter(c => c?.name)];
      setContacts(all);
      setFilteredContacts(all);
    } catch { Alert.alert('Error', 'Failed to load contacts.'); }
    finally { setContactsLoading(false); }
  };

  const handleSearchContacts = q => {
    setSearchQuery(q);
    if (!q.trim()) { setFilteredContacts(contacts); return; }
    setFilteredContacts(contacts.filter(c =>
      c.name?.toLowerCase().includes(q.toLowerCase()) ||
      c.email?.toLowerCase().includes(q.toLowerCase())
    ));
  };

  const handleFabPress = async () => {
    await loadContacts();
    setShowContactsModal(true);
    setSearchQuery('');
  };

  const handleSelectContact = async contact => {
    if (!contact?.id) { Alert.alert('Error', 'Invalid contact.'); return; }
    try {
      setShowContactsModal(false);
      setLoading(true);
      const chatName = contact.is_current_user
        ? `${contact.name} (Personal Notes)` : contact.name;
      const newRoom = await chatService.createChatRoom(contact.id, chatName);
      await loadChatRooms();
      const created = newRoom.data || newRoom;
      if (created) navigation.navigate('ChatScreen', { chatRoom: created, currentUser, contactName: chatName });
    } catch (error) {
      if (error.response?.status === 409) {
        Alert.alert('Chat Exists', 'A chat with this user already exists.');
        await loadChatRooms();
        const existing = chatRooms.find(r =>
          r.name === contact.name ||
          r.name === `${contact.name} (Personal Notes)` ||
          r.participants?.some(p => p.id === contact.id)
        );
        if (existing) navigation.navigate('ChatScreen', { chatRoom: existing, currentUser, contactName: existing.name });
      } else { Alert.alert('Error', `Failed to start chat with ${contact.name}.`); }
    } finally { setLoading(false); }
  };


  const getDisplayNameFromChatRoom = useCallback((room, user) => {
    // 1. Device contact name (from phone contacts)
    if (localRoomNames[room?.id]) return localRoomNames[room.id];

    // 2. Room name from API
    if (room?.name && room.name !== null && room.name.trim()) return room.name;

    // 3. Other participant's name
    if (Array.isArray(room?.participants) && user?.id) {
      const other = room.participants.find(p => p && p.id !== user.id);
      if (other?.name && other.name.trim()) return other.name;
    }

    // 4. Guest fallback
    if (room?.type === 'guest' || room?.is_guest_room) return 'Guest Chat';

    return 'Unknown Contact';
  }, [localRoomNames]);

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  const openChat = room => {
    if (roomMeta[room.id]?.blocked) {
      Alert.alert('Blocked', 'Unblock this contact to send messages.');
      return;
    }
    navigation.navigate('ChatScreen', {
      chatRoom: room,
      currentUser,
      contactName: getDisplayNameFromChatRoom(room, currentUser),
    });
  };

  const formatMessageTime = ts => {
    if (!ts) return '';
    const d = new Date(ts), now = new Date();
    const diff = Math.ceil(Math.abs(now - d) / 86400000);
    if (diff === 1) return 'Today';
    if (diff === 2) return 'Yesterday';
    if (diff <= 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const sortedRooms = [...chatRooms].sort((a, b) => {
    const w = r => (roomMeta[r.id]?.pinned ? 2 : 0) + (roomMeta[r.id]?.favorite ? 1 : 0);
    const weightDiff = w(b) - w(a);
    if (weightDiff !== 0) return weightDiff; // pinned/favorite first

    // Then sort by latest message time (newest first)
    const timeA = a.last_message?.created_at || a.last_message?.createdat || a.updated_at || a.created_at || 0;
    const timeB = b.last_message?.created_at || b.last_message?.createdat || b.updated_at || b.created_at || 0;
    return new Date(timeB) - new Date(timeA);
  });

  // ── Filter by search query ────────────────────────────────────────────────
  const filteredRooms = searchQuery.trim()
    ? sortedRooms.filter(room => {

      const meta = roomMeta[room.id] || {};

      // Locked chats only visible when PIN is verified
      if (meta.locked && !showLockedChats) {
        return false;
      }

      const displayName = (localRoomNames[room.id] || room.name || '').toLowerCase();
      const lastMsg = (room.last_message?.content || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      return displayName.includes(query) || lastMsg.includes(query);

    })
    : sortedRooms.filter(room => {

      const meta = roomMeta[room.id] || {};

      // when not searching, locked chats must remain hidden
      if (meta.locked) return false;

      return true;

    });

  // ══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ══════════════════════════════════════════════════════════════════════════
  return {
    // state
    chatRooms, loading, refreshing, currentUser,
    localRoomNames, roomMeta, isOnline,
    contacts, filteredContacts, showContactsModal, setShowContactsModal,
    contactsLoading, searchQuery,
    showMenuModal, setShowMenuModal, syncingContacts,
    showSelectionDotMenu, setShowSelectionDotMenu,
    selectedRooms, selectionMode,
    showLockPinModal, setShowLockPinModal,
    lockTargetRoom, lockPinInput, setLockPinInput,
    lockPinError, setLockPinError, lockShakeAnim,
    showLockedChatsModal, setShowLockedChatsModal,
    lockedChatsPinInput, setLockedChatsPinInput,
    lockedChatsPinError, setLockedChatsPinError,
    lockedChatsShakeAnim,
    // actions
    onRefresh, openChat, formatMessageTime, sortedRooms,
    handleLongPress, toggleRoomSelection, exitSelection,
    onSelectionPin, onSelectionMute, onSelectionArchive,
    onSelectionViewContact, onSelectionLockChat, onSelectionFavorite,
    onSelectionClearChat, onSelectionBlock, onSelectionDelete,
    confirmLockPin, confirmLockedChatsPin,
    handleSyncContacts, handleInviteForChat,
    handleSearchContacts, handleFabPress, handleSelectContact,
    loadContacts, toggleMeta, searchMode, searchQuery,
    openSearch, closeSearch, handleChatSearch,
    filteredRooms, showLockedChats,
    setShowLockedChats, getDisplayNameFromChatRoom
  };
}
