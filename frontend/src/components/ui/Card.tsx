import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { getTheme, radii, spacing, shadows } from '../../theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type CardVariant = 'default' | 'elevated' | 'outline' | 'ghost' | 'accent';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children:    React.ReactNode;
  variant?:    CardVariant;
  padding?:    CardPadding;
  radius?:     'sm' | 'md' | 'lg' | 'xl';
  onPress?:    TouchableOpacityProps['onPress'];
  onLongPress?:TouchableOpacityProps['onLongPress'];
  style?:      ViewStyle;
  disabled?:   boolean;
  accentColor?: string;  // for 'accent' variant left border
}

// ─── Padding tokens ───────────────────────────────────────────────────────────
const paddingMap: Record<CardPadding, number> = {
  none: 0,
  sm:   spacing.sm,
  md:   spacing.md,
  lg:   spacing.base,
};

const radiusMap = {
  sm: radii.sm,
  md: radii.md,
  lg: radii.lg,
  xl: radii.xl,
};

// ─── Component ────────────────────────────────────────────────────────────────
export const Card: React.FC<CardProps> = ({
  children,
  variant     = 'default',
  padding     = 'md',
  radius      = 'lg',
  onPress,
  onLongPress,
  style,
  disabled,
  accentColor,
}) => {
  const T   = getTheme(useColorScheme());
  const pad = paddingMap[padding];
  const br  = radiusMap[radius];

  const variantStyle = (): ViewStyle => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: T.bgCard,
          borderWidth:     0,
        };
      case 'elevated':
        return {
          backgroundColor: T.bgCardElevated,
          borderWidth:     0,
          ...(T.isDark ? {} : shadows.md),
        };
      case 'outline':
        return {
          backgroundColor: T.bg,
          borderWidth:     1,
          borderColor:     T.border,
        };
      case 'ghost':
        return {
          backgroundColor: T.transparent,
          borderWidth:     0,
        };
      case 'accent':
        return {
          backgroundColor: T.bgCard,
          borderWidth:     0,
          borderLeftWidth: 3,
          borderLeftColor: accentColor ?? T.accent,
          borderRadius:    0,
          borderTopRightRadius:    br,
          borderBottomRightRadius: br,
        };
    }
  };

  const baseStyle: ViewStyle = {
    borderRadius: variant === 'accent' ? 0 : br,
    padding:      pad,
    overflow:     'hidden',
    ...variantStyle(),
  };

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        activeOpacity={0.78}
        style={[baseStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[baseStyle, style]}>
      {children}
    </View>
  );
};

// ─── Card.Row — horizontal layout helper ─────────────────────────────────────
interface CardRowProps {
  children:  React.ReactNode;
  gap?:      number;
  align?:    ViewStyle['alignItems'];
  justify?:  ViewStyle['justifyContent'];
  style?:    ViewStyle;
}

Card.Row = function CardRow({
  children,
  gap     = spacing.sm,
  align   = 'center',
  justify = 'flex-start',
  style,
}: CardRowProps) {
  return (
    <View style={[styles.row, { gap, alignItems: align, justifyContent: justify }, style]}>
      {children}
    </View>
  );
};

// ─── Card.Divider ─────────────────────────────────────────────────────────────
Card.Divider = function CardDivider({ style }: { style?: ViewStyle }) {
  const T = getTheme(useColorScheme());
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: T.border },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  divider: {
    height:           StyleSheet.hairlineWidth,
    marginVertical:   spacing.sm,
  },
});

// ─── Type augmentation for sub-components ─────────────────────────────────────
declare global {
  namespace JSX {
    interface Element {}
  }
}

export type { CardProps };
