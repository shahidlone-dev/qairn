// src/components/campus/PostCard.tsx

import React, { useState, useCallback, useEffect, memo, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, LayoutChangeEvent, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, runOnJS, withDelay,
  interpolate, Extrapolation
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { Avatar, QaafPlusBadge } from '../ui';
import { PostOptionsSheet } from './PostOptionsSheet';
import { PostActionRow } from './PostActionRow';
import { RootStackParamList } from '../../types/navigation';
import { usePostStore, selectPost, selectInFlight } from '../../store/usePostStore';
import { useStoryStore, selectShowStoryRing, selectShouldOpenStory } from '../../store/useStoryStore';
import { usePostActions } from '../../hooks/usePostActions';
import { useAuth } from '../../hooks/useAuth';
import { useVideoPlayback } from '../../context/VideoPlaybackContext';
import { SaveToCollectionSheet } from './SaveToCollectionSheet';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MAX_H_RATIO  = 4 / 3;
const SCREEN_W     = Dimensions.get('window').width;
const FALLBACK_W   = SCREEN_W - 32 - 40;

function mediaHeight(w: number, ratio: number): number {
  if (w === 0) return 0;
  return Math.min(w / ratio, w * MAX_H_RATIO);
}

export function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * `variant` controls the chrome around the post.
 *
 *   - `feed` (default): the canonical campus-feed look — vertical timeline
 *      rail on the left, hairline divider between cards, dense spacing.
 *   - `profile`: the cinematic identity-page look used by ProfileScreen.
 *      No rail. Calmer spacing. Softer divider. Media takes the full card
 *      width. Caption sits under the media (or stands on its own when there
 *      is no media). All interactions — story-aware avatar, double-tap heart
 *      burst, save sheet — stay identical to the feed variant.
 */
type PostCardVariant = 'feed' | 'profile';

interface Props {
  postId:      string;
  onOpenMedia?: () => void;
  variant?:    PostCardVariant;
}

// ---------------------------------------------------------------------------
// FloatingHeart Particle (Now slower and color-matched perfectly)
// ---------------------------------------------------------------------------
const FloatingHeart = memo(({ id, x, y, T, onComplete }: { id: number, x: number, y: number, T: any, onComplete: (id: number) => void }) => {
  const progress = useSharedValue(0);

  const xOffset = useMemo(() => (Math.random() - 0.5) * 80, []); 
  const rotate  = useMemo(() => (Math.random() - 0.5) * 40, []); 

  useEffect(() => {
    progress.value = withTiming(1, { duration: 1500 }, (finished) => {
      if (finished) runOnJS(onComplete)(id); 
    });
  }, []);

  const style = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      top: y - 25, 
      left: x - 25,
      width: 50,
      height: 50,
      opacity: interpolate(progress.value, [0, 0.1, 0.7, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [0, -120]) }, 
        { translateX: progress.value * xOffset },
        { scale: interpolate(progress.value, [0, 0.1, 1], [0.3, 1.2, 0.8]) }, 
        { rotate: `${rotate}deg` }
      ],
      zIndex: 100
    };
  });

  return (
    <Animated.View style={style} pointerEvents="none">
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="heart" size={50} color="white" />
          </View>
        }
      >
        <LinearGradient
          colors={[T.accent, '#3B73E0']} // Matches CreatePost button!
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </MaskedView>
    </Animated.View>
  );
});
FloatingHeart.displayName = 'FloatingHeart';

