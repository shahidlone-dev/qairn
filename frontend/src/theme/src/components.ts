/**
 * qaaf — component-level theme
 *
 * Per-component token bundles. Each component reads a single slice of
 * the theme so its visual contract is documented in one place. Adding
 * a new variant means editing this file, not hunting through component code.
 *
 * `buildComponents` accepts the active semantic colors (light or dark)
 * so the same component shape compiles for both modes.
 */

import type { SemanticColors } from './tokens/colors';
import { radius } from './tokens/radius';
import { space } from './tokens/spacing';
import { textStyles } from './tokens/typography';
import { duration } from './tokens/motion';

export const buildComponents = (c: SemanticColors) => ({
  button: {
    height: { sm: 36, md: 44, lg: 52 },
    paddingX: { sm: space.sm, md: space.md, lg: space.lg },
    radius: radius.full,
    text: { sm: textStyles.labelMd, md: textStyles.labelLg, lg: textStyles.titleSm },
    transition: duration.fast,
    variants: {
      primary: {
        bg: c.brand.primary, bgHover: c.brand.primaryHover, bgPressed: c.brand.primaryPressed,
        fg: c.brand.onPrimary, border: 'transparent',
      },
      secondary: {
        bg: c.brand.primarySubtle, bgHover: c.brand.primarySubtleHover, bgPressed: c.brand.primarySubtleHover,
        fg: c.brand.primary, border: 'transparent',
      },
      outline: {
        bg: 'transparent', bgHover: c.interactive.hoverOverlay, bgPressed: c.interactive.pressedOverlay,
        fg: c.fg.primary, border: c.border.default,
      },
      ghost: {
        bg: 'transparent', bgHover: c.interactive.hoverOverlay, bgPressed: c.interactive.pressedOverlay,
        fg: c.fg.primary, border: 'transparent',
      },
      destructive: {
        bg: c.feedback.error, bgHover: c.feedback.error, bgPressed: c.feedback.error,
        fg: c.fg.onBrand, border: 'transparent',
      },
    },
    disabled: { bg: c.interactive.disabledBg, fg: c.interactive.disabledFg },
  },

  card: {
    bg: c.bg.raised, border: c.border.subtle, radius: radius.lg,
    paddingX: space.md, paddingY: space.md,
  },

  input: {
    height: 48,
    bg: c.bg.sunken, bgFocus: c.bg.raised,
    border: c.border.default, borderFocus: c.border.focus, borderError: c.feedback.error,
    fg: c.fg.primary, placeholder: c.fg.placeholder,
    radius: radius.md, paddingX: space.md,
    text: textStyles.bodyMd,
    label: { ...textStyles.labelMd, color: c.fg.secondary },
    helper: { ...textStyles.caption, color: c.fg.tertiary },
    error:  { ...textStyles.caption, color: c.feedback.errorFg },
  },

  chip: {
    height: { sm: 24, md: 32 },
    paddingX: { sm: space.xs, md: space.sm },
    radius: radius.full,
    bg: c.bg.sunken, bgSelected: c.brand.primarySubtle,
    fg: c.fg.secondary, fgSelected: c.brand.primary,
    border: c.border.subtle,
    text: textStyles.labelSm,
  },

  avatar: {
    sizes: { xs: 24, sm: 32, md: 40, lg: 56, xl: 80, '2xl': 120 },
    radius: radius.full,
    bg: c.bg.sunken, fg: c.fg.secondary,
    border: c.border.subtle,
  },

  badge: {
    height: 20, paddingX: space.xs, radius: radius.full,
    text: { ...textStyles.labelSm, fontSize: 10 },
    variants: {
      neutral: { bg: c.bg.sunken, fg: c.fg.secondary },
      brand:   { bg: c.brand.primarySubtle, fg: c.brand.primary },
      success: { bg: c.feedback.successSubtle, fg: c.feedback.successFg },
      warning: { bg: c.feedback.warningSubtle, fg: c.feedback.warningFg },
      error:   { bg: c.feedback.errorSubtle, fg: c.feedback.errorFg },
    },
  },

  dialog: {
    bg: c.bg.raised, scrim: c.bg.scrim,
    radius: radius['2xl'], padding: space.lg, maxWidth: 480,
  },

  sheet: {
    bg: c.bg.raised, scrim: c.bg.scrim,
    radius: radius['2xl'], handle: c.border.default,
  },

  snackbar: {
    bg: c.bg.inverse, fg: c.fg.inverse,
    radius: radius.md, paddingX: space.md, paddingY: space.sm,
    text: textStyles.bodySm,
  },

  tabs: {
    bg: c.bg.canvas, indicator: c.brand.primary,
    activeFg: c.fg.primary, inactiveFg: c.fg.tertiary,
    border: c.border.subtle,
    text: textStyles.labelLg,
    height: 48,
  },

  navBar: {
    bg: c.bg.raised, fg: c.fg.primary,
    border: c.border.subtle, height: 56,
    title: textStyles.titleLg,
  },

  divider: { color: c.utility.divider, thickness: 1 },

  skeleton: { bg: c.utility.skeleton, shimmer: c.utility.skeletonShimmer, radius: radius.sm },

  list: {
    itemPaddingX: space.md, itemPaddingY: space.sm,
    itemMinHeight: 56, separator: c.utility.divider,
  },
});

export type Components = ReturnType<typeof buildComponents>;
