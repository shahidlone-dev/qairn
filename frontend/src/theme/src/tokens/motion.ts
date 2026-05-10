/**
 * qaaf — motion
 *
 * Durations (ms) and easings for use with Animated, Reanimated, or
 * LayoutAnimation. The semantic aliases (fast / standard / slow) are
 * preferred — keep them aligned with platform expectations.
 */

import { Easing } from 'react-native';

export const duration = {
  instant:    0,
  immediate:  100,
  fast:       150,
  standard:   220,
  slow:       320,
  slower:     480,
  slowest:    640,
} as const;

export const easing = {
  // Material standard — most UI motion
  standard:    Easing.bezier(0.2, 0, 0, 1),
  // Decelerate — entering elements, expanding panels
  decelerate:  Easing.bezier(0, 0, 0, 1),
  // Accelerate — exiting elements, dismissed sheets
  accelerate:  Easing.bezier(0.3, 0, 1, 1),
  // Emphasized — large layout changes (Material 3)
  emphasized:  Easing.bezier(0.2, 0, 0, 1),
  emphasizedDecel: Easing.bezier(0.05, 0.7, 0.1, 1),
  emphasizedAccel: Easing.bezier(0.3, 0, 0.8, 0.15),
  // Spring-like cubic (use for bouncy presses without going to Reanimated)
  bounce: Easing.bezier(0.34, 1.56, 0.64, 1),
} as const;

// Reanimated spring presets (consume with `withSpring(value, theme.spring.gentle)`).
export const spring = {
  gentle: { damping: 18, mass: 1, stiffness: 140 },
  snappy: { damping: 22, mass: 1, stiffness: 220 },
  bouncy: { damping: 12, mass: 1, stiffness: 180 },
  stiff:  { damping: 30, mass: 1, stiffness: 360 },
} as const;

export type Duration = typeof duration;
export type Easings = typeof easing;
export type Springs = typeof spring;
