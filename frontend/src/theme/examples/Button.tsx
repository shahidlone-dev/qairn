/**
 * Example: a fully-themed Button component using the qaaf theme.
 *
 * Drop this into your app as a starting point — it covers all five
 * variants, three sizes, disabled state, and uses theme.duration for
 * its press feedback.
 */

import React, { useCallback, useRef } from 'react';
import {
  Animated, Pressable, StyleSheet, Text, View, ViewStyle, TextStyle,
} from 'react-native';
import { useTheme } from '@qaaf/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export const Button: React.FC<ButtonProps> = ({
  label, onPress, variant = 'primary', size = 'md',
  disabled = false, leftIcon, rightIcon, fullWidth, style,
}) => {
  const { theme } = useTheme();
  const cfg = theme.components.button;
  const v = cfg.variants[variant];

  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = useCallback(() => {
    Animated.timing(scale, {
      toValue: 0.97, duration: cfg.transition,
      easing: theme.easing.standard, useNativeDriver: true,
    }).start();
  }, [scale, cfg.transition, theme.easing.standard]);
  const onOut = useCallback(() => {
    Animated.timing(scale, {
      toValue: 1, duration: cfg.transition,
      easing: theme.easing.standard, useNativeDriver: true,
    }).start();
  }, [scale, cfg.transition, theme.easing.standard]);

  const containerStyle: ViewStyle = {
    height: cfg.height[size],
    paddingHorizontal: cfg.paddingX[size],
    borderRadius: cfg.radius,
    backgroundColor: disabled ? cfg.disabled.bg : v.bg,
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: v.border === 'transparent' ? 'transparent' : v.border,
    opacity: disabled ? 1 : 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  const labelStyle: TextStyle = {
    ...cfg.text[size],
    color: disabled ? cfg.disabled.fg : v.fg,
    marginLeft: leftIcon ? theme.space.xs : 0,
    marginRight: rightIcon ? theme.space.xs : 0,
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        style={containerStyle}
      >
        {leftIcon ? <View>{leftIcon}</View> : null}
        <Text style={labelStyle}>{label}</Text>
        {rightIcon ? <View>{rightIcon}</View> : null}
      </Pressable>
    </Animated.View>
  );
};
