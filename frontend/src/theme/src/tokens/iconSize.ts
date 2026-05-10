/**
 * qaaf — icon sizing
 *
 * Use these for any icon (vector or otherwise) so the visual density
 * stays consistent across the app. `tap` is the minimum hit target
 * (44×44 per a11y guidelines) — not the visual size of the icon itself.
 */

export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  tap: 44, // minimum touch target — wrap small icons in a 44×44 pressable
} as const;

export type IconSize = typeof iconSize;
