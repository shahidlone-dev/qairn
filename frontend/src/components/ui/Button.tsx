import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, radii, spacing } from '../../types/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label:      string;
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  disabled?:  boolean;
  iconLeft?:  keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?:     ViewStyle;
  textStyle?: TextStyle;
}

// ─── Size tokens ──────────────────────────────────────────────────────────────
const sizeTokens: Record<Size, { height: number; px: number; fontSize: number; iconSize: number; radius: number }> = {
  sm: { height: 34, px: spacing.md,   fontSize: fontSizes.sm,   iconSize: 14, radius: radii.md },
  md: { height: 44, px: spacing.lg,   fontSize: fontSizes.md,   iconSize: 16, radius: radii.lg },
  lg: { height: 52, px: spacing.xl,   fontSize: fontSizes.lg,   iconSize: 18, radius: radii.xl },
};

// ─── Component ────────────────────────────────────────────────────────────────
export const Button: React.FC<ButtonProps> = ({
  label,
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  disabled  = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  style,
  textStyle,
  onPress,
  ...rest
}) => {
  const T  = getTheme(useColorScheme());
  const sz = sizeTokens[size];

  const isDisabled = disabled || loading;

  // ── Variant styles ──────────────────────────────────────────────────────────
  const variantStyle = useCallback((): { container: ViewStyle; label: TextStyle; iconColor: string } => {
    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: isDisabled ? T.accentMuted : T.accent, borderWidth: 0 },
          label:     { color: isDisabled ? T.text3 : T.accentText },
          iconColor: isDisabled ? T.text3 : T.accentText,
        };
      case 'secondary':
        return {
          container: { backgroundColor: T.bgCard, borderWidth: 0 },
          label:     { color: T.text },
          iconColor: T.text,
        };
      case 'outline':
        return {
          container: { backgroundColor: T.transparent, borderWidth: 1.5, borderColor: isDisabled ? T.border : T.accent },
          label:     { color: isDisabled ? T.text3 : T.accent },
          iconColor: isDisabled ? T.text3 : T.accent,
        };
      case 'ghost':
        return {
          container: { backgroundColor: T.transparent, borderWidth: 0 },
          label:     { color: isDisabled ? T.text3 : T.accent },
          iconColor: isDisabled ? T.text3 : T.accent,
        };
      case 'danger':
        return {
          container: { backgroundColor: isDisabled ? T.errorMuted : T.error, borderWidth: 0 },
          label:     { color: T.white },
          iconColor: T.white,
        };
    }
  }, [variant, isDisabled, T]);

  const vs = variantStyle();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          height:        sz.height,
          paddingHorizontal: sz.px,
          borderRadius:  sz.radius,
          alignSelf:     fullWidth ? 'stretch' : 'flex-start',
          opacity:       isDisabled && !loading ? 0.5 : 1,
        },
        vs.container,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.iconColor} />
      ) : (
        <View style={styles.inner}>
          {iconLeft && (
            <Ionicons
              name={iconLeft}
              size={sz.iconSize}
              color={vs.iconColor}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.label,
              { fontSize: sz.fontSize, fontFamily: fonts.semibold },
              vs.label,
              textStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {iconRight && (
            <Ionicons
              name={iconRight}
              size={sz.iconSize}
              color={vs.iconColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: {
    letterSpacing: 0.1,
  },
  iconLeft:  { marginRight: 6 },
  iconRight: { marginLeft:  6 },
});
