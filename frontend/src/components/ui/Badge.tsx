import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, radii, spacing, colors } from '../../theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'premium'
  | 'market'
  | 'gold'
  | 'outline';

type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  label?:      string;
  variant?:    BadgeVariant;
  size?:       BadgeSize;
  icon?:       keyof typeof Ionicons.glyphMap;
  dot?:        boolean;      // dot-only mode (no label, small circle)
  count?:      number;       // notification count badge
  maxCount?:   number;       // cap for count display (default 99)
  style?:      ViewStyle;
  textStyle?:  TextStyle;
  customColor?: string;      // override color for custom tints
}

// ─── Size tokens ──────────────────────────────────────────────────────────────
const sizeTokens: Record<BadgeSize, { px: number; py: number; fontSize: number; iconSize: number; dotSize: number }> = {
  xs: { px: 5,  py: 2,  fontSize: fontSizes.xxs, iconSize: 10, dotSize: 7  },
  sm: { px: 7,  py: 3,  fontSize: fontSizes.xs,  iconSize: 11, dotSize: 8  },
  md: { px: 10, py: 4,  fontSize: fontSizes.sm,  iconSize: 13, dotSize: 10 },
};

// ─── Variant resolver ─────────────────────────────────────────────────────────
function resolveVariant(
  variant: BadgeVariant,
  T: ReturnType<typeof getTheme>,
  customColor?: string,
): { bg: string; text: string; border?: string } {
  if (customColor) {
    return { bg: customColor + '20', text: customColor };
  }
  switch (variant) {
    case 'primary':  return { bg: T.accentMuted,       text: T.accent };
    case 'success':  return { bg: T.successMuted,      text: T.success };
    case 'warning':  return { bg: T.warningMuted,      text: T.warning };
    case 'error':    return { bg: T.errorMuted,        text: T.error };
    case 'info':     return { bg: T.infoMuted,         text: T.info };
    case 'premium':  return { bg: T.purpleMuted,       text: T.premium };
    case 'market':   return { bg: T.tealMuted,         text: T.market };
    case 'gold':     return { bg: T.goldMuted,         text: T.gold };
    case 'outline':  return { bg: T.transparent,       text: T.text2, border: T.border };
    default:         return { bg: T.bgInput,           text: T.text3 };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export const Badge: React.FC<BadgeProps> = ({
  label,
  variant    = 'default',
  size       = 'sm',
  icon,
  dot        = false,
  count,
  maxCount   = 99,
  style,
  textStyle,
  customColor,
}) => {
  const T  = getTheme(useColorScheme());
  const sz = sizeTokens[size];
  const vc = resolveVariant(variant, T, customColor);

  // ── Dot-only mode ───────────────────────────────────────────────────────────
  if (dot) {
    return (
      <View
        style={[
          styles.dot,
          { width: sz.dotSize, height: sz.dotSize, backgroundColor: vc.text },
          style,
        ]}
      />
    );
  }

  // ── Count mode ──────────────────────────────────────────────────────────────
  if (count !== undefined) {
    const display = count > maxCount ? `${maxCount}+` : `${count}`;
    const isSmall = count <= 9;
    return (
      <View
        style={[
          styles.countBadge,
          {
            backgroundColor: T.error,
            minWidth: isSmall ? 16 : 20,
            height:   isSmall ? 16 : 20,
            borderRadius: radii.pill,
            paddingHorizontal: isSmall ? 0 : 5,
          },
          style,
        ]}
      >
        <Text style={[styles.countText, { color: colors.white, fontSize: fontSizes.xxs, fontFamily: fonts.bold }]}>
          {display}
        </Text>
      </View>
    );
  }

  // ── Label mode ──────────────────────────────────────────────────────────────
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor:  vc.bg,
          paddingHorizontal: sz.px,
          paddingVertical:   sz.py,
          borderRadius:      radii.pill,
          borderWidth:       vc.border ? 1 : 0,
          borderColor:       vc.border,
        },
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={sz.iconSize}
          color={vc.text}
          style={styles.icon}
        />
      )}
      {label && (
        <Text
          style={[
            styles.label,
            {
              color:      vc.text,
              fontSize:   sz.fontSize,
              fontFamily: fonts.semibold,
            },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </View>
  );
};

// ─── Preset badges for common app use-cases ───────────────────────────────────
export const PremiumBadge = (props: Partial<BadgeProps>) => (
  <Badge label="Premium" variant="premium" icon="star" size="xs" {...props} />
);

export const VerifiedBadge = (props: Partial<BadgeProps>) => (
  <Badge label="Verified" variant="info" icon="checkmark-circle" size="xs" {...props} />
);

export const NewBadge = (props: Partial<BadgeProps>) => (
  <Badge label="New" variant="success" size="xs" {...props} />
);

export const HotBadge = (props: Partial<BadgeProps>) => (
  <Badge label="Hot" variant="primary" icon="flame" size="xs" {...props} />
);

export const MarketBadge = (props: Partial<BadgeProps>) => (
  <Badge label="Market" variant="market" icon="storefront-outline" size="xs" {...props} />
);

const styles = StyleSheet.create({
  badge: {
    flexDirection:  'row',
    alignItems:     'center',
    alignSelf:      'flex-start',
  },
  label: {
    letterSpacing: 0.2,
  },
  icon: {
    marginRight: 3,
  },
  dot: {
    borderRadius: radii.pill,
  },
  countBadge: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  countText: {
    includeFontPadding: false,
    textAlign: 'center',
  },
});
