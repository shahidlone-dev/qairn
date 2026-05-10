// src/components/ui/QaafPlusBadge.tsx

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, radii } from '../../types/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type BadgeSize = 'xs' | 'sm' | 'md';

interface Props {
  size?:  BadgeSize;
  style?: ViewStyle;
}

// ─── Size tokens ──────────────────────────────────────────────────────────────
const sizeTokens: Record<BadgeSize, {
  fontSize:    number;
  plusSize:    number;
  px:          number;
  py:          number;
  gap:         number;
  borderRadius: number;
}> = {
  xs: { fontSize: 9,  plusSize: 11, px: 5,  py: 2, gap: 1, borderRadius: radii.pill },
  sm: { fontSize: 11, plusSize: 13, px: 7,  py: 3, gap: 1, borderRadius: radii.pill },
  md: { fontSize: 13, plusSize: 15, px: 9,  py: 4, gap: 2, borderRadius: radii.pill },
};

// ─── Component ────────────────────────────────────────────────────────────────
export const QaafPlusBadge: React.FC<Props> = ({ size = 'sm', style }) => {
  const T  = getTheme(useColorScheme());
  const sz = sizeTokens[size];

  return (
    <View
      style={[
        styles.badge,
        {
          paddingHorizontal: sz.px,
          paddingVertical:   sz.py,
          gap:               sz.gap,
          borderRadius:      sz.borderRadius,
          backgroundColor:   T.purpleMuted,
          borderColor:       T.purple,
        },
        style,
      ]}
    >
      {/* "qaaf" in white/primary */}
      <Text style={[
        styles.qaaf,
        {
          fontSize:   sz.fontSize,
          fontFamily: fonts.bold,
          color:      T.isDark ? '#ffffff' : '#26215C',
        },
      ]}>
        qaaf
      </Text>

      {/* "+" in purple, slightly larger and bolder */}
      <Text style={[
        styles.plus,
        {
          fontSize:   sz.plusSize,
          fontFamily: fonts.bold,
          color:      T.purple,
        },
      ]}>
        +
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection:  'row',
    alignItems:     'center',
    alignSelf:      'flex-start',
    borderWidth:    0.5,
  },
  qaaf: {
    includeFontPadding: false,
    letterSpacing:      0.2,
  },
  plus: {
    includeFontPadding: false,
    lineHeight:         undefined,
  },
});