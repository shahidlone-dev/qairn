import { lightColors, darkColors } from './tokens/colors';
import type { SemanticColors } from './tokens/colors';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';
import { elevation } from './tokens/elevation';
import { fontFamily, fontWeight, textStyles } from './tokens/typography';
import { duration, easing, spring } from './tokens/motion';
import { zIndex } from './tokens/zIndex';
import { iconSize } from './tokens/iconSize';
import { buildComponents } from './components';
import type { Components } from './components';

export type ThemeMode = 'light' | 'dark';

export type Theme = {
  mode: ThemeMode;
  colors: SemanticColors;
  space: typeof space;
  radius: typeof radius;
  elevation: typeof elevation;
  fontFamily: typeof fontFamily;
  fontWeight: typeof fontWeight;
  textStyles: typeof textStyles;
  duration: typeof duration;
  easing: typeof easing;
  spring: typeof spring;
  zIndex: typeof zIndex;
  iconSize: typeof iconSize;
  components: Components;
};

const sharedTokens = {
  space,
  radius,
  elevation,
  fontFamily,
  fontWeight,
  textStyles,
  duration,
  easing,
  spring,
  zIndex,
  iconSize,
} as const;

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  components: buildComponents(lightColors),
  ...sharedTokens,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  components: buildComponents(darkColors),
  ...sharedTokens,
};
