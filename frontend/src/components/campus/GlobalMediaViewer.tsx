// src/components/campus/GlobalMediaViewer.tsx
//
// Videos-only, Instagram-Reels-style vertical pager.
// Image posts are handled by the dedicated PostImageViewer screen — this
// viewer never renders images directly (the Image element below is a poster
// shown while the video decoder warms up).

import React, { memo, useRef, useState, useCallback, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Modal, Dimensions,
  Text, ViewToken, StatusBar, BackHandler,
  Animated, InteractionManager,
  ActivityIndicator, Easing, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import { fonts, fontSizes, spacing, radii } from '../../types/theme';
import { usePostStore, selectPost } from '../../store/usePostStore';
import PostsApi from '../../api/posts.api';
import { RootStackParamList } from '../../types/navigation';

import { useVideoPlayback } from '../../context/VideoPlaybackContext';

const { width: SW, height: SH } = Dimensions.get('window');

// Public data shape — every entry is a video post.
export type GlobalMediaData = {
  uri:    string;
  postId: string;
};

type Props = {
  visible:      boolean;
  data:         GlobalMediaData[];
  initialIndex: number;
  onClose:      () => void;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const Scrim = memo(() => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.scrimTop} />
    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.scrimBottom} />
  </View>
));
Scrim.displayName = 'Scrim';

const LikeAnim = memo(({ visible }: { visible: boolean }) => {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 220 }),
      Animated.sequence([
        Animated.delay(380),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    ]).start(() => {
      scale.setValue(0);
      opacity.setValue(1);
    });
  }, [visible]);

  if (!visible) return null;
  return (
    <View style={styles.likeAnimWrap} pointerEvents="none">
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Ionicons name="heart" size={100} color="rgba(255,255,255,0.92)" />
      </Animated.View>
    </View>
  );
});
LikeAnim.displayName = 'LikeAnim';

// ─────────────────────────────────────────────────────────────────────────────
// STRICT VIDEO CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
const VideoPlayerController = memo(({ 
  uri, shouldPlay, muted, onStatusChange 
}: {
  uri: string;
  shouldPlay: boolean;
  muted: boolean;
  onStatusChange: (status: string) => void;
}) => {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    p.muted = muted;
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => onStatusChange(status));
    onStatusChange(player.status);
    return () => sub.remove();
  }, [player, onStatusChange]);

  useEffect(() => {
    if (shouldPlay) player.play();
    else player.pause();
  }, [shouldPlay, player]);

  useEffect(() => { player.muted = muted; }, [muted, player]);

  return (
    <VideoView 
      player={player} 
      style={StyleSheet.absoluteFill} 
      contentFit="cover" 
      nativeControls={false} 
    />
  );
});
VideoPlayerController.displayName = 'VideoPlayerController';

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────
function useOptimisticLike(postId: string) {
  const post = usePostStore(selectPost(postId));
  const updatePost = usePostStore(state => state.updatePost);
  const pendingRef = useRef(false);

  return useCallback(async () => {
    if (pendingRef.current || !post) return;
    pendingRef.current = true;

    const wasLiked = post.is_liked;
    const prevCount = post.like_count;

    updatePost(postId, p => ({
      ...p,
      is_liked:   !wasLiked,
      like_count: wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
    }));

    try {
      const res = await PostsApi.likePost(postId);
      updatePost(postId, p => ({
        ...p,
        is_liked:   res.liked,
        like_count: res.like_count,
      }));
    } catch {
      updatePost(postId, p => ({
        ...p,
        is_liked:   wasLiked,
        like_count: prevCount,
      }));
    } finally {
      pendingRef.current = false;
    }
  }, [postId, post, updatePost]);
}

