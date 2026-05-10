// src/screens/shared/ProfileScreen.tsx

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions,
  Share, Modal, Pressable, ScrollView, Platform,
  StatusBar, Alert, Image as RNImage, LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';

import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { Avatar, QaafPlusBadge } from '../../components/ui';
import { PostCard } from '../../components/campus/PostCard';
import { GlobalMediaViewer, GlobalMediaData } from '../../components/campus/GlobalMediaViewer';
import { VideoPlaybackContext } from '../../context/VideoPlaybackContext';

import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { usePostStore } from '../../store/usePostStore';
import {
  useStoryStore,
  selectShowStoryRing,
  selectShouldOpenStory,
} from '../../store/useStoryStore';
import UsersApi from '../../api/users.api';
import { RootStackScreenProps } from '../../types/navigation';
import type { Post as ApiPost } from '../../types/api.types';

type Props = RootStackScreenProps<'Profile'>;
const { width: SW } = Dimensions.get('window');

// --- Mock Suggestions (Keep as is) ---
const MOCK_SUGGESTIONS = [
  { id: 's1', username: 'zara.malik', bio: 'CS final year. Love DSA.', avatar_url: undefined },
  { id: 's2', username: 'ahmed.k', bio: 'EE student, circuit nerd.', avatar_url: undefined },
  { id: 's3', username: 'sara.ch', bio: 'BBA · Marketing enthusiast.', avatar_url: undefined },
];

type MediaState = {
  visible: boolean;
  data: GlobalMediaData[];
  initialIndex: number;
};

