// src/components/campus/PostActionRow.tsx

import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { fonts, spacing } from '../../types/theme';

function fmt(n: number): string {
  if (n === undefined || n === null) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

const ActionButton = memo(({ onPress, disabled, style, children }: any) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    style={({ pressed }) => [
      styles.actionBtn,
      style,
      pressed && { opacity: 0.6 },
    ]}
  >
    {children}
  </Pressable>
));
ActionButton.displayName = 'ActionButton';

interface PostActionRowProps {
  post: any;
  inFlight: any;
  T: any;
  likeAnimatedStyle: any;
  onLikePress: () => void;
  onCommentPress: () => void;
  onSharePress: () => void;
  onSavePress: () => void;
}

export const PostActionRow = memo(({
  post,
  inFlight,
  T,
  likeAnimatedStyle,
  onLikePress,
  onCommentPress,
  onSharePress,
  onSavePress
}: PostActionRowProps) => {
  return (
    <View style={styles.actionRow}>
      
      {/* Gradient Like Button */}
      <ActionButton onPress={onLikePress} disabled={inFlight?.liking}>
        <Animated.View style={[likeAnimatedStyle, { width: 21, height: 21, justifyContent: 'center', alignItems: 'center' }]}>
          {post.is_liked ? (
            <MaskedView
              style={StyleSheet.absoluteFill}
              maskElement={
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="heart" size={21} color="white" />
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
          ) : (
            <Ionicons name="heart-outline" size={21} color={T.text3} />
          )}
        </Animated.View>
        <Text style={{ color: post.is_liked ? T.accent : T.text3, fontFamily: fonts.semibold, fontSize: 13, marginLeft: 4 }}>
          {fmt(post.like_count || 0)}
        </Text>
      </ActionButton>

      {/* Comment Button */}
      <ActionButton onPress={onCommentPress}>
        <Ionicons name="chatbubble-outline" size={20} color={T.text3} />
        <Text style={{ color: T.text3, fontFamily: fonts.semibold, fontSize: 13, marginLeft: 4 }}>
          {fmt(post.comment_count || 0)}
        </Text>
      </ActionButton>

      {/* Share Button */}
      <ActionButton onPress={onSharePress}>
        <Ionicons name="arrow-redo-outline" size={21} color={T.text3} />
        <Text style={{ color: T.text3, fontFamily: fonts.semibold, fontSize: 13, marginLeft: 4 }}>
          {fmt(post.share_count || 0)}
        </Text>
      </ActionButton>

      <View style={{ flex: 1 }} />

      {/* Save Button */}
      <ActionButton onPress={onSavePress} disabled={inFlight?.saving}>
        <Ionicons
          name={post.is_saved ? 'bookmark' : 'bookmark-outline'}
          size={21}
          color={post.is_saved ? T.accent : T.text3}
        />
      </ActionButton>

    </View>
  );
});

PostActionRow.displayName = 'PostActionRow';

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4, marginLeft: -6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: 8, marginRight: 16 },
});