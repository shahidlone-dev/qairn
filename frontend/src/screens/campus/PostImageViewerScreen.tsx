// src/screens/campus/PostImageViewerScreen.tsx
//
// Vertical, scrollable gallery of ALL image posts by a single user.
// Entry point: tapping any image post in the campus feed or profile screen.
// Videos and text-only posts are filtered out — this view is photos only.
// The list opens scrolled to the tapped post.

import React, {
  useCallback, useState, useMemo, useRef, memo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, useColorScheme, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { getTheme, fonts, fontSizes, spacing } from '../../types/theme';
import { Avatar, QaafPlusBadge } from '../../components/ui';
import { PostActionRow }       from '../../components/campus/PostActionRow';
import { PostOptionsSheet }    from '../../components/campus/PostOptionsSheet';
import { SaveToCollectionSheet } from '../../components/campus/SaveToCollectionSheet';

import { usePostStore, selectPost, selectInFlight } from '../../store/usePostStore';
import { usePostActions } from '../../hooks/usePostActions';
import { useAuth }        from '../../hooks/useAuth';
import { useProfile }     from '../../hooks/useProfile';
import { timeAgo, DoubleTapMedia } from '../../components/campus/PostCard';

import { RootStackScreenProps } from '../../types/navigation';
import type { Post as ApiPost } from '../../types/api.types';

type Props = RootStackScreenProps<'PostImageViewer'>;

const SCREEN_W = Dimensions.get('window').width;

// ─────────────────────────────────────────────────────────────────────────────
// Image sizing
//
// The card always renders at the photo's true aspect ratio.
//
// Source of the ratio (in priority order):
//   1. The dimensions returned by expo-image's onLoad (always accurate — these
//      come straight from the decoded bitmap).
//   2. media_width / media_height stored on the post by the upload pipeline.
//   3. A modest 4:5 placeholder while the first load is in flight, so the
//      card has a sensible height before the image decodes (avoids a giant
//      empty cell that pushes everything else off-screen).
//
// Once onLoad fires, the card reflows to the exact ratio. The reflow is
// invisible to the user because the image fades in over the placeholder.
// ─────────────────────────────────────────────────────────────────────────────

function ratioFromMeta(mediaW?: number | null, mediaH?: number | null): number | null {
  if (mediaW && mediaH && mediaW > 0 && mediaH > 0) return mediaW / mediaH;
  return null;
}

const PLACEHOLDER_RATIO = 4 / 5; // gentle portrait placeholder before load

// ─────────────────────────────────────────────────────────────────────────────
// PER-POST CARD
// ─────────────────────────────────────────────────────────────────────────────

interface CardProps {
  postId:       string;
  T:            ReturnType<typeof getTheme>;
  currentUserId?: string;
  onOpenOptions: (postId: string, isOwner: boolean, username: string) => void;
  onOpenSave:    (postId: string) => void;
  onOpenComments:(postId: string) => void;
  onOpenProfile: (userId: string) => void;
}

const ImagePostCard = memo(({
  postId, T, currentUserId,
  onOpenOptions, onOpenSave, onOpenComments, onOpenProfile,
}: CardProps) => {
  const post     = usePostStore(selectPost(postId));
  const inFlight = usePostStore(selectInFlight(postId));
  const { toggleLike } = usePostActions();

  // Like-bounce animation per card
  const likeIconScale = useSharedValue(1);
  const triggerLikeBounce = useCallback(() => {
    likeIconScale.value = 1;
    likeIconScale.value = withSequence(
      withTiming(1.5, { duration: 50 }),
      withSpring(1, { damping: 12, stiffness: 400 }),
    );
  }, []);
  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeIconScale.value }],
  }));

  const handleLikePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    triggerLikeBounce();
    toggleLike(postId);
  }, [postId, toggleLike, triggerLikeBounce]);

  // Double-tap-to-like on the image itself.
  // - First double-tap likes the post (we never UNLIKE on subsequent taps —
  //   matches Instagram / TikTok semantics).
  // - Every double-tap pulses the action-row heart icon and spawns a
  //   floating heart at the tap point (handled inside DoubleTapMedia).
  const handleImageDoubleTap = useCallback((isFirstLike: boolean) => {
    triggerLikeBounce();
    if (isFirstLike && post && !post.is_liked) {
      toggleLike(postId);
    }
  }, [post, postId, toggleLike, triggerLikeBounce]);

  // Measured aspect ratio from the loaded image (preferred when available).
  // Until onLoad fires, we use the post's metadata, then fall back to a
  // gentle 4:5 placeholder so the card has a sensible height before decoding.
  const [measuredRatio, setMeasuredRatio] = useState<number | null>(null);

  const ratio =
    measuredRatio
    ?? ratioFromMeta(post?.media_width, post?.media_height)
    ?? PLACEHOLDER_RATIO;

  const imgHeight = Math.round(SCREEN_W / ratio);

  const handleImageLoad = useCallback((e: { source?: { width?: number; height?: number } }) => {
    const w = e?.source?.width;
    const h = e?.source?.height;
    if (w && h && w > 0 && h > 0) {
      setMeasuredRatio(w / h);
    }
  }, []);

  if (!post || !post.media_url || post.media_type !== 'image') return null;

  const isOwner = currentUserId === post.user.id;

  return (
    <View style={[styles.card, { borderBottomColor: T.borderSubtle }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          onPress={() => onOpenProfile(post.user.id)}
          activeOpacity={0.8}
          style={styles.userRow}
        >
          <Avatar uri={post.user.avatar_url} name={post.user.username} size="sm" />
          <View style={styles.userText}>
            <View style={styles.nameRow}>
              <Text
                style={{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.md }}
                numberOfLines={1}
              >
                {post.user.username}
              </Text>
              {post.user.is_verified && (
                <Ionicons name="checkmark-circle" size={14} color={T.info} style={{ marginLeft: 3 }} />
              )}
              {post.user.is_premium && (
                <QaafPlusBadge size="xs" style={{ marginLeft: 4 }} />
              )}
            </View>
            {!!post.user.dept && (
              <Text style={{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }}>
                {post.user.dept}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onOpenOptions(postId, isOwner, post.user.username)}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={T.text2} />
        </TouchableOpacity>
      </View>

      {/* ── Image — card height matches photo's true aspect ratio ──────────
          Wrapped in DoubleTapMedia (the same engine PostCard uses) so each
          double-tap spawns a floating gradient heart at the tap point and
          likes the post on the first burst. The wrapping View carries the
          fixed dimensions because DoubleTapMedia's internal container is
          flex:1 and needs a sized parent. */}
      <View style={{ width: SCREEN_W, height: imgHeight, backgroundColor: T.bgCard }}>
        <DoubleTapMedia
          isVisible
          T={T}
          onSingleTap={() => { /* single tap is a no-op here — image is already in viewer */ }}
          onDoubleTap={handleImageDoubleTap}
        >
          <Image
            source={{ uri: post.media_url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={120}
            onLoad={handleImageLoad}
          />
        </DoubleTapMedia>
      </View>

      {/* ── Action row ────────────────────────────────────────────────────── */}
      <View style={styles.actionWrap}>
        <PostActionRow
          post={post}
          inFlight={inFlight}
          T={T}
          likeAnimatedStyle={likeAnimatedStyle}
          onLikePress={handleLikePress}
          onCommentPress={() => onOpenComments(postId)}
          onSharePress={() => { /* TODO: share sheet */ }}
          onSavePress={() => onOpenSave(postId)}
        />
      </View>

      {/* ── Like count ───────────────────────────────────────────────────── */}
      {post.like_count > 0 && (
        <Text
          style={{
            color: T.text,
            fontFamily: fonts.semibold,
            fontSize: fontSizes.sm,
            paddingHorizontal: spacing.base,
            marginTop: 2,
          }}
        >
          {post.like_count.toLocaleString()} {post.like_count === 1 ? 'like' : 'likes'}
        </Text>
      )}

      {/* ── Caption (no username prefix) ─────────────────────────────────── */}
      {!!post.content && (
        <Text
          style={{
            color: T.text,
            fontFamily: fonts.regular,
            fontSize: fontSizes.sm,
            lineHeight: 20,
            paddingHorizontal: spacing.base,
            marginTop: spacing.xs,
          }}
        >
          {post.content}
        </Text>
      )}

      {/* ── Comments link ────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => onOpenComments(postId)}
        activeOpacity={0.7}
        style={{ paddingHorizontal: spacing.base, marginTop: spacing.xs }}
      >
        <Text style={{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.sm }}>
          {post.comment_count > 0
            ? `View all ${post.comment_count} ${post.comment_count === 1 ? 'comment' : 'comments'}`
            : 'Be the first to comment'}
        </Text>
      </TouchableOpacity>

      {/* ── Timestamp ────────────────────────────────────────────────────── */}
      <Text
        style={{
          color: T.text3,
          fontFamily: fonts.regular,
          fontSize: fontSizes.xs,
          paddingHorizontal: spacing.base,
          marginTop: spacing.xs,
          marginBottom: spacing.base,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {timeAgo(post.created_at)}
      </Text>
    </View>
  );
});
ImagePostCard.displayName = 'ImagePostCard';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export const PostImageViewerScreen: React.FC<Props> = ({ route, navigation }) => {
  const { postId } = route.params;
  const T          = getTheme(useColorScheme());
  const insets     = useSafeAreaInsets();
  const { user }   = useAuth();

  // Resolve the tapped post → username, so we can fetch all posts by that user.
  const tappedPost = usePostStore(selectPost(postId));
  const username   = tappedPost?.user.username ?? '';

  // Pull paginated posts for this user from the global store via useProfile.
  const { posts, error } = useProfile(username);

  // ── Filter + order image posts ────────────────────────────────────────────
  //
  // The user's expectation:
  //   1. The image they tapped on is ALWAYS the first card.
  //   2. Everything else by the same author follows below, ordered by
  //      engagement (likes + comments + shares) descending — the most-loved
  //      photos float to the top.
  //
  // This replaces the old "scrollToIndex after mount" approach. Pinning the
  // tapped card at index 0 is simpler, more reliable (no race against
  // FlatList layout), and survives pagination naturally — newly loaded
  // posts get inserted by the sort instead of bumping the entry point.
  //
  // Engagement score = like_count + comment_count + share_count.
  // We don't yet expose a `save_count` on the post wire shape; once the
  // backend ships one, add `+ p.save_count` here so save activity counts
  // toward ranking.
  const imagePosts = useMemo(() => {
    const imgs = posts.items.filter(
      (p): p is ApiPost => !!p.media_url && p.media_type === 'image',
    );

    const tapped = imgs.find(p => p.id === postId);
    const rest   = imgs.filter(p => p.id !== postId);

    const score = (p: ApiPost) =>
      (p.like_count    || 0) +
      (p.comment_count || 0) +
      (p.share_count   || 0);

    rest.sort((a, b) => {
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      // Tie-breaker: newer first, so equally-engaged posts feel fresh.
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return tapped ? [tapped, ...rest] : rest;
  }, [posts.items, postId]);

  const imageIds = useMemo(() => imagePosts.map(p => p.id), [imagePosts]);

  // Kept around for the FlatList ref even though we no longer call
  // scrollToIndex — pull-to-refresh consumers and future "scroll to top"
  // controls can still use it.
  const listRef = useRef<FlatList<string>>(null);

  // ── Sheets state lives at the screen level, keyed by postId ─────────────
  const [optionsState, setOptionsState] = useState<{
    visible: boolean; postId: string; isOwner: boolean; username: string;
  }>({ visible: false, postId: '', isOwner: false, username: '' });

  const [saveState, setSaveState] = useState<{ visible: boolean; postId: string }>({
    visible: false, postId: '',
  });

  const handleOpenOptions = useCallback(
    (id: string, isOwner: boolean, uname: string) =>
      setOptionsState({ visible: true, postId: id, isOwner, username: uname }),
    [],
  );
  const handleCloseOptions = useCallback(
    () => setOptionsState(s => ({ ...s, visible: false })),
    [],
  );
  const handleOpenSave = useCallback(
    (id: string) => setSaveState({ visible: true, postId: id }),
    [],
  );
  const handleCloseSave = useCallback(
    () => setSaveState(s => ({ ...s, visible: false })),
    [],
  );

  const handleOpenComments = useCallback(
    (id: string) => navigation.navigate('PostDetail', { postId: id }),
    [navigation],
  );
  const handleOpenProfile = useCallback(
    (userId: string) => navigation.navigate('Profile', { userId }),
    [navigation],
  );

  // ── List rendering ──────────────────────────────────────────────────────
  const renderItem = useCallback(({ item: id }: { item: string }) => (
    <ImagePostCard
      postId={id}
      T={T}
      currentUserId={user?.id}
      onOpenOptions={handleOpenOptions}
      onOpenSave={handleOpenSave}
      onOpenComments={handleOpenComments}
      onOpenProfile={handleOpenProfile}
    />
  ), [T, user?.id, handleOpenOptions, handleOpenSave, handleOpenComments, handleOpenProfile]);

  const keyExtractor = useCallback((id: string) => id, []);

  // ── Loading / empty states ──────────────────────────────────────────────
  if (!tappedPost) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: T.bg }]}
      edges={['top', 'left', 'right']}
    >
      {/* ── Top bar: back + page title ─────────────────────────────────── */}
      <View style={[styles.topBar, { borderBottomColor: T.borderSubtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </TouchableOpacity>

        <View style={styles.topTitleWrap}>
          <Text
            style={{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }}
            numberOfLines={1}
          >
            Photos
          </Text>
          <Text
            style={{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.md }}
            numberOfLines={1}
          >
            {tappedPost.user.username}
          </Text>
        </View>

        {/* Spacer to balance the back button so the title stays centered */}
        <View style={[styles.iconBtn, { opacity: 0 }]}>
          <Ionicons name="chevron-back" size={26} color="transparent" />
        </View>
      </View>

      {posts.isLoading && imageIds.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.accent} />
        </View>
      ) : imageIds.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="image-outline" size={48} color={T.text3} />
          <Text style={{ color: T.text2, fontFamily: fonts.medium, fontSize: fontSizes.sm, marginTop: spacing.sm }}>
            No photos yet
          </Text>
          {!!error && (
            <Text style={{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginTop: 4 }}>
              {error}
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={imageIds}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          // Pagination — load more user posts as the viewer scrolls
          onEndReached={posts.loadMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            posts.isFetchingMore
              ? <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={T.accent} />
                </View>
              : null
          }
          refreshControl={
            <RefreshControl
              refreshing={posts.isRefreshing}
              onRefresh={posts.refresh}
              tintColor={T.accent}
              colors={[T.accent]}
            />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        />
      )}

      {/* ── Sheets ──────────────────────────────────────────────────────── */}
      <PostOptionsSheet
        visible={optionsState.visible}
        onClose={handleCloseOptions}
        postId={optionsState.postId}
        isOwner={optionsState.isOwner}
        inCircle={false}
        username={optionsState.username}
      />

      <SaveToCollectionSheet
        visible={saveState.visible}
        onClose={handleCloseSave}
        postId={saveState.postId}
        // The sheet calls usePostStore.updatePost itself when the toggle
        // succeeds, which is what re-renders the bookmark icon. The
        // previous `(p as any).is_saved = …` direct mutation here was a
        // no-op on the immutable store object and is gone.
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTitleWrap: {
    flex:        1,
    alignItems:  'center',
    paddingHorizontal: spacing.sm,
  },
  iconBtn: {
    padding: 4,
  },

  card: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  cardHeader: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
  },
  userRow: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
  },
  userText: {
    marginLeft: spacing.sm,
    flex:       1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  actionWrap: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
  },
});
