/**
 * ForgotPinStyles.js
 *
 * Place this file at:
 *   src/assets/ForgotPinStyles.js
 *
 * Uses the Shield App global theme (theme.js) — all colors,
 * fonts, and spacing are sourced from Theme.Colors, Theme.Fonts,
 * and Theme.Spacing so the modal automatically inherits any
 * future theme changes.
 */

import { StyleSheet, Platform } from 'react-native';
import { Colors, Fonts, Spacing } from './theme';

/* ─────────────────────────────────────────────────────────────
   LOCAL DESIGN TOKENS
   Derived from theme.js — do NOT hardcode values below this
   section. Reference these constants throughout the StyleSheet.
───────────────────────────────────────────────────────────── */

const T = {
  // ── Surfaces ───────────────────────────────────────────────
  bgApp:        Colors.backgroundDark,          // #0D1B2A  — deepest bg
  bgCard:       Colors.backgroundCard,          // rgba(27,38,59,0.95)
  bgInput:      Colors.backgroundInput,         // #1B263B
  bgKeyBtn:     '#162032',                       // slightly lighter than bgInput
  bgKeyBtnActive: '#1E2E47',                     // pressed state
  bgQuestionCard: 'rgba(20, 32, 50, 0.85)',      // dimmer card for question block
  bgSuccessCircle: 'rgba(0,255,136,0.08)',       // subtle green glow behind ✓ icon
  bgBadge:      'rgba(66,165,245,0.12)',         // blue tint for step badge
  bgError:      'rgba(255,71,87,0.12)',          // red tint for error box
  bgPrimaryBtn: Colors.primary,                 // #42A5F5
  bgCancelBtn:  Colors.backgroundInput,         // #1B263B
  bgDisabledBtn:'rgba(66,165,245,0.22)',         // washed-out primary

  // ── Text ───────────────────────────────────────────────────
  textWhite:    Colors.textPrimary,             // #FFFFFF
  textMuted:    Colors.textSecondary,           // #B0BEC5
  textAccent:   Colors.primary,                 // #42A5F5  — labels, links
  textSuccess:  Colors.textSuccess,             // #00FF88
  textError:    Colors.textError,               // #FF4757
  textWarning:  Colors.warning,                 // #FFC107
  textCyan:     Colors.tertiary,                // #00CCFF  — service pill

  // ── Borders ────────────────────────────────────────────────
  borderDefault: Colors.borderLight,            // rgba(255,255,255,0.1)
  borderActive:  Colors.borderActive,           // #42A5F5
  borderAccent:  Colors.borderAccent,           // rgba(0,255,136,0.3)
  borderError:   'rgba(255,71,87,0.35)',
  borderSuccess: 'rgba(0,255,136,0.35)',

  // ── Dots ───────────────────────────────────────────────────
  dotEmpty:     Colors.primary,                 // #42A5F5  — ring color
  dotFilled:    Colors.primary,                 // #42A5F5  — solid

  // ── Shadows ────────────────────────────────────────────────
  shadowColor:  Colors.primary,                 // #42A5F5  — blue glow

  // ── Overlay ────────────────────────────────────────────────
  overlay:      Colors.overlayDark,             // rgba(0,0,0,0.6)

  // ── Radius ─────────────────────────────────────────────────
  radiusSm:  8,
  radiusMd:  12,
  radiusLg:  16,
  radiusXl:  20,
  radiusFull: 999,

  // ── Spacing ────────────────────────────────────────────────
  xs:  Spacing.xs,   // 4
  sm:  Spacing.sm,   // 8
  md:  Spacing.md,   // 16
  lg:  Spacing.lg,   // 24
  xl:  Spacing.xl,   // 32
};

