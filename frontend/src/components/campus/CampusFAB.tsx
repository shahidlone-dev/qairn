// src/components/campus/CampusFAB.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
// FIX: Imported static 'colors' to guarantee icon tints never resolve to transparent
import { getTheme, colors, fonts, fontSizes, spacing, radii } from '../../theme/theme';

const FLOAT_OPTIONS = [
  { icon: 'videocam' as const, label: 'Reel',  colorKey: 'purple' as const },
  { icon: 'camera'   as const, label: 'Photo', colorKey: 'teal'   as const },
];

interface Props {
  bottomOffset?:    number;
  onRegisterClose?: (closeFn: () => void) => void;
}

export const CampusFAB: React.FC<Props> = ({
  bottomOffset    = 0,
  onRegisterClose,
}) => {
  const T = getTheme(useColorScheme());

  // FIX: Safely map to the guaranteed static color palette
  const floatColors = { purple: colors.purple, teal: colors.teal };

  const [open, setOpen] = useState(false);
  const openRef         = useRef(false);

  const floatAnims = useRef(FLOAT_OPTIONS.map(() => new Animated.Value(0))).current;

  // ── Animate open / close ──────────────────────────────────────────────────
  const animate = useCallback((opening: boolean) => {
    openRef.current = opening;
    setOpen(opening);

    Animated.parallel(
      floatAnims.map((anim, i) =>
        Animated.spring(anim, {
          toValue:         opening ? 1 : 0,
          useNativeDriver: true,
          damping:         18,
          stiffness:       240,
          delay: opening ? i * 50 : (FLOAT_OPTIONS.length - 1 - i) * 40,
        })
      )
    ).start();
  }, [floatAnims]);

  // ── Register close so CampusScreen can call on scroll ────────────────────
  useEffect(() => {
    onRegisterClose?.(() => {
      if (openRef.current) animate(false);
    });
  }, [animate, onRegisterClose]);

  return (
    <View
      style={[styles.container, { bottom: bottomOffset + spacing.lg }]}
      pointerEvents="box-none"
    >
      {/* ── Floating options (Photo above Post, Reel above Photo) ─────────── */}
      {FLOAT_OPTIONS.map((opt, i) => {
        const anim = floatAnims[i];

        const GAP      = 70;
        const distance = GAP * (i + 1);

        const translateY = anim.interpolate({
          inputRange:  [0, 1],
          outputRange: [0, -distance],
        });
        const scale = anim.interpolate({
          inputRange:  [0, 1],
          outputRange: [0.4, 1],
        });
        const opacity = anim;

        return (
          <Animated.View
            key={opt.label}
            style={[
              styles.floatWrap,
              {
                opacity,
                transform: [{ translateY }, { scale }],
              },
            ]}
            pointerEvents={open ? 'auto' : 'none'}
          >
            {/* Label */}
            <View style={[styles.floatLabel, { backgroundColor: T.bgCard, borderColor: T.borderSubtle }]}>
              <Text style={[styles.floatLabelText, { color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>
                {opt.label}
              </Text>
            </View>

            {/* Icon button */}
            <TouchableOpacity
              style={[styles.floatBtn, { backgroundColor: T.bgCard, borderColor: T.borderSubtle }]}
              onPress={() => animate(false)}
              activeOpacity={0.85}
            >
              <Ionicons name={opt.icon} size={22} color={floatColors[opt.colorKey]} />
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* ── Main button — shows + when closed, "Post" when open ───────────── */}
      <TouchableOpacity
        style={[styles.mainBtn, { backgroundColor: T.accent }]}
        onPress={() => animate(!openRef.current)}
        activeOpacity={0.85}
      >
        {open ? (
          <View style={styles.postInner}>
            <Ionicons name="create" size={18} color="#fff" />
            <Text style={[styles.postLabel, { fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>
              Post
            </Text>
          </View>
        ) : (
          <Ionicons name="add" size={30} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position:   'absolute',
    right:      spacing.base,
    alignItems: 'center',
    zIndex:     100,
  },

  // Main FAB
  mainBtn: {
    height:         56,
    minWidth:       56,
    borderRadius:   radii.pill,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    shadowColor:    '#D85A30',
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.4,
    shadowRadius:   8,
    elevation:      10,
  },
  postInner: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
  },
  postLabel: {
    color: '#fff',
  },

  // Floating options
  floatWrap: {
    position:      'absolute',
    bottom:        0,
    right:         4, // FIX: Mathematically centers the 48px mini-buttons over the 56px main button
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  floatBtn: {
    width:          48,
    height:         48,
    borderRadius:   radii.pill,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    StyleSheet.hairlineWidth,
    // FIX: Shadow ensures they don't blend into light backgrounds
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 3 },
    shadowOpacity:  0.12,
    shadowRadius:   6,
    elevation:      6,
  },
  floatLabel: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    borderRadius:      radii.md,
    borderWidth:       StyleSheet.hairlineWidth,
    // FIX: Shadow ensures labels are legible over the feed in light mode
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.1,
    shadowRadius:      4,
    elevation:         4,
  },
  floatLabelText: {},
});