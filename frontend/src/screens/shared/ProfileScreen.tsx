// src/screens/shared/ProfileScreen.tsx

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../theme/theme';
import { Avatar, QaafPlusBadge } from '../../components/ui';
import { CURRENT_USER, MOCK_POSTS } from '../../constants/mockFeed';
import { MOCK_LISTINGS } from '../../constants/mockMarket';
import { MOCK_TUTORS, MOCK_ASSIGNMENTS } from '../../constants/mockServices';
import { RootStackScreenProps } from '../../types/navigation';

type Props     = RootStackScreenProps<'Profile'>;
type TabKey    = 'posts' | 'market' | 'services';

const { width: SW } = Dimensions.get('window');
const POST_SIZE     = (SW - spacing.base * 2 - spacing.xs * 2) / 3;

// ─── Mock profile data ────────────────────────────────────────────────────────
type ProfileData = {
  userId:       string;
  username:     string;
  name:         string;
  bio:          string;
  dept:         string;
  year:         string;
  avatar?:      string;
  circleCount:  number;
  postCount:    number;
  rating:       number;
  premium:      boolean;
  isTutor:      boolean;
  isAssignment: boolean;
  inCircle:     boolean;  // is this user in my circle
};

const MOCK_PROFILES: Record<string, ProfileData> = {
  me: {
    userId: 'me', username: CURRENT_USER.username, name: CURRENT_USER.name,
    bio: 'CS final year · Building qaaf 🚀 · Open to tutoring Python & DSA',
    dept: 'CS', year: 'Final Year', avatar: undefined,
    circleCount: 142, postCount: 89, rating: 4.8,
    premium: false, isTutor: true, isAssignment: false, inCircle: false,
  },
  'u1': {
    userId: 'u1', username: 'zara.malik', name: 'Zara Malik',
    bio: 'CS student · Notes enthusiast · DSA nerd',
    dept: 'CS', year: '3rd Year', avatar: undefined,
    circleCount: 98, postCount: 34, rating: 4.5,
    premium: false, isTutor: false, isAssignment: false, inCircle: true,
  },
  'u2': {
    userId: 'u2', username: 'ahmed.k', name: 'Ahmed Khan',
    bio: 'EE student · Circuit Analysis tutor · Notes seller',
    dept: 'EE', year: '4th Year', avatar: undefined,
    circleCount: 211, postCount: 61, rating: 4.7,
    premium: true, isTutor: true, isAssignment: true, inCircle: false,
  },
};

function getProfile(userId: string): ProfileData {
  return MOCK_PROFILES[userId] ?? MOCK_PROFILES['u1'];
}

// ─── Stat item ────────────────────────────────────────────────────────────────
const StatItem: React.FC<{ label: string; value: string | number; T: ReturnType<typeof getTheme> }> = ({ label, value, T }) => (
  <View style={styles.statItem}>
    <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.xl }]}>{value}</Text>
    <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>{label}</Text>
  </View>
);

// ─── Service badge ────────────────────────────────────────────────────────────
const ServiceBadge: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bg: string }> = ({ icon, label, color, bg }) => (
  <View style={[styles.serviceBadge, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={12} color={color} />
    <Text style={[{ color, fontFamily: fonts.semibold, fontSize: fontSizes.xxs }]}>{label}</Text>
  </View>
);

// ─── Post grid item ───────────────────────────────────────────────────────────
const PostGridItem: React.FC<{ post: typeof MOCK_POSTS[0]; T: ReturnType<typeof getTheme> }> = ({ post, T }) => (
  <TouchableOpacity
    style={[styles.postGridItem, { backgroundColor: T.bgCard, borderColor: T.border }]}
    activeOpacity={0.85}
  >
    <Text style={[{ color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.xs, lineHeight: 16 }]} numberOfLines={4}>
      {post.content}
    </Text>
    <View style={styles.postGridMeta}>
      <Ionicons name="heart" size={11} color={T.like} />
      <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xxs }]}>{post.likes}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Market listing row ───────────────────────────────────────────────────────
