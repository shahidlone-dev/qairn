import { ColorSchemeName } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
//  qaaf v2 — Design System
//  Primary: Coral #D85A30
//  Base:    Pure #ffffff (light) / Pure #000000 (dark)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Semantic / fixed colors (same in both modes) ────────────────────────────
export const colors = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  coral:         '#D85A30',   // primary CTA, like, brand accent
  coralLight:    '#F0997B',   // pressed state / icon tint
  coralDark:     '#993C1D',   // active / deep pressed
  coralMuted:    'rgba(216,90,48,0.12)', // subtle bg tint (badges, highlights)

  // ── Social actions ─────────────────────────────────────────────────────────
  blue:          '#3b82f6',   // comment, reply, follow, info links
  blueLight:     '#93c5fd',   // icon tint / dark mode text on blue bg
  blueMuted:     'rgba(59,130,246,0.12)',

  gold:          '#f59e0b',   // save, bookmark, star, notes/buy
  goldLight:     '#fcd34d',
  goldMuted:     'rgba(245,158,11,0.12)',

  green:         '#22c55e',   // share, send, success, attendance ≥80%
  greenLight:    '#86efac',
  greenMuted:    'rgba(34,197,94,0.12)',

  purple:        '#a855f7',   // premium badge, verified, pro features
  purpleLight:   '#d8b4fe',
  purpleMuted:   'rgba(168,85,247,0.12)',

  teal:          '#14b8a6',   // marketplace, hire, tutor, services
  tealLight:     '#5eead4',
  tealMuted:     'rgba(20,184,166,0.12)',

  // ── Semantic state ─────────────────────────────────────────────────────────
  red:           '#ef4444',   // error, danger, fee due, attendance <75%
  redLight:      '#fca5a5',
  redMuted:      'rgba(239,68,68,0.12)',

  amber:         '#eab308',   // warning, attendance 75–79%
  amberLight:    '#fde047',
  amberMuted:    'rgba(234,179,8,0.12)',

  // ── Always-fixed ───────────────────────────────────────────────────────────
  white:         '#ffffff',
  black:         '#000000',
  transparent:   'transparent',
} as const;

// ─── Dark palette ─────────────────────────────────────────────────────────────
const dark = {
  // Base
  bg:             '#000000',
  bgCard:         '#111111',
  bgCardElevated: '#181818',
  bgInput:        '#1c1c1c',
  bgSheet:        '#0d0d0d',   // bottom sheets, modals
  bgOverlay:      'rgba(0,0,0,0.72)', // modal scrim

  // Borders
  border:         '#2a2a2a',
  borderStrong:   '#3d3d3d',
  borderSubtle:   '#1a1a1a',

  // Text
  text:           '#ffffff',        // headings, primary labels
  text2:          '#c8c8c8',        // body text, descriptions
  text3:          '#707070',        // captions, timestamps, meta
  textMuted:      '#383838',        // placeholders, disabled

  // Nav
  navBg:          'rgba(0,0,0,0.94)',
  navBorder:      'rgba(255,255,255,0.06)',
  navActive:      colors.coral,
  navInactive:    '#555555',

  // Accent (coral)
  accent:         colors.coral,
  accentLight:    colors.coralLight,
  accentDark:     colors.coralDark,
  accentMuted:    'rgba(216,90,48,0.15)',
  accentText:     '#ffffff',

  // Surface aliases (for components that reference 'surface')
  surface:        '#111111',
  surface2:       '#1c1c1c',
  surface3:       '#242424',

  // Social
  like:           colors.coral,
  comment:        colors.blue,
  save:           colors.gold,
  share:          colors.green,
  follow:         colors.blue,
  premium:        colors.purple,
  market:         colors.teal,
  hire:           colors.teal,
  notes:          colors.gold,

  // Semantic
  success:        colors.green,
  successMuted:   colors.greenMuted,
  warning:        colors.amber,
  warningMuted:   colors.amberMuted,
  error:          colors.red,
  errorMuted:     colors.redMuted,
  info:           colors.blue,
  infoMuted:      colors.blueMuted,

  // Attendance
  attGood:        colors.green,     // ≥ 80%
  attWarn:        colors.amber,     // 75–79%
  attDanger:      colors.red,       // < 75%

  isDark: true,
} as const;

