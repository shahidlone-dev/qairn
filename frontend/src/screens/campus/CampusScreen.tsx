// src/screens/campus/CampusScreen.tsx

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../theme/theme';
import { Avatar }            from '../../components/ui';
import { PostCard }          from '../../components/campus/PostCard';
import { CampusFAB }         from '../../components/campus/CampusFAB';
import { NavigationDrawer }  from '../../components/navigation/NavigationDrawer';
import { MOCK_POSTS, CURRENT_USER, Post } from '../../constants/mockFeed';
import { MainTabScreenProps } from '../../types/navigation';

type Props      = MainTabScreenProps<'Campus'>;
type FeedFilter = 'forYou' | 'myCircle';

export const CampusScreen: React.FC<Props> = ({ navigation }) => {
  const T      = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('forYou');
  const [dropOpen,   setDropOpen]   = useState(false);

  const fabCloseRef = useRef<(() => void) | null>(null);

  const posts: Post[] = feedFilter === 'myCircle'
    ? MOCK_POSTS.filter(p => p.inCircle)
    : MOCK_POSTS;

  // ── Close FAB on ANY scroll movement ───────────────────────────
  const handleScroll = useCallback(() => {
    fabCloseRef.current?.();
  }, []);

  // ── Empty state ────────────────────────────────────────────────────────────
  const Empty = () => (
    <View style={styles.empty}>
      <Ionicons name="people-outline" size={48} color={T.text3} />
      <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.lg, textAlign: 'center' }]}>
        Your circle is quiet
      </Text>
      <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.md, textAlign: 'center', lineHeight: 22 }]}>
        Add people to your circle to see their posts here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: T.border, backgroundColor: T.bg }]}>
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="menu" size={24} color={T.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.userPill}
          onPress={() => setDropOpen(p => !p)}
          activeOpacity={0.8}
        >
          <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
            @{CURRENT_USER.username}
          </Text>
          <Ionicons
            name={dropOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={T.text3}
            style={{ marginLeft: 3 }}
          />
        </TouchableOpacity>

<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
  <TouchableOpacity
    onPress={() => navigation.navigate('Search')}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Ionicons name="search-outline" size={22} color={T.text} />
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => navigation.navigate('Notifications')}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Ionicons name="notifications-outline" size={22} color={T.text} />
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => navigation.navigate('Profile', { userId: CURRENT_USER.id })}
  >
    <Avatar name={CURRENT_USER.name} uri={CURRENT_USER.avatar} size="sm" />
  </TouchableOpacity>
</View>
      </View>

      {/* ── Dropdown Modal ─────────────────────────────────────────────────── */}
      <Modal visible={dropOpen} transparent animationType="fade" onRequestClose={() => setDropOpen(false)}>
        <Pressable style={styles.dropScrim} onPress={() => setDropOpen(false)}>
          <View style={[styles.dropdown, { backgroundColor: T.bgCard, borderColor: T.border, top: insets.top + 55 }]}>
            {[
              { key: 'forYou',   label: 'For You'   },
              { key: 'myCircle', label: 'My Circle' },
            ].map((opt, i, arr) => {
              const active = feedFilter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.dropItem,
                    i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderSubtle },
                    active && { backgroundColor: T.accentMuted },
                  ]}
                  onPress={() => { setFeedFilter(opt.key as FeedFilter); setDropOpen(false); }}
                  activeOpacity={0.8}
                >
                  {active && (
                    <Ionicons name="checkmark" size={16} color={T.accent} style={{ marginRight: 8 }} />
                  )}
                  <Text style={[{
                    color:      active ? T.accent : T.text,
                    fontFamily: active ? fonts.semibold : fonts.medium,
                    fontSize:   fontSizes.md,
                    marginLeft: active ? 0 : 24 // Keep text aligned even if no checkmark
                  }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── Feed ──────────────────────────────────────────────────────────── */}
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
          />
        )}
        ListEmptyComponent={<Empty />}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 }} // FIX: Prevents FAB from blocking bottom post
      />

      {/* ── FAB ───────────────────────────────────────────────────────────── */}
      <CampusFAB
        bottomOffset={insets.bottom}
        onRegisterClose={(fn) => { fabCloseRef.current = fn; }}
      />

      {/* ── Navigation Drawer ─────────────────────────────────────────────── */}
      <NavigationDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={(screen) => {
          if (screen === 'Profile')       navigation.navigate('Profile', { userId: CURRENT_USER.id });
          if (screen === 'Notifications') navigation.navigate('Notifications');
          if (screen === 'Settings')      navigation.navigate('Settings');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  header:   {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex:            10, // Ensure header is above list content
  },
  userPill: { flexDirection: 'row', alignItems: 'center' },
  
  dropScrim: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.02)' 
  },
  dropdown: {
    position:      'absolute',
    alignSelf:     'center',
    width:         180,
    borderRadius:  radii.lg,
    borderWidth:   StyleSheet.hairlineWidth,
    overflow:      'hidden',
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius:  12,
    elevation:     8,
  },
  dropItem: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
  },
  
  empty: {
    alignItems:     'center',
    justifyContent: 'center',
    padding:        spacing.xxl,
    gap:            spacing.md,
    marginTop:      80,
  },
});