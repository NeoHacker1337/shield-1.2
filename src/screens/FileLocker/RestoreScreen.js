import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Modal, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Fonts, Spacing } from './../../assets/theme';
import { useRestore } from './hooks/useRestore';
import { useBackup } from './hooks/useBackup';
import RestoreProgressCard from './components/RestoreProgressCard';
import authService from './../../services/AuthService';
import fileManager from './../../services/fileManager';

const SCHEDULE_OPTIONS = [
  { label: 'Every Day', value: 'daily', icon: 'today', color: Colors.primary },
  { label: 'Every Week', value: 'weekly', icon: 'date-range', color: Colors.success },
  { label: 'Every Month', value: 'monthly', icon: 'calendar-today', color: Colors.warning },
  { label: 'Manual Only', value: 'manual', icon: 'block', color: Colors.textSecondary },
];

const RESEND_COOLDOWN = 60; // seconds

const RestoreScreen = ({ navigation }) => {

  // ── Restore Hook ──
  const {
    restoring, progress, currentFile, totalFiles,
    restoredCount, status, errorMessage,
    startRestore, resetRestore,
  } = useRestore();

  // ── Backup Hook ──
  const {
    backing, status: backupRunStatus, progress: backupProgress,
    startBackup, saveSchedule,
  } = useBackup();

  // ── Screen State ──
  const [lastRestoreTime, setLastRestoreTime] = useState(null);
  const [lastBackupTime, setLastBackupTime] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState('manual');
  const [activeTab, setActiveTab] = useState('restore');

  // ── OTP State ──
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const loadData = async () => {
    const token = await authService.getToken();
    const user = await authService.getCurrentUser();
    const lastRestore = await AsyncStorage.getItem('lastRestoreTime');
    const lastBackup = await AsyncStorage.getItem('lastBackupTime');
    const schedule = await AsyncStorage.getItem('backupSchedule');

    setAuthToken(token);
    if (lastRestore) setLastRestoreTime(new Date(lastRestore).toLocaleString());
    if (lastBackup) setLastBackupTime(new Date(lastBackup).toLocaleString());
    if (schedule) setSelectedSchedule(schedule);

    console.log('Token loaded:', token);
    console.log('User loaded:', user);
  };

  // ── Start cooldown timer ──
  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Send OTP ──
  const handleSendOtp = async () => {
    if (!authToken) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    const res = await fileManager.sendRestoreOtp();
    setOtpLoading(false);

    if (res.success) {
      setOtpSent(true);
      setMaskedEmail(res.email || '');
      startCooldown();
    } else {
      setOtpError(res.error || 'Failed to send OTP. Try again.');
    }
  };

  // ── Open OTP Modal (triggered by "Start Restore" button) ──
  const handleRestore = () => {
    if (!authToken) {
      Alert.alert('Error', 'You must be logged in to restore.');
      return;
    }
    // Reset OTP state and open modal
    setOtpValue('');
    setOtpError('');
    setOtpSent(false);
    setMaskedEmail('');
    setResendCooldown(0);
    setOtpModalVisible(true);
    // Auto-send OTP on modal open
    setTimeout(() => handleSendOtp(), 300);
  };

  // ── Verify OTP then Run Restore ──
  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      setOtpError('Please enter the 6-digit OTP.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');

    const res = await fileManager.verifyRestoreOtp(otpValue);
    setOtpLoading(false);

    if (!res.success) {
      setOtpError(res.error || 'Invalid OTP. Please try again.');
      return;
    }

    // ✅ OTP verified — close modal and start restore
    setOtpModalVisible(false);
    setOtpValue('');

    const result = await startRestore(authToken);
    if (result?.success && result?.message) {
      Alert.alert('Info', result.message);
    }
  };

  const handleDone = () => {
    resetRestore();
    navigation.goBack();
  };

  // ── Backup Handler ──
  const handleBackup = () => {
    if (!authToken) {
      Alert.alert('Error', 'You must be logged in to backup.');
      return;
    }
    Alert.alert('Backup Files', 'This will sync all your vault files to the server. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Backup Now',
        onPress: async () => {
          const result = await startBackup();
          if (result.success) {
            const now = new Date().toISOString();
            await AsyncStorage.setItem('lastBackupTime', now);
            setLastBackupTime(new Date(now).toLocaleString());
            Alert.alert('✅ Backup Complete', 'Your vault is fully backed up.');
          } else {
            Alert.alert('Backup Failed', result.error || 'Please try again.');
          }
        },
      },
    ]);
  };

  const handleScheduleSelect = async (value) => {
    setSelectedSchedule(value);
    const res = await saveSchedule(value);
    setScheduleModalVisible(false);
    const label = SCHEDULE_OPTIONS.find(o => o.value === value)?.label;
    Alert.alert(res.success ? 'Schedule Set' : 'Saved Locally', `Auto backup set to: ${label}`);
  };

  const getScheduleLabel = () =>
    SCHEDULE_OPTIONS.find(o => o.value === selectedSchedule)?.label || 'Manual Only';
  const getScheduleColor = () =>
    SCHEDULE_OPTIONS.find(o => o.value === selectedSchedule)?.color || Colors.textSecondary;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
        <Icon name="arrow-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconBox}>
          <Icon name="cloud" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Backup & Restore</Text>
        <Text style={styles.headerSubtitle}>Keep your vault safe with cloud backup and easy restore.</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'backup' && styles.tabBtnActive]} onPress={() => setActiveTab('backup')} activeOpacity={0.8}>
          <Icon name="cloud-upload" size={16} color={activeTab === 'backup' ? Colors.backgroundDark : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'backup' && styles.tabTextActive]}>Backup</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'restore' && styles.tabBtnActive]} onPress={() => setActiveTab('restore')} activeOpacity={0.8}>
          <Icon name="cloud-download" size={16} color={activeTab === 'restore' ? Colors.backgroundDark : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'restore' && styles.tabTextActive]}>Restore</Text>
        </TouchableOpacity>
      </View>

      {/* ════════════ BACKUP TAB ════════════ */}
      {activeTab === 'backup' && (
        <>
          <View style={styles.infoCard}>
            <Icon name="cloud-done" size={18} color={Colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Last Backup</Text>
              <Text style={styles.infoText}>{lastBackupTime || 'Never backed up'}</Text>
            </View>
          </View>

          {backupRunStatus === 'running' && (
            <View style={styles.progressCard}>
              <Text style={styles.progressLabel}>Syncing vault to server...</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${backupProgress}%` }]} />
              </View>
              <Text style={styles.progressPercent}>{backupProgress}%</Text>
            </View>
          )}

          <TouchableOpacity style={styles.scheduleCard} onPress={() => setScheduleModalVisible(true)} activeOpacity={0.85}>
            <View style={[styles.scheduleIconBox, { backgroundColor: `${getScheduleColor()}20` }]}>
              <Icon name="schedule" size={22} color={getScheduleColor()} />
            </View>
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleTitle}>Auto Backup Schedule</Text>
              <Text style={[styles.scheduleValue, { color: getScheduleColor() }]}>{getScheduleLabel()}</Text>
            </View>
            <Icon name="edit" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, { backgroundColor: Colors.primary }, backing && styles.disabledBtn]} onPress={handleBackup} disabled={backing} activeOpacity={0.85}>
            <Icon name="cloud-upload" size={20} color={Colors.backgroundDark} />
            <Text style={styles.actionButtonText}>{backing ? 'Backing up...' : 'Backup Now'}</Text>
          </TouchableOpacity>

          <View style={styles.noteCard}>
            <Icon name="info-outline" size={16} color={Colors.info} />
            <Text style={styles.noteText}>Files are encrypted before upload. Your password is never sent to the server.</Text>
          </View>
        </>
      )}

      {/* ════════════ RESTORE TAB ════════════ */}
      {activeTab === 'restore' && (
        <>
          {lastRestoreTime && (
            <View style={styles.infoCard}>
              <Icon name="history" size={18} color={Colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Last Restore</Text>
                <Text style={styles.infoText}>{lastRestoreTime}</Text>
              </View>
            </View>
          )}

          <RestoreProgressCard
            status={status} progress={progress} currentFile={currentFile}
            totalFiles={totalFiles} restoredCount={restoredCount} errorMessage={errorMessage}
          />

          {/* ✅ ADD HERE — No Backup Empty State */}
          {status === 'no_backup' && (
            <View style={styles.emptyState}>
              <Icon name="cloud-off" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Backup Found</Text>
              <Text style={styles.emptySubtitle}>
                You have not backed up any files yet.{'\n'}
                Go to File Locker and start a backup first.
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => navigation.navigate('FileLocker')}
              >
                <Text style={styles.retryText}>Go to File Locker</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.buttonContainer}>
            {(status === 'idle' || status === 'error') && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors.primary }, restoring && styles.disabledBtn]}
                onPress={handleRestore}
                disabled={restoring}
                activeOpacity={0.85}
              >
                <Icon name="cloud-download" size={20} color={Colors.backgroundDark} />
                <Text style={styles.actionButtonText}>{status === 'error' ? 'Retry Restore' : 'Start Restore'}</Text>
              </TouchableOpacity>
            )}
            {status === 'done' && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: Colors.success }]} onPress={handleDone} activeOpacity={0.85}>
                <Icon name="check" size={20} color={Colors.backgroundDark} />
                <Text style={styles.actionButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.noteCard}>
            <Icon name="info-outline" size={16} color={Colors.info} />
            <Text style={styles.noteText}>Files remain encrypted during download. Your password is never sent to the server.</Text>
          </View>
        </>
      )}

      {/* ════════════ SCHEDULE MODAL ════════════ */}
      <Modal visible={scheduleModalVisible} transparent animationType="slide" onRequestClose={() => setScheduleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Auto Backup Schedule</Text>
              <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
                <Icon name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Choose how often your vault should be automatically backed up.</Text>
            {SCHEDULE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.scheduleOption, selectedSchedule === option.value && styles.scheduleOptionActive, selectedSchedule === option.value && { borderColor: option.color }]}
                onPress={() => handleScheduleSelect(option.value)}
                activeOpacity={0.85}
              >
                <View style={[styles.optionIconBox, { backgroundColor: `${option.color}20` }]}>
                  <Icon name={option.icon} size={22} color={option.color} />
                </View>
                <Text style={[styles.optionLabel, selectedSchedule === option.value && { color: option.color }]}>{option.label}</Text>
                {selectedSchedule === option.value && <Icon name="check-circle" size={20} color={option.color} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ════════════ OTP MODAL ════════════ */}
      <Modal visible={otpModalVisible} transparent animationType="fade" onRequestClose={() => { if (!restoring) setOtpModalVisible(false); }}>
        <KeyboardAvoidingView style={styles.otpOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.otpContainer}>

            {/* Header */}
            <View style={styles.otpHeader}>
              <View style={styles.otpIconBox}>
                <Icon name="verified-user" size={28} color={Colors.primary} />
              </View>
              {!restoring && (
                <TouchableOpacity onPress={() => setOtpModalVisible(false)} style={styles.otpCloseBtn}>
                  <Icon name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.otpTitle}>Verify Your Identity</Text>

            {/* Sending OTP state */}
            {!otpSent ? (
              <View style={styles.otpSendingBox}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.otpSubtitle}>Sending OTP to your email...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.otpSubtitle}>
                  OTP sent to{' '}
                  <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>{maskedEmail}</Text>
                </Text>
                <Text style={styles.otpHint}>Enter the 6-digit code below to proceed with restore.</Text>

                {/* OTP Input */}
                <TextInput
                  style={styles.otpInput}
                  value={otpValue}
                  onChangeText={(t) => { setOtpValue(t.replace(/[^0-9]/g, '')); setOtpError(''); }}
                  placeholder="000000"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                  editable={!otpLoading && !restoring}
                />

                {/* Error */}
                {otpError ? (
                  <View style={styles.otpErrorBox}>
                    <Icon name="error-outline" size={14} color={Colors.error || '#F44336'} />
                    <Text style={styles.otpErrorText}>{otpError}</Text>
                  </View>
                ) : null}



                {/* Verify Button */}
                <TouchableOpacity
                  style={[styles.otpVerifyBtn, (otpLoading || restoring || otpValue.length !== 6) && styles.disabledBtn]}
                  onPress={handleVerifyOtp}
                  disabled={otpLoading || restoring || otpValue.length !== 6}
                  activeOpacity={0.85}
                >
                  {otpLoading || restoring ? (
                    <ActivityIndicator size="small" color={Colors.backgroundDark} />
                  ) : (
                    <Icon name="lock-open" size={18} color={Colors.backgroundDark} />
                  )}
                  <Text style={styles.otpVerifyText}>
                    {restoring ? 'Restoring...' : otpLoading ? 'Verifying...' : 'Verify & Restore'}
                  </Text>
                </TouchableOpacity>

                {/* Resend OTP */}
                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={resendCooldown > 0 || otpLoading}
                  style={styles.resendBtn}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="refresh"
                    size={15}
                    color={resendCooldown > 0 ? Colors.textSecondary : Colors.primary}
                  />
                  <Text style={[styles.resendText, resendCooldown > 0 && { color: Colors.textSecondary }]}>
                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundDark },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },

  backButton: {
    marginTop: Spacing.md, marginLeft: Spacing.xs,
    padding: Spacing.sm, alignSelf: 'flex-start',
    backgroundColor: Colors.backgroundInput,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.borderLight,
  },
  header: { alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm },
  headerIconBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: `${Colors.primary}18`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs, borderWidth: 1, borderColor: `${Colors.primary}30` },
  headerTitle: { color: Colors.textPrimary, fontSize: Fonts.size.xl, fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary },
  headerSubtitle: { color: Colors.textSecondary, fontSize: Fonts.size.sm, textAlign: 'center', paddingHorizontal: Spacing.md, fontFamily: Fonts.family.primary },

  tabRow: { flexDirection: 'row', backgroundColor: Colors.backgroundInput, borderRadius: 12, padding: 4, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: Fonts.size.sm, fontWeight: Fonts.weight.medium, fontFamily: Fonts.family.primary },
  tabTextActive: { color: Colors.backgroundDark, fontWeight: Fonts.weight.bold },

  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundCard, padding: Spacing.md, borderRadius: 12, gap: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight },
  infoLabel: { color: Colors.textSecondary, fontSize: Fonts.size.xs, fontFamily: Fonts.family.primary },
  infoText: { color: Colors.textPrimary, fontSize: Fonts.size.sm, fontWeight: Fonts.weight.medium, fontFamily: Fonts.family.primary, marginTop: 2 },

  progressCard: { backgroundColor: Colors.backgroundCard, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight, gap: 8 },
  progressLabel: { color: Colors.textSecondary, fontSize: Fonts.size.sm, fontFamily: Fonts.family.primary },
  progressBarBg: { height: 6, backgroundColor: Colors.backgroundInput, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 4 },
  progressPercent: { color: Colors.primary, fontSize: Fonts.size.xs, fontFamily: Fonts.family.primary, textAlign: 'right' },

  scheduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundCard, borderRadius: 14, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight },
  scheduleIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scheduleInfo: { flex: 1 },
  scheduleTitle: { color: Colors.textSecondary, fontSize: Fonts.size.xs, fontFamily: Fonts.family.primary },
  scheduleValue: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary, marginTop: 2 },

  buttonContainer: { marginTop: Spacing.sm },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: 12, gap: Spacing.sm, marginBottom: Spacing.sm },
  actionButtonText: { color: Colors.backgroundDark, fontSize: Fonts.size.md, fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary },
  disabledBtn: { opacity: 0.5 },

  noteCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: `${Colors.info}12`, padding: Spacing.sm, borderRadius: 10, gap: Spacing.sm, marginTop: Spacing.md, borderWidth: 1, borderColor: `${Colors.info}30` },
  noteText: { color: Colors.textSecondary, fontSize: Fonts.size.xs, flex: 1, lineHeight: 18, fontFamily: Fonts.family.primary },

  // Schedule Modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlayDark, justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: Colors.backgroundInput, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  modalTitle: { color: Colors.textPrimary, fontSize: Fonts.size.lg, fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary },
  modalSubtitle: { color: Colors.textSecondary, fontSize: Fonts.size.sm, marginBottom: Spacing.lg, fontFamily: Fonts.family.primary, lineHeight: 20 },
  scheduleOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundCard, borderRadius: 14, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight },
  scheduleOptionActive: { backgroundColor: `${Colors.primary}10` },
  optionIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { flex: 1, color: Colors.textPrimary, fontSize: Fonts.size.sm, fontWeight: Fonts.weight.medium, fontFamily: Fonts.family.primary },

  // OTP Modal
  otpOverlay: { flex: 1, backgroundColor: Colors.overlayDark, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  otpContainer: { width: '100%', backgroundColor: Colors.backgroundInput, borderRadius: 20, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight },
  otpHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, position: 'relative' },
  otpIconBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: `${Colors.primary}18`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${Colors.primary}30` },
  otpCloseBtn: { position: 'absolute', right: 0, padding: 4 },
  otpTitle: { color: Colors.textPrimary, fontSize: Fonts.size.lg, fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary, textAlign: 'center', marginBottom: 6 },
  otpSubtitle: { color: Colors.textSecondary, fontSize: Fonts.size.sm, textAlign: 'center', fontFamily: Fonts.family.primary, marginBottom: 4 },
  otpHint: { color: Colors.textSecondary, fontSize: Fonts.size.xs, textAlign: 'center', fontFamily: Fonts.family.primary, marginBottom: Spacing.md },
  otpSendingBox: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 10 },
  otpInput: { backgroundColor: Colors.backgroundCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary, color: Colors.textPrimary, fontSize: 28, fontWeight: 'bold', letterSpacing: 10, padding: Spacing.md, marginVertical: Spacing.md, textAlign: 'center', fontFamily: Fonts.family.primary },
  otpErrorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  otpErrorText: { color: Colors.error || '#F44336', fontSize: Fonts.size.xs, fontFamily: Fonts.family.primary, flex: 1 },
  otpVerifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 12, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  otpVerifyText: { color: Colors.backgroundDark, fontSize: Fonts.size.md, fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary },
  resendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm },
  resendText: { color: Colors.primary, fontSize: Fonts.size.sm, fontFamily: Fonts.family.primary },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.sm,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Fonts.family.primary,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    marginTop: Spacing.sm,
  },
  retryText: {
    color: Colors.backgroundDark,
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,
  },

});

export default RestoreScreen;
