/**
 * qaaf — spacing scale
 *
 * Base unit: 4 px. Most tokens are 4 px multiples; smaller hairline tokens
 * exist for icon padding and dense layouts. Use semantic aliases (xs..2xl)
 * for component padding + gap; reach for the numeric scale only when the
 * design genuinely needs an off-step value.
 */

export const spacing = {
  none: 0,
  px: 1,
  '0.5': 2,
  '1':   4,
  '1.5': 6,
  '2':   8,
  '2.5': 10,
  '3':   12,
  '4':   16,
  '5':   20,
  '6':   24,
  '7':   28,
  '8':   32,
  '9':   36,
  '10':  40,
  '12':  48,
  '14':  56,
  '16':  64,
  '20':  80,
  '24':  96,
  '32':  128,
} as const;

// Semantic aliases — preferred for components.
export const space = {
  xxs: spacing['1'],   // 4
  xs:  spacing['2'],   // 8
  sm:  spacing['3'],   // 12
  md:  spacing['4'],   // 16
  lg:  spacing['6'],   // 24
  xl:  spacing['8'],   // 32
  '2xl': spacing['12'], // 48
  '3xl': spacing['16'], // 64
  '4xl': spacing['24'], // 96
} as const;

export type Spacing = typeof spacing;
export type Space = typeof space;
