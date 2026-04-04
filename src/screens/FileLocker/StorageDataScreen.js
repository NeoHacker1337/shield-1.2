// src/screens/StorageData/StorageDataScreen.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Fonts, Spacing } from '../../assets/theme';
import fileManager from '../../services/fileManager';


const getBarColor = (percent) => {
  if (percent < 50) return Colors.success;
  if (percent < 80) return Colors.warning;
  return Colors.danger;
};


const StorageDataScreen = ({ navigation }) => {


  // ── Existing State ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [storageData, setStorageData] = useState(null);
  const [lastRestore, setLastRestore] = useState(null);
  const [error, setError] = useState('');

  // ── Upgrade Request Modal State ─────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [userNote, setUserNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);

  // ── Auto-refresh on screen focus ────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadStorageInfo();
    }, [])
  );


  const isFetchingRef = React.useRef(false);


  // ── Updated loadStorageInfo (clean + safe) ───────────────────────────────
  const loadStorageInfo = async () => {
    if (isFetchingRef.current) return;   // 🚫 prevent duplicate calls
    isFetchingRef.current = true;

    setLoading(true);
    setError('');

    try {
      const res = await fileManager.getStorageInfo();

      if (res.success) {
        setStorageData(res.data);
      } else {
        setError(res.error || 'Failed to load storage info.');
      }

      const lastTime = await AsyncStorage.getItem('lastRestoreTime');
      if (lastTime) setLastRestore(new Date(lastTime).toLocaleString());

    } catch (e) {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // ── Load Plans for Modal ─────────────────────────────────────────────────────
  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await fileManager.getStoragePlans();

      if (res.success) {
        // Filter out current plan and free plan — show only upgradeable plans
        const upgradeable = (res.data ?? []).filter(
          p => p.slug !== storageData?.plan?.slug
        );

        setPlans(upgradeable);
      } else {
        console.log('Plans error:', res.error);
        setPlans([]);
      }
    } catch (e) {
      console.log('Plans load exception:', e);
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  };


  // ── Open Modal ───────────────────────────────────────────────────────────────
  const openUpgradeModal = () => {
    setSelectedPlan(null);
    setUserNote('');
    setModalVisible(true);
    loadPlans();
  };

  // ── Submit Upgrade Request ───────────────────────────────────────────────────
  const submitUpgradeRequest = async () => {
    if (!selectedPlan) {
      Alert.alert('Select a Plan', 'Please select a plan to request an upgrade.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fileManager.submitUpgradeRequest(selectedPlan.id, userNote.trim());
      if (res.success) {
        setModalVisible(false);
        setSelectedPlan(null);
        setUserNote('');
        Alert.alert(
          '✅ Request Submitted',
          'Your upgrade request has been sent to the admin. You will be notified once approved.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', res.error || 'Failed to submit request. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  // ── Format bytes to readable string ────────────────────────────────────────
  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };


  // Add this helper function at the top (after getBarColor)
  const parseStorageLabel = (label) => {
    if (!label) return 0;
    const match = label.match(/(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      const multipliers = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
      return Math.floor(value * (multipliers[unit] || 1));
    }
    return 0;
  };

  // Replace your existing variable extraction section (around line 135-150) with this:

  // ── Pull values from API response ──────────────────────────────────────────
  const used = storageData?.storage?.used_bytes ?? 0;

  // ✅ FIX: Use plan.storage_label when storage.limit_bytes is 0
  const planStorageLabel = storageData?.plan?.storage_label ?? '0 B';
  const storageLimitBytes = storageData?.storage?.limit_bytes ?? 0;

  // If API returns 0 limit, parse from plan label
  const limit = storageLimitBytes > 0 ? storageLimitBytes : parseStorageLabel(planStorageLabel);

  const usedLabel = storageData?.storage?.used_label ?? '0 B';

  // Use plan label for display if storage label is "0 B"
  const limitLabel = storageLimitBytes > 0
    ? (storageData?.storage?.limit_label ?? planStorageLabel)
    : planStorageLabel;

  // Recalculate percent correctly
  const percent = limit > 0 ? (used / limit * 100) : 0;

  // Recalculate is_full and is_warning based on correct limit
  const isFull = limit > 0 && used >= limit;
  const isWarning = limit > 0 && percent >= 80 && !isFull;

  const planName = storageData?.plan?.name ?? 'Free';
  const planSlug = storageData?.plan?.slug ?? 'free';
  const isFree = storageData?.plan?.is_free ?? true;
  const billingCycle = storageData?.plan?.billing_cycle ?? 'lifetime';
  const features = storageData?.plan?.features ?? [];
  const totalFiles = storageData?.stats?.total_files ?? 0;
  const totalFolders = storageData?.stats?.total_folders ?? 0;
  const barColor = getBarColor(percent);

  // ✅ Calculate available = total limit - used
  const freeBytes = Math.max(0, limit - used);
  const freeLabel = freeBytes > 0 ? formatBytes(freeBytes) : '0 B';

  const renderActionCard = (icon, iconColor, title, subtitle, onPress) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.actionIconBox, { backgroundColor: `${iconColor}18` }]}>
        <Icon name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.actionInfo}>
        <Text style={styles.actionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.actionSubtitle}>{subtitle}</Text> : null}
      </View>
      <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );


  return (
    <View style={{ flex: 1, backgroundColor: Colors.backgroundDark }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>


        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
          <Icon name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>


        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconBox}>
            <Icon name="storage" size={32} color={Colors.warning} />
          </View>
          <Text style={styles.headerTitle}>Storage & Data</Text>
          <Text style={styles.headerSubtitle}>Manage your vault storage and cloud usage.</Text>
        </View>


        {/* ── Loading ── */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading storage info...</Text>
          </View>


        ) : error ? (
          /* ── Error State ── */
          <View style={styles.errorCard}>
            <Icon name="error-outline" size={20} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadStorageInfo} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>


        ) : (
          <>
            {/* ══════════════════════════════════
               STORAGE USAGE CARD
          ══════════════════════════════════ */}
            <View style={styles.storageCard}>


              {/* Plan Badge Row */}
              <View style={styles.storageCardHeader}>
                <View>
                  <Text style={styles.storageCardTitle}>Vault Storage</Text>
                  <Text style={styles.storageCardPlan}>
                    {isFree
                      ? `🆓 Free Plan — ${limitLabel}`
                      : `⭐ ${planName} — ${limitLabel}`}
                  </Text>
                </View>
                <View style={[styles.planBadge, isFree ? styles.freeBadge : styles.premiumBadge]}>
                  <Text style={[styles.planBadgeText, { color: isFree ? Colors.warning : '#FFD700' }]}>
                    {planName.toUpperCase()}
                  </Text>
                </View>
              </View>


              {/* Used / Limit / Percent */}
              <View style={styles.storageNumbers}>
                <Text style={[styles.storageUsed, { color: barColor, fontWeight: 'bold' }]}>
                  {usedLabel}
                </Text>
                <Text style={styles.storageTotal}>/ {limitLabel}</Text>
                <Text style={[styles.storagePercent, { color: barColor }]}>
                  {percent.toFixed(1)}%
                </Text>
              </View>


              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <View style={[
                  styles.progressBarFill,
                  { width: `${Math.min(percent, 100)}%`, backgroundColor: barColor },
                ]} />
              </View>


              {/* Bar Labels */}
              <View style={styles.barLabels}>
                <View style={styles.barLabelItem}>
                  <View style={[styles.barDot, { backgroundColor: barColor }]} />
                  <Text style={styles.barLabelText}>Used ({usedLabel})</Text>
                </View>
                <View style={styles.barLabelItem}>
                  <View style={[styles.barDot, { backgroundColor: Colors.backgroundInput }]} />
                  <Text style={styles.barLabelText}>Free ({freeLabel})</Text>
                </View>
              </View>


              <View style={styles.divider} />


              {/* Mini Stats */}
              <View style={styles.miniStatsRow}>
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatValue}>{totalFiles}</Text>
                  <Text style={styles.miniStatLabel}>Files</Text>
                </View>
                <View style={styles.miniStatDivider} />
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatValue}>{totalFolders}</Text>
                  <Text style={styles.miniStatLabel}>Folders</Text>
                </View>
                <View style={styles.miniStatDivider} />
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatValue}>{limitLabel}</Text>
                  <Text style={styles.miniStatLabel}>Total Limit</Text>
                </View>
                <View style={styles.miniStatDivider} />
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatValue}>{freeLabel}</Text>
                  <Text style={styles.miniStatLabel}>Available</Text>
                </View>
              </View>


            </View>


            {/* ══════════════════════════════════
               WARNING CARD — 80% or full
          ══════════════════════════════════ */}
            {(isWarning || isFull) && (
              <View style={[
                styles.warningCard,
                { borderColor: isFull ? Colors.danger : Colors.warning },
              ]}>
                <Icon
                  name={isFull ? 'error' : 'warning'}
                  size={18}
                  color={isFull ? Colors.danger : Colors.warning}
                />
                <Text style={[
                  styles.warningText,
                  { color: isFull ? Colors.danger : Colors.warning },
                ]}>
                  {isFull
                    ? 'Storage full! Upgrade your plan to continue uploading files.'
                    : `Storage almost full (${percent.toFixed(0)}%). Consider upgrading your plan.`}
                </Text>
              </View>
            )}


            {/* ══════════════════════════════════
               PLAN FEATURES CARD
          ══════════════════════════════════ */}
            {features.length > 0 && (
              <View style={styles.featuresCard}>
                <Text style={styles.sectionTitle}>Your Plan Includes</Text>
                {features.map((feature, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Icon name="check-circle" size={16} color={Colors.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            )}


            {/* ══════════════════════════════════
     UPGRADE CARD — free users only
══════════════════════════════════ */}
            <View style={styles.upgradeCard}>
              <View style={styles.upgradeLeft}>
                <View style={styles.upgradeIconBox}>
                  <Icon name="workspace-premium" size={24} color="#FFD700" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upgradeTitle}>Upgrade Your Plan</Text>
                  <Text style={styles.upgradeSubtitle}>
                    Get more storage & unlock premium features
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={openUpgradeModal}
                activeOpacity={0.85}
              >
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
                <Icon name="arrow-forward" size={14} color={Colors.backgroundDark} />
              </TouchableOpacity>
            </View>

            {/* ══════════════════════════════════
               ACTIONS
          ══════════════════════════════════ */}
            <Text style={styles.sectionTitle}>Manage Data</Text>
            <View style={styles.actionsContainer}>
              {renderActionCard(
                'refresh', Colors.primary,
                'Refresh Storage Info',
                'Reload latest stats from server',
                loadStorageInfo,
              )}
              {renderActionCard(
                'cloud-download', Colors.success,
                'Backup & Restore',
                'Download vault files from server',
                () => navigation.navigate('Restore'),
              )}
              {renderActionCard(
                'workspace-premium', '#FFD700',
                'View All Plans',
                'Compare plans and upgrade',
                () => navigation.navigate('GetPremium'),
              )}

            </View>


            {/* Last Restore */}
            {lastRestore && (
              <View style={styles.infoCard}>
                <Icon name="history" size={16} color={Colors.textSecondary} />
                <Text style={styles.infoText}>Last restored: {lastRestore}</Text>
              </View>
            )}


          </>
        )}


      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════
     UPGRADE REQUEST MODAL (Fixed)
══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrapper}
          >
            <View style={styles.modalContainer}>

              {/* Drag Handle */}
              <View style={styles.dragHandle} />

              {/* ── Modal Header ── */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View style={styles.modalIconBox}>
                    <Icon name="upgrade" size={20} color={Colors.info} />
                  </View>
                  <Text style={styles.modalTitle}>Request Storage Upgrade</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Icon name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* ── Scrollable Body ── */}
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >

                {/* Current Plan Info */}
                <View style={styles.currentPlanBox}>
                  <Icon name="info-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.currentPlanText}>
                    Current plan:{' '}
                    <Text style={{ color: Colors.warning }}>{planName}</Text>
                    {' '}— {limitLabel} storage
                  </Text>
                </View>

                {/* ── Select Plan ── */}
                <Text style={styles.modalSectionLabel}>Select a Plan to Request</Text>

                {plansLoading ? (

                  // ── Loading State ──
                  <View style={styles.plansLoading}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.plansLoadingText}>Loading available plans...</Text>
                  </View>

                ) : plans.length === 0 ? (

                  // ── Empty State ──
                  <View style={styles.noPlansBox}>
                    <Icon name="info-outline" size={18} color={Colors.textSecondary} />
                    <Text style={styles.noPlansText}>No upgrade plans available right now.</Text>
                  </View>

                ) : (

                  // ── Plans List ──
                  plans.map(plan => {
                    const isSelected = selectedPlan?.id === plan.id;
                    const featuresList = Array.isArray(plan.features)
                      ? plan.features
                      : JSON.parse(plan.features ?? '[]');

                    return (
                      <TouchableOpacity
                        key={plan.id}
                        style={[styles.planCard, isSelected && styles.planCardSelected]}
                        onPress={() => setSelectedPlan(plan)}
                        activeOpacity={0.8}
                      >
                        {/* Left: Selection Indicator */}
                        <View style={styles.planSelectionIndicator}>
                          <View style={[
                            styles.planRadioOuter,
                            isSelected && styles.planRadioOuterSelected
                          ]}>
                            {isSelected && <View style={styles.planRadioInner} />}
                          </View>
                        </View>

                        {/* Center: Content */}
                        <View style={styles.planContent}>
                          {/* Row 1: Name & Price */}
                          <View style={styles.planHeaderRow}>
                            <Text style={styles.planName}>{plan.name}</Text>
                            <View style={styles.planPriceContainer}>
                              <Text style={styles.planPrice}>RM/{plan.price}</Text>
                              <Text style={styles.planBillingCycle}>/{plan.billing_cycle}</Text>
                            </View>
                          </View>

                          {/* Row 2: Storage Badge */}
                          <View style={styles.planStorageBadge}>
                            <Icon name="storage" size={12} color={Colors.warning} />
                            <Text style={styles.planStorageText}>{plan.storage_label ?? '—'}</Text>
                          </View>

                          {/* Row 3: Features (max 2) */}
                          <View style={styles.planFeaturesRow}>
                            {featuresList.slice(0, 2).map((f, i) => (
                              <View key={i} style={styles.planFeatureItem}>
                                <Icon name="check" size={10} color={Colors.success} />
                                <Text style={styles.planFeatureText} numberOfLines={1}>{f}</Text>
                              </View>
                            ))}
                            {featuresList.length > 2 && (
                              <Text style={styles.planMoreFeatures}>+{featuresList.length - 2} more</Text>
                            )}
                          </View>
                        </View>

                        {/* Right: Best Value Badge (optional - show if you have a flag) */}
                        {plan.is_popular && (
                          <View style={styles.popularBadge}>
                            <Text style={styles.popularBadgeText}>POPULAR</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}

                {/* ── Note to Admin ── */}
                <Text style={[styles.modalSectionLabel, { marginTop: Spacing.md }]}>
                  Note to Admin{' '}
                  <Text style={styles.optionalLabel}>(optional)</Text>
                </Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="e.g. I need more storage for my project files..."
                  placeholderTextColor={Colors.textSecondary}
                  value={userNote}
                  onChangeText={setUserNote}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{userNote.length} / 500</Text>

                {/* ── Submit Button ── */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (!selectedPlan || submitting) && styles.submitBtnDisabled,
                  ]}
                  onPress={submitUpgradeRequest}
                  disabled={!selectedPlan || submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={Colors.backgroundDark} />
                  ) : (
                    <>
                      <Icon name="send" size={17} color={Colors.backgroundDark} />
                      <Text style={styles.submitBtnText}>Send Request to Admin</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* ── Cancel ── */}
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>



    </View>
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
  headerIconBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: `${Colors.warning}18`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs, borderWidth: 1, borderColor: `${Colors.warning}30` },
  headerTitle: { color: Colors.textPrimary, fontSize: Fonts.size.xl, fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary },
  headerSubtitle: { color: Colors.textSecondary, fontSize: Fonts.size.sm, textAlign: 'center', paddingHorizontal: Spacing.md, fontFamily: Fonts.family.primary },

  loadingContainer: { alignItems: 'center', marginTop: 60, gap: Spacing.md },
  loadingText: { color: Colors.textSecondary, fontSize: Fonts.size.sm, fontFamily: Fonts.family.primary },

  errorCard: { alignItems: 'center', padding: Spacing.lg, gap: Spacing.sm },
  errorText: { color: Colors.danger, fontSize: Fonts.size.sm, textAlign: 'center', fontFamily: Fonts.family.primary },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: 10, marginTop: 4 },
  retryText: { color: Colors.backgroundDark, fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary },

  // ── Storage Card ──────────────────────────────────────────────────────────
  storageCard: { backgroundColor: Colors.backgroundCard, borderRadius: 20, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight },
  storageCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  storageCardTitle: { color: Colors.textPrimary, fontSize: Fonts.size.md, fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary },
  storageCardPlan: { color: Colors.textSecondary, fontSize: Fonts.size.xs, marginTop: 2, fontFamily: Fonts.family.primary },

  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  freeBadge: { backgroundColor: `${Colors.warning}18`, borderWidth: 1, borderColor: `${Colors.warning}40` },
  premiumBadge: { backgroundColor: 'rgba(255,215,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  planBadgeText: { fontSize: 10, fontWeight: Fonts.weight.bold, letterSpacing: 1, fontFamily: Fonts.family.primary },

  storageNumbers: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.sm },
  storageUsed: { fontSize: Fonts.size.md },
  storageTotal: { color: Colors.textSecondary, fontSize: Fonts.size.sm },
  storagePercent: { fontSize: Fonts.size.sm, fontWeight: Fonts.weight.bold },

  progressBarBg: { width: '100%', height: 10, backgroundColor: Colors.backgroundInput, borderRadius: 6, overflow: 'hidden', marginBottom: 4 },
  progressBarFill: { height: '100%', borderRadius: 6 },

  barLabels: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xs, marginTop: Spacing.xs },
  barLabelItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barDot: { width: 8, height: 8, borderRadius: 4 },
  barLabelText: { color: Colors.textSecondary, fontSize: Fonts.size.xs, fontFamily: Fonts.family.primary },

  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.md },

  miniStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniStat: { flex: 1, alignItems: 'center', gap: 4 },
  miniStatValue: { color: Colors.textPrimary, fontSize: Fonts.size.xs, fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary },
  miniStatLabel: { color: Colors.textSecondary, fontSize: 10, fontFamily: Fonts.family.primary },
  miniStatDivider: { width: 1, height: 32, backgroundColor: Colors.borderLight },

  // ── Features Card ─────────────────────────────────────────────────────────
  featuresCard: { backgroundColor: Colors.backgroundCard, borderRadius: 16, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight, gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { color: Colors.textPrimary, fontSize: Fonts.size.sm, fontFamily: Fonts.family.primary, flex: 1 },

  // ── Warning Card ──────────────────────────────────────────────────────────
  warningCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${Colors.danger}10`, padding: Spacing.sm, borderRadius: 10, gap: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1 },
  warningText: { fontSize: Fonts.size.xs, flex: 1, lineHeight: 18, fontFamily: Fonts.family.primary },

  // ── Upgrade Card ──────────────────────────────────────────────────────────
  upgradeCard: { backgroundColor: Colors.backgroundCard, borderRadius: 16, padding: Spacing.md, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  upgradeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  upgradeIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,215,0,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  upgradeTitle: { color: Colors.textPrimary, fontSize: Fonts.size.sm, fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary },
  upgradeSubtitle: { color: Colors.textSecondary, fontSize: Fonts.size.xs, marginTop: 2, fontFamily: Fonts.family.primary },
  upgradeButton: { backgroundColor: Colors.secondary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  upgradeButtonText: { color: Colors.backgroundDark, fontSize: Fonts.size.xs, fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary },

  sectionTitle: { color: Colors.textSecondary, fontSize: Fonts.size.xs, fontWeight: Fonts.weight.bold, marginBottom: Spacing.sm, marginTop: Spacing.xs, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: Fonts.family.primary },

  // ── Actions ───────────────────────────────────────────────────────────────
  actionsContainer: { gap: Spacing.sm, marginBottom: Spacing.lg },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundCard, borderRadius: 14, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight },
  actionIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionInfo: { flex: 1 },
  actionTitle: { color: Colors.textPrimary, fontSize: Fonts.size.sm, fontWeight: Fonts.weight.medium, fontFamily: Fonts.family.primary },
  actionSubtitle: { color: Colors.textSecondary, fontSize: Fonts.size.xs, marginTop: 2, fontFamily: Fonts.family.primary },

  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundCard, padding: Spacing.sm, borderRadius: 10, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight },
  infoText: { color: Colors.textSecondary, fontSize: Fonts.size.xs, fontFamily: Fonts.family.primary },

  // ── UPGRADE REQUEST MODAL ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayDark,
    justifyContent: 'flex-end',         // ✅ sheet sits at bottom
  },
  modalWrapper: {
    width: '100%',                       // ✅ KAV wraps only the sheet
  },
  modalContainer: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    maxHeight: '88%',                    // ✅ limits sheet height
    borderTopWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalScrollContent: {
    paddingBottom: Spacing.lg,           // ✅ send button never cut off
  },

  dragHandle: {
    width: 40, height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 4, alignSelf: 'center',
    marginBottom: Spacing.md,
  },

  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.md,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  modalIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${Colors.info}15`,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: `${Colors.info}30`,
  },
  modalTitle: {
    color: Colors.textPrimary, fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary,
  },
  modalCloseBtn: {
    padding: 6, backgroundColor: Colors.backgroundInput,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.borderLight,
  },

  currentPlanBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.backgroundInput,
    borderRadius: 10, padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  currentPlanText: {
    color: Colors.textSecondary, fontSize: Fonts.size.xs,
    fontFamily: Fonts.family.primary, flex: 1,
  },

  modalSectionLabel: {
    color: Colors.textSecondary, fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.bold, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: Spacing.sm,
    fontFamily: Fonts.family.primary,
  },
  optionalLabel: {
    color: Colors.textSecondary,
    fontWeight: Fonts.weight.normal,
    textTransform: 'none',
    letterSpacing: 0,
  },

  plansLoading: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, padding: Spacing.md, justifyContent: 'center',
  },
  plansLoadingText: {
    color: Colors.textSecondary, fontSize: Fonts.size.sm,
    fontFamily: Fonts.family.primary,
  },

  noPlansBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.backgroundInput,
    borderRadius: 12,
  },
  noPlansText: {
    color: Colors.textSecondary, fontSize: Fonts.size.sm,
    fontFamily: Fonts.family.primary,
  },

  // ── Plan Cards inside Modal ───────────────────────────────────────────────
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundInput,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  planCardSelected: {
    borderColor: Colors.info,
    backgroundColor: `${Colors.info}10`,
  },

  // Selection Radio Button
  planSelectionIndicator: {
    marginRight: Spacing.sm,
  },
  planRadioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  planRadioOuterSelected: {
    borderColor: Colors.info,
    backgroundColor: Colors.info,
  },
  planRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },

  // Content Layout
  planContent: {
    flex: 1,
    justifyContent: 'center',
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planName: {
    color: Colors.textPrimary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    color: Colors.success,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    fontFamily: Fonts.family.primary,
  },
  planBillingCycle: {
    color: Colors.textSecondary,
    fontSize: Fonts.size.xs,
    fontFamily: Fonts.family.primary,
  },

  // Storage Badge
  planStorageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.warning}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    gap: 4,
  },
  planStorageText: {
    color: Colors.warning,
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semibold,
    fontFamily: Fonts.family.primary,
  },

  // Features
  planFeaturesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planFeatureText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Fonts.family.primary,
    maxWidth: 100,
  },
  planMoreFeatures: {
    color: Colors.info,
    fontSize: 10,
    fontWeight: Fonts.weight.medium,
    fontFamily: Fonts.family.primary,
  },

  // Popular Badge (optional)
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: Colors.info,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 8,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: Fonts.weight.bold,
    letterSpacing: 0.5,
    fontFamily: Fonts.family.primary,
  },

  // ── Note Input ────────────────────────────────────────────────────────────
  noteInput: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight,
    color: Colors.textPrimary, padding: Spacing.md,
    fontSize: Fonts.size.sm, minHeight: 100,
    fontFamily: Fonts.family.primary,
  },
  charCount: {
    color: Colors.textSecondary, fontSize: 11,
    textAlign: 'right', marginTop: 4,
    marginBottom: Spacing.md, fontFamily: Fonts.family.primary,
  },

  // ── Submit / Cancel ───────────────────────────────────────────────────────
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.info,
    borderRadius: 14, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: {
    color: Colors.backgroundDark, fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.bold, fontFamily: Fonts.family.primary,
  },
  cancelBtn: {
    alignItems: 'center', padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  cancelBtnText: {
    color: Colors.textSecondary, fontSize: Fonts.size.sm,
    fontFamily: Fonts.family.primary,
  },
});


export default StorageDataScreen;
