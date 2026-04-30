// src/components/campus/PostCard.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../theme/theme';
import { Avatar } from '../ui';
import { Post } from '../../constants/mockFeed';
import { PostOptionsSheet } from './PostOptionsSheet';
import { RootStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

interface Props {
  post:     Post;
  onPress?: () => void;
}

export const PostCard: React.FC<Props> = ({ post, onPress }) => {
  const T          = getTheme(useColorScheme());
  const navigation = useNavigation<Nav>();

  const [liked,     setLiked]     = useState(post.liked);
  const [saved,     setSaved]     = useState(post.saved);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [sheetOpen, setSheetOpen] = useState(false);

  const goToComments = () =>
    navigation.navigate('PostDetail', { postId: post.id });

  return (
    <>
      <View style={[styles.card, { borderBottomColor: T.border }]}>

        {/* ── Tappable post body ───────────────────────────────────────────── */}
        <TouchableOpacity activeOpacity={0.97} onPress={onPress}>

          {/* Top row — avatar, meta, 3-dot */}
          <View style={styles.topRow}>
            <Avatar uri={post.user.avatar} name={post.user.username} size="md" />

            <View style={styles.meta}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.name, { color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}
                  numberOfLines={1}
                >
                  {post.user.username}
                </Text>
                {post.user.verified && (
                  <Ionicons name="checkmark-circle" size={14} color={T.blue} style={{ marginLeft: 3 }} />
                )}
                {post.user.premium && (
                  <Ionicons name="star" size={13} color={T.premium} style={{ marginLeft: 2 }} />
                )}
              </View>

              {/* Dept · time */}
              <View style={styles.subRow}>
                <View style={[styles.deptChip, { backgroundColor: T.accentMuted }]}>
                  <Text style={[{ color: T.accent, fontFamily: fonts.semibold, fontSize: fontSizes.xxs }]}>
                    {post.user.dept}
                  </Text>
                </View>
                <View style={[styles.dot, { backgroundColor: T.text3 }]} />
                <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs }]}>
                  {timeAgo(post.timestamp)}
                </Text>
              </View>
            </View>

            {/* 3-dot vertical */}
            <TouchableOpacity
              onPress={() => setSheetOpen(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={T.text3} />
            </TouchableOpacity>
          </View>

          {/* Post content */}
          <Text style={[styles.content, { color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.md }]}>
            {post.content}
          </Text>
        </TouchableOpacity>

        {/* ── Action bar ────────────────────────────────────────────────────── */}
        <View style={styles.actions}>
          {/* Like */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { setLiked(p => !p); setLikeCount(p => liked ? p - 1 : p + 1); }}
            activeOpacity={0.7}
          >
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? T.like : T.text3} />
            <Text style={[styles.count, { color: liked ? T.like : T.text3, fontFamily: fonts.medium, fontSize: fontSizes.xs }]}>
              {formatCount(likeCount)}
            </Text>
          </TouchableOpacity>

          {/* Comment icon → CommentsScreen */}
          <TouchableOpacity style={styles.actionBtn} onPress={goToComments} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={19} color={T.text3} />
            <Text style={[styles.count, { color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.xs }]}>
              {formatCount(post.comments)}
            </Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-redo-outline" size={20} color={T.text3} />
            <Text style={[styles.count, { color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.xs }]}>
              {formatCount(post.shares)}
            </Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Save */}
          <TouchableOpacity onPress={() => setSaved(p => !p)} activeOpacity={0.7}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={saved ? T.save : T.text3}
            />
          </TouchableOpacity>
        </View>

        {/* ── Preview comment ───────────────────────────────────────────────── */}
        {post.previewComment && (
          <View style={[styles.previewWrapper, { borderTopColor: T.borderSubtle }]}>
            {/* Arrow drops down from comment icon position */}
            <View style={styles.previewArrowRow}>
              <Ionicons name="caret-down" size={11} color={T.text3} />
            </View>

            {/* Avatar + comment text */}
            <View style={styles.previewRow}>
              <Avatar size="xs" />
              <Text
                style={[styles.previewText, { color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.sm }]}
                numberOfLines={2}
              >
                <Text style={{ color: T.text, fontFamily: fonts.semibold }}>
                  {post.previewComment.username}{' '}
                </Text>
                {post.previewComment.text}
              </Text>
            </View>
          </View>
        )}

      </View>

      {/* Options bottom sheet */}
      <PostOptionsSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        inCircle={post.inCircle}
        username={post.user.username}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop:        spacing.base,
  },

  // Top row
  topRow: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    gap:               spacing.sm,
    marginBottom:      spacing.sm,
    paddingHorizontal: spacing.base,
  },
  meta:     { flex: 1 },
  nameRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name:     { flexShrink: 1 },
  subRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:      { width: 3, height: 3, borderRadius: 99, opacity: 0.4 },
  deptChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.pill },

  // Content
  content: {
    lineHeight:        22,
    marginBottom:      spacing.sm,
    paddingHorizontal: spacing.base,
  },

  // Actions
  actions: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
  },
  actionBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    paddingVertical: spacing.xs,
    paddingRight:   spacing.md,
  },
  count: {},

  // Preview comment
  previewWrapper: {
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.md,
    borderTopWidth:    StyleSheet.hairlineWidth,
    paddingTop:        0,
  },
  previewArrowRow: {
    paddingLeft:    52,
    marginBottom:   2,
  },
  previewRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            spacing.sm,
    paddingLeft:    52,   // avatar aligns under comment icon
  },
  previewText: {
    flex:       1,
    lineHeight: 18,
  },
});