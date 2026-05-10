// src/components/campus/CampusFAB.tsx

import React from 'react';
import { TouchableOpacity, StyleSheet, useColorScheme, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import Animated, { 
  SharedValue, 
  useAnimatedStyle, 
  useSharedValue,
  useAnimatedReaction,
  withSpring, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';

import { getTheme, spacing, radii } from '../../types/theme';
import { RootStackParamList } from '../../types/navigation';

interface Props {
  bottomOffset?: number;
  isScrollingDown: SharedValue<boolean>;
  onRegisterClose?: (closeFn: () => void) => void;
}

export const CampusFAB: React.FC<Props> = ({ 
  bottomOffset = 0, 
  isScrollingDown 
}) => {
  const colorScheme = useColorScheme();
  const T = getTheme(colorScheme);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  // ── Theme Overrides for Opaque Sub-buttons ────────────────────────────────
  const isDark = colorScheme === 'dark';
  const subBtnBgColor = isDark ? '#2C2C2E' : '#FFFFFF'; 
  const subIconColor = isDark ? '#FFFFFF' : '#1C1C1E';

  const isExpanded = useSharedValue(false);

  // Auto-close the menu if the user starts scrolling down
  useAnimatedReaction(
    () => isScrollingDown.value,
    (scrollingDown) => {
      if (scrollingDown && isExpanded.value) {
        isExpanded.value = false;
      }
    }
  );

  // ── Interaction Logic ─────────────────────────────────────────────────────
  const handleMainPress = () => {
    if (!isExpanded.value) {
      // 1. Menu is Closed -> Open it
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      isExpanded.value = true;
    } else {
      // 2. Menu is Open -> Main button acts as the STORY button!
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      isExpanded.value = false;
      navigation.navigate('StoryGallery'); // Navigates to the new Gallery module
    }
  };

  const handlePostPress = () => {
    isExpanded.value = false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('CreatePost'); 
  };

  // ── Animations ────────────────────────────────────────────────────────────
  const containerStyle = useAnimatedStyle(() => {
    const isHidden = isScrollingDown.value;
    return {
      transform: [
        { 
          scale: withSpring(isHidden ? 0 : 1, {
            damping: 15,
            stiffness: 150,
            mass: 0.8,
            overshootClamping: isHidden, 
          }) 
        }
      ],
      opacity: withTiming(isHidden ? 0 : 1, { 
        duration: 200,
        easing: Easing.out(Easing.quad)
      }),
    };
  });

  // Post Button pops out above (-75px)
  const postBtnStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withSpring(isExpanded.value ? -75 : 0) },
      { scale: withSpring(isExpanded.value ? 1 : 0.4) }
    ],
    opacity: withTiming(isExpanded.value ? 1 : 0, { duration: 150 }),
  }));

  // Icon Crossfade: Fades OUT the '+'
  const plusIconStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    opacity: withTiming(isExpanded.value ? 0 : 1, { duration: 150 }),
    transform: [
      { scale: withSpring(isExpanded.value ? 0.2 : 1) },
      { rotate: withSpring(isExpanded.value ? '90deg' : '0deg') }
    ]
  }));

  // Icon Crossfade: Fades IN the 'Story' icon
  const storyIconStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    opacity: withTiming(isExpanded.value ? 1 : 0, { duration: 150 }),
    transform: [
      { scale: withSpring(isExpanded.value ? 1 : 0.2) },
      { rotate: withSpring(isExpanded.value ? '0deg' : '-90deg') }
    ]
  }));

  // Text Labels slide and fade in
  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isExpanded.value ? 1 : 0, { duration: 150 }),
    transform: [{ translateX: withSpring(isExpanded.value ? 0 : 10) }]
  }));

  return (
    <Animated.View
      style={[
        styles.container, 
        { bottom: bottomOffset + 90 },
        containerStyle 
      ]}
      pointerEvents="box-none"
    >
      {/* ── Main Button Label ("Add your story") ── */}
      <Animated.Text 
        numberOfLines={1}
        style={[
          styles.label, 
          styles.mainLabel, 
          { backgroundColor: subBtnBgColor, color: subIconColor }, 
          labelStyle
        ]}
        pointerEvents="none"
      >
        Add your story
      </Animated.Text>

      {/* POP-OUT BUTTON: Posts */}
      <Animated.View style={[styles.subBtnWrapper, postBtnStyle]}>
        
        {/* ── Sub Button Label ("Create a post") ── */}
        <Animated.Text 
          numberOfLines={1}
          style={[
            styles.label, 
            styles.subLabel, 
            { backgroundColor: subBtnBgColor, color: subIconColor }, 
            labelStyle
          ]}
          pointerEvents="none"
        >
          Create a post
        </Animated.Text>

        <TouchableOpacity 
          style={[styles.subBtn, { backgroundColor: subBtnBgColor }]} 
          onPress={handlePostPress}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-outline" size={22} color={subIconColor} />
        </TouchableOpacity>
      </Animated.View>

      {/* MAIN BUTTON: Toggles menu, then becomes Story Button */}
      <TouchableOpacity
        style={[styles.mainBtn, { backgroundColor: T.accent }]}
        onPress={handleMainPress}
        activeOpacity={0.9}
      >
        {/* The '+' Icon (Visible when closed) */}
        <Animated.View style={plusIconStyle}>
          <Ionicons name="add" size={34} color="#fff" style={styles.icon} />
        </Animated.View>

        {/* The 'Story' Icon (Visible when expanded) */}
        <Animated.View style={storyIconStyle}>
          <Ionicons name="aperture-outline" size={28} color="#fff" style={styles.icon} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  mainBtn: {
    height: 60,
    width: 60,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D85A30', 
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 10,
  },
  subBtnWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  subBtn: {
    height: 48,
    width: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  icon: {
    marginLeft: 0, 
  },
  label: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
    width: 130, // Forces the pill to be wide enough so text doesn't wrap
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  subLabel: {
    right: 56, 
  },
  mainLabel: {
    right: 72, 
    bottom: 16, 
    zIndex: 5,
  }
});