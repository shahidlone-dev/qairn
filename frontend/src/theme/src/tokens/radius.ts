/**
 * qaaf — corner radius
 *
 * Soft / friendly shape language. Most surfaces 16 dp; buttons full-pill;
 * inputs 12 dp. The `full` token is for circular avatars and pill buttons —
 * use a number large enough to be a circle at any reasonable size.
 */

export const radius = {
  none: 0,
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export type Radius = typeof radius;