// ─────────────────────────────────────────────────────────────────────────────
// REEL ITEM (With Dopamine Scroll Polish)
// ─────────────────────────────────────────────────────────────────────────────
const ReelItem = memo(({ item, index, scrollY, isActive, isAdjacent, onClose, onNavigateCreate }: any) => {
  const insets = useSafeAreaInsets();
  
  // FIXED: Consume Unified Audio State
  const { isMuted, setMuted } = useVideoPlayback();

  const [userPaused, setUserPaused] = useState(false);
  const [videoStatus, setVideoStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const [likeAnim, setLikeAnim] = useState(false);

  const optimisticLike = useOptimisticLike(item.postId);
  const videoOpacity = useRef(new Animated.Value(0)).current;

  const shouldMount = isActive || isAdjacent;
  const shouldPlay = isActive && !userPaused && videoStatus !== 'error';

  useEffect(() => {
    if (videoStatus === 'ready') {
      Animated.timing(videoOpacity, {
        toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start();
    } else {
      videoOpacity.setValue(0);
    }
  }, [videoStatus, videoOpacity]);

  // Map expo-video's raw `statusChange` payload onto our tri-state
  // (loading / ready / error). Anything other than `readyToPlay` and `error`
  // collapses to `loading` so the spinner overlay shows during buffering.
  // (This was previously overwritten by a paste from the FAB code, which
  // referenced undefined symbols and caused the
  // "Property 'handleStatusChange' doesn't exist" runtime error.)
  const handleStatusChange = useCallback((status: string) => {
    if (status === 'readyToPlay')   setVideoStatus('ready');
    else if (status === 'error')    setVideoStatus('error');
    else                            setVideoStatus('loading');
  }, []);

  const handleRetry = useCallback(() => {
    setVideoStatus('loading');
    setRetryKey(k => k + 1);
  }, []);

  const handlePlayPauseToggle = useCallback(() => setUserPaused(p => !p), []);
  const handleMuteToggle = useCallback(() => setMuted(!isMuted), [isMuted, setMuted]);

  let lastHaptic = 0;
  const handleDouble = useCallback(() => {
    optimisticLike();
    const now = Date.now();
    if (now - lastHaptic > 500) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      lastHaptic = now;
    }
    setLikeAnim(false);
    requestAnimationFrame(() => setLikeAnim(true));
    setTimeout(() => setLikeAnim(false), 700);
  }, [optimisticLike]);

  // FIXED: Sync Gestures
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDelay(250)
    .runOnJS(true)
    .onEnd(handlePlayPauseToggle);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .runOnJS(true)
    .onEnd(handleDouble);

  const taps = Gesture.Exclusive(doubleTap, singleTap);

  const scale = scrollY.interpolate({
    inputRange: [(index - 1) * SH, index * SH, (index + 1) * SH],
    outputRange: [0.94, 1, 0.94],
    extrapolate: 'clamp',
  });
  
  const opacity = scrollY.interpolate({
    inputRange: [(index - 1) * SH, index * SH, (index + 1) * SH],
    outputRange: [0.85, 1, 0.85],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.reelItem, { transform: [{ scale }], opacity }]}>
      <StatusBar hidden />

      {videoStatus !== 'ready' && (
        <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}

      {shouldMount && videoStatus !== 'error' && (
        <GestureDetector gesture={taps}>
          <View style={StyleSheet.absoluteFill} collapsable={false}>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}>
              <VideoPlayerController 
                key={`player-${retryKey}`}
                uri={item.uri} 
                shouldPlay={shouldPlay} 
                muted={isMuted} 
                onStatusChange={handleStatusChange} 
              />
            </Animated.View>
          </View>
        </GestureDetector>
      )}

      {isActive && videoStatus === 'loading' && (
        <View style={styles.statusOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
        </View>
      )}

      {videoStatus === 'error' && (
        <View style={styles.statusOverlay}>
          <Ionicons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.7)" />
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryText}>Tap to Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <Scrim />
      <LikeAnim visible={likeAnim} />

      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity onPress={onNavigateCreate} style={styles.topBtn} hitSlop={10}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.topRight}>
          <TouchableOpacity onPress={handlePlayPauseToggle} style={styles.topBtn} hitSlop={10}>
            <Ionicons name={!userPaused && isActive ? 'pause' : 'play'} size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMuteToggle} style={styles.topBtn} hitSlop={10}>
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.topBtn} hitSlop={10}>
            <Ionicons name="chevron-down" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

    </Animated.View>
  );
}, (prev, next) =>
  prev.isActive   === next.isActive &&
  prev.isAdjacent === next.isAdjacent &&
  prev.item.postId === next.item.postId
);
ReelItem.displayName = 'ReelItem';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: GlobalMediaViewer
// ─────────────────────────────────────────────────────────────────────────────
export const GlobalMediaViewer: React.FC<Props> = ({ visible, data, initialIndex, onClose }) => {
  const navigation = useNavigation<Nav>();

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [visible, onClose]);

  const viewConfig   = useRef({ itemVisiblePercentThreshold: 60, minimumViewTime: 50 });
  const onViewChange = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  });

  const handleCreate = useCallback(() => {
    onClose();
    InteractionManager.runAfterInteractions(() => navigation.navigate('CreatePost', { mode: 'video' }));
  }, [navigation, onClose]);

  const keyExtractor = useCallback((item: GlobalMediaData) => `reel-${item.postId}`, []);

  if (!visible || data.length === 0) return null;

  return (
    <Modal visible={visible} animationType="slide" onShow={() => setActiveIndex(initialIndex)} statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.root}>
              <Animated.FlatList
                data={data}
                keyExtractor={keyExtractor}
                renderItem={({ item, index }) => (
                  <ReelItem
                    item={item}
                    index={index}
                    scrollY={scrollY}
                    isActive={index === activeIndex}
                    isAdjacent={Math.abs(index - activeIndex) <= 1}
                    onClose={onClose}
                    onNavigateCreate={handleCreate}
                  />
                )}
                pagingEnabled
                snapToInterval={SH}
                snapToAlignment="start"
                decelerationRate={Platform.OS === 'ios' ? 0.92 : 'fast'}
                disableIntervalMomentum={true}
                overScrollMode="never"
                showsVerticalScrollIndicator={false}
                initialScrollIndex={initialIndex}
                viewabilityConfig={viewConfig.current}
                onViewableItemsChanged={onViewChange.current}
                getItemLayout={(_, index) => ({ length: SH, offset: SH * index, index })}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                bounces={false}
                
                // FIXED: FLatList Optimizations
                windowSize={3}
                maxToRenderPerBatch={1}
                initialNumToRender={1}
                removeClippedSubviews={true}
              />
          </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#000' },
  reelItem:    { width: SW, height: SH, backgroundColor: '#000' },

  scrimTop: { position: 'absolute', top: 0, left: 0, right: 0, height: SH * 0.18 },
  scrimBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SH * 0.52 },

  statusOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  errorText: { color: 'rgba(255,255,255,0.8)', marginTop: 12, fontFamily: fonts.medium, fontSize: fontSizes.md },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radii.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  retryText: { color: '#fff', fontFamily: fonts.semibold, fontSize: fontSizes.sm },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topBtn: { backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: radii.pill, padding: 8 },

  likeAnimWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
});