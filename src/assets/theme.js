// 🌈 Global Theme Configuration for Shield App

export const Colors = {
  // Core brand colors
  primary: '#42A5F5',       // Blue accent
  secondary: '#00FF88',     // Neon green accent
  tertiary: '#00CCFF',      // Cyan accent

  // Backgrounds
  backgroundDark: '#0D1B2A', // Global app background
  backgroundCard: 'rgba(27, 38, 59, 0.95)',
  backgroundInput: '#1B263B',

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#B0BEC5',
  textError: '#FF4757',
  textSuccess: '#00FF88',

  // Borders and shadows
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderActive: '#42A5F5',
  borderAccent: 'rgba(0, 255, 136, 0.3)',

  // Status and indicators
  success: '#00FF88',
  danger: '#FF4757',
  warning: '#FFC107',
  info: '#00CCFF',

  // Transparency helpers
  transparent: 'transparent',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
};

export const Fonts = {
  family: {
    primary: 'monospace', // consistent futuristic look
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
  weight: {
    light: '300',
    normal: '400',
    medium: '600',
    bold: '700',
    heavy: '900',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Theme = {
  Colors,
  Fonts,
  Spacing,
};

export default Theme;
