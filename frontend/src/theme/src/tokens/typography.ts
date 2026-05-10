/**
 * qaaf — typography tokens
 *
 * Two families:
 *   display: Plus Jakarta Sans  — headings, hero copy, brand moments
 *   body:    Inter              — UI labels, paragraphs, dense info
 *
 * On Expo, register the fonts with expo-font in App.tsx; the family
 * names below match the keys you pass to Font.loadAsync().
 */

import { Platform } from 'react-native';

export const fontFamily = {
  display: Platform.select({
    ios:     'PlusJakartaSans-Regular',
    android: 'PlusJakartaSans-Regular',
    default: 'Plus Jakarta Sans, system-ui, sans-serif',
  }) as string,
  displayMedium: Platform.select({
    ios: 'PlusJakartaSans-Medium', android: 'PlusJakartaSans-Medium',
    default: 'Plus Jakarta Sans, system-ui, sans-serif',
  }) as string,
  displaySemibold: Platform.select({
    ios: 'PlusJakartaSans-SemiBold', android: 'PlusJakartaSans-SemiBold',
    default: 'Plus Jakarta Sans, system-ui, sans-serif',
  }) as string,
  displayBold: Platform.select({
    ios: 'PlusJakartaSans-Bold', android: 'PlusJakartaSans-Bold',
    default: 'Plus Jakarta Sans, system-ui, sans-serif',
  }) as string,
  displayExtrabold: Platform.select({
    ios: 'PlusJakartaSans-ExtraBold', android: 'PlusJakartaSans-ExtraBold',
    default: 'Plus Jakarta Sans, system-ui, sans-serif',
  }) as string,

  body: Platform.select({
    ios: 'Inter-Regular', android: 'Inter-Regular',
    default: 'Inter, system-ui, sans-serif',
  }) as string,
  bodyMedium: Platform.select({
    ios: 'Inter-Medium', android: 'Inter-Medium',
    default: 'Inter, system-ui, sans-serif',
  }) as string,
  bodySemibold: Platform.select({
    ios: 'Inter-SemiBold', android: 'Inter-SemiBold',
    default: 'Inter, system-ui, sans-serif',
  }) as string,
  bodyBold: Platform.select({
    ios: 'Inter-Bold', android: 'Inter-Bold',
    default: 'Inter, system-ui, sans-serif',
  }) as string,

  mono: Platform.select({
    ios: 'JetBrainsMono-Regular', android: 'JetBrainsMono-Regular',
    default: 'JetBrains Mono, ui-monospace, monospace',
  }) as string,
} as const;

export const fontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  extrabold: '800',
} as const;

// Line heights expressed as unitless multipliers; the spread fn below converts
// each text style to absolute pixels (RN doesn't support unitless lineHeight).
const lh = (size: number, mult: number) => Math.round(size * mult);

/**
 * Type scale — names follow Material 3 (display / headline / title / body / label).
 * Sizes target a 1.125 modular ratio with hand-tuned tracking.
 */
export const textStyles = {
  displayLg: {
    fontFamily: fontFamily.displayExtrabold,
    fontWeight: fontWeight.extrabold,
    fontSize: 56, lineHeight: lh(56, 1.05), letterSpacing: -1.5,
  },
  displayMd: {
    fontFamily: fontFamily.displayExtrabold,
    fontWeight: fontWeight.extrabold,
    fontSize: 44, lineHeight: lh(44, 1.08), letterSpacing: -1.2,
  },
  displaySm: {
    fontFamily: fontFamily.displayBold,
    fontWeight: fontWeight.bold,
    fontSize: 36, lineHeight: lh(36, 1.1), letterSpacing: -0.8,
  },

  headlineLg: {
    fontFamily: fontFamily.displayBold,
    fontWeight: fontWeight.bold,
    fontSize: 32, lineHeight: lh(32, 1.15), letterSpacing: -0.5,
  },
  headlineMd: {
    fontFamily: fontFamily.displayBold,
    fontWeight: fontWeight.bold,
    fontSize: 28, lineHeight: lh(28, 1.2), letterSpacing: -0.4,
  },
  headlineSm: {
    fontFamily: fontFamily.displaySemibold,
    fontWeight: fontWeight.semibold,
    fontSize: 24, lineHeight: lh(24, 1.25), letterSpacing: -0.2,
  },

  titleLg: {
    fontFamily: fontFamily.displaySemibold,
    fontWeight: fontWeight.semibold,
    fontSize: 20, lineHeight: lh(20, 1.3), letterSpacing: -0.1,
  },
  titleMd: {
    fontFamily: fontFamily.bodySemibold,
    fontWeight: fontWeight.semibold,
    fontSize: 17, lineHeight: lh(17, 1.35), letterSpacing: 0,
  },
  titleSm: {
    fontFamily: fontFamily.bodySemibold,
    fontWeight: fontWeight.semibold,
    fontSize: 15, lineHeight: lh(15, 1.4), letterSpacing: 0,
  },

  bodyLg: {
    fontFamily: fontFamily.body,
    fontWeight: fontWeight.regular,
    fontSize: 17, lineHeight: lh(17, 1.5), letterSpacing: 0,
  },
  bodyMd: {
    fontFamily: fontFamily.body,
    fontWeight: fontWeight.regular,
    fontSize: 15, lineHeight: lh(15, 1.5), letterSpacing: 0,
  },
  bodySm: {
    fontFamily: fontFamily.body,
    fontWeight: fontWeight.regular,
    fontSize: 13, lineHeight: lh(13, 1.5), letterSpacing: 0.1,
  },

  labelLg: {
    fontFamily: fontFamily.bodyMedium,
    fontWeight: fontWeight.medium,
    fontSize: 15, lineHeight: lh(15, 1.3), letterSpacing: 0.1,
  },
  labelMd: {
    fontFamily: fontFamily.bodyMedium,
    fontWeight: fontWeight.medium,
    fontSize: 13, lineHeight: lh(13, 1.3), letterSpacing: 0.2,
  },
  labelSm: {
    fontFamily: fontFamily.bodyMedium,
    fontWeight: fontWeight.medium,
    fontSize: 11, lineHeight: lh(11, 1.3), letterSpacing: 0.4,
  },

  caption: {
    fontFamily: fontFamily.body,
    fontWeight: fontWeight.regular,
    fontSize: 12, lineHeight: lh(12, 1.4), letterSpacing: 0.2,
  },

  overline: {
    fontFamily: fontFamily.bodySemibold,
    fontWeight: fontWeight.semibold,
    fontSize: 11, lineHeight: lh(11, 1.3), letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },

  code: {
    fontFamily: fontFamily.mono,
    fontWeight: fontWeight.regular,
    fontSize: 13, lineHeight: lh(13, 1.5), letterSpacing: 0,
  },
} as const;

export type TextStyles = typeof textStyles;
export type TextStyleName = keyof TextStyles;
