import { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // ✅ added useMemo
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

// ✅ Removed unused `verifyValue` import
import {
  loadLocalMeta,
  saveLocalMeta,
  syncMetaToAPI,
  addToSyncQueue,
  flushSyncQueue,
  mergeServerMeta,
} from './metaSyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyPin } from '../../services/pinService';

// ✅ Constants moved to top, after all imports
const CHAT_LOCK_SERVICE = 'shield-chat-lock';
const CHAT_ROOMS_CACHE_KEY = 'shield-chat-rooms-cache';

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

  const [contactDisplayNames, setContactDisplayNames] = useState({});

  // ✅ Stable ref to always hold the latest chatRooms — avoids stale closures
  //    in async callbacks (e.g. 409 handler) without adding chatRooms to deps
  const chatRoomsRef = useRef(chatRooms);
  useEffect(() => { chatRoomsRef.current = chatRooms; }, [chatRooms]);

  // ✅ Debounce timer ref for handleChatSearch
  const searchDebounceRef = useRef(null);


  // Add this function
const resolveContactNames = useCallback(async (rooms) => {
  const results = {};
  for (const room of rooms) {
    const phoneNumber = room?.contact?.phone || room?.phone || '';
    const serverName = getDisplayNameFromChatRoom(room, currentUser);
    const resolved = await authService.getContactDisplayName(phoneNumber, serverName);
    results[room.id] = resolved;
  }
  setContactDisplayNames(results);
}, [currentUser]);

// Call it when rooms load
useEffect(() => {
  if (sortedRooms?.length > 0) {
    resolveContactNames(sortedRooms);
  }
}, [sortedRooms]);

  // ══════════════════════════════════════════════════════════════════════════
  // EFFECT 1 — Restore roomMeta from AsyncStorage on mount (RUNS FIRST)
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const restoreLocalMeta = async () => {
      const local = await loadLocalMeta();
      if (Object.keys(local).length > 0) {
        setRoomMeta(local);
      }
    };
    restoreLocalMeta();
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // EFFECT 2 — Watch network, flush queue when back online
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      if (online) {
        flushSyncQueue();
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
      const fresh = res.data ?? res;
      setChatRooms(fresh);
      await AsyncStorage.setItem(CHAT_ROOMS_CACHE_KEY, JSON.stringify(fresh));
    } catch (e) {
      console.log('loadChatRooms error (silent):', e?.message);
      try {
        const cached = await AsyncStorage.getItem(CHAT_ROOMS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setChatRooms(parsed);
          console.log('Loaded chat rooms from offline cache:', parsed.length);
        }
      } catch {
        // truly nothing to show
      }
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
        if (user) {
          await loadChatRooms();
        }
      } catch (e) {
        console.log('INIT ERROR DETAIL:', e);
        Alert.alert('Error', 'Failed to initialize chat system.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadChatRooms]);

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

        // ✅ Request permissions correctly for both platforms
        let ok = false;
        if (Platform.OS === 'android') {
          const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
          ok = r === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          // ✅ iOS: check/request permission via react-native-contacts
          const status = await Contacts.checkPermission();
          if (status === 'authorized') {
            ok = true;
          } else if (status === 'undefined') {
            const requested = await Contacts.requestPermission();
            ok = requested === 'authorized';
          }
          // 'denied' → ok stays false
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

  // ─── EFFECT 6: WhatsApp-style auto-refresh ───────────────────────────────
  const pollingRef = useRef(null);
  const isFocusedRef = useRef(false);

  // ✅ Separate stable ref for isOnline so the interval callback always
  //    reads the latest value without being a dep of useFocusEffect
  const isOnlineRef = useRef(isOnline);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;

      if (currentUser && !loading) {
        loadChatRooms();
      }

      // ✅ Capture loading state at setup time only — do NOT include `loading`
      //    in deps. The interval reads isOnlineRef / isFocusedRef by ref so it
      //    always has current values without causing interval restarts.
      pollingRef.current = setInterval(async () => {
        if (isFocusedRef.current && currentUser && isOnlineRef.current) {
          try {
            const res = await chatService.getChatRooms();
            const fresh = res.data ?? res;
            setChatRooms(fresh);
            await AsyncStorage.setItem(CHAT_ROOMS_CACHE_KEY, JSON.stringify(fresh));
          } catch {
            // silent
          }
        }
      }, 3000);

      return () => {
        isFocusedRef.current = false;
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
      // ✅ Removed `loading` and `isOnline` from deps — both are read via refs
    }, [currentUser, loadChatRooms])
  );

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

  const handleChatSearch = useCallback((text) => {
    setSearchQuery(text);
    setShowLockedChats(false);

    // ✅ Debounce Keychain access — don't hammer secure storage on every keystroke
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!/^\d{6}$/.test(text)) return;

    searchDebounceRef.current = setTimeout(async () => {
      try {
        // ✅ Use verifyPin (same as confirmLockPin) — consistent hashed comparison
        const valid = await verifyPin(CHAT_LOCK_SERVICE, text);
        if (valid) {
          setShowLockedChats(true);
        }
      } catch {
        setShowLockedChats(false);
      }
    }, 300);
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // META HELPERS — Local first, silent API sync
  // ══════════════════════════════════════════════════════════════════════════

  // ✅ Wrapped in useCallback; uses .catch() to handle rejections from
  //    syncMetaToAPI, not just resolved-false values
  const persistMeta = useCallback((updatedMeta, roomId) => {
    saveLocalMeta(updatedMeta); // async but ordering is best-effort for local cache
    syncMetaToAPI(roomId, updatedMeta[roomId])
      .then(success => {
        if (!success) addToSyncQueue(roomId, updatedMeta[roomId]);
      })
      .catch(() => {
        // ✅ Handle rejection (network error, thrown exception) — queue the item
        addToSyncQueue(roomId, updatedMeta[roomId]);
      });
  }, []);

  const toggleMeta = useCallback((roomId, key) => {
    setRoomMeta(prev => {
      const updated = {
        ...prev,
        [roomId]: { ...prev[roomId], [key]: !prev[roomId]?.[key] },
      };
      persistMeta(updated, roomId);
      return updated;
    });
  }, [persistMeta]);

  const toggleMetaForSet = useCallback((ids, key) => {
    setRoomMeta(prev => {
      const updated = { ...prev };
      ids.forEach(id => {
        updated[id] = { ...updated[id], [key]: !updated[id]?.[key] };
      });
      saveLocalMeta(updated);
      ids.forEach(id => {
        syncMetaToAPI(id, updated[id])
          .then(success => {
            if (!success) addToSyncQueue(id, updated[id]);
          })
          .catch(() => {
            addToSyncQueue(id, updated[id]); // ✅ handle rejections
          });
      });
      return updated;
    });
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // SELECTION MODE
  // ══════════════════════════════════════════════════════════════════════════

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedRooms(new Set());
    setShowSelectionDotMenu(false);
  }, []);

  const handleLongPress = useCallback((room) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedRooms(new Set([room.id]));
    } else {
      toggleRoomSelection(room.id);
    }
  }, [selectionMode]); // toggleRoomSelection defined below — see note

  const toggleRoomSelection = useCallback((roomId) => {
    // ✅ Do NOT call exitSelection() inside the state updater.
    //    Compute the next set, then call the appropriate setters in sequence.
    setSelectedRooms(prev => {
      const next = new Set(prev);
      next.has(roomId) ? next.delete(roomId) : next.add(roomId);
      return next;
    });
    // ✅ Check size after update via a separate effect-like approach — 
    //    we schedule this check after the state is flushed using a ref trick
    //    or simply accept a one-render lag. Best practice here is to derive
    //    exitSelection from a useEffect watching selectedRooms.
  }, []);

  // ✅ Exit selection mode reactively when selectedRooms becomes empty
  //    This replaces the unsafe exitSelection()-inside-updater pattern
  useEffect(() => {
    if (selectionMode && selectedRooms.size === 0) {
      exitSelection();
    }
  }, [selectedRooms, selectionMode, exitSelection]);

  // ── Selection actions ─────────────────────────────────────────────────────
  const onSelectionPin = useCallback(() => {
    toggleMetaForSet(selectedRooms, 'pinned');
    exitSelection();
  }, [selectedRooms, toggleMetaForSet, exitSelection]);

  const onSelectionMute = useCallback(() => {
    toggleMetaForSet(selectedRooms, 'muted');
    exitSelection();
  }, [selectedRooms, toggleMetaForSet, exitSelection]);

  const onSelectionArchive = useCallback(() => {
    toggleMetaForSet(selectedRooms, 'archived');
    exitSelection();
  }, [selectedRooms, toggleMetaForSet, exitSelection]);

  const onSelectionViewContact = useCallback(() => {
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
  }, [selectedRooms, chatRooms, currentUser, localRoomNames, exitSelection]);

  const onSelectionLockChat = useCallback(() => {
    setShowSelectionDotMenu(false);
    if (selectedRooms.size !== 1) {
      Alert.alert('Info', 'Select only one chat to lock/unlock.');
      return;
    }
    const room = chatRooms.find(r => r.id === [...selectedRooms][0]);
    if (!room) return;
    setLockTargetRoom(room);
    setLockPinInput('');
    setLockPinError('');
    setShowLockPinModal(true);
  }, [selectedRooms, chatRooms]);

  // ✅ Use toggleMetaForSet to batch the single favorite toggle — consistent pattern
  const onSelectionFavorite = useCallback(() => {
    setShowSelectionDotMenu(false);
    toggleMetaForSet(selectedRooms, 'favorite');
    exitSelection();
  }, [selectedRooms, toggleMetaForSet, exitSelection]);

  const onSelectionClearChat = useCallback(() => {
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
  }, [selectedRooms, localRoomNames, chatRooms, exitSelection]);

  const onSelectionBlock = useCallback(() => {
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
  }, [selectedRooms, roomMeta, toggleMeta, exitSelection]);

  const onSelectionDelete = useCallback(() => {
    setShowSelectionDotMenu(false);
    // ✅ Capture the selected IDs at press time — avoids stale closure in async callback
    const idsToDelete = [...selectedRooms];
    Alert.alert('Delete Chats', `Delete ${idsToDelete.length} chat${idsToDelete.length > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel', onPress: exitSelection },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await Promise.all(idsToDelete.map(id => chatService.deleteChatRoom(id)));
            setChatRooms(p => p.filter(r => !idsToDelete.includes(r.id)));
            setRoomMeta(prev => {
              const updated = { ...prev };
              idsToDelete.forEach(id => delete updated[id]);
              saveLocalMeta(updated);
              return updated;
            });
          } catch { Alert.alert('Error', 'Could not delete chats.'); }
          finally { exitSelection(); }
        }
      },
    ]);
  }, [selectedRooms, exitSelection]);

  // ══════════════════════════════════════════════════════════════════════════
  // LOCK PIN
  // ══════════════════════════════════════════════════════════════════════════

  const shakeAnim = useCallback((anim) => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(anim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const confirmLockPin = useCallback(async () => {
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

      // ✅ Read the current lock state BEFORE toggling — roomMeta is read
      //    synchronously here, then toggleMeta enqueues its async state update.
      //    This gives the correct "will become" value for the success message.
      const isCurrentlyLocked = !!roomMeta?.[lockTargetRoom.id]?.locked;
      const willBeLocked = !isCurrentlyLocked;

      toggleMeta(lockTargetRoom.id, 'locked');

      setShowLockPinModal(false);
      setLockPinInput('');

      Alert.alert(
        'Success',
        `Chat ${willBeLocked ? 'locked 🔒' : 'unlocked 🔓'}.`
      );

      exitSelection();
    } catch {
      setLockPinError('Failed to verify PIN.');
      shakeAnim(lockShakeAnim);
    }
  }, [lockPinInput, roomMeta, lockTargetRoom, toggleMeta, exitSelection, shakeAnim, lockShakeAnim]);

  // ══════════════════════════════════════════════════════════════════════════
  // LOCKED CHATS ACCESS PIN
  // ══════════════════════════════════════════════════════════════════════════

  const confirmLockedChatsPin = useCallback(async () => {
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

      setShowLockedChatsModal(false);
      setLockedChatsPinInput('');
      setLockedChatsPinError('');
      setShowLockedChats(true);
    } catch {
      setLockedChatsPinError('Failed to verify PIN.');
      shakeAnim(lockedChatsShakeAnim);
    }
  }, [lockedChatsPinInput, shakeAnim, lockedChatsShakeAnim]);

  // ══════════════════════════════════════════════════════════════════════════
  // NORMAL HEADER MENU
  // ══════════════════════════════════════════════════════════════════════════

  const handleSyncContacts = useCallback(() => {
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
  }, []); // loadContacts defined below — acceptable forward ref in callback

  const handleInviteForChat = useCallback(async () => {
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
  }, [currentUser]);

  // ══════════════════════════════════════════════════════════════════════════
  // CONTACTS
  // ══════════════════════════════════════════════════════════════════════════

  const loadContacts = useCallback(async () => {
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
  }, [currentUser]);

  const handleSearchContacts = useCallback((q) => {
    setSearchQuery(q);
    if (!q.trim()) { setFilteredContacts(contacts); return; }
    setFilteredContacts(contacts.filter(c =>
      c.name?.toLowerCase().includes(q.toLowerCase()) ||
      c.email?.toLowerCase().includes(q.toLowerCase())
    ));
  }, [contacts]);

  const handleFabPress = useCallback(async () => {
    await loadContacts();
    setShowContactsModal(true);
    setSearchQuery('');
  }, [loadContacts]);

const handleSelectContact = useCallback(async (contact) => {
  if (!contact?.id) { Alert.alert('Error', 'Invalid contact.'); return; }
  try {
    setShowContactsModal(false);
    setLoading(true);
    const chatName = contact.is_current_user
      ? `${contact.name} (Personal Notes)` : contact.name;
    const newRoom = await chatService.createChatRoom(contact.id, chatName);
    await loadChatRooms();
    const created = newRoom.data || newRoom;
    if (created) navigation.getParent()?.navigate('ChatScreen', {   // ✅ getParent()
      chatRoom: created, currentUser, contactName: chatName,
    });
  } catch (error) {
    if (error.response?.status === 409) {
      Alert.alert('Chat Exists', 'A chat with this user already exists.');
      await loadChatRooms();
      const existing = chatRoomsRef.current.find(r =>
        r.name === contact.name ||
        r.name === `${contact.name} (Personal Notes)` ||
        r.participants?.some(p => p.id === contact.id)
      );
      if (existing) navigation.getParent()?.navigate('ChatScreen', {   // ✅ getParent()
        chatRoom: existing, currentUser, contactName: existing.name,
      });
    } else {
      Alert.alert('Error', `Failed to start chat with ${contact.name}.`);
    }
  } finally {
    setLoading(false);
  }
}, [currentUser, loadChatRooms, navigation]);

  // ══════════════════════════════════════════════════════════════════════════
  // CHAT ROOM DISPLAY NAME
  // ══════════════════════════════════════════════════════════════════════════
  const getDisplayNameFromChatRoom = useCallback((room, user) => {
    if (localRoomNames[room?.id]) return localRoomNames[room.id];

    if (Array.isArray(room?.participants) && user?.id) {
      const other = room.participants.find(p => p && p.id !== user.id);
      const otherName = other?.name?.trim() || other?.username?.trim();
      if (otherName) return otherName;
    }

    if (room?.type !== 'one-to-one' && room?.name?.trim()) return room.name;

    if (room?.type === 'guest' || room?.isguestroom) return 'Guest Chat';

    return 'Unknown Contact';
  }, [localRoomNames]);

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  const openChat = useCallback((room) => {
  if (roomMeta[room.id]?.blocked) {
    Alert.alert('Blocked', 'Unblock this contact to send messages.');
    return;
  }
  navigation.getParent()?.navigate('ChatScreen', {
    chatRoom: room,
    currentUser,
    contactName: getDisplayNameFromChatRoom(room, currentUser),
  });
}, [roomMeta, currentUser, navigation, getDisplayNameFromChatRoom]);

  // ✅ Fixed date logic: compare calendar dates, not arbitrary 24h buckets
  const formatMessageTime = useCallback((ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();

    // Normalize both to midnight for clean day comparisons
    const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((nowDay - dDay) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  // ✅ Memoized — only recomputes when chatRooms or roomMeta actually change
  const sortedRooms = useMemo(() => {
    return [...chatRooms].sort((a, b) => {
      const w = r => (roomMeta[r.id]?.pinned ? 2 : 0) + (roomMeta[r.id]?.favorite ? 1 : 0);
      const weightDiff = w(b) - w(a);
      if (weightDiff !== 0) return weightDiff;

      const timeA = a.last_message?.created_at || a.last_message?.createdat || a.updated_at || a.created_at || 0;
      const timeB = b.last_message?.created_at || b.last_message?.createdat || b.updated_at || b.created_at || 0;
      return new Date(timeB) - new Date(timeA);
    });
  }, [chatRooms, roomMeta]);

  // ✅ Memoized — only recomputes when sort result, search state, or lock state changes
  const filteredRooms = useMemo(() => {
    if (searchQuery.trim()) {
      return sortedRooms.filter(room => {
        const meta = roomMeta[room.id] || {};
        if (meta.locked && !showLockedChats) return false;
        const displayName = (localRoomNames[room.id] || room.name || '').toLowerCase();
        const lastMsg = (room.last_message?.content || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return displayName.includes(query) || lastMsg.includes(query);
      });
    }
    return sortedRooms.filter(room => {
      const meta = roomMeta[room.id] || {};
      return !meta.locked;
    });
  }, [sortedRooms, searchQuery, roomMeta, showLockedChats, localRoomNames]);

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
    loadContacts, toggleMeta, searchMode,
    // ✅ searchQuery returned once (was duplicated)
    openSearch, closeSearch, handleChatSearch,
    filteredRooms, showLockedChats,
    setShowLockedChats, getDisplayNameFromChatRoom ,
    contactDisplayNames
  };
}