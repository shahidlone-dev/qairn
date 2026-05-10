/**
 * qaaf — theme bridge
 *
 * Adapts @qaaf/theme tokens to the flat API consumed by the 40+ components
 * in this codebase. Components call getTheme(useColorScheme()) and read
 * off a plain object — no hooks, no context — which keeps legacy components
 * unchanged while still deriving values from the single source of truth.
 *
 * ThemeProvider in App.tsx drives dark/light switching at the React level;
 * this file lets non-context-aware components stay in sync via useColorScheme.
 */

import { lightTheme, darkTheme } from '../theme/src';
import { fontFamily } from '../theme/src/tokens/typography';
import { space } from '../theme/src/tokens/spacing';
import { radius } from '../theme/src/tokens/radius';
import { elevation } from '../theme/src/tokens/elevation';
import { palette } from '../theme/src/tokens/palette';

type ColorScheme = 'light' | 'dark' | null | undefined;

// ─── Theme object (returned by getTheme) ──────────────────────────────────────

export const getTheme = (scheme: ColorScheme) => {
  const t = scheme === 'dark' ? darkTheme : lightTheme;
  const c = t.colors;

  return {
    // — Backgrounds —
    bg:             c.bg.canvas,
    bgCard:         c.bg.raised,
    bgCardElevated: c.bg.raised,
    bgInput:        c.bg.sunken,
    bgSheet:        c.bg.raised,
    bgOverlay:      c.bg.scrim,
    surface:        c.bg.raised,
    surface2:       c.bg.sunken,
    surface3:       c.bg.overlay,

    // — Brand —
    accent:      c.brand.primary,
    accentLight: c.brand.primaryHover,
    accentDark:  c.brand.primaryPressed,
    accentMuted: c.brand.primarySubtle,
    accentText:  c.brand.onPrimary,

    // — Borders —
    border:       c.border.default,
    borderStrong: c.border.strong,
    borderSubtle: c.border.subtle,

    // — Foreground —
    text:      c.fg.primary,
    text2:     c.fg.secondary,
    text3:     c.fg.tertiary,
    textMuted: c.fg.placeholder,

    // — Feedback —
    error:        c.feedback.error,
    errorMuted:   c.feedback.errorSubtle,
    success:      c.feedback.success,
    successMuted: c.feedback.successSubtle,
    warning:      c.feedback.warning,
    warningMuted: c.feedback.warningSubtle,
    info:         c.feedback.info,
    infoMuted:    c.feedback.infoSubtle,

    // — Attendance —
    attGood:   c.feedback.success,
    attWarn:   c.feedback.warning,
    attDanger: c.feedback.error,

    // — Social / fixed palette values —
    like:        c.accent.primary,
    comment:     palette.blue[500],
    save:        palette.amber[500],
    share:       palette.green[500],
    follow:      palette.blue[500],
    premium:     '#A855F7',
    market:      '#14B8A6',
    hire:        '#14B8A6',
    notes:       palette.amber[500],
    blue:        palette.blue[500],
    blueMuted:   `${palette.blue[500]}1F`,
    green:       palette.green[500],
    greenMuted:  `${palette.green[500]}1F`,
    red:         palette.red[500],
    redMuted:    `${palette.red[500]}1F`,
    gold:        palette.amber[500],
    goldMuted:   `${palette.amber[500]}1F`,
    purple:      '#A855F7',
    purpleMuted: 'rgba(168,85,247,0.12)',
    teal:        '#14B8A6',
    tealMuted:   'rgba(20,184,166,0.12)',

    // — Nav —
    navBg:       c.bg.raised,
    navBorder:   c.border.subtle,
    navActive:   c.brand.primary,
    navInactive: c.fg.tertiary,

    // — Utility —
    white:       '#FFFFFF' as string,
    black:       '#000000' as string,
    transparent: 'transparent' as const,
    isDark:      scheme === 'dark',
  };
};

export type AppTheme = ReturnType<typeof getTheme>;

// ─── Font families ────────────────────────────────────────────────────────────

export const fonts = {
  regular:  fontFamily.body,
  medium:   fontFamily.bodyMedium,
  semibold: fontFamily.bodySemibold,
  bold:     fontFamily.bodyBold,
} as const;

// ─── Font sizes ───────────────────────────────────────────────────────────────

export const fontSizes = {
  xxs:  10,
  xs:   11,
  sm:   12,
  base: 13,
  md:   14,
  lg:   16,
  xl:   18,
  xxl:  22,
  hero: 28,
  mega: 36,
  giga: 48,
} as const;

// ─── Border radii ─────────────────────────────────────────────────────────────

export const radii = {
  xs:   radius.xs,
  sm:   radius.sm,
  md:   radius.md,
  lg:   radius.lg,
  xl:   radius.xl,
  xxl:  radius['2xl'],
  pill: radius.full,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const spacing = {
  none:  0,
  xxs:   2,
  xs:    space.xxs,    // 4
  sm:    space.xs,     // 8
  md:    12,
  base:  space.md,     // 16
  lg:    20,
  xl:    space.xl,     // 32
  xxl:   space['2xl'], // 48
  xxxl:  space['3xl'], // 64
  '4xl': space['4xl'], // 96
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const shadows = {
  xs: elevation.xs,
  sm: elevation.sm,
  md: elevation.md,
  lg: elevation.lg,
} as const;

// ─── Static color palette (for components that need fixed values) ─────────────

export const colors = {
  coral:        palette.indigo[500],
  coralLight:   palette.indigo[400],
  coralDark:    palette.indigo[700],
  coralMuted:   `${palette.indigo[500]}1F`,
  blue:         palette.blue[500],
  blueLight:    palette.blue[300],
  blueMuted:    `${palette.blue[500]}1F`,
  gold:         palette.amber[500],
  goldLight:    palette.amber[300],
  goldMuted:    `${palette.amber[500]}1F`,
  green:        palette.green[500],
  greenLight:   palette.green[300],
  greenMuted:   `${palette.green[500]}1F`,
  purple:       '#A855F7',
  purpleLight:  '#D8B4FE',
  purpleMuted:  'rgba(168,85,247,0.12)',
  teal:         '#14B8A6',
  tealLight:    '#5EEAD4',
  tealMuted:    'rgba(20,184,166,0.12)',
  red:          palette.red[500],
  redLight:     palette.red[300],
  redMuted:     `${palette.red[500]}1F`,
  amber:        palette.amber[500],
  amberLight:   palette.amber[300],
  amberMuted:   `${palette.amber[500]}1F`,
  white:        palette.neutral[0],
  black:        palette.neutral[1000],
  transparent:  'transparent' as const,
} as const;
