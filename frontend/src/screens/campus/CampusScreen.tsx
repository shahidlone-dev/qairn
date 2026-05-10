// src/screens/campus/CampusScreen.tsx

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, runOnJS,
} from 'react-native-reanimated';

import { getTheme, fonts, fontSizes, spacing } from '../../types/theme';
import { PostCard } from '../../components/campus/PostCard';
import { CampusFAB } from '../../components/campus/CampusFAB';
import { CampusHeader } from '../../components/campus/CampusHeader';
import { NavigationDrawer } from '../../components/navigation/NavigationDrawer';
import { GlobalMediaViewer, GlobalMediaData } from '../../components/campus/GlobalMediaViewer';
import { VideoPlaybackContext } from '../../context/VideoPlaybackContext';
import { useScrollSignal } from '../../context/ScrollContext';
import { useAuth } from '../../hooks/useAuth';
import { useFeed } from '../../hooks/useFeed';
import { useFeedEngine } from '../../hooks/useFeedEngine';
import { usePostStore } from '../../store/usePostStore';
import { useStoryStore } from '../../store/useStoryStore';
import { MainTabScreenProps } from '../../types/navigation';
import type { Post as ApiPost } from '../../types/api.types';

type Props = MainTabScreenProps<'Campus'>;
type FeedFilter = 'forYou' | 'myCircle';

const FeedEmpty = ({ T }: { T: ReturnType<typeof getTheme> }) => (
  <View style={styles.emptyWrap}>
    <Ionicons name="newspaper-outline" size={48} color={T.text3} />
    <Text style={{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md, marginTop: spacing.sm }}>
      Nothing here yet
    </Text>
    <Text style={{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, textAlign: 'center' }}>
      Follow people or create a post to get started
    </Text>
  </View>
);

type MediaState = {
  visible:      boolean;
  data:         GlobalMediaData[];
  initialIndex: number;
};