const MarketRow: React.FC<{ listing: typeof MOCK_LISTINGS[0]; T: ReturnType<typeof getTheme> }> = ({ listing, T }) => {
  const isNote = listing.type === 'note';
  return (
    <TouchableOpacity style={[styles.marketRow, { borderBottomColor: T.borderSubtle }]} activeOpacity={0.8}>
      <View style={[styles.marketIcon, { backgroundColor: isNote ? T.goldMuted : T.accentMuted }]}>
        <Ionicons name={isNote ? 'document-text' : 'cube'} size={20} color={isNote ? T.gold : T.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]} numberOfLines={1}>
          {listing.title}
        </Text>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginTop: 2 }]}>
          {listing.dept} · {isNote ? `${(listing as any).pages} pages` : (listing as any).condition}
        </Text>
      </View>
      <Text style={[{ color: T.accent, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
        Rs {listing.price.toLocaleString()}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Service card (compact) ───────────────────────────────────────────────────
const ServiceRow: React.FC<{
  type:   'tutor' | 'assignment';
  data:   typeof MOCK_TUTORS[0] | typeof MOCK_ASSIGNMENTS[0];
  T:      ReturnType<typeof getTheme>;
}> = ({ type, data, T }) => {
  const isTutor = type === 'tutor';
  const tutor   = data as typeof MOCK_TUTORS[0];
  const assign  = data as typeof MOCK_ASSIGNMENTS[0];

  return (
    <View style={[styles.serviceRow, { backgroundColor: T.bgCard, borderColor: T.border }]}>
      <View style={[styles.serviceIcon, { backgroundColor: isTutor ? T.accentMuted : T.tealMuted }]}>
        <Ionicons name={isTutor ? 'school' : 'create'} size={20} color={isTutor ? T.accent : T.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>
          {isTutor ? 'Tutor' : 'Assignment Helper'}
        </Text>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginTop: 2 }]}>
          {data.subjects.join(' · ')}
        </Text>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>
          ⭐ {data.rating} · {isTutor ? `${tutor.sessions} sessions` : `${assign.done} done`}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[{ color: isTutor ? T.accent : T.teal, fontFamily: fonts.bold, fontSize: fontSizes.md }]}>
          Rs {isTutor ? tutor.rate : assign.pricePerPage}
        </Text>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xxs }]}>
          {isTutor ? 'per hour' : 'per page'}
        </Text>
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export const ProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const T      = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();

  const userId  = route.params.userId;
  const isOwn   = userId === CURRENT_USER.id || userId === 'me';
  const profile = getProfile(isOwn ? 'me' : userId);

  const [activeTab,  setActiveTab]  = useState<TabKey>('posts');
  const [inCircle,   setInCircle]   = useState(profile.inCircle);

  // Get this user's content
  const userPosts    = MOCK_POSTS.filter(p => p.user.username === profile.username);
  const userListings = MOCK_LISTINGS.filter(l => l.seller === profile.username);
  const userTutor    = MOCK_TUTORS.find(t => t.username === profile.username);
  const userAssign   = MOCK_ASSIGNMENTS.find(a => a.username === profile.username);

  const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'posts',    label: 'Posts',    icon: 'grid-outline'           },
    { key: 'market',   label: 'Market',   icon: 'storefront-outline'     },
    { key: 'services', label: 'Services', icon: 'briefcase-outline'      },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>

      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <View style={[styles.headerBar, { borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.lg }]}>
          {profile.username}
        </Text>
        {isOwn ? (
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-vertical" size={20} color={T.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="share-outline" size={20} color={T.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>

        {/* ── Profile header ──────────────────────────────────────────────── */}
        <View style={[styles.profileHeader, { borderBottomColor: T.border }]}>

          {/* Avatar + stats row */}
          <View style={styles.avatarStatsRow}>
            <Avatar size="xl" name={profile.username} uri={profile.avatar} />
            <View style={styles.statsRow}>
              <StatItem label="Posts"   value={profile.postCount}   T={T} />
              <View style={[styles.statDivider, { backgroundColor: T.border }]} />
              <StatItem label="Circle"  value={profile.circleCount} T={T} />
              <View style={[styles.statDivider, { backgroundColor: T.border }]} />
              <StatItem label="Rating"  value={`⭐ ${profile.rating}`} T={T} />
            </View>
          </View>

          {/* Name + badges */}
          <View style={styles.nameRow}>
            <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.lg }]}>
              {profile.name}
            </Text>
            {profile.premium && <QaafPlusBadge size="sm" style={{ marginLeft: spacing.sm }} />}
          </View>

          {/* Service badges */}
          {(profile.isTutor || profile.isAssignment) && (
            <View style={styles.badgeRow}>
              {profile.isTutor && (
                <ServiceBadge icon="school" label="Tutor" color={T.accent} bg={T.accentMuted} />
              )}
              {profile.isAssignment && (
                <ServiceBadge icon="create" label="Assignment Helper" color={T.teal} bg={T.tealMuted} />
              )}
            </View>
          )}

          {/* Dept + year */}
          <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm }]}>
            {profile.dept} · {profile.year}
          </Text>

          {/* Bio */}
          {profile.bio && (
            <Text style={[{ color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.sm, lineHeight: 20, marginTop: spacing.xs }]}>
              {profile.bio}
            </Text>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            {isOwn ? (
              <>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: T.bgCard, borderColor: T.border, flex: 1 }]} activeOpacity={0.8}>
                  <Ionicons name="create-outline" size={16} color={T.text} />
                  <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: T.bgCard, borderColor: T.border, flex: 1 }]} activeOpacity={0.8}>
                  <Ionicons name="settings-outline" size={16} color={T.text} />
                  <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>Settings</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Add / Remove circle */}
                <TouchableOpacity
                  style={[styles.actionBtn, {
                    backgroundColor: inCircle ? T.bgCard : T.accent,
                    borderColor:     inCircle ? T.border : T.accent,
                    flex: 1,
                  }]}
                  onPress={() => setInCircle(p => !p)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={inCircle ? 'person-remove-outline' : 'person-add-outline'}
                    size={16}
                    color={inCircle ? T.text : '#fff'}
                  />
                  <Text style={[{ color: inCircle ? T.text : '#fff', fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>
                    {inCircle ? 'In Circle' : 'Add to Circle'}
                  </Text>
                </TouchableOpacity>

                {/* Message */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: T.bgCard, borderColor: T.border, flex: 1 }]}
                  onPress={() => navigation.navigate('ChatRoom', { chatId: profile.userId, name: profile.username })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={T.text} />
                  <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>Message</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* ── Content tabs ──────────────────────────────────────────────────── */}
        <View style={[styles.tabRow, { borderBottomColor: T.border }]}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && { borderBottomColor: T.accent, borderBottomWidth: 2.5 }]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={tab.icon} size={18} color={active ? T.accent : T.text3} />
                <Text style={[{
                  color:      active ? T.accent : T.text3,
                  fontFamily: active ? fonts.semibold : fonts.regular,
                  fontSize:   fontSizes.xs,
                }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Posts tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'posts' && (
          <View style={styles.postsGrid}>
            {userPosts.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="grid-outline" size={36} color={T.text3} />
                <Text style={[{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.sm, marginTop: spacing.sm, textAlign: 'center' }]}>
                  No posts yet
                </Text>
              </View>
            ) : (
              userPosts.map(post => <PostGridItem key={post.id} post={post} T={T} />)
            )}
          </View>
        )}

        {/* ── Market tab ────────────────────────────────────────────────────── */}
        {activeTab === 'market' && (
          <View>
            {userListings.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="storefront-outline" size={36} color={T.text3} />
                <Text style={[{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.sm, marginTop: spacing.sm, textAlign: 'center' }]}>
                  No listings yet
                </Text>
              </View>
            ) : (
              userListings.map(l => <MarketRow key={l.id} listing={l} T={T} />)
            )}
          </View>
        )}

        {/* ── Services tab ──────────────────────────────────────────────────── */}
        {activeTab === 'services' && (
          <View style={[styles.servicesTab, { paddingHorizontal: spacing.base }]}>
            {!userTutor && !userAssign ? (
              <View style={styles.emptyTab}>
                <Ionicons name="briefcase-outline" size={36} color={T.text3} />
                <Text style={[{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.sm, marginTop: spacing.sm, textAlign: 'center' }]}>
                  No services offered
                </Text>
              </View>
            ) : (
              <>
                {userTutor && <ServiceRow type="tutor" data={userTutor} T={T} />}
                {userAssign && <ServiceRow type="assignment" data={userAssign} T={T} />}
              </>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Header bar
  headerBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Profile header
  profileHeader: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.lg,
    gap:               spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarStatsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.lg,
    marginBottom:  spacing.sm,
  },
  statsRow: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent:'space-around',
  },
  statItem: { alignItems: 'center', gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32 },

  // Name + badges
  nameRow:   { flexDirection: 'row', alignItems: 'center' },
  badgeRow:  { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  serviceBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: spacing.sm,
    paddingVertical:   3,
    borderRadius:      radii.pill,
  },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius:   radii.lg,
    borderWidth:    StyleSheet.hairlineWidth,
  },

  // Tabs
  tabRow: {
    flexDirection:     'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.xs,
    paddingVertical: spacing.md,
  },

  // Posts grid
  postsGrid: {
    flexDirection:     'row',
    flexWrap:          'wrap',
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.md,
    gap:               spacing.xs,
  },
  postGridItem: {
    width:        POST_SIZE,
    height:       POST_SIZE,
    borderRadius: radii.md,
    borderWidth:  StyleSheet.hairlineWidth,
    padding:      spacing.sm,
    overflow:     'hidden',
    justifyContent: 'space-between',
  },
  postGridMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  // Market
  marketRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    gap:               spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  marketIcon: {
    width:          42,
    height:         42,
    borderRadius:   radii.md,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Services
  servicesTab: { paddingTop: spacing.md, gap: spacing.md },
  serviceRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
    padding:       spacing.base,
    borderRadius:  radii.xl,
    borderWidth:   StyleSheet.hairlineWidth,
  },
  serviceIcon: {
    width:          46,
    height:         46,
    borderRadius:   radii.md,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Empty
  emptyTab: {
    alignItems:        'center',
    paddingTop:        60,
    paddingHorizontal: spacing.xxl,
  },
});