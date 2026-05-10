// src/hooks/useFeed.ts
//
// PHASE 1 OVERHAUL:
//   - Uses setFeedWithPosts / appendFeedWithPosts (single set() → one re-render)
//   - Deduplication is now handled by the store actions, not here
//   - filterRef prevents stale closure bugs when filter changes mid-flight

import { useEffect, useRef, useState } from 'react';
import PostsApi from '../api/posts.api';
import { usePostStore, selectFeed } from '../store/usePostStore';

type FeedFilter = 'forYou' | 'myCircle';

export const useFeed = (filter: FeedFilter = 'forYou') => {
  const feedIds = usePostStore(selectFeed(filter));

  const [isLoading,      setIsLoading]      = useState(true);
  const [isRefreshing,   setIsRefreshing]   = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const pageRef    = useRef(1);
  const hasMoreRef = useRef(true);
  const filterRef  = useRef(filter);
  filterRef.current = filter;

  const load = async (refresh = false) => {
    const activeFilter = filterRef.current;
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
      const res = await PostsApi.getFeed(activeFilter, {
        cursor: String(pageRef.current),
        limit:  15,
      });

      // PHASE 1: single atomic store update (one re-render, dedup included)
      const { setFeedWithPosts, appendFeedWithPosts } = usePostStore.getState();
      if (refresh || pageRef.current === 1) {
        setFeedWithPosts(activeFilter, res.items);
      } else {
        appendFeedWithPosts(activeFilter, res.items);
      }

      hasMoreRef.current = res.hasMore;
      if (res.hasMore) pageRef.current += 1;
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load feed. Pull down to retry.');
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
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    feedIds,
    isLoading,
    isRefreshing,
    isFetchingMore,
    error,
    refresh:  () => load(true),
    loadMore: () => load(false),
  };
};