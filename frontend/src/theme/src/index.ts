/**
 * qaaf — public API
 *
 * Single entry point for the design system. Consumers should only
 * import from `@qaaf/theme` (or this file directly during development).
 */

export { ThemeProvider, useTheme, useThemeTokens } from './ThemeProvider';
export type { ColorSchemePreference, ThemeStorage, ThemeProviderProps } from './ThemeProvider';

export { useStyles } from './useStyles';

export { lightTheme, darkTheme } from './theme';
export type { Theme, ThemeMode } from './theme';

// Token re-exports for advanced use cases (design tooling, tests, codegen).
export * as tokens from './tokens';
export type { SemanticColors } from './tokens/colors';
export type { Components } from './components';