// ---------------------------------------------------------------------------
// DoubleTapMedia — Infinite Tap Particle Engine
//
// Exported so other media surfaces (the full-screen photo viewer, etc.) can
// reuse the exact same heart-burst behaviour without duplicating the logic.
// Children are rendered inside a flex:1 wrapper, so wrap this in a sized
// container if you need a specific width/height.
// ---------------------------------------------------------------------------
export const DoubleTapMedia = ({ children, onSingleTap, onDoubleTap, isVisible, T }: any) => {
  const [hearts, setHearts] = useState<{ id: number, x: number, y: number }[]>([]);
  const heartIdCounter = useRef(0);
  
  const lastTapTime = useRef(0);
  const tapCombo = useRef(0);
  const singleTapTimeout = useRef<any>(null);

  const spawnHeart = useCallback((x: number, y: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const id = heartIdCounter.current++;
    setHearts(prev => [...prev, { id, x, y }]);
  }, []);

  const removeHeart = useCallback((id: number) => {
    setHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  const handleTap = useCallback((x: number, y: number) => {
    const now = Date.now();
    const delay = now - lastTapTime.current;
    lastTapTime.current = now;

    if (delay < 500) { 
      tapCombo.current += 1;
      
      if (singleTapTimeout.current) {
        clearTimeout(singleTapTimeout.current);
        singleTapTimeout.current = null;
      }

      if (tapCombo.current >= 2) {
        spawnHeart(x, y); 
        const isFirstLike = tapCombo.current === 2;
        if (onDoubleTap) onDoubleTap(isFirstLike);
      }
    } else {
      tapCombo.current = 1;
      if (singleTapTimeout.current) clearTimeout(singleTapTimeout.current);
      
      singleTapTimeout.current = setTimeout(() => {
        if (tapCombo.current === 1 && onSingleTap) {
          onSingleTap();
        }
        tapCombo.current = 0;
      }, 300);
    }
  }, [onDoubleTap, onSingleTap, spawnHeart]);

  const tapGesture = Gesture.Tap()
    .maxDuration(250) 
    .onStart((e) => {
      runOnJS(handleTap)(e.x, e.y);
    });

  if (!isVisible) {
    return <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>;
  }

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={{ flex: 1, justifyContent: 'center', overflow: 'hidden' }}>
        {children}
        {hearts.map(h => (
          <FloatingHeart key={h.id} id={h.id} x={h.x} y={h.y} T={T} onComplete={removeHeart} />
        ))}
      </Animated.View>
    </GestureDetector>
  );
};

// ---------------------------------------------------------------------------
// PendingCard
// ---------------------------------------------------------------------------
const PendingCard = memo(({ tempId }: { tempId: string }) => {
  const T        = getTheme(useColorScheme());
  const pending  = usePostStore(s => s.pendingUploads[tempId]);
  const { user } = useAuth();
  if (!pending) return null;

  const failed = pending.status === 'failed';
  const label  = failed
    ? (pending.error ?? 'Upload failed.')
    : pending.status === 'uploading'  ? 'Uploading…'
    : pending.status === 'processing' ? 'Processing…'
    : 'Done';

  return (
    <View style={[styles.card, { borderBottomColor: T.border, opacity: failed ? 0.7 : 1 }]}>
      <View style={styles.rowLayout}>
        <View style={styles.leftCol}>
          <Avatar uri={user?.avatar_url} name={user?.username} size="sm" />
          <View style={[styles.verticalLine, { backgroundColor: T.borderSubtle }]} />
        </View>
        <View style={styles.rightCol}>
          <View style={styles.topRow}>
            <Text style={{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }}>
              {user?.username ?? 'You'}
            </Text>
            <Text style={{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginLeft: 6 }}>
              · just now
            </Text>
          </View>
          {!!pending.content && (
            <Text style={[styles.bodyText, { color: T.text2 }]}>{pending.content}</Text>
          )}
          {!!pending.mediaUri && pending.mediaType === 'image' && (
            <View style={[styles.mediaBase, { height: mediaHeight(FALLBACK_W, 1), backgroundColor: T.bgCard, borderColor: T.borderSubtle }]}>
              <Image source={{ uri: pending.mediaUri }} style={styles.mediaCover} contentFit="cover" />
            </View>
          )}
          <View style={[styles.uploadBar, { backgroundColor: T.bgInput }]}>
            {failed ? (
              <View style={styles.uploadRow}>
                <Ionicons name="alert-circle-outline" size={14} color={T.error} />
                <Text style={{ color: T.error, fontFamily: fonts.medium, fontSize: fontSizes.xs, marginLeft: 4 }}>{label}</Text>
              </View>
            ) : (
              <View style={styles.uploadRow}>
                <ActivityIndicator size="small" color={T.accent} style={{ marginRight: 6 }} />
                <Text style={{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.xs }}>{label}</Text>
                <View style={[styles.progressTrack, { backgroundColor: T.border }]}>
                  <View style={[styles.progressFill, { width: `${pending.progress}%` as any, backgroundColor: T.accent }]} />
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
});
PendingCard.displayName = 'PendingCard';

// ---------------------------------------------------------------------------
// BodyText
// ---------------------------------------------------------------------------
const TEXT_COLLAPSED = 5;

const BodyText = memo(({ text, T }: { text: string; T: ReturnType<typeof getTheme> }) => {
  const [expanded,        setExpanded]       = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);

  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text
        style={[styles.bodyText, { color: T.text2 }]}
        numberOfLines={expanded ? undefined : TEXT_COLLAPSED}
        onTextLayout={e => {
          if (!needsExpansion && e.nativeEvent.lines.length > TEXT_COLLAPSED) {
            setNeedsExpansion(true);
          }
        }}
      >
        {text}
      </Text>
      {needsExpansion && (
        <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.7} hitSlop={10}>
          <Text style={{ color: T.accent, fontFamily: fonts.semibold, fontSize: fontSizes.sm, marginTop: 2 }}>
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});
BodyText.displayName = 'BodyText';

// ---------------------------------------------------------------------------
// ImagePreview
// ---------------------------------------------------------------------------
const ImagePreview = memo(({ uri, onPress, onDoubleTap, T, containerWidth, mediaW, mediaH, isVisible }: any) => {
  const ratio = (mediaW && mediaH && mediaH > 0) ? mediaW / mediaH : 1;
  const h     = mediaHeight(containerWidth || FALLBACK_W, ratio);

  return (
    <View style={[styles.mediaBase, { height: h, borderColor: T.borderSubtle, backgroundColor: T.bgCard }]}>
      <DoubleTapMedia onSingleTap={onPress} onDoubleTap={onDoubleTap} isVisible={isVisible} T={T}>
        <Image source={{ uri }} style={styles.mediaCover} contentFit="cover" transition={150} />
      </DoubleTapMedia>
    </View>
  );
});
ImagePreview.displayName = 'ImagePreview';

// ---------------------------------------------------------------------------
// VideoPreview
// ---------------------------------------------------------------------------
const VideoPreview = memo(({ postId, uri, onOpenMedia, onDoubleTap, T, containerWidth, mediaW, mediaH, isVisible }: any) => {
  const { activePostId, nextPostId, isMuted, setMuted } = useVideoPlayback();
  const isActive = activePostId === postId;
  const isNext   = nextPostId   === postId;
  const shouldMount = isActive || isNext;

  const ratio = (mediaW && mediaH && mediaH > 0) ? mediaW / mediaH : 9 / 16;
  const h     = mediaHeight(containerWidth || FALLBACK_W, ratio);

  const player = useVideoPlayer(shouldMount ? uri : null, p => {
    p.loop  = true;
    p.muted = isMuted;
    if (isActive) p.play();
  });

  useEffect(() => {
    return () => { try { player?.release(); } catch {} };
  }, [player]);

  useEffect(() => {
    if (!player) return;
    try {
      if (isActive) player.play();
      else          player.pause();
    } catch (e) {}
  }, [isActive, player]);

  useEffect(() => {
    if (!player) return;
    try {
      player.muted = isMuted;
    } catch (e) {}
  }, [isMuted, player]);

  const toggleMute = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  return (
    <View style={[styles.mediaBase, { height: h, borderColor: T.borderSubtle, backgroundColor: '#000' }]}>
      <DoubleTapMedia onSingleTap={onOpenMedia} onDoubleTap={onDoubleTap} isVisible={isVisible} T={T}>
        {(!isActive || !player) && (
          <Image source={{ uri }} style={styles.mediaCover} contentFit="cover" />
        )}
        {isActive && player && (
          <VideoView player={player} style={styles.mediaCover} contentFit="cover" nativeControls={false} />
        )}
        {!isActive && (
          <View style={[StyleSheet.absoluteFill, styles.heroPlayOverlay]} pointerEvents="none">
            <View style={styles.heroPlayRing}>
              <Ionicons name="play" size={34} color="#fff" style={{ marginLeft: 4 }} />
            </View>
          </View>
        )}
        {isActive && (
          <TouchableOpacity style={styles.videoSoundBtn} onPress={toggleMute} hitSlop={14} activeOpacity={0.85}>
            <View style={styles.videoCtrlBg}>
              <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={15} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.reelBadge}>
          <Ionicons name="play-circle" size={13} color="#fff" />
        </View>
      </DoubleTapMedia>
    </View>
  );
});
VideoPreview.displayName = 'VideoPreview';

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------
function areEqual(prev: Props, next: Props) {
  return (
    prev.postId      === next.postId      &&
    prev.onOpenMedia === next.onOpenMedia &&
    prev.variant     === next.variant
  );
}

export const PostCard = memo(({ postId, onOpenMedia, variant = 'feed' }: Props) => {
  const T          = getTheme(useColorScheme());
  const navigation = useNavigation<Nav>();
  const { user }   = useAuth();

  const post     = usePostStore(selectPost(postId));
  const inFlight = usePostStore(selectInFlight(postId));
  const { toggleLike, toggleSave } = usePostActions();

  const [sheetOpen,      setSheetOpen]      = useState(false);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [rightColWidth, setRightColWidth] = useState(0);

  const isVisible = post?.media_url ? true : false;

  // -------------------------------------------------------------------------
  // Like Button Bounce Animation
  // -------------------------------------------------------------------------
  const likeIconScale = useSharedValue(1);

  const triggerLikeBounce = useCallback(() => {
    likeIconScale.value = 1; 
    likeIconScale.value = withSequence(
      withTiming(1.5, { duration: 50 }), 
      withSpring(1, { damping: 12, stiffness: 400 })
    );
  }, []);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeIconScale.value }]
  }));
  // -------------------------------------------------------------------------

  const onRightColLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setRightColWidth(w);
  }, []);

  const handleDoubleTapLike = useCallback((isFirstLikeTrigger: boolean = true) => {
    triggerLikeBounce();
    if (isFirstLikeTrigger && post && !post.is_liked) {
      toggleLike(postId);
    }
  }, [post?.is_liked, postId, toggleLike, triggerLikeBounce]); 

  const handleSingleLikePress = useCallback(() => {
    triggerLikeBounce();
    toggleLike(postId);
  }, [postId, toggleLike, triggerLikeBounce]);

  if (postId.startsWith('pending_')) return <PendingCard tempId={postId} />;
  if (!post) return null;

  const isOwner      = user?.id === post.user.id;
  const goToComments = () => navigation.navigate('PostDetail', { postId: post.id });
  const goToProfile  = () => navigation.navigate('Profile', { userId: post.user.id });

  // Story-aware avatar wiring.
  // - showStory       → render the gradient ring while the story is still unviewed
  // - shouldOpenStory → tapping the avatar opens the viewer instead of the profile
  //
  // Once the user finishes / closes the story, useStoryStore marks this user-id
  // as viewed: showStory flips to false (ring disappears everywhere), and
  // shouldOpenStory also flips to false (subsequent taps go straight to profile).
  // selectShowStoryRing returns a primitive boolean — read it directly.
  // (Earlier versions of this file destructured it as an object, which made
  // `showStory` always undefined and the ring never appeared.)
  const showStory       = useStoryStore(selectShowStoryRing(post.user.id));
  const shouldOpenStory = useStoryStore(selectShouldOpenStory(post.user.id));

  const handleAvatarPress = useCallback(() => {
    if (shouldOpenStory) {
      navigation.navigate('StoryViewer', { userId: post.user.id });
    } else {
      goToProfile();
    }
  }, [shouldOpenStory, navigation, post.user.id]); // goToProfile is stable per render

  // ── Shared sub-renderers ────────────────────────────────────────────────
  // The header, body, media block, and action row are identical between
  // variants — only the surrounding chrome (rail vs no-rail, padding,
  // dividers) differs. Pulling these out of the return keeps both branches
  // in sync without duplicated JSX.

  const renderHeader = () => (
    <View style={styles.topRow}>
      {/* Avatar is intentionally OMITTED on the profile variant — you're
          already standing on this user's profile, so repeating their face
          on every card is redundant noise. The feed variant still shows
          the avatar in the timeline rail. */}
      <TouchableOpacity style={styles.nameRow} onPress={goToProfile} activeOpacity={0.7} hitSlop={5}>
        <Text
          style={{ color: T.text, fontFamily: fonts.bold, fontSize: fontSizes.md, letterSpacing: -0.2 }}
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
        <Text style={{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginLeft: 6 }}>
          · {timeAgo(post.created_at)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setSheetOpen(true)} hitSlop={15}>
        <Ionicons name="ellipsis-horizontal" size={18} color={T.text3} />
      </TouchableOpacity>
    </View>
  );

  const renderMedia = (containerWidth: number) => {
    if (!post.media_url || !post.media_type) return null;
    return post.media_type === 'video' ? (
      <VideoPreview
        postId={postId}
        uri={post.media_url}
        onOpenMedia={onOpenMedia}
        onDoubleTap={handleDoubleTapLike}
        T={T}
        containerWidth={containerWidth}
        mediaW={post.media_width}
        mediaH={post.media_height}
        isVisible={true}
      />
    ) : (
      <ImagePreview
        uri={post.media_url}
        onPress={onOpenMedia}
        onDoubleTap={handleDoubleTapLike}
        T={T}
        containerWidth={containerWidth}
        mediaW={post.media_width}
        mediaH={post.media_height}
        isVisible={true}
      />
    );
  };

  const renderActions = () => (
    <PostActionRow
      post={post}
      inFlight={inFlight}
      T={T}
      likeAnimatedStyle={likeAnimatedStyle}
      onLikePress={handleSingleLikePress}
      onCommentPress={goToComments}
      onSharePress={() => {}}
      onSavePress={() => setSaveSheetOpen(true)}
    />
  );

  const sheets = (
    <>
      <PostOptionsSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        postId={postId}
        isOwner={isOwner}
        inCircle={(post as any).in_circle ?? false}
        username={post.user.username}
      />
      <SaveToCollectionSheet
        visible={saveSheetOpen}
        onClose={() => setSaveSheetOpen(false)}
        postId={postId}
      />
    </>
  );

  // ── PROFILE VARIANT ─────────────────────────────────────────────────────
  // Cinematic identity layout. No vertical rail. Avatar moves inline next to
  // the username at the top. Media takes full card width and the divider
  // between cards is a soft hairline that fades into the page.
  if (variant === 'profile') {
    return (
      <View style={[stylesProfile.card, { borderBottomColor: T.borderSubtle }]}>
        <View style={stylesProfile.headerWrap}>
          {renderHeader()}
        </View>

        {!!post.content && (
          <View style={stylesProfile.bodyWrap}>
            <Text
              style={[stylesProfile.bodyText, { color: T.text2 }]}
              // No truncation here — the per-tab container governs how much
              // breathing room the text gets, so we let it flow naturally.
            >
              {post.content}
            </Text>
          </View>
        )}

        {!!post.media_url && (
          <View
            style={stylesProfile.mediaWrap}
            onLayout={onRightColLayout}
          >
            {renderMedia(rightColWidth)}
          </View>
        )}

        <View style={stylesProfile.actionsWrap}>
          {renderActions()}
        </View>

        {sheets}
      </View>
    );
  }

  // ── FEED VARIANT (default — unchanged) ──────────────────────────────────
  return (
    <View style={[styles.card, { borderBottomColor: T.border }]}>
      <View style={styles.rowLayout}>

        <View style={styles.leftCol}>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8} hitSlop={6}>
            <Avatar
              uri={post.user.avatar_url}
              name={post.user.username}
              size="sm"
              showStory={showStory}
            />
          </TouchableOpacity>
          <View style={[styles.verticalLine, { backgroundColor: T.borderSubtle }]} />
        </View>

        <View style={styles.rightCol} onLayout={onRightColLayout}>
          {renderHeader()}
          {!!post.content && <BodyText text={post.content} T={T} />}
          {renderMedia(rightColWidth)}
          {renderActions()}
        </View>
      </View>
      {sheets}
    </View>
  );
}, areEqual);

