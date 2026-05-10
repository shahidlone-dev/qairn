# @qaaf/theme

Production design system for the qaaf React Native / Expo app.

## Install

```bash
# already in this monorepo as workspace:* — otherwise:
yarn add @qaaf/theme
```

Peer deps: `react`, `react-native`. Optional: `@react-native-async-storage/async-storage` (or any get/set adapter) for persisting the user's mode choice.

## Wire it up

```tsx
// App.tsx
import { ThemeProvider } from '@qaaf/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  return (
    <ThemeProvider storage={AsyncStorage} defaultPreference="system">
      <RootNav />
    </ThemeProvider>
  );
}
```

## Use it

```tsx
import { useTheme, useStyles } from '@qaaf/theme';
import { StyleSheet, Text, View } from 'react-native';

export function Card({ title }: { title: string }) {
  const { theme } = useTheme();
  const styles = useStyles((t) => StyleSheet.create({
    card: {
      backgroundColor: t.colors.bg.raised,
      borderRadius: t.radius.lg,
      padding: t.space.md,
      borderWidth: 1,
      borderColor: t.colors.border.subtle,
      ...t.elevation.md,
    },
    title: {
      ...t.textStyles.titleLg,
      color: t.colors.fg.primary,
    },
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}
```

## Toggle mode

```tsx
const { mode, setPreference, toggle } = useTheme();
//   mode = 'light' | 'dark'  (resolved)
//   setPreference('system' | 'light' | 'dark')
//   toggle()  ←  flips light↔dark
```

## Token map

```
theme.colors.{bg,fg,border,brand,accent,feedback,interactive,utility}
theme.textStyles.{display,headline,title,body,label}{Lg,Md,Sm}
theme.space.{xxs..4xl}                  // 4..96 dp
theme.radius.{none,xs,sm,md,lg,xl,2xl,3xl,full}
theme.elevation.{xs,sm,md,lg,xl,2xl}    // cross-platform shadow bundles
theme.duration.{instant..slowest}       // ms
theme.easing.{standard,decelerate,...}
theme.spring.{gentle,snappy,bouncy,stiff}
theme.iconSize.{xs..3xl,tap}
theme.breakpoints.{xs..2xl}
theme.zIndex.{base..tooltip}
theme.gradients.brand                   // for expo-linear-gradient
theme.components.{button,card,input,...} // pre-baked component theming
```

## Architecture

```
src/
  tokens/            primitives — palette, typography, spacing, motion, …
  colors.ts          semantic light/dark color tokens
  components.ts      per-component theme bundles
  theme.ts           lightTheme + darkTheme assembly
  ThemeProvider.tsx  context + system mode listener + persistence
  useStyles.ts       memoized StyleSheet builder
  index.ts           public API
```

Designers edit `tokens/`. App code reads `useTheme()` only — never the raw palette directly.
