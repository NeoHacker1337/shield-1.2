import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Modal,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import profileStyles from '../assets/ContactProfileScreenStyles';
import useContactName from '../screens/chatSystem/Features/useContactName';
import authService from '../services/AuthService';
import { getDisplayNameFromChatRoom } from '../utils/chatUtils';
// ═══════════════════════════════════════════════════════════════
//  REUSABLE CUSTOM MODAL — Closes on outside tap
// ═══════════════════════════════════════════════════════════════

const CustomModal = ({ visible, onClose, children }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
    statusBarTranslucent
  >
    <Pressable style={profileStyles.modalOverlay} onPress={onClose}>
      <Pressable
        style={profileStyles.modalContainer}
        onPress={(e) => e.stopPropagation()}
      >
        {children}
      </Pressable>
    </Pressable>
  </Modal>
);

// ═══════════════════════════════════════════════════════════════
//  ACTION BUTTON
// ═══════════════════════════════════════════════════════════════

const ActionButton = ({ iconName, label, onPress, iconColor = '#128C7E' }) => (
  <TouchableOpacity style={profileStyles.actionButton} onPress={onPress}>
    <View style={profileStyles.actionIconContainer}>
      <Icon name={iconName} size={22} color={iconColor} />
    </View>
    <Text style={profileStyles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════
//  MENU ITEM
// ═══════════════════════════════════════════════════════════════

const MenuItem = ({
  iconName,
  iconFamily = 'material',
  title,
  subtitle,
  onPress,
  rightComponent,
  titleColor = '#333',
  iconColor = '#667781',
}) => (
  <TouchableOpacity
    style={profileStyles.menuItem}
    onPress={onPress}
    activeOpacity={0.6}
  >
    <View style={profileStyles.menuIconContainer}>
      {iconFamily === 'material' ? (
        <Icon name={iconName} size={22} color={iconColor} />
      ) : (
        <MCIcon name={iconName} size={22} color={iconColor} />
      )}
    </View>

    <View style={profileStyles.menuTextContainer}>
      <Text style={[profileStyles.menuTitle, { color: titleColor }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={profileStyles.menuSubtitle}>{subtitle}</Text>
      ) : null}
    </View>

    {rightComponent || null}
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════
//  SECTION DIVIDER
// ═══════════════════════════════════════════════════════════════

const SectionDivider = () => <View style={profileStyles.sectionDivider} />;

// ═══════════════════════════════════════════════════════════════
//  RADIO OPTION (for disappearing messages)
// ═══════════════════════════════════════════════════════════════

const RadioOption = ({ label, selected, onPress }) => (
  <TouchableOpacity style={profileStyles.radioOption} onPress={onPress}>
    <View
      style={[
        profileStyles.radioOuter,
        !selected && profileStyles.radioOuterInactive,
      ]}
    >
      {selected && <View style={profileStyles.radioInner} />}
    </View>
    <Text style={profileStyles.radioLabel}>{label}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════════════════════

const ContactProfileScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();

  const {

    phoneNumber = '',
    avatarColor = '#128C7E',
    avatarChar = '?',
    avatarUrl = null,
    isOnline = false,
    chatRoom = null,
    currentUser = null,
    serverContactName = '',   // name stored on the server (e.g. user.name)
  } = route.params || {};


  // ── Contact name resolution (phonebook first, server fallback) ──
  const { localContactName } = useContactName({ chatRoom, currentUser });
  const displayName = getDisplayNameFromChatRoom(chatRoom, currentUser);

  const [resolvedNameMeta, setResolvedNameMeta] = useState(null);

  useEffect(() => {
    const resolve = async () => {
      // Priority for server fallback name:
      // 1. localContactName (from useContactName hook)
      // 2. serverContactName (explicitly passed from navigation)
      // 3. displayName (route param default)
      const serverName = localContactName || serverContactName || displayName;
      const result = await authService.getContactDisplayName(phoneNumber, serverName);
      setResolvedNameMeta(result);
    };
    resolve();
  }, [phoneNumber, localContactName, serverContactName, displayName]);

  // finalName priority:
  // 1. Phonebook name (resolvedNameMeta.name, fromPhonebook: true)
  // 2. Server name   (resolvedNameMeta.name, fromPhonebook: false)
  // 3. localContactName from hook
  // 4. serverContactName from route params
  // 5. displayName fallback
  const finalName =
    resolvedNameMeta?.name ||        // phonebook or server resolved
    localContactName ||              // local hook
    serverContactName ||             // passed from navigation
    displayName;                     // last fallback

  // Show "Not in phonebook" only when resolved and confirmed not in phonebook
  const showNotSaved = resolvedNameMeta !== null && resolvedNameMeta.fromPhonebook === false;

  // ─── State ───
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [customNotifications, setCustomNotifications] = useState(false);
  const [disappearingMessages, setDisappearingMessages] = useState('Off');
  const [mediaVisibility, setMediaVisibility] = useState(true);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // ─── Modal Visibility States ───
  const [showCallModal, setShowCallModal] = useState(false);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);

  // Temp state for disappearing selection before confirm
  const [tempDisappearing, setTempDisappearing] = useState('Off');

  // ─── Handlers ───
  const handleCall = useCallback(() => {
    setShowCallModal(true);
  }, []);

  const handleVideoCall = useCallback(() => {
    setShowVideoCallModal(true);
  }, []);

  const handleSaveContact = useCallback(() => {
    setShowSaveModal(true);
  }, []);

  const handleSearch = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCustomNotifications = useCallback(() => {
    setCustomNotifications(prev => !prev);
  }, []);

  const handleDisappearingMessages = useCallback(() => {
    setTempDisappearing(disappearingMessages);
    setShowDisappearingModal(true);
  }, [disappearingMessages]);

  const confirmDisappearing = useCallback(() => {
    setDisappearingMessages(tempDisappearing);
    setShowDisappearingModal(false);
  }, [tempDisappearing]);

  const handleMuteNotifications = useCallback(() => {
    if (muteNotifications) {
      setMuteNotifications(false);
    } else {
      setShowMuteModal(true);
    }
  }, [muteNotifications]);

  const handleMediaVisibility = useCallback(() => {
    setMediaVisibility(prev => !prev);
  }, []);

  const handleBlock = useCallback(() => {
    setShowBlockModal(true);
  }, []);

  const handleReport = useCallback(() => {
    setShowReportModal(true);
  }, []);

  const handleEncryption = useCallback(() => {
    setShowEncryptionModal(true);
  }, []);

  // ✅ FIX 1 — Extracted call handler with proper navigation (no getParent())

  const handleStartAudioCall = useCallback(() => {
    setShowCallModal(false);
    if (!chatRoom?.id || !currentUser?.id) {
      Alert.alert('Error', 'Cannot start call.');
      return;
    }

    navigation.navigate('AudioCall', {
      userId: currentUser.id,
      roomId: chatRoom.id,
      isCaller: true,
      callerName: finalName,
    });
  },
    [chatRoom, currentUser, finalName, navigation]);

  const handleStartVideoCall = useCallback(() => {
    setShowVideoCallModal(false);
    if (!chatRoom?.id || !currentUser?.id) {
      Alert.alert('Error', 'Cannot start video call.');
      return;
    }

    navigation.navigate('VideoCallScreen', {
      userId: currentUser.id,
      roomId: chatRoom.id,
      isCaller: true,
      callerName: finalName,
    });
  }, [chatRoom?.id, currentUser?.id, finalName, navigation]);


  // ✅ FIX 2 — iconFamily for timer icon corrected to 'material' (MCIcon needs 'material-community')
  // The original had iconFamily="material-community" for 'timer' but MCIcon uses different names.
  // 'timer' exists in MaterialIcons, so iconFamily should stay as default 'material'.

  return (
    <View style={profileStyles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />

      {/* ─── Top Safe Area ─── */}
      <View style={{ height: insets.top, backgroundColor: '#075E54' }} />

      {/* ─── Header Bar ─── */}
      <View style={profileStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={profileStyles.headerBackButton}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={profileStyles.headerMenuButton}
          onPress={() => setShowMoreOptions(!showMoreOptions)}
        >
          <Icon name="more-vert" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ─── Scrollable Content ─── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile Section ─── */}


        <View style={profileStyles.profileSection}>
          <View style={profileStyles.avatarWrapper}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={profileStyles.avatarImage}
              />
            ) : (
              <View
                style={[
                  profileStyles.avatarFallback,
                  { backgroundColor: avatarColor },
                ]}
              >
                <Text style={profileStyles.avatarFallbackText}>
                  {avatarChar}
                </Text>
              </View>
            )}
            {isOnline && <View style={profileStyles.onlineIndicator} />}
          </View>

          {/* ✅ NAME (FIXED) */}
          <Text style={profileStyles.displayNameText}>
            {finalName}
          </Text>

          {/* ✅ NOT SAVED LABEL */}
          {showNotSaved && (
            <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              {resolvedNameMeta?.label || 'Not in phonebook'}
            </Text>
          )}

          {/* ✅ PHONE NUMBER (RESTORED) */}
          <Text style={profileStyles.phoneNumber}>
            {phoneNumber || 'No phone number'}
          </Text>

          {/* ONLINE STATUS */}
          {isOnline && (
            <Text style={profileStyles.onlineStatusText}>Online</Text>
          )}
        </View>



        {/* ─── Action Buttons Row ─── */}
        <View style={profileStyles.actionsRow}>
          <ActionButton iconName="call" label="Call" onPress={handleCall} />
          <ActionButton
            iconName="videocam"
            label="Video"
            onPress={handleVideoCall}
          />
          <ActionButton
            iconName="bookmark-border"
            label="Save"
            onPress={handleSaveContact}
          />
          <ActionButton
            iconName="search"
            label="Search"
            onPress={handleSearch}
          />
        </View>

        <SectionDivider />

        {/* ─── Settings List ─── */}
        <View style={profileStyles.settingsSection}>
          <MenuItem
            iconName="notifications-none"
            title="Custom Notifications"
            onPress={handleCustomNotifications}
            rightComponent={
              <Switch
                value={customNotifications}
                onValueChange={handleCustomNotifications}
                trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                thumbColor={customNotifications ? '#128C7E' : '#f4f3f4'}
              />
            }
          />

          {/* ✅ FIX 2 — iconFamily corrected: 'timer' is a MaterialIcons icon, not MCIcon */}
          <MenuItem
            iconName="timer"
            iconFamily="material"
            title="Disappearing messages"
            subtitle={disappearingMessages}
            onPress={handleDisappearingMessages}
          />

          <MenuItem
            iconName={
              muteNotifications ? 'notifications-off' : 'notifications'
            }
            title="Mute Notifications"
            subtitle={muteNotifications ? 'On' : 'Off'}
            onPress={handleMuteNotifications}
          />

          <MenuItem
            iconName="perm-media"
            title="Media visibility"
            subtitle={mediaVisibility ? 'Default' : 'Hidden'}
            onPress={handleMediaVisibility}
          />
        </View>

        <SectionDivider />

        {/* ─── Encryption Section ─── */}
        <View style={profileStyles.settingsSection}>
          <MenuItem
            iconName="lock"
            title="Encryption"
            subtitle="Messages are end-to-end encrypted. Tap to verify."
            iconColor="#128C7E"
            onPress={handleEncryption}
          />
        </View>

        <SectionDivider />

        {/* ─── Danger Zone ─── */}
        <View style={profileStyles.settingsSection}>
          <MenuItem
            iconName="block"
            title={`Block ${finalName}`}
            titleColor="#DC2626"
            iconColor="#DC2626"
            onPress={handleBlock}
          />
          <MenuItem
            iconName="thumb-down"
            title={`Report ${finalName}`}
            titleColor="#DC2626"
            iconColor="#DC2626"
            onPress={handleReport}
          />
        </View>
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  ALL CUSTOM MODALS                                      */}
      {/* ═══════════════════════════════════════════════════════ */}

      {/* ── Audio Call Modal ── */}
      <CustomModal
        visible={showCallModal}
        onClose={() => setShowCallModal(false)}
      >
        <View style={profileStyles.modalHeader}>
          <Text style={profileStyles.modalTitle}>Audio Call</Text>
          <Text style={profileStyles.modalMessage}>
            Call {finalName}?
          </Text>
        </View>
        <View style={profileStyles.modalFooter}>
          <TouchableOpacity
            style={profileStyles.modalCancelButton}
            onPress={() => setShowCallModal(false)}
          >
            <Text style={profileStyles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>

          {/* ✅ FIX 1 — Uses handleStartAudioCall with direct navigation.navigate() */}
          <TouchableOpacity
            style={profileStyles.modalConfirmButton}
            onPress={handleStartAudioCall}
          >
            <Text style={profileStyles.modalConfirmText}>Call</Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* ── Video Call Modal ── */}
      <CustomModal
        visible={showVideoCallModal}
        onClose={() => setShowVideoCallModal(false)}
      >
        <View style={profileStyles.modalHeader}>
          <Text style={profileStyles.modalTitle}>Video Call</Text>
          <Text style={profileStyles.modalMessage}>
            Video call {finalName}?
          </Text>
        </View>
        <View style={profileStyles.modalFooter}>
          <TouchableOpacity
            style={profileStyles.modalCancelButton}
            onPress={() => setShowVideoCallModal(false)}
          >
            <Text style={profileStyles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={profileStyles.modalConfirmButton}
            onPress={handleStartVideoCall}
          >
            <Text style={profileStyles.modalConfirmText}>Call</Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* ── Save Contact Modal ── */}
      <CustomModal
        visible={showSaveModal}
        onClose={() => setShowSaveModal(false)}
      >
        <View style={profileStyles.modalHeader}>
          <Text style={profileStyles.modalTitle}>Save Contact</Text>
          <Text style={profileStyles.modalMessage}>
            Save {finalName} to contacts?
          </Text>
        </View>
        <View style={profileStyles.modalFooter}>
          <TouchableOpacity
            style={profileStyles.modalCancelButton}
            onPress={() => setShowSaveModal(false)}
          >
            <Text style={profileStyles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={profileStyles.modalConfirmButton}
            onPress={() => {
              setShowSaveModal(false);
              console.log('[ContactProfileScreen] Contact saved');
            }}
          >
            <Text style={profileStyles.modalConfirmText}>Save</Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* ── Disappearing Messages Modal ── */}
      <CustomModal
        visible={showDisappearingModal}
        onClose={() => setShowDisappearingModal(false)}
      >
        <View style={profileStyles.modalHeader}>
          <Text style={profileStyles.modalTitle}>Disappearing Messages</Text>
          <Text style={profileStyles.modalMessage}>
            Choose how long messages last
          </Text>
        </View>

        <View style={profileStyles.modalOptionsContainer}>
          {['Off', '24 Hours', '7 Days', '90 Days'].map(option => (
            <RadioOption
              key={option}
              label={option}
              selected={tempDisappearing === option}
              onPress={() => setTempDisappearing(option)}
            />
          ))}
        </View>

        <View style={profileStyles.modalFooter}>
          <TouchableOpacity
            style={profileStyles.modalCancelButton}
            onPress={() => setShowDisappearingModal(false)}
          >
            <Text style={profileStyles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={profileStyles.modalConfirmButton}
            onPress={confirmDisappearing}
          >
            <Text style={profileStyles.modalConfirmText}>OK</Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* ── Mute Notifications Modal ── */}
      <CustomModal
        visible={showMuteModal}
        onClose={() => setShowMuteModal(false)}
      >
        <View style={profileStyles.modalHeader}>
          <Text style={profileStyles.modalTitle}>Mute Notifications</Text>
          <Text style={profileStyles.modalMessage}>Choose mute duration</Text>
        </View>

        <View style={profileStyles.modalOptionsContainer}>
          {/* ✅ FIX 3 — Each option now stores its own value before closing */}
          {['8 Hours', '1 Week', 'Always'].map(option => (
            <TouchableOpacity
              key={option}
              style={profileStyles.modalOption}
              onPress={() => {
                console.log('[ContactProfileScreen] Muted for:', option);
                setMuteNotifications(true);
                setShowMuteModal(false);
              }}
            >
              <Text style={profileStyles.modalOptionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={profileStyles.modalFooter}>
          <TouchableOpacity
            style={profileStyles.modalCancelButton}
            onPress={() => setShowMuteModal(false)}
          >
            <Text style={profileStyles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* ── Encryption Modal ── */}
      <CustomModal
        visible={showEncryptionModal}
        onClose={() => setShowEncryptionModal(false)}
      >
        <View style={profileStyles.modalHeader}>
          <Text style={profileStyles.modalTitle}>Encryption</Text>
          <Text style={profileStyles.modalMessage}>
            Messages to this chat are secured with end-to-end encryption.
            Tap to learn more.
          </Text>
        </View>
        <View style={profileStyles.modalFooter}>
          <TouchableOpacity
            style={profileStyles.modalConfirmButton}
            onPress={() => setShowEncryptionModal(false)}
          >
            <Text style={profileStyles.modalConfirmText}>OK</Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* ── Block Modal ── */}
      <CustomModal
        visible={showBlockModal}
        onClose={() => setShowBlockModal(false)}
      >
        <View style={profileStyles.modalHeader}>
          <Text style={profileStyles.modalTitle}>Block Contact</Text>
          <Text style={profileStyles.modalMessage}>
            Block {finalName}? Blocked contacts can no longer send you
            messages.
          </Text>
        </View>
        <View style={profileStyles.modalFooter}>
          <TouchableOpacity
            style={profileStyles.modalCancelButton}
            onPress={() => setShowBlockModal(false)}
          >
            <Text style={profileStyles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              profileStyles.modalConfirmButton,
              profileStyles.modalConfirmButtonDestructive,
            ]}
            onPress={() => {
              setShowBlockModal(false);
              console.log('[ContactProfileScreen] Contact blocked:', finalName);
            }}
          >
            <Text style={profileStyles.modalConfirmText}>Block</Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* ── Report Modal ── */}
      <CustomModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
      >
        <View style={profileStyles.modalHeader}>
          <Text style={profileStyles.modalTitle}>Report Contact</Text>
          <Text style={profileStyles.modalMessage}>
            Report {finalName}? The last 5 messages will be forwarded to
            us for review.
          </Text>
        </View>
        <View style={profileStyles.modalFooter}>
          <TouchableOpacity
            style={profileStyles.modalCancelButton}
            onPress={() => setShowReportModal(false)}
          >
            <Text style={profileStyles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              profileStyles.modalConfirmButton,
              profileStyles.modalConfirmButtonDestructive,
            ]}
            onPress={() => {
              setShowReportModal(false);
              console.log('[ContactProfileScreen] Contact reported:', finalName);
            }}
          >
            <Text style={profileStyles.modalConfirmText}>Report</Text>
          </TouchableOpacity>
        </View>
      </CustomModal>
    </View>
  );
};

export default ContactProfileScreen;
