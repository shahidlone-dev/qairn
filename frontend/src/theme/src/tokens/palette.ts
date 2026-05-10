/**
 * qaaf — raw color palette
 *
 * These are NOT intended for direct use in components. Reference them through
 * the semantic tokens in `theme/colors.ts` instead. The raw palette exists so
 * we can change brand hues in one place without touching every component.
 *
 * Naming: <hue><tone>, where tone is the Material/Tailwind convention
 * (50 = lightest, 950 = darkest). 500 is the canonical brand value for
 * each ramp. Generated with a perceptual lightness curve (OKLCH) — values
 * are sRGB hex for cross-platform compatibility.
 */

export const palette = {
  // ─── Brand: indigo (left side of icon gradient) ───
  indigo: {
    50:  '#F1EEFF',
    100: '#E3DBFF',
    200: '#C8B7FF',
    300: '#AC92FF',
    400: '#916EFF',
    500: '#7C5CFF', // brand
    600: '#6645E6',
    700: '#5234B8',
    800: '#3F2787',
    900: '#2C1B5C',
    950: '#180E36',
  },

  // ─── Brand: pink (right side of icon gradient) ───
  pink: {
    50:  '#FDEEF6',
    100: '#FBDDED',
    200: '#F7BBDB',
    300: '#F38EC4',
    400: '#F063AC',
    500: '#EC4899', // brand
    600: '#D02B7E',
    700: '#A91F65',
    800: '#7E174B',
    900: '#560F33',
    950: '#33081E',
  },

  // ─── Neutrals (cool slate, slightly indigo-shifted) ───
  neutral: {
    0:   '#FFFFFF',
    50:  '#F8F8FB',
    100: '#F1F1F6',
    200: '#E4E4EC',
    300: '#CDCDD8',
    400: '#A8A8B8',
    500: '#76767E', // mid
    600: '#5A5A66',
    700: '#3F3F4A',
    800: '#2A2A33',
    900: '#1A1A22',
    950: '#0F0F14',
    1000: '#000000',
  },

  // ─── Semantic accent ramps ───
  green: {
    50:  '#E8F8EE',
    100: '#CFEFDA',
    300: '#7DD89A',
    500: '#22C55E', // success
    600: '#16A34A',
    700: '#15803D',
    900: '#0A3F1E',
  },

  amber: {
    50:  '#FFF7E6',
    100: '#FEEBC1',
    300: '#FACE73',
    500: '#F59E0B', // warning
    600: '#D97706',
    700: '#B45309',
    900: '#5A2E04',
  },

  red: {
    50:  '#FEECEC',
    100: '#FCD4D4',
    300: '#F38B8B',
    500: '#EF4444', // error
    600: '#DC2626',
    700: '#B91C1C',
    900: '#5C1010',
  },

  blue: {
    50:  '#E8F2FE',
    100: '#CFE3FD',
    300: '#7AB2F8',
    500: '#3B82F6', // info
    600: '#2563EB',
    700: '#1D4ED8',
    900: '#0D266B',
  },
} as const;

// Brand gradient — used for the icon, hero CTAs, and brand splashes.
// Keep these in sync with the gradient stops in the icon SVGs.
export const gradients = {
  brand: {
    angle: 135,
    stops: [palette.indigo[500], palette.pink[500]],
    css: `linear-gradient(135deg, ${palette.indigo[500]} 0%, ${palette.pink[500]} 100%)`,
  },
  brandSoft: {
    angle: 135,
    stops: [palette.indigo[400], palette.pink[400]],
    css: `linear-gradient(135deg, ${palette.indigo[400]} 0%, ${palette.pink[400]} 100%)`,
  },
  brandDeep: {
    angle: 135,
    stops: [palette.indigo[700], palette.pink[700]],
    css: `linear-gradient(135deg, ${palette.indigo[700]} 0%, ${palette.pink[700]} 100%)`,
  },
} as const;

export type Palette = typeof palette;
export type Gradients = typeof gradients;
