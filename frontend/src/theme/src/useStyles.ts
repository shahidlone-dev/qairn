/**
 * qaaf — useStyles hook
 *
 * Memoized StyleSheet builder that runs once per theme change. Pattern
 * lifted from Tamagui / NativeBase / Restyle but kept ~30 LOC.
 *
 * Usage
 *   const styles = useStyles((t) => StyleSheet.create({
 *     container: { padding: t.space.md, backgroundColor: t.colors.bg.canvas },
 *   }));
 */

import { useMemo } from 'react';
import type { StyleSheet } from 'react-native';
import { useThemeTokens } from './ThemeProvider';
import type { Theme } from './theme';

type StyleBuilder<T extends StyleSheet.NamedStyles<T>> = (theme: Theme) => T;

export function useStyles<T extends StyleSheet.NamedStyles<T>>(
  builder: StyleBuilder<T>,
): T {
  const theme = useThemeTokens();
  // We intentionally key memo on the theme reference. lightTheme + darkTheme
  // are stable singletons, so we get a fresh stylesheet only on mode flip.
  return useMemo(() => builder(theme), [theme, builder]);
}
