/**
 * qaaf — breakpoints
 *
 * Used by useMediaQuery / Dimensions checks for responsive layout
 * (split-pane on tablets, larger gutters on landscape phones, etc.)
 */

export const breakpoints = {
  xs: 0,    // small phones
  sm: 360,  // standard phones
  md: 600,  // large phones / small tablets
  lg: 905,  // tablets
  xl: 1240, // large tablets / foldables open
  '2xl': 1440,
} as const;

export type Breakpoints = typeof breakpoints;
export type BreakpointKey = keyof Breakpoints;
