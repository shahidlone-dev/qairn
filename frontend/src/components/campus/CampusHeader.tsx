// src/components/campus/CampusHeader.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

import { getTheme, fonts, fontSizes, spacing } from '../../types/theme';
import { Avatar } from '../ui';

// Define the exact props the Header needs to function
interface CampusHeaderProps {
  T: ReturnType<typeof getTheme>;
  user: any;
  feedFilter: 'forYou' | 'myCircle';
  setFeedFilter: (f: 'forYou' | 'myCircle') => void;
  onMenuPress: () => void;
  onSearchPress: () => void;
  onProfilePress: () => void;
  isScrollingDown: SharedValue<boolean>; // The magic signal from CampusScreen
}

export const CampusHeader: React.FC<CampusHeaderProps> = ({
  T, user, feedFilter, setFeedFilter, 
  onMenuPress, onSearchPress, onProfilePress, 
  isScrollingDown
}) => {
  const insets = useSafeAreaInsets();

  // Animation: Slide UP and fade out when scrolling down
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          translateY: withTiming(isScrollingDown.value ? -100 : 0, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          }) 
        }
      ],
      opacity: withTiming(isScrollingDown.value ? 0 : 1, { duration: 250 }),
    };
  });

  return (
    <Animated.View 
      style={[
        styles.header, 
        { 
          backgroundColor: T.bg, 
          borderBottomColor: T.border,
          paddingTop: insets.top + spacing.sm, // Push content below the iOS notch safely
        },
        animatedStyle
      ]}
    >
      <TouchableOpacity onPress={onMenuPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="menu" size={24} color={T.text} />
      </TouchableOpacity>

      <View style={[styles.filterPill, { backgroundColor: T.bgInput }]}>
        {(['forYou', 'myCircle'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, feedFilter === f && { backgroundColor: T.accent }]}
            onPress={() => setFeedFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={{ fontFamily: fonts.semibold, fontSize: fontSizes.xs, color: feedFilter === f ? '#fff' : T.text3 }}>
              {f === 'forYou' ? 'For You' : 'Circle'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <TouchableOpacity onPress={onSearchPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="search-outline" size={22} color={T.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onProfilePress}>
          <Avatar name={user?.username} uri={user?.avatar_url} size="sm" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute', // Allows feed to scroll underneath
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 100, // Keeps it above the FlatList
  },
  filterPill: { flexDirection: 'row', borderRadius: 999, padding: 3, gap: 2 },
  filterBtn: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 999 },
});