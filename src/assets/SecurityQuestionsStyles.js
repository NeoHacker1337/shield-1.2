import { StyleSheet, Platform, Dimensions } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallDevice = screenWidth < 375;
const isLargeDevice = screenWidth > 768;

export default StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  mainContainer: { 
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.05,
    paddingTop: screenHeight * 0.06,
  },
  
  // Header Styles
  header: {
    alignItems: 'center',
    marginBottom: screenHeight * 0.03,
    width: '100%',
  },
  shieldIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4ADE80',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: screenHeight * 0.02,
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainTitle: {
    fontSize: Platform.select({
      ios: isSmallDevice ? 28 : isLargeDevice ? 36 : 32,
      android: isSmallDevice ? 26 : isLargeDevice ? 34 : 30,
    }),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: screenHeight * 0.015,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    marginBottom: screenHeight * 0.015,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    marginRight: 8,
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  statusText: {
    color: '#4ADE80',
    fontSize: Platform.select({
      ios: isSmallDevice ? 11 : isLargeDevice ? 14 : 12,
      android: isSmallDevice ? 10 : isLargeDevice ? 13 : 11,
    }),
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  subTitle: {
    fontSize: Platform.select({
      ios: isSmallDevice ? 13 : isLargeDevice ? 16 : 14,
      android: isSmallDevice ? 12 : isLargeDevice ? 15 : 13,
    }),
    color: '#888888',
    lineHeight: Platform.select({
      ios: isSmallDevice ? 18 : 22,
      android: isSmallDevice ? 17 : 21,
    }),
    textAlign: 'center',
    maxWidth: screenWidth * 0.8,
  },
  
  // Card Container
  cardContainer: {
    width: '100%',
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: screenWidth * 0.05,
    borderWidth: 1,
    borderColor: '#222222',
    marginBottom: screenHeight * 0.03,
  },
  
  // Question Sections
  questionSection: {
    marginBottom: screenHeight * 0.025,
  },
  sectionLabel: {
    color: '#60A5FA',
    fontSize: Platform.select({
      ios: isSmallDevice ? 12 : isLargeDevice ? 15 : 13,
      android: isSmallDevice ? 11 : isLargeDevice ? 14 : 12,
    }),
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: screenHeight * 0.012,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: screenHeight * 0.015,
    minHeight: screenHeight * 0.065,
  },
  selectorIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4ADE80',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questionMark: {
    color: '#4ADE80',
    fontSize: 16,
    fontWeight: '700',
  },
  selectorText: {
    flex: 1,
    color: '#666666',
    fontSize: Platform.select({
      ios: isSmallDevice ? 14 : isLargeDevice ? 17 : 15,
      android: isSmallDevice ? 13 : isLargeDevice ? 16 : 14,
    }),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  selectorTextSelected: {
    color: '#FFFFFF',
  },
  inputContainer: {
    marginTop: screenHeight * 0.012,
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    padding: screenHeight * 0.015,
    borderRadius: 12,
    fontSize: Platform.select({
      ios: isSmallDevice ? 14 : isLargeDevice ? 17 : 15,
      android: isSmallDevice ? 13 : isLargeDevice ? 16 : 14,
    }),
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: screenHeight * 0.065,
  },
  
  // Complete Button
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ADE80',
    borderRadius: 12,
    paddingVertical: screenHeight * 0.018,
    marginTop: screenHeight * 0.01,
    marginBottom: screenHeight * 0.02,
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: { 
    opacity: 0.5 
  },
  buttonIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  buttonIcon: { 
    margin: 0,
  },
  completeButtonText: {
    color: '#0A0A0A',
    fontSize: Platform.select({
      ios: isSmallDevice ? 15 : isLargeDevice ? 19 : 17,
      android: isSmallDevice ? 14 : isLargeDevice ? 18 : 16,
    }),
    fontWeight: '800',
    letterSpacing: 1,
  },
  
  // Security Notice
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: screenHeight * 0.015,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  noticeText: {
    color: '#F59E0B',
    fontSize: Platform.select({
      ios: isSmallDevice ? 12 : isLargeDevice ? 14 : 13,
      android: isSmallDevice ? 11 : isLargeDevice ? 13 : 12,
    }),
    fontWeight: '500',
    lineHeight: Platform.select({
      ios: isSmallDevice ? 16 : 20,
      android: isSmallDevice ? 15 : 19,
    }),
    marginLeft: 10,
    flex: 1,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: screenHeight * 0.03,
  },
  footerBrand: {
    color: '#4ADE80',
    fontSize: Platform.select({
      ios: isSmallDevice ? 20 : isLargeDevice ? 24 : 22,
      android: isSmallDevice ? 19 : isLargeDevice ? 23 : 21,
    }),
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
  },
  footerTagline: {
    color: '#666666',
    fontSize: Platform.select({
      ios: isSmallDevice ? 11 : isLargeDevice ? 13 : 12,
      android: isSmallDevice ? 10 : isLargeDevice ? 12 : 11,
    }),
    fontWeight: '600',
    letterSpacing: 2,
  },
  
  // Keyboard Spacer
  keyboardSpacer: {
    height: screenHeight * 0.2,
  },
  
  // Modal Styles - Keep existing functionality
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: screenHeight * 0.05,
  },
  modalContent: {
    width: '100%',
    maxWidth: Platform.select({
      ios: isLargeDevice ? 500 : 400,
      android: isLargeDevice ? 480 : 380,
    }),
    height: screenHeight * (isLargeDevice ? 0.6 : 0.7),
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
  },
  modalInner: {
    flex: 1,
    padding: screenWidth * 0.05,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: screenHeight * 0.02,
    paddingBottom: screenHeight * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: Platform.select({
      ios: isSmallDevice ? 16 : isLargeDevice ? 20 : 18,
      android: isSmallDevice ? 15 : isLargeDevice ? 19 : 17,
    }),
    fontWeight: '700',
    letterSpacing: 1,
    flex: 1,
  },
  closeButton: { 
    padding: 5 
  },
  modalList: { 
    flex: 1, 
    marginVertical: screenHeight * 0.01 
  },
  modalListContent: {
    flexGrow: 1,
    paddingBottom: screenHeight * 0.02,
  },
  questionItem: { 
    marginBottom: screenHeight * 0.008 
  },
  questionItemContent: {
    backgroundColor: '#1A1A1A',
    padding: screenHeight * 0.015,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: screenHeight * 0.06,
    justifyContent: 'center',
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: Platform.select({
      ios: isSmallDevice ? 14 : isLargeDevice ? 18 : 16,
      android: isSmallDevice ? 13 : isLargeDevice ? 17 : 15,
    }),
    fontWeight: '500',
  },
  cancelButton: { 
    backgroundColor: '#333333',
    borderRadius: 10,
    paddingVertical: screenHeight * 0.016,
    alignItems: 'center',
    marginTop: screenHeight * 0.01,
    minHeight: screenHeight * 0.06,
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: Platform.select({
      ios: isSmallDevice ? 14 : isLargeDevice ? 18 : 16,
      android: isSmallDevice ? 13 : isLargeDevice ? 17 : 15,
    }),
    fontWeight: '700',
    letterSpacing: 1,
  },
});