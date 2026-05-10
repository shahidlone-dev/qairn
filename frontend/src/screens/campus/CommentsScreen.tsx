// src/screens/campus/CommentsScreen.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { Avatar } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { usePostStore } from '../../store/usePostStore';
import PostsApi from '../../api/posts.api';
import { timeAgo } from '../../components/campus/PostCard';
import { RootStackScreenProps } from '../../types/navigation';
import type { Comment } from '../../types/api.types';

type Props = RootStackScreenProps<'PostDetail'>;

// ─── Single comment row ───────────────────────────────────────────────────────
const CommentRow: React.FC<{
  comment:  Comment;
  T:        ReturnType<typeof getTheme>;
  isOwner:  boolean;
  onReply:  (id: string, username: string) => void;
}> = ({ comment, T, isOwner, onReply }) => (
  <View style={styles.commentRow}>
    <Avatar size="sm" uri={comment.user.avatar_url} name={comment.user.username} />
    <View style={styles.commentBody}>
      <View style={styles.bubbleHeader}>
        <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.xs }]}>
          {comment.user.username}
        </Text>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.xxs }]}>
          {timeAgo(comment.created_at)}
        </Text>
      </View>
      <Text style={[{ color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.sm, lineHeight: 18, marginTop: 2 }]}>
        {comment.text}
      </Text>
      {isOwner && (
        <TouchableOpacity
          style={styles.replyBtn}
          onPress={() => onReply(comment.id, comment.user.username)}
          activeOpacity={0.7}
        >
          <Ionicons name="return-down-forward-outline" size={12} color={T.text3} />
          <Text style={[{ color: T.text3, fontFamily: fonts.medium, fontSize: fontSizes.xxs }]}>
            Reply
          </Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
export const CommentsScreen: React.FC<Props> = ({ route, navigation }) => {
  const T      = getTheme(useColorScheme());
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const postId = route.params.postId;

  // ✅ FIX: Read post from Zustand — real data, not mock
  const post = usePostStore(s => s.postsById[postId]);
  const updatePost = usePostStore(s => s.updatePost);

  // ✅ FIX: ownership from real user id
  const isOwner = !!user && !!post && user.id === post.user.id;

  const inputRef = useRef<TextInput>(null);

  const [comments,      setComments]      = useState<Comment[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [isFetchingMore,setIsFetchingMore] = useState(false);
  const [hasMore,       setHasMore]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const pageRef = useRef(1);

  const [inputText,   setInputText]   = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; username: string } | null>(null);
  const [isSending,   setIsSending]   = useState(false);

  // ── Load comments ─────────────────────────────────────────────────────────
  const loadComments = useCallback(async (refresh = false) => {
    if (!hasMore && !refresh) return;

    if (refresh) {
      pageRef.current = 1;
      setIsLoading(true);
    } else {
      setIsFetchingMore(true);
    }
    setError(null);

    try {
      const res = await PostsApi.getComments(postId, {
        cursor: String(pageRef.current),
        limit:  20,
      });

      if (refresh || pageRef.current === 1) {
        setComments(res.items);
      } else {
        setComments(prev => [...prev, ...res.items]);
      }

      setHasMore(res.hasMore);
      if (res.hasMore) pageRef.current += 1;
    } catch (err: any) {
      setError('Could not load comments. Tap to retry.');
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [postId]);

  useEffect(() => { loadComments(true); }, [postId]);

  // ── Send comment ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    const parentId = replyTarget?.id;

    try {
      // ✅ PostsApi.addComment now returns Comment directly (mapped in posts_api.ts)
      const newComment = await PostsApi.addComment(postId, text, parentId);

      setComments(prev => [newComment, ...prev]);

      // Bump comment count in the store so the feed card stays in sync
      updatePost(postId, p => ({ ...p, comment_count: p.comment_count + 1 }));

      setInputText('');
      setReplyTarget(null);
    } catch {
      // Keep input text so user doesn't lose it
    } finally {
      setIsSending(false);
    }
  };

  const handleReplyTap = (id: string, username: string) => {
    setReplyTarget({ id, username });
    setInputText('');
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyTarget(null);
    setInputText('');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <>
      {/* Post snippet */}
      {post && (
        <View style={[styles.postPreview, { borderBottomColor: T.border }]}>
          <Avatar size="sm" uri={post.user.avatar_url} name={post.user.username} />
          <View style={{ flex: 1 }}>
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
        </View>
      )}
      {/* Error banner */}
      {error && (
        <TouchableOpacity style={[styles.errorBanner, { backgroundColor: T.error + '18' }]} onPress={() => loadComments(true)}>
          <Text style={[{ color: T.error, fontFamily: fonts.medium, fontSize: fontSizes.sm }]}>{error}</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="chatbubble-outline" size={36} color={T.text3} />
        <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md, textAlign: 'center' }]}>
          No comments yet
        </Text>
        <Text style={[{ color: T.text3, fontFamily: fonts.regular, fontSize: fontSizes.sm, textAlign: 'center', lineHeight: 20 }]}>
          Be the first to comment.
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1, backgroundColor: T.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: T.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={[{ color: T.text, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>
            Comments
          </Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Loading state */}
        {isLoading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={T.accent} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <CommentRow
                comment={item}
                T={T}
                isOwner={isOwner}
                onReply={handleReplyTap}
              />
            )}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={
              isFetchingMore
                ? <ActivityIndicator size="small" color={T.accent} style={{ paddingVertical: spacing.lg }} />
                : null
            }
            onEndReached={() => loadComments(false)}
            onEndReachedThreshold={0.4}
            inverted={comments.length > 0}     // newest at bottom, natural chat feel
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Reply indicator */}
        {replyTarget && (
          <View style={[styles.replyIndicator, { backgroundColor: T.accentMuted, borderColor: T.accent }]}>
            <Text style={[{ color: T.accent, fontFamily: fonts.medium, fontSize: fontSizes.xs }]}>
              Replying to @{replyTarget.username}
            </Text>
            <TouchableOpacity onPress={cancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={14} color={T.accent} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={[
          styles.inputBar,
          {
            borderTopColor:  T.border,
            backgroundColor: T.bg,
            paddingBottom:   Math.max(insets.bottom, spacing.sm),
          },
        ]}>
          <Avatar size="xs" uri={user?.avatar_url} name={user?.username} />
          <View style={[styles.inputWrap, { backgroundColor: T.bgInput, borderRadius: radii.pill }]}>
            <TextInput
              ref={inputRef}
              value={inputText}
              onChangeText={setInputText}
              placeholder={replyTarget ? `Reply to @${replyTarget.username}...` : 'Add a comment...'}
              placeholderTextColor={T.text3}
              style={[styles.input, { color: T.text, fontFamily: fonts.regular, fontSize: fontSizes.sm }]}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              multiline
              editable={!isSending}
            />
            {inputText.trim().length > 0 && (
              <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.8} disabled={isSending}>
                {isSending
                  ? <ActivityIndicator size="small" color={T.accent} />
                  : <Ionicons name="send" size={16} color={T.accent} />
                }
              </TouchableOpacity>
            )}
          </View>
        </View>

      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  loadingCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  postPreview: {
    flexDirection:     'row',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentRow: {
    flexDirection:     'row',
    gap:               spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
  },
  commentBody: { flex: 1 },
  bubbleHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   2,
  },
  replyBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    marginTop:      spacing.xs,
    paddingVertical: 2,
  },
  emptyState: {
    padding:        spacing.xxl,
    alignItems:     'center',
    gap:            spacing.sm,
  },
  errorBanner: {
    margin:        spacing.base,
    padding:       spacing.md,
    borderRadius:  radii.md,
    alignItems:    'center',
  },
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