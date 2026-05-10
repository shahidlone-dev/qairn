// src/components/story/StoryModal.tsx
//
// Reusable Instagram-style story viewer wrapped in a React Native Modal.
//
// Why a Modal instead of just a Screen:
//   - Can be rendered from anywhere (story rail, profile avatar, post header)
//     without going through the navigation stack and pulling in route params
//   - The actual `StoryViewerScreen` is now a thin wrapper that opens this
//     modal and forwards `navigation.goBack()` as `onClose` — keeping
//     deep-linking and 3rd-party navigations working
//
// Capabilities:
//   - Auto-progressing segmented progress bar (image: timer, video: bound to
//     player readiness)
//   - Tap zones (left 30% = prev, right 70% = next), long-press = pause
//   - Swipe-down anywhere to close
//   - Reply input bar at the bottom, autofocus optional
//   - Server-side `markViewed` on every advance, with local Zustand mirror
//   - Loads stories from /api/stories/user/:userId; falls back to a single
//     mocked story if the request fails so the viewer is never blank
//
// Lifecycle rules carried over from StoryViewerScreen:
//   - Every `useVideoPlayer` MUST be released on unmount (player.release())
//   - VideoStory is keyed on the active item id so swapping items remounts
//     the player and the previous one is freed cleanly

import React, {
  useState, useEffect, useCallback, useRef, memo, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, StatusBar, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  cancelAnimation, Easing, runOnJS,
} from 'react-native-reanimated';
import {
  Gesture, GestureDetector, GestureHandlerRootView,
} from 'react-native-gesture-handler';

import { fonts, spacing } from '../../types/theme';
import { Avatar } from '../ui';
import { useStoryStore } from '../../store/useStoryStore';
import StoriesApi, { type ApiStory, type StoryMediaType } from '../../api/stories.api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StoryItem = {
  id:        string;
  url:       string;
  type:      StoryMediaType;
  duration:  number;   // ms — used for image/text; videos auto-advance
  timeAgo:   string;
  textContent?:     string | null;
  backgroundColor?: string | null;
};

export type StoryUser = {
  id:       string;
  name:     string;
  avatar?:  string | null;
  items:    StoryItem[];
};

interface Props {
  visible:      boolean;
  userId:       string | null;
  /** Optional pre-loaded user (skips API fetch when present). */
  initialUser?: StoryUser | null;
  onClose:      () => void;
}

const { width: SW } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function apiToStoryUser(userId: string, stories: ApiStory[]): StoryUser | null {
  if (!stories.length) return null;
  return {
    id:     userId,
    name:   userId.slice(0, 8),     // overwritten by feed-supplied name when available
    avatar: null,
    items:  stories.map(s => ({
      id:               s.id,
      type:             s.media_type,
      url:              s.media_url ?? '',
      duration:         s.duration_ms ?? 5000,
      timeAgo:          timeAgo(s.created_at),
      textContent:      s.text_content,
      backgroundColor:  s.background_color,
    })),
  };
}

// ---------------------------------------------------------------------------
// Progress segment
// ---------------------------------------------------------------------------
const ProgressSegment = memo(({
  index, currentIndex, progress,
}: {
  index:        number;
  currentIndex: number;
  progress:     Animated.SharedValue<number>;
}) => {
  const anim = useAnimatedStyle(() => {
    if (index < currentIndex) return { width: '100%' };
    if (index > currentIndex) return { width: '0%' };
    return { width: `${progress.value * 100}%` as any };
  });
  return (
    <View style={styles.segBg}>
      <Animated.View style={[styles.segFill, anim]} />
    </View>
  );
});
ProgressSegment.displayName = 'ProgressSegment';

// ---------------------------------------------------------------------------
// Image story
// ---------------------------------------------------------------------------
const ImageStory = memo(({ item, nextItem }: { item: StoryItem; nextItem?: StoryItem }) => (
  <>
    <Image
      source={{ uri: item.url }}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      transition={200}
      cachePolicy="memory-disk"
    />
    {nextItem?.type === 'image' && nextItem.url ? (
      <Image
        source={{ uri: nextItem.url }}
        style={{ width: 1, height: 1, position: 'absolute', opacity: 0 }}
        cachePolicy="memory-disk"
      />
    ) : null}
  </>
));
ImageStory.displayName = 'ImageStory';

