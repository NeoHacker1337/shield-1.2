// 🌈 Global Theme Configuration for Shield App
import { Platform } from 'react-native';

// ─────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────
export const Colors = {
  // Core brand colors
  primary: '#42A5F5',       // Blue accent
  accent: '#4F46E5',        // Indigo/purple accent (glow, highlights)
  secondary: '#00FF88',     // Neon green accent
  tertiary: '#00CCFF',      // Cyan accent (also used as `info`)

  // Backgrounds
  backgroundDark: '#0D1B2A',
  backgroundCard: 'rgba(27, 38, 59, 0.95)',
  backgroundInput: '#1B263B',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0BEC5',
  textError: '#FF4757',
  textSuccess: '#00FF88',   // Matches `success`

  // Borders & shadows
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderActive: '#42A5F5',
  borderAccent: 'rgba(0, 255, 136, 0.3)',

  // Status indicators
  success: '#00FF88',
  danger: '#FF4757',
  warning: '#FFC107',
  info: '#00CCFF',          // Matches `tertiary`

  // Utility
  transparent: 'transparent',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
};

// ─────────────────────────────────────────────
// FONTS
// ─────────────────────────────────────────────
export const Fonts = {
  family: {
    /**
     * Use the OS system font for best legibility and performance.
     * iOS ships 'System' (San Francisco); Android ships 'Roboto'.
     * Set to a custom font name here once you load a custom font.
     */
    primary: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  size: {
    xs:  12,
    sm:  14,
    md:  16,
    lg:  18,
    xl:  22,
    xxl: 28,
  },
  weight: {
    light:  '300',
    normal: '400',
    medium: '600',
    bold:   '700',
    heavy:  '900',
  },
};

// ─────────────────────────────────────────────
// SPACING
// ─────────────────────────────────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

// ─────────────────────────────────────────────
// RADII  (named border-radius tokens)
// ─────────────────────────────────────────────
export const Radii = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  pill: 9999, // Use instead of 999 — avoids clipping artefacts on large elements
};

// ─────────────────────────────────────────────
// SHADOWS  (shared shadow presets)
// ─────────────────────────────────────────────
export const Shadows = {
  /** Subtle shadow for headers */
  header: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius:  12,
    elevation:     10,
  },
  /** Deeper shadow for cards */
  card: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius:  20,
    elevation:     12,
  },
};

// ─────────────────────────────────────────────
// COMPOSITE EXPORT
// ─────────────────────────────────────────────
export const Theme = {
  Colors,
  Fonts,
  Spacing,
  Radii,
  Shadows,
};

export default Theme;