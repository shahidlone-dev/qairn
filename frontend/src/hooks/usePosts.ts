// src/hooks/usePosts.ts

import { useCallback, useEffect } from 'react';
import { usePaginatedFeed }       from './usePaginatedFeed';
import PostsApi                   from '../api/posts.api';
import type { Post }              from '../types/api.types';

type FeedFilter = 'forYou' | 'myCircle';

export function usePosts(filter: FeedFilter = 'forYou') {
  const feed = usePaginatedFeed<Post>(
    useCallback(params => PostsApi.getFeed(filter, params), [filter])
  );

  // Load on mount and when filter changes
  useEffect(() => {
    feed.load();
  }, [filter]);

  // ── Toggle like (optimistic) ──────────────────────────────────────────────
  const likePost = async (postId: string) => {
    // Optimistic update
    feed.updateItem(postId, post => ({
      ...post,
      is_liked:   !post.is_liked,
      like_count: post.is_liked ? post.like_count - 1 : post.like_count + 1,
    }));

    try {
      const res = await PostsApi.likePost(postId);
      // Sync with server response
      feed.updateItem(postId, post => ({
        ...post,
        is_liked:   res.liked,
        like_count: res.like_count,
      }));
    } catch {
      // Revert on error
      feed.updateItem(postId, post => ({
        ...post,
        is_liked:   !post.is_liked,
        like_count: post.is_liked ? post.like_count - 1 : post.like_count + 1,
      }));
    }
  };

  // ── Toggle save (optimistic) ──────────────────────────────────────────────
  const savePost = async (postId: string) => {
    feed.updateItem(postId, post => ({ ...post, is_saved: !post.is_saved }));
    try {
      const res = await PostsApi.savePost(postId);
      feed.updateItem(postId, post => ({ ...post, is_saved: res.saved }));
    } catch {
      feed.updateItem(postId, post => ({ ...post, is_saved: !post.is_saved }));
    }
  };

  // ── Delete post ───────────────────────────────────────────────────────────
  const deletePost = async (postId: string) => {
    feed.removeItem(postId);
    try {
      await PostsApi.deletePost(postId);
    } catch {
      // Could reload feed here if needed
    }
  };

  // ── Create post ───────────────────────────────────────────────────────────
  const createPost = async (content: string, media_url?: string, media_type?: string) => {
    const res = await PostsApi.createPost({ content, media_url, media_type });
    feed.prependItem(res.post);
    return res.post;
  };

  return {
    posts:          feed.items,
    isLoading:      feed.isLoading,
    isRefreshing:   feed.isRefreshing,
    isFetchingMore: feed.isFetchingMore,
    hasMore:        feed.hasMore,
    error:          feed.error,
    refresh:        feed.refresh,
    loadMore:       feed.loadMore,
    likePost,
    savePost,
    deletePost,
    createPost,
  };
}