/* ─────────────────────────────────────────────────────────────
   STYLESHEET
───────────────────────────────────────────────────────────── */
const ForgotPinStyles = StyleSheet.create({

  /* ══════════════════════════════════════
     OVERLAY & MODAL CARD
  ══════════════════════════════════════ */

  overlay: {
    flexGrow: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: T.lg,
  },

  container: {
    backgroundColor: T.bgCard,
    borderRadius: T.radiusXl,
    paddingHorizontal: T.md + T.xs,   // 20
    paddingTop: T.md + T.xs,           // 20
    paddingBottom: T.lg,
    width: '92%',
    maxWidth: 390,
    borderWidth: 1,
    borderColor: T.borderDefault,
    // Blue glow shadow
    ...Platform.select({
      ios: {
        shadowColor:   T.shadowColor,
        shadowOffset:  { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius:  20,
      },
      android: {
        elevation: 16,
      },
    }),
  },

  /* ══════════════════════════════════════
     HEADER ROW  (icon + title + close btn)
  ══════════════════════════════════════ */

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: T.sm + T.xs,         // 12
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.sm,
  },

  headerTitle: {
    color: T.textWhite,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    marginLeft: T.xs + 2,              // 6
    letterSpacing: 0.4,
  },

  closeBtn: {
    padding: T.xs,
    borderRadius: T.radiusFull,
  },

  /* ══════════════════════════════════════
     STEP BADGE
  ══════════════════════════════════════ */

  badge: {
    backgroundColor: T.bgBadge,
    borderRadius: T.radiusFull,
    paddingHorizontal: T.sm + T.xs,    // 12
    paddingVertical: T.xs + 1,         // 5
    alignSelf: 'center',
    marginBottom: T.sm + T.xs,         // 12
    borderWidth: 1,
    borderColor: 'rgba(66,165,245,0.2)',
  },

  badgeText: {
    color: Colors.primary,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.bold,
    letterSpacing: 0.6,
  },

  /* ══════════════════════════════════════
     DIVIDER
  ══════════════════════════════════════ */

  divider: {
    height: 1,
    backgroundColor: T.borderDefault,
    marginBottom: T.md,
  },

  /* ══════════════════════════════════════
     STEP TITLE & DESCRIPTION
  ══════════════════════════════════════ */

  title: {
    color: T.textWhite,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.bold,
    textAlign: 'center',
    marginBottom: T.xs + 2,            // 6
    letterSpacing: 0.3,
  },

  description: {
    color: T.textMuted,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: T.md,
    paddingHorizontal: T.xs,
  },

  descriptionAccent: {
    color: Colors.tertiary,            // #00CCFF  — service name inline
    fontWeight: Fonts.weight.bold,
  },

  /* ══════════════════════════════════════
     SERVICE PILL
  ══════════════════════════════════════ */

  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,204,255,0.1)',
    borderRadius: T.radiusFull,
    paddingHorizontal: T.sm + T.xs,    // 12
    paddingVertical: T.xs + 2,         // 6
    marginBottom: T.md,
    borderWidth: 1,
    borderColor: 'rgba(0,204,255,0.25)',
    gap: T.sm - 1,                     // 7
  },

  servicePillDot: {
    width: 7,
    height: 7,
    borderRadius: T.radiusFull,
    backgroundColor: Colors.tertiary,  // #00CCFF
  },

  servicePillText: {
    color: Colors.tertiary,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.bold,
    letterSpacing: 0.5,
  },

  /* ══════════════════════════════════════
     SECURITY QUESTION CARD
  ══════════════════════════════════════ */

  questionCard: {
    backgroundColor: T.bgQuestionCard,
    borderRadius: T.radiusMd,
    padding: T.sm + T.xs,              // 12
    marginBottom: T.sm + T.xs,         // 12
    borderWidth: 1,
    borderColor: 'rgba(66,165,245,0.2)',
  },

  questionCardError: {
    borderColor: T.borderError,
  },

  questionLabel: {
    color: Colors.primary,
    fontFamily: Fonts.family.primary,
    fontSize: 10,
    fontWeight: Fonts.weight.heavy,
    letterSpacing: 1,
    marginBottom: T.sm - 1,            // 7
    textTransform: 'uppercase',
  },

  questionText: {
    color: T.textWhite,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
    lineHeight: 21,
  },

  questionTextError: {
    color: Colors.textError,
  },

  /* ══════════════════════════════════════
     ANSWER TEXT INPUT
  ══════════════════════════════════════ */

  answerInput: {
    backgroundColor: T.bgInput,
    borderRadius: T.radiusMd,
    paddingHorizontal: T.md,
    paddingVertical: T.sm + T.xs,      // 12 — meets 44px touch target
    color: T.textWhite,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.md,
    borderWidth: 1.5,
    borderColor: T.borderDefault,
    marginBottom: T.sm + T.xs,         // 12
  },

  answerInputFocused: {
    borderColor: T.borderActive,       // #42A5F5
    backgroundColor: '#1E2E47',
  },

  /* ══════════════════════════════════════
     ERROR BOX
  ══════════════════════════════════════ */

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bgError,
    borderRadius: T.radiusSm,
    paddingHorizontal: T.sm + T.xs,    // 12
    paddingVertical: T.sm + 1,         // 9
    marginBottom: T.sm + T.xs,         // 12
    borderWidth: 1,
    borderColor: T.borderError,
    gap: T.xs + 2,                     // 6
  },

  errorText: {
    color: T.textError,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.medium,
    flex: 1,
    lineHeight: 18,
  },

  /* ══════════════════════════════════════
     PIN DOTS ROW
  ══════════════════════════════════════ */

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: T.md + T.xs,         // 20
    gap: T.sm + T.xs,                  // 12
  },

  dot: {
    width: 16,
    height: 16,
    borderRadius: T.radiusFull,
    borderWidth: 2,
    borderColor: T.dotEmpty,
    backgroundColor: 'transparent',
  },

  dotFilled: {
    backgroundColor: T.dotFilled,
    borderColor: T.dotFilled,
    // Subtle glow on filled dot
    ...Platform.select({
      ios: {
        shadowColor:   Colors.primary,
        shadowOffset:  { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius:  5,
      },
    }),
  },

  /* ══════════════════════════════════════
     NUMERIC KEYPAD
  ══════════════════════════════════════ */

  keypad: {
    alignItems: 'center',
    marginBottom: T.xs,
  },

  keyRow: {
    flexDirection: 'row',
    marginBottom: T.sm + T.xs,         // 12
    gap: T.md,                         // 16
  },

  keyBtn: {
    width: 64,
    height: 64,
    borderRadius: T.radiusFull,
    backgroundColor: T.bgKeyBtn,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.borderDefault,
    // Subtle touch feedback via pressable activeOpacity (set in component)
    ...Platform.select({
      ios: {
        shadowColor:   Colors.primary,
        shadowOffset:  { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius:  6,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  keyBtnEmpty: {
    width: 64,
    height: 64,
  },

  keyText: {
    color: T.textWhite,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
  },

  /* ══════════════════════════════════════
     ACTION BUTTONS (Step 1 — Verify)
  ══════════════════════════════════════ */

  btnRow: {
    flexDirection: 'row',
    gap: T.sm + T.xs,                  // 12
    marginTop: T.xs,
  },

  cancelBtn: {
    flex: 1,
    paddingVertical: T.sm + T.xs,      // 12 — min 44px height via font+padding
    borderRadius: T.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bgCancelBtn,
    borderWidth: 1,
    borderColor: T.borderDefault,
    minHeight: 48,
  },

  cancelBtnText: {
    color: T.textMuted,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.medium,
  },

  primaryBtn: {
    flex: 1,
    paddingVertical: T.sm + T.xs,      // 12
    borderRadius: T.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bgPrimaryBtn,
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(66,165,245,0.5)',
  },

  primaryBtnDisabled: {
    backgroundColor: T.bgDisabledBtn,
    borderColor: 'transparent',
  },

  primaryBtnText: {
    color: T.textWhite,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.bold,
    letterSpacing: 0.3,
  },

  /* ══════════════════════════════════════
     BACK LINK (Steps 2 & 3)
  ══════════════════════════════════════ */

  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: T.md,
    paddingVertical: T.sm,
    gap: T.xs,
  },

  backLinkText: {
    color: Colors.primary,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
  },

  /* ══════════════════════════════════════
     LOADING ROW
  ══════════════════════════════════════ */

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: T.lg,
    gap: T.sm + T.xs,                  // 12
  },

  loadingText: {
    color: T.textMuted,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,
  },

  /* ══════════════════════════════════════
     SUCCESS STATE  (Step 4)
  ══════════════════════════════════════ */

  successContainer: {
    alignItems: 'center',
    paddingVertical: T.sm,
  },

  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: T.radiusFull,
    backgroundColor: T.bgSuccessCircle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: T.md + T.xs,         // 20
    borderWidth: 1,
    borderColor: T.borderAccent,       // rgba(0,255,136,0.3)
    // Green glow
    ...Platform.select({
      ios: {
        shadowColor:   Colors.success,
        shadowOffset:  { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius:  14,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  successTitle: {
    color: T.textWhite,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.bold,
    marginBottom: T.sm + T.xs,         // 12
    textAlign: 'center',
    letterSpacing: 0.4,
  },

  successDesc: {
    color: T.textMuted,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.sm,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: T.lg,
    paddingHorizontal: T.sm,
  },

  successDescAccent: {
    color: Colors.secondary,           // #00FF88  — service name in success msg
    fontWeight: Fonts.weight.bold,
  },

  successBtn: {
    backgroundColor: Colors.secondary, // #00FF88
    borderRadius: T.radiusMd,
    paddingHorizontal: T.xl,           // 32
    paddingVertical: T.sm + T.xs,      // 12
    minHeight: 48,
    borderWidth: 1,
    borderColor: T.borderAccent,
    ...Platform.select({
      ios: {
        shadowColor:   Colors.success,
        shadowOffset:  { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius:  10,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  successBtnText: {
    color: Colors.backgroundDark,      // #0D1B2A — dark text on green btn
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.heavy,
    letterSpacing: 0.5,
  },

  /* ══════════════════════════════════════
     COOLDOWN / LOCKED STATE
  ══════════════════════════════════════ */

  lockedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,193,7,0.1)',
    borderRadius: T.radiusSm,
    paddingHorizontal: T.sm + T.xs,    // 12
    paddingVertical: T.sm + 1,         // 9
    marginBottom: T.sm + T.xs,         // 12
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.3)',
    gap: T.xs + 2,                     // 6
  },

  lockedText: {
    color: Colors.warning,             // #FFC107
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.medium,
    flex: 1,
    lineHeight: 18,
  },

  /* ══════════════════════════════════════
     ATTEMPTS WARNING (1–2 attempts left)
  ══════════════════════════════════════ */

  attemptsWarning: {
    color: Colors.warning,
    fontFamily: Fonts.family.primary,
    fontSize: Fonts.size.xs,
    textAlign: 'center',
    marginTop: -T.xs,                  // pull up slightly above btn row
    marginBottom: T.sm,
    fontWeight: Fonts.weight.medium,
  },

  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
},
});

export default ForgotPinStyles;