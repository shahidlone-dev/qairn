// src/screens/campus/CommentsScreen.tsx

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { getTheme, fonts, fontSizes, spacing, radii } from '../../theme/theme';
import { Avatar } from '../../components/ui';
import { MOCK_POSTS, CURRENT_USER, Comment } from '../../constants/mockFeed';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'PostDetail'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type CommentWithReply = Comment & {
  ownerReply?: { text: string; timestamp: string };
};

// ─── Owner comment thread item ────────────────────────────────────────────────
const OwnerCommentItem: React.FC<{
  comment:  CommentWithReply;
  isLast:   boolean;
  T:        ReturnType<typeof getTheme>;
  onReply:  (id: string, username: string) => void;
}> = ({ comment, isLast, T, onReply }) => (
  <View style={styles.threadItem}>
    {/* Left — avatar + thread line */}
    <View style={styles.threadLeft}>
      <Avatar size="sm" name={comment.username} />
      {/* Line continues down unless last item with no reply */}
      {(!isLast || comment.ownerReply) && (
        <View style={[styles.threadLine, { backgroundColor: T.border }]} />
      )}
    </View>

    {/* Right — comment + reply */}
    <View style={styles.threadRight}>
      {/* Comment bubble */}
      <View style={[styles.commentBubble, { backgroundColor: T.bgCard }]}>
        <View style={styles.bubbleHeader}>
          <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.xs }]}>
            {comment.username}
          </Text>
          <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xxs }]}>
            {timeAgo(comment.timestamp)}
          </Text>
        </View>
        <Text style={[{ color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.sm, lineHeight: 18, marginTop: 3 }]}>
          {comment.text}
        </Text>
      </View>

      {/* Reply button */}
      {!comment.ownerReply && (
        <TouchableOpacity
          style={styles.replyBtn}
          onPress={() => onReply(comment.id, comment.username)}
          activeOpacity={0.7}
        >
          <Ionicons name="return-down-forward-outline" size={12} color={T.text3} />
          <Text style={[{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.xxs }]}>
            Reply
          </Text>
        </TouchableOpacity>
      )}

      {/* Owner reply — threaded below */}
      {comment.ownerReply && (
        <View style={styles.ownerReplyWrap}>
          {/* Sub-thread left */}
          <View style={styles.subThreadLeft}>
            <Avatar size="xs" name={CURRENT_USER.username} uri={CURRENT_USER.avatar} />
          </View>
          {/* Reply bubble */}
          <View style={[styles.replyBubble, { backgroundColor: T.accentMuted, borderColor: T.accentLight }]}>
            <View style={styles.bubbleHeader}>
              <Text style={[{ color: T.accent, fontFamily: fonts.semibold, fontSize: fontSizes.xs }]}>
                You
              </Text>
              <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xxs }]}>
                {timeAgo(comment.ownerReply.timestamp)}
              </Text>
            </View>
            <Text style={[{ color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.sm, lineHeight: 18, marginTop: 3 }]}>
              {comment.ownerReply.text}
            </Text>
          </View>
        </View>
      )}

      {/* Bottom spacing */}
      <View style={{ height: spacing.md }} />
    </View>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
