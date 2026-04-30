// src/components/navigation/CustomTabBar.tsx

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes } from '../../theme/theme';

type TabCfg = {
  label:      string;
  icon:       keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const TAB_CONFIG: Record<string, TabCfg> = {
  Campus:    { label: 'Campus',    icon: 'grid-outline',       iconActive: 'grid'       },
  Academics: { label: 'Academics', icon: 'school-outline',     iconActive: 'school'     },
  Chats:     { label: 'Chats',     icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  Market:    { label: 'Market',    icon: 'storefront-outline', iconActive: 'storefront' },
  Services:  { label: 'Services',  icon: 'briefcase-outline',  iconActive: 'briefcase'  },
};

const { width } = Dimensions.get('window');

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state, descriptors, navigation,
}) => {
  const T      = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: T.navBg,
        borderTopColor:  T.navBorder,
        paddingBottom:   insets.bottom > 0 ? insets.bottom : 10,
      },
    ]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const cfg     = TAB_CONFIG[route.name];

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
            style={[styles.tab, { width: width / state.routes.length }]}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
          >
            {focused && (
              <View style={[styles.pill, { backgroundColor: T.accentMuted }]} />
            )}
            <Ionicons
              name={focused ? cfg.iconActive : cfg.icon}
              size={22}
              color={focused ? T.accent : T.navInactive}
            />
            <Text style={[
              styles.label,
              {
                color:      focused ? T.accent : T.navInactive,
                fontFamily: focused ? fonts.semibold : fonts.regular,
                fontSize:   fontSizes.xxs,
              },
            ]} numberOfLines={1}>
              {cfg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop:     8,
  },
  tab: {
    alignItems:      'center',
    justifyContent:  'center',
    gap:             3,
    paddingVertical: 2,
    position:        'relative',
  },
  pill: {
    position:     'absolute',
    top:          -4,
    width:        36,
    height:       3,
    borderRadius: 99,
  },
  label: { letterSpacing: 0.1 },
});