PostCard.displayName = 'PostCard';

// ─────────────────────────────────────────────────────────────────────────────
// Profile variant styles
//
// Calmer rhythm than the feed: no rail, more breathing room, lighter divider.
// Each subsection (header / body / media / actions) gets its own padding so a
// consumer screen can change the surrounding atmosphere (e.g. a darker
// container for the Videos tab) without the card's interior shifting.
// ─────────────────────────────────────────────────────────────────────────────
const stylesProfile = StyleSheet.create({
  card: {
    paddingTop:    spacing.lg,
    paddingBottom: spacing.md,
    // Soft single divider — half opacity by way of borderSubtle. The
    // ProfileScreen tab containers can hide this entirely if they want a
    // truly seamless flow (e.g. Photos tab uses card-on-blank-canvas).
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerWrap: {
    paddingHorizontal: spacing.base,
  },
  bodyWrap: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
  },
  bodyText: {
    fontFamily: fonts.regular,
    fontSize:   fontSizes.md,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  mediaWrap: {
    // Media block sits flush left/right inside the card so a 16:9 photo
    // really feels cinematic. ImagePreview / VideoPreview internally apply
    // their own border radius — we don't override it here.
    paddingHorizontal: 0,
    paddingTop:        spacing.md,
  },
  actionsWrap: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.xs,
  },
});

const styles = StyleSheet.create({
  card:         { borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  rowLayout:    { flexDirection: 'row', paddingHorizontal: spacing.md },
  leftCol:      { alignItems: 'center', marginRight: spacing.sm, width: 44 },
  verticalLine: { flex: 1, width: 2, marginTop: spacing.sm, marginBottom: spacing.xs, borderRadius: 99 },
  rightCol:     { flex: 1, paddingBottom: spacing.sm },
  topRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap' },
  bodyText:     { fontFamily: fonts.regular, fontSize: fontSizes.md, lineHeight: 22 },

  mediaBase: {
    marginTop: 4, marginBottom: spacing.sm, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', width: '100%',
  },
  mediaCover: { width: '100%', height: '100%' },

  heroPlayOverlay: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  heroPlayRing:    {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  videoSoundBtn: { position: 'absolute', bottom: spacing.sm, right: spacing.sm },
  videoCtrlBg:   { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radii.pill, padding: 8, alignItems: 'center', justifyContent: 'center' },
  reelBadge:     {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radii.pill, padding: 6,
  }
});