export const CommentsScreen: React.FC<Props> = ({ route, navigation }) => {
  const T      = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();
  const postId = route.params.postId;

  const post    = MOCK_POSTS.find(p => p.id === postId);
  const isOwner = post?.user.username === CURRENT_USER.username;

  const inputRef = useRef<TextInput>(null);
  const [comments,       setComments]       = useState<CommentWithReply[]>(post?.allComments ?? []);
  const [inputText,      setInputText]      = useState('');
  const [replyTarget,    setReplyTarget]    = useState<{ id: string; username: string } | null>(null);
  const [mySentComments, setMySentComments] = useState<Comment[]>([]);

  if (!post) return null;

  const handleReplyTap = (id: string, username: string) => {
    setReplyTarget({ id, username });
    setInputText('');
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyTarget(null);
    setInputText('');
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const now = new Date().toISOString();

    if (isOwner && replyTarget) {
      setComments(prev => prev.map(c =>
        c.id === replyTarget.id
          ? { ...c, ownerReply: { text: inputText.trim(), timestamp: now } }
          : c
      ));
      setReplyTarget(null);
    } else if (!isOwner) {
      setMySentComments(prev => [...prev, {
        id:        `c${Date.now()}`,
        username:  CURRENT_USER.username,
        text:      inputText.trim(),
        timestamp: now,
      }]);
    }
    setInputText('');
  };

  // ── Regular user thread view ───────────────────────────────────────────────
  const RegularView = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.regularScroll}
      keyboardShouldPersistTaps="handled"
    >
      {/* Thread: post → comment */}
      <View style={styles.threadItem}>
        {/* Left column: post owner avatar + line */}
        <View style={styles.threadLeft}>
          <Avatar size="sm" uri={post.user.avatar} name={post.user.username} />
          <View style={[styles.threadLine, { backgroundColor: T.border }]} />
          {/* Commenter avatar at bottom of line */}
          {mySentComments.length > 0 && <Avatar size="xs" name={CURRENT_USER.username} uri={CURRENT_USER.avatar} />}
        </View>

        {/* Right column */}
        <View style={styles.threadRight}>
          {/* Post snippet */}
          <View style={styles.postSnippet}>
            <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>
              {post.user.username}
            </Text>
            <Text
              style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, lineHeight: 16, marginTop: 2 }]}
              numberOfLines={3}
            >
              {post.content}
            </Text>
          </View>

          {/* Sent comments */}
          {mySentComments.map((myComment, index) => (
            <View key={myComment.id} style={[styles.sentBlock, index > 0 && { marginTop: spacing.md }]}>
              <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>
                {CURRENT_USER.username}
              </Text>
              <Text style={[{ color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.sm, lineHeight: 18, marginTop: 2 }]}>
                {myComment.text}
              </Text>
              <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xxs, marginTop: 4 }]}>
                {timeAgo(myComment.timestamp)}
              </Text>
            </View>
          ))}

          {/* Prompt when not yet sent */}
          {mySentComments.length === 0 && (
            <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xs, marginTop: 4 }]}>
              Reply to {post.user.username}...
            </Text>
          )}
          <View style={{ height: spacing.md }} />
        </View>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1, backgroundColor: T.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <View style={[styles.header, { borderBottomColor: T.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.lg }]}>
            Comments
          </Text>
          <View style={{ width: 22 }} />
        </View>

        {/* ── Post preview ──────────────────────────────────────────────────── */}
        <View style={[styles.postPreview, { borderBottomColor: T.border, backgroundColor: T.bgCard }]}>
          <Avatar size="sm" uri={post.user.avatar} name={post.user.username} />
          <View style={{ flex: 1 }}>
            <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.sm }]}>
              {post.user.username}
              <Text style={[{ color: T.text3, fontFamily: fonts.regular }]}>
                {'  ·  '}{post.user.dept}
              </Text>
            </Text>
            <Text
              style={[{ color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.sm, lineHeight: 18, marginTop: 3 }]}
              numberOfLines={3}
            >
              {post.content}
            </Text>
          </View>
        </View>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        {isOwner ? (
          comments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={36} color={T.text3} />
              <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md, textAlign: 'center' }]}>
                No comments yet
              </Text>
              <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, textAlign: 'center', lineHeight: 20 }]}>
                When someone comments on your post,{'\n'}it will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => (
                <OwnerCommentItem
                  comment={item}
                  isLast={index === comments.length - 1}
                  T={T}
                  onReply={handleReplyTap}
                />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
            />
          )
        ) : (
          <RegularView />
        )}

        {/* ── Reply indicator ───────────────────────────────────────────────── */}
        {isOwner && replyTarget && (
          <View style={[styles.replyIndicator, { backgroundColor: T.accentMuted, borderColor: T.accent }]}>
            <Text style={[{ color: T.accent, fontFamily: fonts.medium, fontSize: fontSizes.xs }]}>
              Replying to {replyTarget.username}
            </Text>
            <TouchableOpacity onPress={cancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={14} color={T.accent} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Input bar ─────────────────────────────────────────────────────── */}
        {(!isOwner || (isOwner && replyTarget)) && (
          <View style={[
            styles.inputBar,
            {
              borderTopColor:  T.border,
              backgroundColor: T.bg,
              paddingBottom:   Math.max(insets.bottom, spacing.sm), // Fixes iOS Keyboard Gap
            },
          ]}>
            <Avatar size="xs" name={CURRENT_USER.username} uri={CURRENT_USER.avatar} />
            <View style={[styles.inputWrap, { backgroundColor: T.bgInput, borderRadius: radii.pill }]}>
              <TextInput
                ref={inputRef}
                value={inputText}
                onChangeText={setInputText}
                placeholder={
                  isOwner && replyTarget
                    ? `Reply to ${replyTarget.username}...`
                    : `Comment on this post...`
                }
                placeholderTextColor={T.textMuted}
                style={[styles.input, { color: T.text, fontFamily: fonts.regular, fontSize: fontSizes.sm }]}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                multiline
                autoFocus={!isOwner}
              />
              {inputText.trim().length > 0 && (
                <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.8}>
                  <Ionicons name="send" size={16} color={T.accent} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const AVATAR_SM = 32;
const AVATAR_XS = 24;

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Post preview
  postPreview: {
    flexDirection:     'row',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Thread layout (shared by owner + regular)
  threadItem: {
    flexDirection:     'row',
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.md,
  },
  threadLeft: {
    alignItems:  'center',
    marginRight: spacing.sm,
    width:       AVATAR_SM,
  },
  threadLine: {
    width:     2,
    flex:      1,
    minHeight: spacing.lg,
    marginVertical: 4,
    borderRadius: 99,
  },
  threadRight: {
    flex: 1,
  },

  // Owner comment bubble
  commentBubble: {
    borderRadius:  radii.lg,
    padding:       spacing.md,
  },
  bubbleHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  replyBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    marginTop:      spacing.xs,
    paddingVertical: 2,
  },

  // Owner reply (sub-thread)
  ownerReplyWrap: {
    flexDirection: 'row',
    marginTop:     spacing.sm,
    gap:           spacing.sm,
  },
  subThreadLeft: {
    width:      AVATAR_XS,
    alignItems: 'center',
  },
  replyBubble: {
    flex:         1,
    borderRadius: radii.lg,
    borderWidth:  StyleSheet.hairlineWidth,
    padding:      spacing.md,
  },

  // Regular user view
  regularScroll: {
    paddingBottom: spacing.xxl,
  },
  postSnippet: {
    marginBottom: spacing.lg,
  },
  sentBlock: {
    marginBottom: spacing.sm,
  },

  // Empty state
  emptyState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.sm,
    padding:        spacing.xxl,
  },

  // Reply indicator
  replyIndicator: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    marginHorizontal:  spacing.base,
    marginBottom:      spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    borderRadius:      radii.md,
    borderWidth:       StyleSheet.hairlineWidth,
  },

  // Input bar
  inputBar: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.sm,
    borderTopWidth:    StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    minHeight:         38,
  },
  input:   { flex: 1, includeFontPadding: false, maxHeight: 80 },
  sendBtn: { paddingLeft: spacing.sm },
});