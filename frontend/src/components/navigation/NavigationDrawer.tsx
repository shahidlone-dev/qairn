// src/components/navigation/NavigationDrawer.tsx

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { Avatar, QaafPlusBadge } from '../ui';
import { CURRENT_USER } from '../../constants/mockFeed';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

type DrawerItem = {
  icon:   keyof typeof Ionicons.glyphMap;
  label:  string;
  color?: string;
  badge?: number;
};

interface Props {
  visible:     boolean;
  onClose:     () => void;
  onNavigate?: (screen: string) => void;
}

export const NavigationDrawer: React.FC<Props> = ({
  visible,
  onClose,
  onNavigate,
}) => {
  const T      = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();

  const slideX  = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideX, {
        toValue:         visible ? 0 : -DRAWER_WIDTH,
        useNativeDriver: true,
        damping:         24,
        stiffness:       240,
      }),
      Animated.timing(opacity, {
        toValue:  visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const mainItems: DrawerItem[] = [
    { icon: 'notifications-outline',  label: 'Notifications', badge: 3        },
    { icon: 'bookmark-outline',        label: 'Saved posts'                    },
    { icon: 'people-outline',          label: 'My Circle'                      },
    { icon: 'storefront-outline',      label: 'My Listings'                    },
    { icon: 'document-text-outline',   label: 'My Notes'                       },
    { icon: 'add-circle-outline',      label: 'Go Premium',   color: T.purple  },
  ];

  const bottomItems: DrawerItem[] = [
    { icon: 'settings-outline',      label: 'Settings' },
    { icon: 'help-circle-outline',   label: 'Help'     },
  ];

  const renderItem = (item: DrawerItem, index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.item, { borderBottomColor: T.borderSubtle }]}
      activeOpacity={0.7}
      onPress={() => { onClose(); onNavigate?.(item.label); }}
    >
      <View style={[
        styles.iconWrap,
        { backgroundColor: item.color ? item.color + '18' : T.bgInput },
      ]}>
        <Ionicons name={item.icon} size={20} color={item.color ?? T.text2} />
      </View>

      <Text style={[
        styles.itemLabel,
        { color: item.color ?? T.text, fontFamily: fonts.medium, fontSize: fontSizes.md },
      ]}>
        {item.label}
      </Text>

      {item.label === 'Go Premium' ? (
        <QaafPlusBadge size="xs" />
      ) : item.badge ? (
        <View style={[styles.badge, { backgroundColor: T.error }]}>
          <Text style={[styles.badgeText, { fontFamily: fonts.bold }]}>{item.badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={T.text3} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Scrim */}
      <Animated.View style={[styles.scrim, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width:            DRAWER_WIDTH,
            backgroundColor:  T.bg,
            borderRightColor: T.border,
            paddingTop:       insets.top + spacing.md,
            paddingBottom:    insets.bottom + spacing.md,
            transform:        [{ translateX: slideX }],
          },
        ]}
      >
        {/* Profile block */}
        <TouchableOpacity
          style={[styles.profileBlock, { borderBottomColor: T.border }]}
          activeOpacity={0.8}
          onPress={() => { onClose(); onNavigate?.('Profile'); }}
        >
          <Avatar name={CURRENT_USER.name} size="lg" showOnline />
          <View style={styles.profileText}>
            <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.lg }]}>
              {CURRENT_USER.name}
            </Text>
            <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, marginTop: 2 }]}>
              @{CURRENT_USER.username} · {CURRENT_USER.dept}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={T.text3} />
        </TouchableOpacity>

        {/* Stats */}
        <View style={[styles.statsRow, { borderBottomColor: T.border }]}>
          {[
            { num: '142', label: 'In Circle' },
            { num: '89',  label: 'Posts'     },
            { num: '14',  label: 'Listings'  },
          ].map((s, i, arr) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xl }]}>{s.num}</Text>
                <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>{s.label}</Text>
              </View>
              {i < arr.length - 1 && (
                <View style={[styles.statDivider, { backgroundColor: T.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Nav items */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            {mainItems.map(renderItem)}
          </View>
        </ScrollView>

        {/* Bottom items */}
        <View style={[styles.bottomSection, { borderTopColor: T.border }]}>
          {bottomItems.map(renderItem)}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  drawer: {
    position:         'absolute',
    left: 0, top: 0, bottom: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowColor:      '#000',
    shadowOffset:     { width: 4, height: 0 },
    shadowOpacity:    0.18,
    shadowRadius:     16,
    elevation:        20,
  },
  profileBlock: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom:     spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom:      spacing.xs,
  },
  profileText: { flex: 1 },
  statsRow: {
    flexDirection:     'row',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom:      spacing.xs,
  },
  statItem:    { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32 },
  section:     { paddingVertical: spacing.xs },
  item: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    gap:               spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width:          38,
    height:         38,
    borderRadius:   radii.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  itemLabel:     { flex: 1 },
  badge: {
    minWidth:          18,
    height:            18,
    borderRadius:      99,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 4,
  },
  badgeText:     { color: '#fff', fontSize: 10 },
  bottomSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.xs },
});