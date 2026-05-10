// src/components/campus/MediaViewer.tsx
// FIX: Added player.release() cleanup useEffect.
// Previously the native video decoder was never freed when the component
// unmounted (e.g. user navigating away from CreatePostScreen), leaking
// hardware resources on every post creation session.

import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { getTheme, radii, spacing } from '../../types/theme';
import type { Post as ApiPost } from '../../types/api.types';

type MediaItem = { uri: string; type: 'image' | 'video' };

interface Props {
  data:          MediaItem[];
  initialIndex?: number;
  onRemove?:     () => void;
  post?:         ApiPost;
}

export const MediaViewer: React.FC<Props> = ({ data, initialIndex = 0, onRemove }) => {
  const T          = getTheme(useColorScheme());
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 5);

  const activeItem  = data[initialIndex];
  const videoSource = activeItem?.type === 'video' ? activeItem.uri : null;

  const player = useVideoPlayer(videoSource, p => {
    p.loop  = true;
    p.muted = true;
    p.play();
  });

  // FIX: Release the native decoder when this component unmounts.
  // Without this, every MediaViewer instance (used inside CreatePostScreen
  // for the post preview) leaks a live hardware decoder.
  useEffect(() => {
    return () => {
      try { player?.release(); } catch {}
    };
  }, [player]);

  if (!activeItem) return null;

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: T.bgCard, borderColor: T.borderSubtle, aspectRatio },
      ]}
    >
      {activeItem.type === 'image' ? (
        <Image
          source={{ uri: activeItem.uri }}
          style={styles.media}
          resizeMode="cover"
          onLoad={e => setAspectRatio(e.nativeEvent.source.width / e.nativeEvent.source.height)}
        />
      ) : (
        <VideoView
          player={player}
          style={styles.media}
          contentFit="cover"
          nativeControls={false}
          onLayout={() => setAspectRatio(4 / 5)}
        />
      )}

      {activeItem.type === 'video' && !onRemove && (
        <View style={styles.videoIndicator}>
          <Ionicons name="play" size={16} color="#fff" />
        </View>
      )}

      {onRemove && (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper:        { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', width: '100%' },
  media:          { width: '100%', height: '100%' },
  videoIndicator: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: radii.pill },
  removeBtn:      { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(0,0,0,0.6)', width: 28, height: 28, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});