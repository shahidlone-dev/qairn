/**
 * qaaf — ThemeProvider
 *
 * Provides the active `Theme` to the tree and tracks the user's
 * preference (`light` | `dark` | `system`). When `system` is selected
 * we listen to the OS appearance and re-render on change.
 *
 * Persistence: pass an optional `storage` adapter (AsyncStorage,
 * MMKV, expo-secure-store — anything with get/set) to persist
 * the user's mode choice across launches. Without it the choice
 * is in-memory only.
 *
 * Usage
 *   <ThemeProvider storage={AsyncStorage}>
 *     <App />
 *   </ThemeProvider>
 *
 *   const { theme, mode, setMode } = useTheme();
 */

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { Appearance, ColorSchemeName, StatusBar } from 'react-native';
import { lightTheme, darkTheme, type Theme, type ThemeMode } from './theme';

export type ColorSchemePreference = ThemeMode | 'system';

export type ThemeStorage = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
};

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;          // resolved mode — never 'system'
  preference: ColorSchemePreference; // raw user choice
  setPreference: (p: ColorSchemePreference) => void;
  toggle: () => void;
};

const STORAGE_KEY = '@qaaf/theme-preference';

const ThemeContext = createContext<ThemeContextValue | null>(null);

const resolve = (
  preference: ColorSchemePreference,
  systemScheme: ColorSchemeName,
): ThemeMode => {
  if (preference === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
  return preference;
};

export type ThemeProviderProps = {
  children: React.ReactNode;
  /** Initial preference if nothing is persisted. Default: 'system'. */
  defaultPreference?: ColorSchemePreference;
  /** Optional persistent store (AsyncStorage, MMKV, etc.). */
  storage?: ThemeStorage;
  /** Override the resolved theme — useful for storybook / tests. */
  forceMode?: ThemeMode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultPreference = 'system',
  storage,
  forceMode,
}) => {
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme(),
  );
  const [preference, setPreferenceState] = useState<ColorSchemePreference>(defaultPreference);
  const [hydrated, setHydrated] = useState(!storage);

  // Hydrate from storage on mount.
  useEffect(() => {
    if (!storage) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw === 'light' || raw === 'dark' || raw === 'system') {
          setPreferenceState(raw);
        }
      } catch {
        // ignore — fall back to default
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, [storage]);

  // Track system appearance changes when preference is 'system'.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const setPreference = useCallback((p: ColorSchemePreference) => {
    setPreferenceState(p);
    if (storage) {
      try { void storage.setItem(STORAGE_KEY, p); } catch { /* ignore */ }
    }
  }, [storage]);

  const toggle = useCallback(() => {
    setPreference(preference === 'dark' ? 'light' : 'dark');
  }, [preference, setPreference]);

  const mode: ThemeMode = forceMode ?? resolve(preference, systemScheme);
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  const value = useMemo<ThemeContextValue>(() => ({
    theme, mode, preference, setPreference, toggle,
  }), [theme, mode, preference, setPreference, toggle]);

  // Avoid a flash of the wrong theme during async hydration.
  if (!hydrated) return null;

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar 
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent" 
        translucent={true} 
      />
      {children}
    </ThemeContext.Provider>
  );
};

/** Read the active theme + mode controls. */
export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme: must be used within <ThemeProvider>');
  return ctx;
};

/** Lightweight hook for components that only need style tokens. */
export const useThemeTokens = (): Theme => useTheme().theme;