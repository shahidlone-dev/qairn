// src/hooks/useProfile.ts

import { useEffect, useRef, useState, useMemo } from 'react';
import UsersApi from '../api/users.api';
import { usePostStore, selectFeed } from '../store/usePostStore';
import type { User, Post } from '../types/api.types';

export const useProfile = (username: string) => {
  const feedKey = `profile_${username}`;

  // ✅ selectFeed returns stable EMPTY_IDS ref when key absent — no loop
  const postIds = usePostStore(selectFeed(feedKey));

  const [user,          setUser]          = useState<User | null>(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [isRefreshing,  setIsRefreshing]  = useState(false);
  const [isFetchingMore,setIsFetchingMore] = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [hasMore,       setHasMore]       = useState(true);
  const [following,     setFollowing]     = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const pageRef     = useRef(1);
  const hasMoreRef  = useRef(true);
  const usernameRef = useRef(username);
  usernameRef.current = username;

  const load = async (refresh = false) => {
    if (!hasMoreRef.current && !refresh) return;
    setError(null);

    if (refresh) {
      setIsRefreshing(true);
      pageRef.current    = 1;
      hasMoreRef.current = true;
    } else if (pageRef.current === 1) {
      setIsLoading(true);
    } else {
      setIsFetchingMore(true);
    }

    try {
      const res = await UsersApi.getUserProfile(usernameRef.current, {
        cursor: String(pageRef.current),
        limit:  12,
      });

      if (res.user) {
        setUser(res.user);
        setFollowing(res.user.is_following ?? false);
      }

      const { mergePosts, setFeed, appendFeed } = usePostStore.getState();
      mergePosts(res.posts);

      const ids = res.posts.map(p => p.id);
      if (refresh || pageRef.current === 1) {
        setFeed(feedKey, ids);
      } else {
        appendFeed(feedKey, ids);
      }

      hasMoreRef.current = res.hasMore;
      setHasMore(res.hasMore);
      if (res.hasMore) pageRef.current += 1;
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load profile.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    pageRef.current    = 1;
    hasMoreRef.current = true;
    load(true);
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Follow / unfollow ─────────────────────────────────────────────────────
  const toggleFollow = async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    const was = following;
    setFollowing(!was);
    try {
      if (was) await UsersApi.unfollow(user.id);
      else     await UsersApi.follow(user.id);
    } catch {
      setFollowing(was);
    } finally {
      setFollowLoading(false);
    }
  };

  // ✅ Memoize items so ProfileScreen's FlatList doesn't get a new array ref
  // every render and re-render infinitely.
  const items = useMemo<Post[]>(() => {
    const { postsById } = usePostStore.getState();
    return postIds.map(id => postsById[id]).filter((p): p is Post => !!p);
  }, [postIds]); // postIds is stable ref from selectFeed — only changes when feed actually changes

  const posts = {
    items,
    isLoading,
    isRefreshing,
    isFetchingMore,
    hasMore,
    refresh:  () => load(true),
    loadMore: () => load(false),
  };

  return { user, posts, isLoading, error, following, followLoading, toggleFollow };
};