export const CampusScreen: React.FC<Props> = ({ navigation }) => {
  const T      = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('forYou');
  const fabCloseRef = useRef<(() => void) | null>(null);

  const [mediaState, setMediaState] = useState<MediaState>({
    visible: false, data: [], initialIndex: 0,
  });

  const [isMuted, setIsMuted] = useState(true);

  // ── Feed data ──────────────────────────────────────────────────────────────
  const { feedIds, isLoading, isRefreshing, isFetchingMore, error, refresh, loadMore } =
    useFeed(feedFilter);

  // ── Story feed (rings on the rail + viewed-state mirror) ──────────────────
  // Refreshes on initial mount and whenever the post feed is pulled-to-refresh,
  // so the user's own ring lights up after they post a story and other users'
  // rings stay in sync. Failures are swallowed inside the store.
  const refreshStories = useStoryStore(s => s.refreshFeed);
  useEffect(() => {
    refreshStories();
  }, [refreshStories]);
  useEffect(() => {
    if (isRefreshing) refreshStories();
  }, [isRefreshing, refreshStories]);

  // ── Feed engine ────────────────────────────────────────────────────────────
  const {
    activePostId,
    nextPostId,
    viewabilityConfig,
    onViewableItemsChanged,
  } = useFeedEngine(feedIds);

  // ── Playback context ───────────────────────────────────────────────────────
  const playbackCtx = useMemo(() => ({
    activePostId: mediaState.visible ? null : activePostId,
    nextPostId:   mediaState.visible ? null : nextPostId,
    isMuted,
    setMuted: (m: boolean) => setIsMuted(m),
  }), [activePostId, nextPostId, isMuted, mediaState.visible]);

  // ── Scroll handler ─────────────────────────────────────────────────────────
  //
  // Reanimated v3 worklet rules followed here:
  //   - runOnJS() only receives named useCallback refs — never inline arrows.
  //     Inline arrows are recreated on every render; Reanimated cannot marshal
  //     them safely to the JS thread and crashes on scroll.
  //   - Date.now() is not available inside worklets. Removed entirely.
  //   - Worklet body only does: shared value writes + runOnJS(stableRef)().
  //
  const isScrollingDown = useScrollSignal();
  const lastScrollY     = useSharedValue(0);

  // Must be defined with useCallback BEFORE scrollHandler reads them
  const handleFabClose = useCallback(() => {
    fabCloseRef.current?.();
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      if (y < 0) return;

      if (y > lastScrollY.value + 5)      isScrollingDown.value = true;
      else if (y < lastScrollY.value - 5) isScrollingDown.value = false;

      lastScrollY.value = y;

      // Only pass a stable named function to runOnJS — never an inline arrow
      runOnJS(handleFabClose)();
    },
  });

  const handleFabRegister = useCallback((fn: () => void) => {
    fabCloseRef.current = fn;
  }, []);

  // ── Open media viewer ──────────────────────────────────────────────────────
  // - Videos open the in-place reels-style modal (GlobalMediaViewer).
  // - Images navigate to a dedicated PostImageViewer stack screen.
  const handleOpenMedia = useCallback((tappedId: string) => {
    const state      = usePostStore.getState();
    const tappedPost = state.postsById[tappedId];
    if (!tappedPost?.media_url || !tappedPost.media_type) return;

    if (tappedPost.media_type === 'image') {
      navigation.navigate('PostImageViewer', { postId: tappedId });
      return;
    }

    // Video → reels-style vertical pager built from all videos in the feed.
    const realIds = feedIds.filter(id => !id.startsWith('pending_'));
    const videoPosts = realIds
      .map(id => state.postsById[id])
      .filter((p): p is ApiPost => !!p && p.media_type === 'video' && !!p.media_url);
    const startIndex = videoPosts.findIndex(p => p.id === tappedId);
    setMediaState({
      visible:      true,
      initialIndex: Math.max(0, startIndex),
      data:         videoPosts.map(p => ({ uri: p.media_url!, postId: p.id })),
    });
  }, [feedIds, navigation]);

  const handleCloseMedia = useCallback(() => {
    setMediaState(p => ({ ...p, visible: false }));
  }, []);

  // renderItem deps: only re-creates when active/next post or handler changes
  const renderItem = useCallback(({ item: id }: { item: string }) => (
    <PostCard
      postId={id}
      onOpenMedia={() => handleOpenMedia(id)}
      isVisible={id === activePostId || id === nextPostId}
    />
  ), [activePostId, nextPostId, handleOpenMedia]);

  const keyExtractor = useCallback((id: string) => id, []);

  if (isLoading) return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    </SafeAreaView>
  );

  return (
    <VideoPlaybackContext.Provider value={playbackCtx}>
      <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right', 'bottom']}>

        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: insets.top, backgroundColor: T.bg, zIndex: 105,
        }} />

        <CampusHeader
          T={T}
          user={user}
          feedFilter={feedFilter}
          setFeedFilter={setFeedFilter}
          onMenuPress={() => setDrawerOpen(true)}
          onSearchPress={() => navigation.navigate('Search')}
          onProfilePress={() => user && navigation.navigate('Profile', { userId: user.id })}
          isScrollingDown={isScrollingDown}
        />

        {!!error && (
          <TouchableOpacity
            style={[styles.errorBanner, { backgroundColor: T.errorMuted, marginTop: insets.top + 60 }]}
            onPress={refresh}
          >
            <Ionicons name="alert-circle-outline" size={14} color={T.error} />
            <Text style={{ color: T.error, fontFamily: fonts.medium, fontSize: fontSizes.sm, marginLeft: 6 }}>
              {error} · Tap to retry
            </Text>
          </TouchableOpacity>
        )}

        <Animated.FlatList
          data={feedIds}
          keyExtractor={keyExtractor}
          renderItem={renderItem}

          viewabilityConfig={viewabilityConfig.current}
          onViewableItemsChanged={onViewableItemsChanged.current}

          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={5}
          windowSize={7}
          initialNumToRender={4}
          updateCellsBatchingPeriod={50}
          decelerationRate="fast"

          ListEmptyComponent={<FeedEmpty T={T} />}
          ListFooterComponent={
            isFetchingMore
              ? <View style={styles.footerLoader}><ActivityIndicator size="small" color={T.accent} /></View>
              : null
          }
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingTop:    insets.top + (Platform.OS === 'ios' ? 55 : 70),
            paddingBottom: insets.bottom + 120,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={T.accent}
              colors={[T.accent]}
              progressViewOffset={insets.top + 60}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />

        <CampusFAB
          bottomOffset={insets.bottom}
          onRegisterClose={handleFabRegister}
          isScrollingDown={isScrollingDown}
        />

        <NavigationDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onNavigate={() => {}}
        />

        <GlobalMediaViewer
          visible={mediaState.visible}
          data={mediaState.data}
          initialIndex={mediaState.initialIndex}
          onClose={handleCloseMedia}
        />

      </SafeAreaView>
    </VideoPlaybackContext.Provider>
  );
};

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBanner:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  footerLoader: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyWrap:    { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, paddingTop: 80 },
});