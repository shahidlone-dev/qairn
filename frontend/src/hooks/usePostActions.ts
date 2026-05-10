// src/hooks/usePostActions.ts
//
// PHASE 1 OVERHAUL:
//   - Uses new setInFlight(id, action, bool) signature
//   - inFlight guard + rollback on every mutation
//   - Debounce via inFlight guard (no setTimeout needed — guard is synchronous)
//   - toggleLike never re-fires if already in flight

import { Alert } from 'react-native';
import { usePostStore } from '../store/usePostStore';
import PostsApi from '../api/posts.api';

export const usePostActions = () => {
  const updatePost  = usePostStore(s => s.updatePost);
  const setInFlight = usePostStore(s => s.setInFlight);
  const removePost  = usePostStore(s => s.removePost);

// ── toggleLike ─────────────────────────────────────────────────────────────
  // Optimistic update → server confirm → rollback on failure.
  // inFlight guard prevents double-tap spamming.
  const toggleLike = async (postId: string) => {
    const { inFlight, postsById } = usePostStore.getState();
    if (inFlight[postId]?.liking) return;          // debounce
    const post = postsById[postId];
    if (!post) return;

    const wasLiked  = post.is_liked;
    const prevCount = post.like_count || 0; // Safe fallback

    setInFlight(postId, 'liking', true);

    // Optimistic update
    updatePost(postId, p => ({
      ...p,
      is_liked:   !p.is_liked,
      like_count: p.is_liked ? Math.max(0, (p.like_count || 0) - 1) : (p.like_count || 0) + 1,
    }));

    try {
      const res = await PostsApi.likePost(postId);
      // Server confirm — reconcile with real counts.
      updatePost(postId, p => ({ ...p, is_liked: res.liked, like_count: res.like_count }));
    } catch {
      // Rollback
      updatePost(postId, p => ({ ...p, is_liked: wasLiked, like_count: prevCount }));
    } finally {
      setInFlight(postId, 'liking', false);
    }
  };

  // (Removed) toggleSave
  //
  // The bookmark icon now always opens SaveToCollectionSheet, which lets the
  // user pick a collection and calls /api/collections/:id/posts/:postId/toggle.
  // The old /api/posts/:id/save route was never registered on the server, so
  // this hook silently 404'd. SaveToCollectionSheet updates `is_saved` in the
  // store directly via usePostStore.updatePost.

  // ── deletePost ─────────────────────────────────────────────────────────────
  const deletePost = async (postId: string) => {
    const { inFlight } = usePostStore.getState();
    if (inFlight[postId]?.deleting) return;

    Alert.alert('Delete Post', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setInFlight(postId, 'deleting', true);
          try {
            await PostsApi.deletePost(postId);
            removePost(postId);
          } catch {
            Alert.alert('Error', 'Failed to delete post. Please try again.');
          } finally {
            setInFlight(postId, 'deleting', false);
          }
        },
      },
    ]);
  };

  return { toggleLike, deletePost };
};