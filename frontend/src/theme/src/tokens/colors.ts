/**
 * qaaf — semantic color tokens
 *
 * Components MUST consume these, not the raw palette. Each semantic token
 * has a light + dark value; the active value is selected by the
 * ThemeProvider based on the user's preference / system setting.
 *
 * Token taxonomy
 *   bg.*           surface backgrounds (canvas, raised, sunken, scrim)
 *   fg.*           foreground / text on bg.*
 *   border.*       hairline + emphasized strokes
 *   brand.*        primary action / brand identity
 *   accent.*       secondary brand surface
 *   feedback.*     success / warning / error / info
 *   interactive.*  hover / pressed / focus / disabled state overlays
 *   utility.*      shadow tints, overlays, transparent gradients
 */

import { palette } from './palette';

const alpha = (hex: string, a: number): string => {
  const v = Math.round(a * 255).toString(16).padStart(2, '0');
  return `${hex}${v}`;
};

export const lightColors = {
  bg: {
    canvas:   palette.neutral[0],     // page background
    raised:   palette.neutral[0],     // cards, sheets
    sunken:   palette.neutral[50],    // input fields, code blocks
    overlay:  alpha(palette.neutral[1000], 0.5),
    scrim:    alpha(palette.neutral[1000], 0.32),
    inverse:  palette.neutral[900],   // tooltips, snackbars
  },

  fg: {
    primary:    palette.neutral[900], // headings, body
    secondary:  palette.neutral[600], // supporting copy
    tertiary:   palette.neutral[500], // metadata, captions
    disabled:   palette.neutral[400],
    placeholder: palette.neutral[400],
    inverse:    palette.neutral[0],   // text on dark surfaces
    onBrand:    palette.neutral[0],   // text on brand fills
    link:       palette.indigo[600],
  },

  border: {
    subtle:     palette.neutral[200],
    default:    palette.neutral[300],
    strong:     palette.neutral[400],
    focus:      palette.indigo[500],
    onBrand:    alpha(palette.neutral[0], 0.32),
  },

  brand: {
    primary:        palette.indigo[500],
    primaryHover:   palette.indigo[600],
    primaryPressed: palette.indigo[700],
    primarySubtle:  palette.indigo[50],
    primarySubtleHover: palette.indigo[100],
    onPrimary:      palette.neutral[0],
  },

  accent: {
    primary:        palette.pink[500],
    primaryHover:   palette.pink[600],
    primaryPressed: palette.pink[700],
    primarySubtle:  palette.pink[50],
    onPrimary:      palette.neutral[0],
  },

  feedback: {
    success:        palette.green[500],
    successSubtle:  palette.green[50],
    successFg:      palette.green[700],
    warning:        palette.amber[500],
    warningSubtle:  palette.amber[50],
    warningFg:      palette.amber[700],
    error:          palette.red[500],
    errorSubtle:    palette.red[50],
    errorFg:        palette.red[700],
    info:           palette.blue[500],
    infoSubtle:     palette.blue[50],
    infoFg:         palette.blue[700],
  },

  interactive: {
    hoverOverlay:   alpha(palette.neutral[1000], 0.04),
    pressedOverlay: alpha(palette.neutral[1000], 0.08),
    focusRing:      alpha(palette.indigo[500], 0.32),
    selection:      alpha(palette.indigo[500], 0.16),
    disabledBg:     palette.neutral[100],
    disabledFg:     palette.neutral[400],
  },

  utility: {
    shadow:         alpha(palette.neutral[1000], 0.08),
    shadowStrong:   alpha(palette.neutral[1000], 0.16),
    skeleton:       palette.neutral[100],
    skeletonShimmer: palette.neutral[200],
    divider:        palette.neutral[200],
    backdrop:       alpha(palette.neutral[1000], 0.5),
  },
} as const;

export const darkColors: SemanticColors = {
  bg: {
    canvas:   palette.neutral[950],
    raised:   palette.neutral[900],
    sunken:   palette.neutral[1000],
    overlay:  alpha(palette.neutral[1000], 0.7),
    scrim:    alpha(palette.neutral[1000], 0.6),
    inverse:  palette.neutral[100],
  },

  fg: {
    primary:    palette.neutral[50],
    secondary:  palette.neutral[300],
    tertiary:   palette.neutral[400],
    disabled:   palette.neutral[600],
    placeholder: palette.neutral[500],
    inverse:    palette.neutral[900],
    onBrand:    palette.neutral[0],
    link:       palette.indigo[300],
  },

  border: {
    subtle:     palette.neutral[800],
    default:    palette.neutral[700],
    strong:     palette.neutral[600],
    focus:      palette.indigo[400],
    onBrand:    alpha(palette.neutral[0], 0.32),
  },

  brand: {
    primary:        palette.indigo[400],
    primaryHover:   palette.indigo[300],
    primaryPressed: palette.indigo[200],
    primarySubtle:  alpha(palette.indigo[500], 0.16),
    primarySubtleHover: alpha(palette.indigo[500], 0.24),
    onPrimary:      palette.neutral[950],
  },

  accent: {
    primary:        palette.pink[400],
    primaryHover:   palette.pink[300],
    primaryPressed: palette.pink[200],
    primarySubtle:  alpha(palette.pink[500], 0.16),
    onPrimary:      palette.neutral[950],
  },

  feedback: {
    success:        palette.green[500],
    successSubtle:  alpha(palette.green[500], 0.16),
    successFg:      palette.green[300],
    warning:        palette.amber[500],
    warningSubtle:  alpha(palette.amber[500], 0.16),
    warningFg:      palette.amber[300],
    error:          palette.red[500],
    errorSubtle:    alpha(palette.red[500], 0.16),
    errorFg:        palette.red[300],
    info:           palette.blue[500],
    infoSubtle:     alpha(palette.blue[500], 0.16),
    infoFg:         palette.blue[300],
  },

  interactive: {
    hoverOverlay:   alpha(palette.neutral[0], 0.06),
    pressedOverlay: alpha(palette.neutral[0], 0.10),
    focusRing:      alpha(palette.indigo[400], 0.4),
    selection:      alpha(palette.indigo[400], 0.24),
    disabledBg:     palette.neutral[800],
    disabledFg:     palette.neutral[600],
  },

  utility: {
    shadow:         alpha(palette.neutral[1000], 0.4),
    shadowStrong:   alpha(palette.neutral[1000], 0.6),
    skeleton:       palette.neutral[800],
    skeletonShimmer: palette.neutral[700],
    divider:        palette.neutral[800],
    backdrop:       alpha(palette.neutral[1000], 0.7),
  },
};

type DeepStringify<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};
export type SemanticColors = DeepStringify<typeof lightColors>;