// ─── Light palette ────────────────────────────────────────────────────────────
const light = {
  // Base
  bg:             '#ffffff',
  bgCard:         '#f5f5f5',
  bgCardElevated: '#ffffff',
  bgInput:        '#ebebeb',
  bgSheet:        '#ffffff',
  bgOverlay:      'rgba(0,0,0,0.40)',

  // Borders
  border:         '#e2e2e2',
  borderStrong:   '#c8c8c8',
  borderSubtle:   '#f0f0f0',

  // Text
  text:           '#0a0a0a',
  text2:          '#3d3d3d',
  text3:          '#888888',
  textMuted:      '#c4c4c4',

  // Nav
  navBg:          'rgba(255,255,255,0.94)',
  navBorder:      'rgba(0,0,0,0.06)',
  navActive:      colors.coral,
  navInactive:    '#c4c4c4',

  // Accent (coral)
  accent:         colors.coral,
  accentLight:    colors.coralLight,
  accentDark:     colors.coralDark,
  accentMuted:    'rgba(216,90,48,0.10)',
  accentText:     '#ffffff',

  // Surface aliases
  surface:        '#ffffff',
  surface2:       '#ebebeb',
  surface3:       '#f5f5f5',

  // Social
  like:           colors.coral,
  comment:        colors.blue,
  save:           colors.gold,
  share:          colors.green,
  follow:         colors.blue,
  premium:        colors.purple,
  market:         colors.teal,
  hire:           colors.teal,
  notes:          colors.gold,

  // Semantic
  success:        colors.green,
  successMuted:   colors.greenMuted,
  warning:        colors.amber,
  warningMuted:   colors.amberMuted,
  error:          colors.red,
  errorMuted:     colors.redMuted,
  info:           colors.blue,
  infoMuted:      colors.blueMuted,

  // Attendance
  attGood:        colors.green,
  attWarn:        colors.amber,
  attDanger:      colors.red,

  isDark: false,
} as const;

// ─── Theme type ───────────────────────────────────────────────────────────────
export type Theme = typeof dark;
export type ThemeColors = keyof Theme;

// ─── Resolver ─────────────────────────────────────────────────────────────────
export function getTheme(scheme: ColorSchemeName): Theme {
  return scheme === 'dark' ? dark : light;
}

// ─── Typography ───────────────────────────────────────────────────────────────
export const fonts = {
  regular:  'Inter-Regular',
  medium:   'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold:     'Inter-Bold',
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
} as const;

export const lineHeights = {
  tight:  1.2,
  snug:   1.35,
  normal: 1.5,
  relaxed:1.65,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const spacing = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
} as const;

// ─── Border radii ─────────────────────────────────────────────────────────────
export const radii = {
  xs:   4,
  sm:   8,
  md:   10,
  lg:   14,
  xl:   18,
  xxl:  24,
  pill: 999,
} as const;

// ─── Shadows (for elevated cards — light mode only, transparent on dark) ──────
export const shadows = {
  sm: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius:  3,
    elevation:     2,
  },
  md: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     4,
  },
  lg: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius:  16,
    elevation:     8,
  },
} as const;

// ─── Z-index scale ────────────────────────────────────────────────────────────
export const zIndex = {
  base:    0,
  card:    10,
  header:  20,
  drawer:  30,
  modal:   40,
  toast:   50,
  overlay: 60,
} as const;

// ─── Attendance helpers ───────────────────────────────────────────────────────
export function attendancePct(attended: number, held: number): number {
  if (!held) return 0;
  return Math.round((attended / held) * 100);
}

export function attColor(pct: number, theme: Theme): string {
  if (pct >= 80) return theme.attGood;
  if (pct >= 75) return theme.attWarn;
  return theme.attDanger;
}

/** How many consecutive classes needed to reach 75% */
export function neededClasses(attended: number, held: number): number {
  return Math.max(0, Math.ceil(3 * held - 4 * attended));
}

/** How many classes can be safely skipped while staying ≥75% */
export function canMissClasses(attended: number, held: number): number {
  return Math.max(0, Math.floor(4 * attended - 3 * held));
}

// ─── Date / time helpers ──────────────────────────────────────────────────────
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getDay(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  });
}

export function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

export function formatCurrency(amount: number, currency = 'PKR'): string {
  return new Intl.NumberFormat('en-PK', {
    style:    'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Market / badge helpers ───────────────────────────────────────────────────
export type ServiceType = 'notes' | 'tutor' | 'assignment' | 'hire' | 'item';

export function serviceColor(type: ServiceType, theme: Theme): string {
  switch (type) {
    case 'notes':      return theme.notes;
    case 'tutor':      return theme.hire;
    case 'assignment': return theme.hire;
    case 'hire':       return theme.market;
    case 'item':       return theme.accent;
    default:           return theme.accent;
  }
}

export type MemberTier = 'free' | 'premium' | 'pro';

export function tierColor(tier: MemberTier, theme: Theme): string {
  switch (tier) {
    case 'premium': return theme.premium;
    case 'pro':     return colors.gold;
    default:        return theme.text3;
  }
}

export function tierLabel(tier: MemberTier): string {
  switch (tier) {
    case 'premium': return 'Premium';
    case 'pro':     return 'Pro';
    default:        return 'Free';
  }
}

// ─── Fee / result status helpers ──────────────────────────────────────────────
export type FeeStatus = 'paid' | 'due' | 'overdue';

export function feeColor(status: FeeStatus, theme: Theme): string {
  switch (status) {
    case 'paid':    return theme.success;
    case 'due':     return theme.warning;
    case 'overdue': return theme.error;
  }
}

export type ResultGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export function gradeColor(grade: ResultGrade, theme: Theme): string {
  switch (grade) {
    case 'A': return theme.success;
    case 'B': return theme.info;
    case 'C': return theme.warning;
    case 'D': return theme.warning;
    case 'F': return theme.error;
  }
}