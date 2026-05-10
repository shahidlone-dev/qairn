// src/components/ui/Avatar.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, radii } from '../../types/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type AvatarSize  = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
type AvatarShape = 'circle' | 'rounded';

interface AvatarProps {
  uri?:         string;
  name?:        string;
  size?:        AvatarSize;
  shape?:       AvatarShape;
  onPress?:     () => void;
  showOnline?:  boolean;
  showStory?:   boolean;
  storyViewed?: boolean;
  style?:       ViewStyle;
}

// ─── Size tokens ──────────────────────────────────────────────────────────────
const sizeMap: Record<AvatarSize, {
  size: number; fontSize: number; ringGap: number;
  ringWidth: number; onlineSize: number; onlineBorder: number;
}> = {
  xs:  { size: 24,  fontSize: fontSizes.xxs, ringGap: 1.5, ringWidth: 1.5, onlineSize: 7,  onlineBorder: 1.5 },
  sm:  { size: 32,  fontSize: fontSizes.xs,  ringGap: 2,   ringWidth: 2,   onlineSize: 8,  onlineBorder: 1.5 },
  md:  { size: 40,  fontSize: fontSizes.md,  ringGap: 2,   ringWidth: 2,   onlineSize: 10, onlineBorder: 2   },
  lg:  { size: 52,  fontSize: fontSizes.lg,  ringGap: 2.5, ringWidth: 2.5, onlineSize: 12, onlineBorder: 2   },
  xl:  { size: 68,  fontSize: fontSizes.xl,  ringGap: 3,   ringWidth: 3,   onlineSize: 14, onlineBorder: 2.5 },
  xxl: { size: 88,  fontSize: fontSizes.xxl, ringGap: 3,   ringWidth: 3,   onlineSize: 16, onlineBorder: 3   },
};

// ─── Default silhouette SVG (Instagram-style, black bg + white person) ────────
const DefaultSilhouette: React.FC<{ size: number }> = ({ size }) => {
  // Scale proportionally to avatar size
  const vb   = 100;
  const head = { cx: 50, cy: 35, r: 18 };
  const body = { d: 'M15 85 Q15 58 50 58 Q85 58 85 85 Z' };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`}>
      {/* Background circle — pure black */}
      <Circle cx="50" cy="50" r="50" fill="#000000" />
      {/* Head */}
      <Circle cx={head.cx} cy={head.cy} r={head.r} fill="#ffffff" opacity={0.9} />
      {/* Body */}
      <Path d={body.d} fill="#ffffff" opacity={0.9} />
    </Svg>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name        = '',
  size        = 'md',
  shape       = 'circle',
  onPress,
  showOnline  = false,
  showStory   = false,
  storyViewed = false,
  style,
}) => {
  const T        = getTheme(useColorScheme());
  const sz       = sizeMap[size];
  const br       = shape === 'circle' ? radii.pill : radii.lg;
  const [imgErr, setImgErr] = useState(false);

  const hasImage = !!uri && !imgErr;

  const totalSize = showStory
    ? sz.size + (sz.ringGap + sz.ringWidth) * 2
    : sz.size;

  // ── Inner avatar content ──────────────────────────────────────────────────
  const Inner = () => {
    if (hasImage) {
      return (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: br }]}
          onError={() => setImgErr(true)}
        />
      );
    }
    // No image → always black silhouette, no initials ever
    return <DefaultSilhouette size={sz.size} />;
  };

  const avatarEl = (
    <View style={[styles.wrap, { width: totalSize, height: totalSize }, style]}>
      {/* Story ring */}
      {showStory && (
        <View style={[
          styles.ring,
          {
            borderRadius:  shape === 'circle' ? totalSize / 2 : br + sz.ringGap + sz.ringWidth,
            borderWidth:   sz.ringWidth,
            borderColor:   storyViewed ? T.border : T.accent,
          },
        ]} />
      )}

      {/* Avatar circle */}
      <View style={[
        styles.avatar,
        {
          width:           sz.size,
          height:          sz.size,
          borderRadius:    br,
          backgroundColor: 'transparent',
          margin:          showStory ? sz.ringGap + sz.ringWidth : 0,
          overflow:        'hidden',
        },
      ]}>
        <Inner />
      </View>

      {/* Online dot */}
      {showOnline && (
        <View style={[
          styles.online,
          {
            width:        sz.onlineSize,
            height:       sz.onlineSize,
            borderRadius: radii.pill,
            borderWidth:  sz.onlineBorder,
            borderColor:  T.bg,
            backgroundColor: '#22c55e',
            bottom: showStory ? sz.ringWidth : 0,
            right:  showStory ? sz.ringWidth : 0,
          },
        ]} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {avatarEl}
      </TouchableOpacity>
    );
  }

  return avatarEl;
};

// ─── AvatarGroup ──────────────────────────────────────────────────────────────
interface AvatarGroupProps {
  users:  Array<{ uri?: string; name: string }>;
  max?:   number;
  size?:  AvatarSize;
  style?: ViewStyle;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  users, max = 4, size = 'sm', style,
}) => {
  const T       = getTheme(useColorScheme());
  const sz      = sizeMap[size];
  const visible = users.slice(0, max);
  const extra   = users.length - max;
  const overlap = sz.size * 0.32;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {visible.map((u, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: visible.length - i }}>
          <Avatar uri={u.uri} name={u.name} size={size}
            style={{ borderWidth: 2, borderColor: T.bg } as ViewStyle}
          />
        </View>
      ))}
      {extra > 0 && (
        <View style={[
          styles.extra,
          {
            width:           sz.size,
            height:          sz.size,
            borderRadius:    radii.pill,
            backgroundColor: T.bgInput,
            borderWidth:     2,
            borderColor:     T.bg,
            marginLeft:      -overlap,
          },
        ]}>
          <Text style={{ color: T.text3, fontSize: sz.fontSize, fontFamily: fonts.semibold }}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap:   { position: 'relative' },
  ring:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  online: { position: 'absolute' },
  extra:  { alignItems: 'center', justifyContent: 'center', zIndex: 0 },
});