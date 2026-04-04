import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0E27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },

  // ScrollView
  scrollContent: {
    flexGrow: 1,
  },
  
  contentWrapper: {
    flex: 1,
    paddingBottom: 40,
  },

  // Header Background
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: '#1A1F3A',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    opacity: 0.8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  editButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Profile Section
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 10,
  },
  
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#475569',
  },
  
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#42A5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  
  premiumBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1F3A',
    borderWidth: 2,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  
  activeBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 2,
  },
  
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  userRole: {
    fontSize: 14,
    color: '#8B9DC3',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 31, 58, 0.8)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },

  // Cards
  card: {
    backgroundColor: 'rgba(26, 31, 58, 0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    overflow: 'hidden',
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  
  infoLabel: {
    width: 120,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  infoValue: {
    flex: 1,
    fontSize: 15,
    color: '#F1F5F9',
    fontWeight: '600',
  },

  // Input
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: '#00D9FF',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },

  // Upgrade Button
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  
  upgradeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  
  upgradeButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  
  upgradeSubtext: {
    color: 'rgba(255, 215, 0, 0.7)',
    fontSize: 13,
  },

  // Action Buttons
  actionButton: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  
  cancelButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  
  versionText: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
    marginTop: 12,
    fontWeight: '500',
  },

  // Legacy styles (kept for compatibility)
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 10,
  },
  membershipContainer: {
    marginBottom: 20,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  freeBadgeBg: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
  },
  premiumBadgeBg: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  lifetimeBadgeBg: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  membershipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  premiumText: {
    color: '#FFD700',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  inputValue: {
    fontSize: 16,
    color: '#F1F5F9',
    fontWeight: '600',
  },
  inputDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 68,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },
  lifetimeText: {
    color: '#FFD700',
    fontWeight: '700',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  statusPremium: {
    backgroundColor: '#10B981',
  },
  statusFree: {
    backgroundColor: '#6B7280',
  },
  lifetimeBadge: {
    backgroundColor: '#FFD700',
    borderColor: '#F59E0B',
  },
  headerGradient: {
    flex: 1,
  },
  glowEffect: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
  },
  saveButtonActive: {
    backgroundColor: '#10B981',
  },
  avatarPremium: {
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.4,
  },
  avatarLifetime: {
    borderColor: '#FFD700',
    borderWidth: 4,
    shadowColor: '#FFD700',
    shadowOpacity: 0.6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  upgradeTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  upgradeSubtitle: {
    color: 'rgba(255, 215, 0, 0.7)',
    fontSize: 13,
  },
});

export default styles;