import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, radii, spacing } from '../../theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type InputVariant = 'filled' | 'outline';
type InputSize    = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?:        string;
  placeholder?:  string;
  value:         string;
  onChangeText:  (text: string) => void;
  variant?:      InputVariant;
  size?:         InputSize;
  iconLeft?:     keyof typeof Ionicons.glyphMap;
  iconRight?:    keyof typeof Ionicons.glyphMap;
  onIconRightPress?: () => void;
  error?:        string;
  hint?:         string;
  disabled?:     boolean;
  secureText?:   boolean;
  containerStyle?: ViewStyle;
  inputStyle?:   TextStyle;
}

// ─── Size tokens ──────────────────────────────────────────────────────────────
const sizeTokens: Record<InputSize, { height: number; px: number; fontSize: number; iconSize: number }> = {
  sm: { height: 38, px: spacing.md,   fontSize: fontSizes.sm,   iconSize: 16 },
  md: { height: 48, px: spacing.base, fontSize: fontSizes.md,   iconSize: 18 },
  lg: { height: 56, px: spacing.lg,   fontSize: fontSizes.lg,   iconSize: 20 },
};

// ─── Component ────────────────────────────────────────────────────────────────
export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  variant  = 'filled',
  size     = 'md',
  iconLeft,
  iconRight,
  onIconRightPress,
  error,
  hint,
  disabled = false,
  secureText = false,
  containerStyle,
  inputStyle,
  ...rest
}) => {
  const T  = getTheme(useColorScheme());
  const sz = sizeTokens[size];

  const [focused,  setFocused]  = useState(false);
  const [secure,   setSecure]   = useState(secureText);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = useCallback(() => {
    setFocused(true);
    Animated.timing(focusAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  }, [focusAnim]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  }, [focusAnim]);

  const borderColor = focusAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? T.error : T.border, error ? T.error : T.accent],
  });

  const hasError   = !!error;
  const showToggle = secureText;
  const effectiveIconRight = showToggle
    ? (secure ? 'eye-off-outline' : 'eye-outline')
    : iconRight;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Label */}
      {label && (
        <Text style={[styles.label, { color: hasError ? T.error : T.text2, fontFamily: fonts.medium, fontSize: fontSizes.sm }]}>
          {label}
        </Text>
      )}

      {/* Input row */}
      <Animated.View
        style={[
          styles.container,
          {
            height:      sz.height,
            borderRadius: radii.lg,
            backgroundColor: variant === 'filled' ? T.bgInput : T.transparent,
            borderWidth:  variant === 'outline' ? 1.5 : focused || hasError ? 1.5 : 0,
            borderColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {/* Left icon */}
        {iconLeft && (
          <Ionicons
            name={iconLeft}
            size={sz.iconSize}
            color={focused ? T.accent : T.text3}
            style={[styles.iconLeft, { marginLeft: sz.px - 4 }]}
          />
        )}

        {/* Text input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={T.textMuted}
          secureTextEntry={secure}
          editable={!disabled}
          style={[
            styles.input,
            {
              flex:       1,
              fontSize:   sz.fontSize,
              fontFamily: fonts.regular,
              color:      T.text,
              paddingHorizontal: iconLeft ? spacing.sm : sz.px,
              paddingRight: effectiveIconRight ? 0 : sz.px,
            },
            inputStyle,
          ]}
          {...rest}
        />

        {/* Right icon / toggle */}
        {effectiveIconRight && (
          <TouchableOpacity
            onPress={showToggle ? () => setSecure(p => !p) : onIconRightPress}
            style={[styles.iconRight, { marginRight: sz.px - 4 }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={!showToggle && !onIconRightPress}
          >
            <Ionicons
              name={effectiveIconRight}
              size={sz.iconSize}
              color={focused ? T.accent : T.text3}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Error / hint */}
      {(hasError || hint) && (
        <Text
          style={[
            styles.helper,
            {
              color:      hasError ? T.error : T.text3,
              fontFamily: fonts.regular,
              fontSize:   fontSizes.xs,
            },
          ]}
        >
          {hasError ? error : hint}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper:   { gap: 6 },
  label:     { marginBottom: 2 },
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    overflow:       'hidden',
  },
  input: {
    height:     '100%',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  iconLeft:  {},
  iconRight: { padding: 4 },
  helper:    { marginTop: 2, marginLeft: 4 },
});
