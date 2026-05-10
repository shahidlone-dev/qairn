/**
 * qaaf — z-index scale
 *
 * RN flattens zIndex per stacking context. These values give us a
 * predictable hierarchy across overlays without magic numbers in components.
 */

export const zIndex = {
  hide:        -1,
  base:         0,
  raised:       1,
  dropdown:    100,
  sticky:      200,
  banner:      300,
  overlay:     400,
  modal:       500,
  popover:     600,
  skipLink:    700,
  toast:       800,
  tooltip:     900,
} as const;

export type ZIndex = typeof zIndex;