export const ProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const T = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();
  const { user: me, setUser } = useAuth();

  const userId = route.params?.userId;
  const isOwn = !userId || userId === me?.id;
  const username = isOwn ? (me?.username ?? '') : (route.params?.username ?? '');

  const {
    user,
    posts,
    isLoading,
    error,
    following,
    followLoading,
    toggleFollow,
  } = useProfile(username);

  const [suggOpen, setSuggOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  // ── Profile content tabs ─────────────────────────────────────────────────
  // The screen splits the user's posts into three identity surfaces. Each
  // surface gets its own atmosphere (calm / spacious / dark) and its own
  // card rhythm so the profile reads like an identity platform rather than
  // an Instagram clone.
  type TabKey = 'thoughts' | 'photos' | 'videos';
  const [activeTab, setActiveTab] = useState<TabKey>('thoughts');

  // Tab pill measurement: we capture the width of the tab strip on layout
  // and use it to position the animated indicator. Storing one number is
  // enough since the three tabs are evenly distributed (each = stripWidth/3).
  const [tabStripWidth, setTabStripWidth] = useState(0);
  const onTabStripLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== tabStripWidth) setTabStripWidth(w);
  }, [tabStripWidth]);

  const indicatorOffset = useSharedValue(0);
  // Note: `indicatorStyle` is defined further down in this component, AFTER
  // `visibleTabs` is computed, so it can read the current segment count
  // when tabs get auto-hidden (e.g. user has no videos → 2-tab layout).

  // Tap-to-tab. We move the animated pill via a shared value (no re-render
  // pressure on the JS thread for the slide), and only flip activeTab when
  // the user actually picks the tab.
  const switchTab = useCallback((next: TabKey, idx: number) => {
    Haptics.selectionAsync().catch(() => {});
    indicatorOffset.value = idx;
    setActiveTab(next);
  }, [indicatorOffset]);

  const [mediaState, setMediaState] = useState<MediaState>({
    visible: false, data: [], initialIndex: 0,
  });

  // ── Avatar / story interaction state ─────────────────────────────────────
  // The avatar surface is a multi-purpose tap target on this screen:
  //   - tap with story            → open the story viewer
  //   - tap with no story (self)  → open the StoryGallery upload flow
  //   - hold (self)               → WhatsApp-style preview modal with action
  //                                  rows for Add another story / Change or
  //                                  Add profile / View story.
  // The state here just tracks the modal + the in-flight upload spinner.
  const [previewOpen,     setPreviewOpen]     = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Whether THIS profile's user has any active story we know about. We feed
  // it into both the avatar ring and the long-press modal's "View story" row.
  const targetUserId = isOwn ? (me?.id ?? '') : (userId ?? '');
  const showStoryRing  = useStoryStore(selectShowStoryRing(targetUserId));
  const shouldOpenStory = useStoryStore(selectShouldOpenStory(targetUserId));
  const refreshStoryFeed = useStoryStore(s => s.refreshFeed);

  // Avatar shown in the header. For SELF we prefer the auth user's avatar
  // because that's the source of truth post-upload; setUser() updates it
  // synchronously while useProfile() may keep a stale snapshot until refresh.
  // For OTHER users we just use whatever the profile fetch returned.
  const avatarUri: string | null | undefined =
    isOwn ? me?.avatar_url : user?.avatar_url;

  // ── Media Viewer Logic ───────────────────────────────────────────────────
  // Videos open the in-place reels modal; images push the dedicated
  // PostImageViewer screen (Instagram-detail layout).
  const handleOpenMedia = useCallback((tappedId: string) => {
    const state = usePostStore.getState();
    const tappedPost = state.postsById[tappedId];
    if (!tappedPost?.media_url || !tappedPost.media_type) return;

    if (tappedPost.media_type === 'image') {
      navigation.navigate('PostImageViewer', { postId: tappedId });
      return;
    }

    const videoPosts = posts.items.filter(p => p.media_type === 'video' && !!p.media_url);
    const startIndex = videoPosts.findIndex(p => p.id === tappedId);
    setMediaState({
      visible: true,
      initialIndex: Math.max(0, startIndex),
      data: videoPosts.map(p => ({ uri: p.media_url!, postId: p.id })),
    });
  }, [posts.items, navigation]);

  // ── Playback Context ─────────────────────────────────────────────────────
  const playbackCtx = useMemo(() => ({
    activePostId: mediaState.visible ? null : activePostId,
    nextPostId: null,
    isMuted,
    setMuted: (m: boolean) => setIsMuted(m),
  }), [activePostId, isMuted, mediaState.visible]);

  // ── Per-tab content filters ──────────────────────────────────────────────
  // Single source of truth: the profile's loaded posts. We split them by
  // payload shape so each tab can choose its own card layout without sharing
  // a mixed list.
  const thoughtsPosts = useMemo(
    () => posts.items.filter(p => !p.media_url),
    [posts.items],
  );
  const photoPosts = useMemo(
    () => posts.items.filter(p => p.media_type === 'image' && !!p.media_url),
    [posts.items],
  );
  const videoPosts = useMemo(
    () => posts.items.filter(p => p.media_type === 'video' && !!p.media_url),
    [posts.items],
  );

  // Auto-hide empty tabs. If everything is empty we still show all three so
  // the user has somewhere to land — collapsing the bar in that case would
  // make the profile feel broken.
  const visibleTabs: { key: TabKey; label: string; index: number }[] = useMemo(() => {
    const all = [
      { key: 'thoughts' as const, label: 'Thoughts', count: thoughtsPosts.length },
      { key: 'photos'   as const, label: 'Photos',   count: photoPosts.length    },
      { key: 'videos'   as const, label: 'Videos',   count: videoPosts.length    },
    ];
    const nonEmpty = all.filter(t => t.count > 0);
    const list = nonEmpty.length > 0 ? nonEmpty : all;
    return list.map((t, i) => ({ key: t.key, label: t.label, index: i }));
  }, [thoughtsPosts.length, photoPosts.length, videoPosts.length]);

  // If the active tab disappears (e.g. last photo was deleted), fall back to
  // the first available tab. This effect is cheap — it only fires when the
  // visibility set actually changes.
  useEffect(() => {
    if (!visibleTabs.find(t => t.key === activeTab)) {
      const next = visibleTabs[0];
      if (next) {
        indicatorOffset.value = 0;
        setActiveTab(next.key);
      }
    }
  }, [visibleTabs, activeTab, indicatorOffset]);

  // Animated indicator pill style. Defined here so it can close over the
  // current `visibleTabs.length` — when tabs get auto-hidden the indicator
  // scales to fit the remaining segments correctly.
  const segmentCount = Math.max(1, visibleTabs.length);
  const indicatorStyle = useAnimatedStyle(() => {
    const segment = tabStripWidth / segmentCount;
    return {
      width:    segment,
      transform: [{
        translateX: withSpring(indicatorOffset.value * segment, {
          damping:   18,
          stiffness: 220,
          mass:      0.6,
        }),
      }],
    };
  });

  // Active tab's posts (the data source for the FlatList below).
  const tabPosts = useMemo(() => {
    if (activeTab === 'thoughts') return thoughtsPosts;
    if (activeTab === 'photos')   return photoPosts;
    return videoPosts;
  }, [activeTab, thoughtsPosts, photoPosts, videoPosts]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out @${user?.username} on qaaf!\nqaaf://profile/${user?.username}`,
        title: `@${user?.username} on qaaf`,
      });
    } catch {}
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActivePostId(viewableItems[0].item.id);
    }
  }).current;

  // ── Avatar / story dispatchers ────────────────────────────────────────────
  //
  // IMPORTANT: every hook below MUST run on every render — they cannot live
  // after the early `if (isLoading && !user) return ...` guards. Doing so
  // changes the hook count between renders (loading frame vs. ready frame)
  // and trips React's "Rendered more hooks than during the previous render"
  // rule. Keep all hooks above the guards; do the guards last.
  //
  // The single-tap behaviour is intentionally SYMMETRIC with the rest of the
  // app: anywhere a user's avatar shows a story ring, tapping it opens the
  // viewer. The novelty here is that, on SELF and when no story exists, the
  // tap still leads somewhere useful — straight into the upload flow — so the
  // avatar doubles as the "Add story" affordance on the user's own profile.
  const openStoryViewer = useCallback(() => {
    if (!targetUserId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('StoryViewer', { userId: targetUserId });
  }, [navigation, targetUserId]);

  const openStoryGallery = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('StoryGallery');
  }, [navigation]);

  const handleAvatarPress = useCallback(() => {
    if (uploadingAvatar) return;

    if (isOwn) {
      // Self: story-or-upload. We use selectShowStoryRing (which returns true
      // for self if any active story exists, regardless of viewed-state) so a
      // single tap always lets you re-watch your own story.
      if (showStoryRing) openStoryViewer();
      else               openStoryGallery();
    } else {
      // Other users: only open the viewer if there's actually something to
      // view. With no story, a tap on someone else's avatar should just sit
      // there — we don't show their full-screen photo because that flow is
      // owner-only.
      if (shouldOpenStory) openStoryViewer();
    }
  }, [uploadingAvatar, isOwn, showStoryRing, shouldOpenStory, openStoryViewer, openStoryGallery]);

  const handleAvatarLongPress = useCallback(() => {
    // The WhatsApp-style preview is a self-only feature — opening it on
    // another user's avatar would tease edit options that wouldn't work.
    if (!isOwn || uploadingAvatar) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPreviewOpen(true);
  }, [isOwn, uploadingAvatar]);

  // ── Profile-photo picker ──────────────────────────────────────────────────
  // Mirrors the EditProfileScreen pipeline so there's exactly one path that
  // talks to the upload endpoint: UsersApi.uploadAndSetAvatar.
  const guessMime = (uri: string) => {
    const u = uri.toLowerCase();
    if (u.endsWith('.png'))  return 'image/png';
    if (u.endsWith('.webp')) return 'image/webp';
    if (u.endsWith('.gif'))  return 'image/gif';
    return 'image/jpeg';
  };

  const persistAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      const refreshed = await UsersApi.uploadAndSetAvatar(uri, guessMime(uri));
      setUser?.(refreshed);
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message ?? 'Could not upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'We need camera access to take a profile photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes:    ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect:        [1, 1],
      quality:       0.85,
      cameraType:    ImagePicker.CameraType.front,
    });
    if (!result.canceled && result.assets?.[0]) persistAvatar(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'We need photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:    ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect:        [1, 1],
      quality:       0.85,
    });
    if (!result.canceled && result.assets?.[0]) persistAvatar(result.assets[0].uri);
  };

  // Called from the preview modal's "Change profile" / "Add profile" row.
  // We close the preview first so the Alert isn't fighting the modal for focus.
  const handleChangeAvatar = () => {
    setPreviewOpen(false);
    // Tiny defer so the Modal close animation can start before the Alert.
    setTimeout(() => {
      Alert.alert(
        avatarUri ? 'Change profile photo' : 'Add profile photo',
        undefined,
        [
          { text: 'Take Picture',         onPress: pickFromCamera },
          { text: 'Choose from Library',  onPress: pickFromLibrary },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }, 220);
  };

  // ── Refresh story feed when the screen mounts ─────────────────────────────
  // Without this, a brand-new story posted by the user wouldn't light up the
  // avatar ring until they navigated back to Campus and triggered a refresh
  // there. Cheap call (deduped inside the store).
  useEffect(() => {
    refreshStoryFeed().catch(() => {});
  }, [refreshStoryFeed]);

  // ── Per-tab atmosphere ────────────────────────────────────────────────────
  // The body background shifts subtly per tab so each surface has its own
  // mood:
  //   - Thoughts : default page bg (calm, journal-like).
  //   - Photos   : default page bg with extra padding (spacious gallery).
  //   - Videos   : near-black backdrop (cinematic, lets bright video frames
  //                pop against the dark surround).
  // The header itself always sits on T.bg — only the scroll body shifts.
  const tabBodyBg = activeTab === 'videos' ? '#0A0A0A' : T.bg;

  // ── Per-tab card renderer ─────────────────────────────────────────────────
  // Thoughts and Videos share PostCard (variant='profile'). Photos collapse
  // to a single asymmetric memory tile — interactions live in the
  // full-screen PostImageViewer which the tile opens on tap.
  //
  // Defined here (above the early-return guards) so the hook count is stable
  // across the loading frame and the ready frame.
  const renderTabItem = useCallback(
    ({ item, index }: { item: ApiPost; index: number }) => {
      if (activeTab === 'photos') {
        return (
          <PhotoMemoryCard
            post={item}
            index={index}
            onOpen={() => handleOpenMedia(item.id)}
            T={T}
          />
        );
      }
      // Thoughts + Videos use the same cinematic profile card. The dark
      // backdrop on Videos is applied at the FlatList level (tabBodyBg).
      return (
        <PostCard
          postId={item.id}
          onOpenMedia={() => handleOpenMedia(item.id)}
          variant="profile"
        />
      );
    },
    [activeTab, handleOpenMedia, T],
  );

  // ── Early-return guards (kept LAST so all hooks run unconditionally) ─────
  if (isLoading && !user) return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      <View style={styles.center}><ActivityIndicator size="large" color={T.accent} /></View>
    </SafeAreaView>
  );

  if (!user) return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={T.text} />
      </TouchableOpacity>
      <View style={styles.center}>
        <Ionicons name="person-outline" size={48} color={T.text3} />
        <Text style={[{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.md, marginTop: spacing.md }]}>
          {error ?? 'User not found'}
        </Text>
      </View>
    </SafeAreaView>
  );

  const Header = () => (
    <View style={{ backgroundColor: T.bg }}>
      <View style={[styles.topBar, { borderBottomColor: T.border }]}>
  <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
    <Ionicons name="arrow-back" size={22} color={T.text} />
  </TouchableOpacity>
  
  <Text style={[styles.topBarTitle, { color: T.text }]}>@{user.username}</Text>
  
  {/* UPDATE THIS BUTTON */}
  <TouchableOpacity 
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    onPress={() => navigation.navigate('ProfileOptions')}
  >
    <Ionicons name="ellipsis-vertical" size={20} color={T.text} />
  </TouchableOpacity>
</View>

      <View style={styles.avatarRow}>
        {/* Avatar surface: tap = story (or upload, for self), long-press = preview.
            We wrap with TouchableOpacity but keep the existing ring styling
            from the Avatar component itself (showStory prop). The badge is a
            small "+" / "▶" hint that flips based on state — story available
            shows the play arrow, no story shows the plus. Hidden entirely on
            other users' profiles since long-press is a self-only feature. */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleAvatarPress}
          onLongPress={handleAvatarLongPress}
          delayLongPress={280}
          style={styles.avatarHitArea}
        >
          <Avatar
            size="xl"
            uri={avatarUri ?? undefined}
            name={user.username}
            showStory={showStoryRing}
          />

          {isOwn && (
            <View
              style={[
                styles.avatarBadge,
                { backgroundColor: T.accent, borderColor: T.bg },
              ]}
              pointerEvents="none"
            >
              <Ionicons
                name={showStoryRing ? 'play' : 'add'}
                size={14}
                color="#fff"
              />
            </View>
          )}

          {uploadingAvatar && (
            <View style={styles.avatarLoadingOverlay} pointerEvents="none">
              <ActivityIndicator color="#fff" size="small" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <StatBox value={user.post_count ?? 0} label="Posts" T={T} />
          <StatBox value={user.circle_count ?? 0} label="Circle" T={T} />
        </View>
      </View>

      <View style={styles.infoArea}>
        <View style={styles.nameRow}>
          <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>
            {user.full_name || user.username}
          </Text>
          {user.is_verified && <Ionicons name="checkmark-circle" size={16} color={T.blue} style={{ marginLeft: 4 }} />}
          {user.is_premium && <QaafPlusBadge size="xs" style={{ marginLeft: 6 }} />}
        </View>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, marginTop: 2 }]}>
          {[user.dept, user.year ? `Year ${user.year}` : null].filter(Boolean).join(' · ')}
        </Text>
        {user.bio && (
          <Text style={[{ color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.sm, lineHeight: 20, marginTop: 6 }]}>
            {user.bio}
          </Text>
        )}
      </View>

      <View style={styles.actionRow}>
        {isOwn ? (
          <>
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: T.border, flex: 1 }]} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={[{ color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.sm }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { borderColor: T.border }]} onPress={() => setSuggOpen(true)}>
              <Ionicons name="person-add-outline" size={18} color={T.text} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: following ? T.bgInput : T.accent, flex: 1, borderWidth: following ? 1 : 0, borderColor: T.border }]}
              onPress={toggleFollow}
              disabled={followLoading}
            >
              <Text style={[{ color: following ? T.text : '#fff', fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: T.border }]} onPress={() => navigation.navigate('ChatRoom', { chatId: user.id, name: user.username })}>
              <Ionicons name="chatbubble-outline" size={15} color={T.text} />
              <Text style={[{ color: T.text, fontFamily: fonts.medium, fontSize: fontSizes.sm }]}>Message</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Content tabs: Thoughts | Photos | Videos ─────────────────────
          Floating pill, animated indicator, soft shadow. The indicator is
          a Reanimated pill that springs between segments — no segmented
          control, no hard tabs. Empty tabs are pruned at the data layer
          (visibleTabs above) so the bar shrinks to whatever the user
          actually has, but never vanishes entirely. */}
      <View style={styles.tabsOuter}>
        <View
          style={[styles.tabsPill, { backgroundColor: T.bgInput, borderColor: T.borderSubtle }]}
          onLayout={onTabStripLayout}
        >
          {/* Animated active-segment indicator */}
          {visibleTabs.length > 0 && tabStripWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.tabsIndicator,
                { backgroundColor: T.bg, shadowColor: T.text },
                indicatorStyle,
              ]}
            />
          )}

          {visibleTabs.map(t => {
            const active = t.key === activeTab;
            return (
              <TouchableOpacity
                key={t.key}
                style={styles.tabsItem}
                onPress={() => switchTab(t.key, t.index)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.tabsLabel,
                    {
                      color:      active ? T.text : T.text3,
                      fontFamily: active ? fonts.bold : fonts.medium,
                    },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  return (
    <VideoPlaybackContext.Provider value={playbackCtx}>
      <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
        <FlatList
          // FlatList key forces a fresh list when switching tabs so the
          // viewport scrolls back to the top of each tab's content. Without
          // this, jumping from a long Photos list to a short Thoughts list
          // would leave the user staring at empty space below the last post.
          key={activeTab}
          data={tabPosts}
          keyExtractor={item => item.id}
          ListHeaderComponent={<Header />}
          renderItem={renderTabItem}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          refreshControl={
            <RefreshControl refreshing={posts.isRefreshing} onRefresh={posts.refresh} tintColor={T.accent} />
          }
          onEndReached={() => posts.hasMore && posts.loadMore()}
          onEndReachedThreshold={0.5}
          style={{ backgroundColor: tabBodyBg }}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
            backgroundColor: tabBodyBg,
          }}
          ListEmptyComponent={
            !posts.isLoading ? (
              <View style={styles.emptyPosts}>
                <Ionicons
                  name={
                    activeTab === 'photos' ? 'images-outline' :
                    activeTab === 'videos' ? 'videocam-outline' :
                    'create-outline'
                  }
                  size={44}
                  color={activeTab === 'videos' ? '#777' : T.text3}
                />
                <Text style={{
                  color: activeTab === 'videos' ? '#bbb' : T.text3,
                  fontFamily: fonts.medium,
                  fontSize: fontSizes.md,
                  marginTop: spacing.md,
                }}>
                  {activeTab === 'photos'   ? 'No photos yet' :
                   activeTab === 'videos'   ? 'No videos yet' :
                   'No thoughts shared yet'}
                </Text>
              </View>
            ) : null
          }
        />

        <GlobalMediaViewer
          visible={mediaState.visible}
          data={mediaState.data}
          initialIndex={mediaState.initialIndex}
          onClose={() => setMediaState(p => ({ ...p, visible: false }))}
        />

        {/* ── Avatar long-press preview (WhatsApp-style) ───────────────────
            Layout:
              - Top strip: username + close button.
              - Centered: large circular avatar (or initial placeholder).
              - Bottom: action rows — Add another story, Change/Add profile,
                View story (only when there's something to view).
            Tap anywhere on the dim backdrop to dismiss. The rendered modal
            is gated on `isOwn` because the preview is a self-only feature
            (other people's avatars don't get edit options). */}
        <Modal
          visible={previewOpen && isOwn}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setPreviewOpen(false)}
        >
          <StatusBar hidden />
          <View style={styles.previewRoot}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setPreviewOpen(false)}
            />

            {/* Header strip */}
            <View
              style={[
                styles.previewHeader,
                { paddingTop: insets.top + spacing.sm },
              ]}
            >
              <Text style={styles.previewName} numberOfLines={1}>
                {user.username}
              </Text>
              <TouchableOpacity
                onPress={() => setPreviewOpen(false)}
                hitSlop={12}
              >
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Centered circular avatar */}
            <View style={styles.previewCenter}>
              {avatarUri ? (
                <RNImage
                  source={{ uri: avatarUri }}
                  style={styles.previewAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.previewAvatar,
                    styles.previewAvatarPlaceholder,
                    { backgroundColor: T.bgInput },
                  ]}
                >
                  <Text style={[styles.previewInitial, { color: T.text2 }]}>
                    {(user.username[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}

              {uploadingAvatar && (
                <View style={[styles.previewAvatar, styles.previewLoading]}>
                  <ActivityIndicator color="#fff" size="large" />
                </View>
              )}
            </View>

            {/* Action rows */}
            <View
              style={[
                styles.previewActions,
                { paddingBottom: insets.bottom + spacing.lg },
              ]}
            >
              <TouchableOpacity
                style={styles.previewRow}
                onPress={() => {
                  setPreviewOpen(false);
                  openStoryGallery();
                }}
              >
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
                <Text style={styles.previewRowText}>
                  {showStoryRing ? 'Add another story' : 'Add story'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.previewRow}
                onPress={handleChangeAvatar}
              >
                <Ionicons name="camera-outline" size={22} color="#fff" />
                <Text style={styles.previewRowText}>
                  {avatarUri ? 'Change profile' : 'Add profile'}
                </Text>
              </TouchableOpacity>

              {showStoryRing && (
                <TouchableOpacity
                  style={styles.previewRow}
                  onPress={() => {
                    setPreviewOpen(false);
                    openStoryViewer();
                  }}
                >
                  <Ionicons name="eye-outline" size={22} color="#fff" />
                  <Text style={styles.previewRowText}>View story</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </VideoPlaybackContext.Provider>
  );
};

const StatBox: React.FC<{ value: number; label: string; T: any }> = ({ value, label, T }) => (
  <View style={styles.statBox}>
    <Text style={[{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.lg }]}>
      {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
    </Text>
    <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>{label}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// PhotoMemoryCard
//
// Floating memory tile used by the Photos tab. Each card occupies the full
// inset width and renders at the photo's TRUE aspect ratio so the user sees
// every image the way it was framed — no cropping into a square grid, no
// forced cycle of artificial aspects.
//
// If `media_width / media_height` are missing (older posts), we fall back
// to a calm 4:5 portrait so the card still has a reasonable height.
//
// Tap → opens the existing PostImageViewer (preserving the heart-burst
// engine, action row, save sheet, etc.).
// ─────────────────────────────────────────────────────────────────────────────

const PHOTO_GAP            = spacing.md;
const PHOTO_FALLBACK_RATIO = 4 / 5;
// Don't let an extreme aspect produce an absurdly tall or short card. These
// caps protect against bad metadata while still preserving the user's frame
// for the overwhelming majority of photos that fall inside the band.
const PHOTO_MIN_ASPECT     = 0.55; // taller than ~9:16
const PHOTO_MAX_ASPECT     = 1.9;  // wider than ~17:9

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

const PhotoMemoryCard: React.FC<{
  post:   ApiPost;
  index:  number;
  onOpen: () => void;
  T:      ReturnType<typeof getTheme>;
}> = ({ post, onOpen, T }) => {
  const w = post.media_width  ?? 0;
  const h = post.media_height ?? 0;
  const sourceAspect =
    w > 0 && h > 0 ? clamp(w / h, PHOTO_MIN_ASPECT, PHOTO_MAX_ASPECT)
                   : PHOTO_FALLBACK_RATIO;

  // Keep cards inset a touch from the screen edges so the layout breathes —
  // full-bleed strips read as a slideshow.
  const horizontalInset = spacing.base;
  const cardWidth  = SW - horizontalInset * 2;
  const cardHeight = Math.round(cardWidth / sourceAspect);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onOpen}
      style={[
        styles.photoCard,
        {
          width:        cardWidth,
          height:       cardHeight,
          marginLeft:   horizontalInset,
          marginRight:  horizontalInset,
          marginBottom: PHOTO_GAP,
          backgroundColor: T.bgCard,
          shadowColor: '#000',
        },
      ]}
    >
      <RNImage
        source={{ uri: post.media_url ?? undefined }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* Bottom scrim + caption (only if there's text — otherwise the photo
          stands alone, calm and unbothered). */}
      {!!post.content && (
        <>
          <View style={styles.photoScrimBottom} pointerEvents="none" />
          <Text
            style={styles.photoCaption}
            numberOfLines={2}
            pointerEvents="none"
          >
            {post.content}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: { padding: spacing.base },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  topBarTitle: { fontFamily: fonts.semibold, fontSize: fontSizes.lg },
  avatarRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingTop: spacing.md, gap: spacing.xl },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  infoArea: { paddingHorizontal: spacing.base, paddingTop: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  primaryBtn: { height: 40, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  outlineBtn: { height: 40, paddingHorizontal: spacing.md, borderRadius: radii.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs },
  iconBtn: { width: 40, height: 40, borderRadius: radii.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyPosts: { alignItems: 'center', paddingVertical: 80 },

  // ── Floating pill tabs (Thoughts | Photos | Videos) ──
  tabsOuter: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.lg,
    paddingBottom:     spacing.md,
  },
  tabsPill: {
    flexDirection: 'row',
    borderRadius:  radii.pill,
    padding:       4,
    borderWidth:   StyleSheet.hairlineWidth,
    position:      'relative',
    // Soft shadow to lift the pill off the page — gives it the "floating"
    // quality the design calls for, without making it shouty.
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius:  6,
    elevation:     2,
  },
  tabsItem: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 9,
    zIndex: 1,
  },
  tabsLabel: {
    fontSize:      fontSizes.sm,
    letterSpacing: 0.2,
  },
  tabsIndicator: {
    position:      'absolute',
    top:           4,
    bottom:        4,
    left:          4,
    borderRadius:  radii.pill,
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius:  3,
    elevation:     1,
  },

  // ── Photo memory card (asymmetric tile for the Photos tab) ──
  photoCard: {
    borderRadius: radii.xl,
    overflow:     'hidden',
    // Cinematic soft shadow — the card "floats" rather than sitting on a
    // grid. Subtle on iOS, a tad heavier on Android to compensate for
    // elevation rendering.
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius:  14,
    elevation:     6,
  },
  photoScrimBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  photoCaption: {
    position:  'absolute',
    bottom:    spacing.md,
    left:      spacing.md,
    right:     spacing.md,
    color:     '#fff',
    fontFamily: fonts.medium,
    fontSize:   fontSizes.sm,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Avatar surface ──
  avatarHitArea: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── WhatsApp-style preview modal ──
  previewRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  previewName: {
    color: '#fff',
    fontFamily: fonts.semibold,
    fontSize: fontSizes.lg,
    flex: 1,
    paddingRight: spacing.md,
  },
  previewCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatar: {
    width:  Math.min(SW * 0.7, 320),
    height: Math.min(SW * 0.7, 320),
    borderRadius: 999,
    backgroundColor: '#000',
  },
  previewAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInitial: {
    fontFamily: fonts.bold,
    fontSize: 96,
  },
  previewLoading: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewActions: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    gap: 6,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  previewRowText: {
    color: '#fff',
    fontFamily: fonts.medium,
    fontSize: fontSizes.md,
  },
});