// ---------------------------------------------------------------------------
// Video story
// ---------------------------------------------------------------------------
interface VideoStoryProps {
  item:          StoryItem;
  nextItem?:     StoryItem;
  isPaused:      boolean;
  onVideoEnded:  () => void;
  onVideoReady:  () => void;
}

const VideoStory = memo(({
  item, nextItem, isPaused, onVideoEnded, onVideoReady,
}: VideoStoryProps) => {
  const player = useVideoPlayer(item.url, p => {
    p.loop  = false;
    p.muted = false;
  });

  const preloadPlayer = useVideoPlayer(
    nextItem?.type === 'video' ? nextItem.url : null,
    p => { p.muted = true; p.loop = false; },
  );

  useEffect(() => {
    return () => {
      try { player.release(); }        catch {}
      try { preloadPlayer?.release(); } catch {}
    };
  }, [player, preloadPlayer]);

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') onVideoReady();
      if (status === 'idle')        onVideoEnded();
    });
    return () => sub.remove();
  }, [player, onVideoEnded, onVideoReady]);

  useEffect(() => {
    if (isPaused) player.pause();
    else          player.play();
  }, [isPaused, player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls={false}
    />
  );
});
VideoStory.displayName = 'VideoStory';

// ---------------------------------------------------------------------------
// Text story
// ---------------------------------------------------------------------------
const TextStory = memo(({ item }: { item: StoryItem }) => (
  <View
    style={[
      StyleSheet.absoluteFill,
      styles.textStoryWrap,
      { backgroundColor: item.backgroundColor || '#FF5733' },
    ]}
  >
    <Text style={styles.textStoryText}>{item.textContent ?? ''}</Text>
  </View>
));
TextStory.displayName = 'TextStory';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const FALLBACK_STORY: StoryUser = {
  id:     'fallback',
  name:   'preview',
  avatar: 'https://i.pravatar.cc/150?u=fallback',
  items: [
    { id: 'fb1', type: 'image', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800', duration: 5000, timeAgo: 'now' },
  ],
};

export const StoryModal: React.FC<Props> = ({ visible, userId, initialUser, onClose }) => {
  const insets    = useSafeAreaInsets();
  const markStore = useStoryStore(s => s.markViewed);

  // ── Story payload ────────────────────────────────────────────────────────
  const [story,     setStory]     = useState<StoryUser | null>(initialUser ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initialUser) { setStory(initialUser); return; }
    if (!userId)     { setStory(FALLBACK_STORY); return; }

    let cancelled = false;
    setIsFetching(true);
    setLoadError(null);

    StoriesApi.getByUser(userId)
      .then(stories => {
        if (cancelled) return;
        const built = apiToStoryUser(userId, stories);
        setStory(built ?? FALLBACK_STORY);
        setIsFetching(false);
      })
      .catch(err => {
        if (cancelled) return;
        setLoadError(err?.message ?? 'Failed to load stories.');
        setStory(FALLBACK_STORY); // keep the modal usable
        setIsFetching(false);
      });

    return () => { cancelled = true; };
  }, [visible, userId, initialUser]);

  // ── Mark the user's ring as viewed once we successfully open ─────────────
  useEffect(() => {
    if (visible && userId) markStore(userId);
  }, [visible, userId, markStore]);

  // ── Index / playback state ───────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused,     setIsPaused]     = useState(false);
  const [videoReady,   setVideoReady]   = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [replyText,    setReplyText]    = useState('');

  // Reset index every time we reopen / switch user.
  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(0);
    setReplyText('');
    setIsPaused(false);
  }, [visible, userId]);

  const items       = story?.items ?? [];
  const currentItem = items[currentIndex] ?? items[0];
  const nextItem    = items[currentIndex + 1];
  const isVideo     = currentItem?.type === 'video';
  const isText      = currentItem?.type === 'text';

  const progress         = useSharedValue(0);
  const longPressActive  = useRef(false);
  const dragY            = useSharedValue(0);

  // ── Navigation helpers ───────────────────────────────────────────────────
  const goToNext = useCallback(() => {
    setVideoReady(false);
    if (currentIndex < items.length - 1) {
      // mark the current story (server) before moving on
      const cur = items[currentIndex];
      if (cur?.id && userId) {
        // markStore already mirrors locally; storyId triggers backend write
        markStore(userId, cur.id);
      }
      setCurrentIndex(i => i + 1);
    } else {
      // mark final story too, then close
      const cur = items[currentIndex];
      if (cur?.id && userId) markStore(userId, cur.id);
      onClose();
    }
  }, [currentIndex, items, onClose, markStore, userId]);

  const goToPrev = useCallback(() => {
    setVideoReady(false);
    cancelAnimation(progress);
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
    else                  progress.value = 0; // restart first
  }, [currentIndex, progress]);

  // ── Progress animation ───────────────────────────────────────────────────
  const startProgress = useCallback((fromValue = 0) => {
    if (!currentItem) return;
    progress.value = fromValue;
    const remaining = (1 - fromValue) * (currentItem.duration ?? 5000);
    progress.value = withTiming(
      1,
      { duration: remaining, easing: Easing.linear },
      finished => { if (finished) runOnJS(goToNext)(); },
    );
  }, [currentItem, progress, goToNext]);

  // Reset & kick off on index/visible changes
  useEffect(() => {
    if (!visible || !currentItem) return;
    cancelAnimation(progress);
    progress.value = 0;
    setIsLoading(isVideo);
    setVideoReady(false);

    if (!isVideo && !isPaused) startProgress(0);
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, visible, currentItem?.id]);

  // Video ready → start the bar
  useEffect(() => {
    if (isVideo && videoReady && !isPaused) {
      setIsLoading(false);
      startProgress(progress.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoReady]);

  // Pause/resume
  useEffect(() => {
    if (isPaused) {
      cancelAnimation(progress);
    } else {
      if (isVideo && !videoReady) return;
      startProgress(progress.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  // ── Tap zone handlers ────────────────────────────────────────────────────
  const handlePressIn = useCallback(() => {
    longPressActive.current = false;
  }, []);

  const handleLongPress = useCallback(() => {
    longPressActive.current = true;
    setIsPaused(true);
  }, []);

  const handlePressOut = useCallback(() => {
    if (longPressActive.current) {
      longPressActive.current = false;
      setIsPaused(false);
    }
  }, []);

  const handlePress = useCallback((e: any) => {
    if (longPressActive.current) return;
    const x = e.nativeEvent.locationX;
    if (x < SW * 0.3) goToPrev();
    else              goToNext();
  }, [goToPrev, goToNext]);

  // ── Swipe-down-to-close (Reanimated worklet + Gesture) ───────────────────
  // We translate the entire content with the drag and dismiss past a threshold.
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
  }));

  const closeFromGesture = useCallback(() => {
    onClose();
  }, [onClose]);

  const swipeGesture = useMemo(() => Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetX([-20, 20])
    .onUpdate(e => {
      // Only respond to downward drags.
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd(e => {
      const shouldClose = e.translationY > 140 || e.velocityY > 900;
      if (shouldClose) {
        dragY.value = withTiming(900, { duration: 220 }, () => runOnJS(closeFromGesture)());
      } else {
        dragY.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    }), [dragY, closeFromGesture]);

  // ── Reply submit ─────────────────────────────────────────────────────────
  const handleReplySubmit = useCallback(() => {
    if (!replyText.trim()) return;
    // TODO: route into chat creation. For now we just ack visually.
    setReplyText('');
    setIsPaused(false);
  }, [replyText]);

  // ── Video callbacks ──────────────────────────────────────────────────────
  const handleVideoReady = useCallback(() => setVideoReady(true), []);
  const handleVideoEnded = useCallback(() => goToNext(),          [goToNext]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar hidden />

        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[styles.container, containerStyle]}>

            {/* ── Loading state when there's no item yet ─────────────────── */}
            {!currentItem || isFetching ? (
              <View style={styles.fetchOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                {loadError ? (
                  <Text style={styles.fetchError}>{loadError}</Text>
                ) : null}
              </View>
            ) : (
              <>
                {/* ── Media layer ────────────────────────────────────────── */}
                {isVideo ? (
                  <VideoStory
                    key={`video-${currentItem.id}`}
                    item={currentItem}
                    nextItem={nextItem}
                    isPaused={isPaused}
                    onVideoEnded={handleVideoEnded}
                    onVideoReady={handleVideoReady}
                  />
                ) : isText ? (
                  <TextStory key={`text-${currentItem.id}`} item={currentItem} />
                ) : (
                  <ImageStory
                    key={`image-${currentItem.id}`}
                    item={currentItem}
                    nextItem={nextItem}
                  />
                )}

                {/* ── Scrim gradients ────────────────────────────────────── */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.65)', 'transparent']}
                  style={styles.scrimTop}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.55)']}
                  style={styles.scrimBottom}
                  pointerEvents="none"
                />

                {/* ── Loading spinner (video buffering) ───────────────────── */}
                {isLoading && (
                  <View style={styles.loadingOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color="rgba(255,255,255,0.85)" />
                  </View>
                )}

                {/* ── HUD: progress + header ─────────────────────────────── */}
                <View
                  style={[styles.hud, { paddingTop: Math.max(insets.top, 16) }]}
                  pointerEvents="box-none"
                >
                  <View style={styles.progressRow}>
                    {items.map((_, i) => (
                      <ProgressSegment
                        key={i}
                        index={i}
                        currentIndex={currentIndex}
                        progress={progress}
                      />
                    ))}
                  </View>

                  <View style={styles.header}>
                    <View style={styles.userRow}>
                      <Avatar size="sm" name={story?.name ?? '?'} uri={story?.avatar ?? undefined} />
                      <Text style={styles.userName}>{story?.name ?? 'unknown'}</Text>
                      <Text style={styles.timeAgo}>· {currentItem.timeAgo}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={20}>
                      <Ionicons name="close" size={26} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ── Tap layer ──────────────────────────────────────────── */}
                {/* Sits below the bottom reply input so the keyboard / TextInput
                    can still receive focus. */}
                <Pressable
                  style={styles.tapLayer}
                  onPressIn={handlePressIn}
                  onLongPress={handleLongPress}
                  onPressOut={handlePressOut}
                  onPress={handlePress}
                  delayLongPress={150}
                />

                {/* ── Pause indicator ────────────────────────────────────── */}
                {isPaused && (
                  <View style={styles.pauseIndicator} pointerEvents="none">
                    <Ionicons name="pause" size={40} color="rgba(255,255,255,0.7)" />
                  </View>
                )}

                {/* ── Reply input (sits above the tap layer) ─────────────── */}
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={[styles.replyDock, { paddingBottom: Math.max(insets.bottom, 12) }]}
                  pointerEvents="box-none"
                >
                  <View style={styles.replyRow}>
                    <View style={styles.replyInputWrap}>
                      <TextInput
                        style={styles.replyInput}
                        placeholder={`Reply to ${story?.name ?? 'story'}…`}
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        value={replyText}
                        onChangeText={setReplyText}
                        onFocus={() => setIsPaused(true)}
                        onBlur={() => setIsPaused(false)}
                        returnKeyType="send"
                        onSubmitEditing={handleReplySubmit}
                      />
                    </View>
                    <TouchableOpacity style={styles.replyAction} hitSlop={12}>
                      <Ionicons name="heart-outline" size={26} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.replyAction}
                      hitSlop={12}
                      onPress={handleReplySubmit}
                      disabled={!replyText.trim()}
                    >
                      <Ionicons
                        name="paper-plane-outline"
                        size={24}
                        color={replyText.trim() ? '#fff' : 'rgba(255,255,255,0.4)'}
                      />
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              </>
            )}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  fetchOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24,
  },
  fetchError: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.medium, textAlign: 'center' },

  // Scrims
  scrimTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: 160, zIndex: 1 },
  scrimBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, zIndex: 1 },

  // HUD
  hud: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    paddingHorizontal: spacing.base,
  },

  // Progress
  progressRow: { flexDirection: 'row', gap: 3, marginBottom: 10 },
  segBg: {
    flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2, overflow: 'hidden',
  },
  segFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },

  // Header
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  userName: {
    color: '#fff', fontFamily: fonts.bold, fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  timeAgo:  { color: 'rgba(255,255,255,0.65)', fontFamily: fonts.medium, fontSize: 12 },

  // Tap layer — fills everything below the HUD and above the reply dock
  tapLayer: {
    position: 'absolute',
    top: 80, left: 0, right: 0, bottom: 80,
    zIndex: 4,
  },

  // Loading
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  pauseIndicator: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 15 },

  // Reply dock
  replyDock: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.base,
    paddingTop: 8,
    zIndex: 20,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyInputWrap: {
    flex: 1,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  replyInput: {
    color: '#fff',
    fontFamily: fonts.medium,
    fontSize: 14,
    paddingVertical: Platform.OS === 'ios' ? 0 : 6,
  },
  replyAction: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },

  // Text story
  textStoryWrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  textStoryText: { color: '#fff', fontSize: 32, fontFamily: fonts.bold, textAlign: 'center' },
});

export default StoryModal;
