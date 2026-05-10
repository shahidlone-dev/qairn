import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  useSharedValue,
  useAnimatedReaction
} from 'react-native-reanimated';

import { getTheme, fonts } from '../../types/theme';
import { useScrollSignal } from '../../context/ScrollContext';

const { width } = Dimensions.get('window');

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state, navigation,
}) => {
  const scheme = useColorScheme();
  const T = getTheme(scheme);
  const insets = useSafeAreaInsets();
  
  // 1. Grab the global signal from your ScrollContext
  const isScrollingDown = useScrollSignal();
  
  // 2. Local shared value to drive the actual animation
  const barTranslateY = useSharedValue(0);

  const activeRoute = state.routes[state.index].name;
  const isCampus = activeRoute === 'Campus';

  // 3. THE REACTION: This force-links the global signal to this local bar
  useAnimatedReaction(
    () => isScrollingDown.value,
    (scrolling) => {
      // If we aren't on Campus, barTranslateY MUST be 0 (visible)
      if (!isCampus) {
        barTranslateY.value = 0;
        return;
      }
      // If we are on Campus, follow the scrolling signal
      barTranslateY.value = scrolling ? 130 : 0;
    },
    [isCampus] // Re-run this logic if the user switches tabs
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          translateY: withTiming(barTranslateY.value, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }) 
        }
      ],
      opacity: withTiming(barTranslateY.value > 0 ? 0 : 1, { duration: 250 }),
    };
  });

  return (
    <Animated.View style={[
      styles.container,
      {
        backgroundColor: T.bg, // Matches your app background
        borderTopColor:  T.borderSubtle,
        paddingBottom:   insets.bottom > 0 ? insets.bottom : 12,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 50 + (insets.bottom > 0 ? insets.bottom : 12),
        zIndex: 1000, 
        
        // Shadow to separate it from the feed content
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: scheme === 'dark' ? 0.3 : 0.05,
        shadowRadius: 10,
        elevation: 24,
      },
      animatedStyle 
    ]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const cfg = {
            Campus:    { label: 'Campus',    icon: 'grid-outline',       iconActive: 'grid'       },
            Academics: { label: 'Academics', icon: 'school-outline',     iconActive: 'school'     },
            Chats:     { label: 'Chats',     icon: 'chatbubble-outline', iconActive: 'chatbubble' },
            Market:    { label: 'Market',    icon: 'storefront-outline', iconActive: 'storefront' },
            Services:  { label: 'Services',  icon: 'briefcase-outline',  iconActive: 'briefcase'  },
        }[route.name] || { label: route.name, icon: 'square-outline', iconActive: 'square' };

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress', target: route.key, canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.tab}
          >
            {focused && (
              <View style={[styles.pill, { backgroundColor: T.accent }]} />
            )}
            <Ionicons
              name={focused ? cfg.iconActive : (cfg.icon as any)}
              size={22}
              color={focused ? T.accent : T.text3}
            />
            <Text style={[
              styles.label,
              {
                color:      focused ? T.accent : T.text3,
                fontFamily: focused ? fonts.bold : fonts.medium,
              },
            ]} numberOfLines={1}>
              {cfg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop:     8,
  },
  tab: {
    flex: 1,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             2,
  },
  pill: {
    position:     'absolute',
    top:          -8,
    width:        32,
    height:       3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  label: { 
    fontSize: 10,
    letterSpacing: -0.2,
    marginTop: 1,
  },
});