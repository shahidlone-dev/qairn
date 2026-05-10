/**
 * src/theme/theme.ts  —  COMPATIBILITY SHIM
 *
 * File location: frontend/src/theme/theme.ts
 * (NOT inside src/theme/src/ — that folder is the package internals, don't touch it)
 *
 * All 37 app files import from this path:
 *   import { getTheme, fonts, fontSizes, spacing, radii, colors } from '../../theme/theme'
 *
 * This shim satisfies every one of those imports by mapping the new
 * theme tokens back to the flat names the old code expects.
 * The real package code stays untouched inside src/theme/src/.
 */

import { ColorSchemeName } from 'react-native';

// Import from the real package internals — note ./src/ prefix
import { lightTheme, darkTheme } from './src/theme';
import type { Theme as BaseTheme } from './src/theme';
import { palette, gradients } from './src/tokens/palette';
import { fontFamily, fontWeight, textStyles } from './src/tokens/typography';
import { space } from './src/tokens/spacing';
import { radius } from './src/tokens/radius';
import { elevation } from './src/tokens/elevation';
import { duration, easing, spring } from './src/tokens/motion';
import { zIndex } from './src/tokens/zIndex';
import { iconSize } from './src/tokens/iconSize';

// ─── Flat alias builder ───────────────────────────────────────────────────────
// Maps every new nested token to the flat key old code reads as T.xxx

function makeFlatAliases(base: BaseTheme) {
  const c = base.colors;
  return {
    // Backgrounds
    bg:             c.bg.canvas,
    bgCard:         c.bg.raised,
    bgCardElevated: c.bg.raised,
    bgInput:        c.bg.sunken,
    bgSheet:        c.bg.raised,
    bgOverlay:      c.bg.scrim,
    surface:        c.bg.raised,
    surface2:       c.bg.sunken,
    surface3:       c.bg.overlay,

    // Text
    text:      c.fg.primary,
    text2:     c.fg.secondary,
    text3:     c.fg.tertiary,
    textMuted: c.fg.disabled,

    // Borders
    border:       c.border.default,
    borderStrong: c.border.strong,
    borderSubtle: c.border.subtle,

    // Brand (old coral → new indigo)
    accent:      c.brand.primary,
    accentLight: c.brand.primaryHover,
    accentDark:  c.brand.primaryPressed,
    accentMuted: c.brand.primarySubtle,
    accentText:  c.brand.onPrimary,

    // Social
    like:    c.accent.primary,
    comment: palette.blue[500],
    save:    palette.amber[500],
    share:   palette.green[500],
    follow:  palette.blue[500],
    premium: '#A855F7',
    market:  '#14B8A6',
    hire:    '#14B8A6',
    notes:   palette.amber[500],

    // Direct palette reads
    blue:        palette.blue[500],
    green:       palette.green[500],
    red:         palette.red[500],
    gold:        palette.amber[500],
    goldMuted:   `${palette.amber[500]}1F`,
    purple:      '#A855F7',
    purpleMuted: 'rgba(168,85,247,0.12)',
    teal:        '#14B8A6',
    tealMuted:   'rgba(20,184,166,0.12)',

    // Feedback
    success:      c.feedback.success,
    successMuted: c.feedback.successSubtle,
    warning:      c.feedback.warning,
    warningMuted: c.feedback.warningSubtle,
    error:        c.feedback.error,
    errorMuted:   c.feedback.errorSubtle,
    info:         c.feedback.info,
    infoMuted:    c.feedback.infoSubtle,

    // Attendance
    attGood:   c.feedback.success,
    attWarn:   c.feedback.warning,
    attDanger: c.feedback.error,

    // Nav
    navBg:       c.bg.raised,
    navBorder:   c.border.subtle,
    navActive:   c.brand.primary,
    navInactive: c.fg.tertiary,

    // Fixed
    white:       palette.neutral[0]    as string,
    black:       palette.neutral[1000] as string,
    transparent: 'transparent'         as const,

    // Mode flag
    isDark: base.mode === 'dark',
  };
}

// ─── Extended Theme type ──────────────────────────────────────────────────────
type FlatAliases = ReturnType<typeof makeFlatAliases>;
export type Theme = BaseTheme & FlatAliases;

// Build once as stable singletons — no object creation on every getTheme() call
const _light: Theme = Object.assign({}, lightTheme, makeFlatAliases(lightTheme));
const _dark:  Theme = Object.assign({}, darkTheme,  makeFlatAliases(darkTheme));

// ─── getTheme ─────────────────────────────────────────────────────────────────
export function getTheme(scheme: ColorSchemeName): Theme {
  return scheme === 'dark' ? _dark : _light;
}

// ─── Named token exports ──────────────────────────────────────────────────────
// import { fonts, fontSizes, spacing, radii, shadows, colors } from '../../theme/theme'

export const fonts = {
  regular:  fontFamily.body,
  medium:   fontFamily.bodyMedium,
  semibold: fontFamily.bodySemibold,
  bold:     fontFamily.bodyBold,
} as const;

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

export const radii = {
  xs:   radius.xs,
  sm:   radius.sm,
  md:   radius.md,
  lg:   radius.lg,
  xl:   radius.xl,
  xxl:  radius['2xl'],
  pill: radius.full,
} as const;

export const shadows = {
  sm: elevation.sm,
  md: elevation.md,
  lg: elevation.lg,
} as const;

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

// Re-export new tokens for any file that needs them directly
export {
  fontFamily, fontWeight, textStyles,
  space, radius, elevation,
  duration, easing, spring,
  zIndex, iconSize,
  palette, gradients,
};

export type { BaseTheme };

// ─── Domain types & helpers ───────────────────────────────────────────────────
export type ServiceType = 'notes' | 'tutor' | 'assignment' | 'hire' | 'item';
export type MemberTier  = 'free' | 'premium' | 'pro';
export type FeeStatus   = 'paid' | 'due' | 'overdue';
export type ResultGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export function attendancePct(attended: number, held: number): number {
  if (!held) return 0;
  return Math.round((attended / held) * 100);
}
export function attColor(pct: number, t: Theme): string {
  if (pct >= 80) return t.attGood;
  if (pct >= 75) return t.attWarn;
  return t.attDanger;
}
export function neededClasses(attended: number, held: number): number {
  return Math.max(0, Math.ceil(3 * held - 4 * attended));
}
export function canMissClasses(attended: number, held: number): number {
  return Math.max(0, Math.floor(4 * attended - 3 * held));
}
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
export function getDay(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}
export function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export function formatCurrency(amount: number, currency = 'PKR'): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(amount);
}
export function serviceColor(type: ServiceType, t: Theme): string {
  switch (type) {
    case 'notes':
    case 'tutor':
    case 'assignment': return t.info;
    case 'hire':
    case 'item':
    default:           return t.accent;
  }
}
export function tierColor(tier: MemberTier, t: Theme): string {
  switch (tier) {
    case 'premium': return t.premium;
    case 'pro':     return t.gold;
    default:        return t.text3;
  }
}
export function tierLabel(tier: MemberTier): string {
  switch (tier) {
    case 'premium': return 'Premium';
    case 'pro':     return 'Pro';
    default:        return 'Free';
  }
}
export function feeColor(status: FeeStatus, t: Theme): string {
  switch (status) {
    case 'paid':    return t.success;
    case 'due':     return t.warning;
    case 'overdue': return t.error;
  }
}
export function gradeColor(grade: ResultGrade, t: Theme): string {
  switch (grade) {
    case 'A': return t.success;
    case 'B': return t.info;
    case 'C':
    case 'D': return t.warning;
    case 'F': return t.error;
  }
}