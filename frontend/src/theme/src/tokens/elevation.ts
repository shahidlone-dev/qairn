/**
 * qaaf — elevation
 *
 * RN shadows are split: iOS uses shadowColor/Offset/Opacity/Radius;
 * Android uses elevation (a single dp number that the OS interprets).
 * Each token returns the full set so spreading it onto a View works
 * cross-platform.
 *
 * Usage:
 *   <View style={[styles.card, theme.elevation.md]} />
 */

import { Platform, ViewStyle } from 'react-native';

const make = (
  androidElevation: number,
  shadowOpacity: number,
  shadowRadius: number,
  shadowOffsetY: number,
  shadowColor = '#000',
): ViewStyle => Platform.select({
  ios: {
    shadowColor,
    shadowOffset: { width: 0, height: shadowOffsetY },
    shadowOpacity,
    shadowRadius,
  } as ViewStyle,
  android: {
    elevation: androidElevation,
    shadowColor,
  } as ViewStyle,
  default: {
    // Web fallback (react-native-web)
    // @ts-ignore — boxShadow is web-only
    boxShadow: `0 ${shadowOffsetY}px ${shadowRadius * 2}px rgba(0,0,0,${shadowOpacity})`,
  } as ViewStyle,
}) as ViewStyle;

export const elevation = {
  none: {} as ViewStyle,
  xs:  make(1,  0.04, 2,  1),
  sm:  make(2,  0.06, 4,  2),
  md:  make(4,  0.08, 8,  4),
  lg:  make(8,  0.12, 16, 8),
  xl:  make(16, 0.16, 24, 12),
  '2xl': make(24, 0.20, 32, 16),
} as const;

export type Elevation = typeof elevation;
