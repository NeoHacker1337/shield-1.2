import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  scrollView: {
    flex: 1,
    width: screenWidth,
  },
  slide: {
    width: screenWidth,
    flex: 1,
  },
  slideBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // --- Matrix Background ---
  matrixBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    opacity: 0.03,
  },
  matrixColumn: {
    flex: 1,
    alignItems: 'center',
  },
  matrixChar: {
    color: Colors.secondary,
    fontSize: 12,
    fontFamily: Fonts.family.primary,
    lineHeight: 16,
    fontWeight: Fonts.weight.bold,
  },

  // --- Cyber Grid ---
  cyberGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.04,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.tertiary,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: Colors.tertiary,
  },

  // --- Permission Loading ---
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  permissionContent: {
    alignItems: 'center',
    maxWidth: screenWidth - 40,
    width: '100%',
    paddingHorizontal: 20,
  },
  permissionIcon: {
    fontSize: 80,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: Fonts.weight.bold,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Fonts.family.primary,
  },
  permissionSubtitle: {
    fontSize: 18,
    color: Colors.tertiary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Fonts.family.primary,
  },
  permissionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: Fonts.family.primary,
    paddingHorizontal: 10,
  },
  permissionProgressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0,255,136,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  permissionProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  permissionProgressText: {
    fontSize: 12,
    color: Colors.secondary,
    fontFamily: Fonts.family.primary,
    marginTop: 6,
  },
  permissionStatus: {
    fontSize: 14,
    color: Colors.tertiary,
    marginBottom: 16,
    fontFamily: Fonts.family.primary,
  },
  permissionListContainer: {
    alignItems: 'flex-start',
    width: '100%',
  },
  permissionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionListDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  permissionListText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: Fonts.family.primary,
  },

  // --- SPLASH SCREEN LOGO (FIXED) ---
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  splashLogoContainer: {
    width: screenWidth * 0.35, // 35% of screen width
    height: screenWidth * 0.35, // Keep it square
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  splashLogoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  splashTitle: {
    fontSize: 48,
    fontWeight: Fonts.weight.heavy,
    color: Colors.textPrimary,
    textAlign: 'center',
    textShadowColor: Colors.secondary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 8,
  },
  splashSubtext: {
    fontSize: 12,
    color: Colors.tertiary,
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 2,
  },
  splashLoading: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },

  // --- WELCOME SCREEN LOGO (FIXED) ---
  welcomeLogoContainer: {
    width: screenWidth * 0.4, // 40% of screen width
    height: screenWidth * 0.4, // Keep it square
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeLogoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  welcomeTitle: {
    fontSize: 32,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: Fonts.weight.heavy,
    textShadowColor: Colors.secondary,
    textShadowRadius: 8,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: Colors.tertiary,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  welcomeButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  welcomeButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 40,
  },
  welcomeButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: Fonts.weight.bold,
    textAlign: 'center',
  },

  // --- Onboarding Slides ---
  slideIcon: {
    fontSize: 100,
    marginBottom: 20,
    textAlign: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 25,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    alignSelf: 'center',
    marginVertical: 20,
    marginHorizontal: 20,
    maxWidth: screenWidth - 40,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: Fonts.weight.medium,
    textTransform: 'uppercase',
    color: Colors.tertiary,
    marginBottom: 8,
    letterSpacing: 2,
  },
  title: {
    fontSize: 36,
    fontWeight: Fonts.weight.heavy,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featuresContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  featureText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: Fonts.weight.medium,
  },
  codeContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  codePattern: {
    fontSize: 16,
    color: Colors.tertiary,
    fontWeight: Fonts.weight.bold,
    textAlign: 'center',
    letterSpacing: 2,
  },

  // --- Bottom Controls ---
  fixedBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.backgroundDark,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  paginationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  paginationDotActive: {
    width: 30,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.secondary,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButton: {
    width: '100%',
    marginBottom: 15,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  nextButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  nextButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: Fonts.weight.bold,
    letterSpacing: 2,
  },
  badgeBackground: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  badgeText: {
    color: Colors.secondary,
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
