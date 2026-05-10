// src/hooks/useMarket.ts
// FIX: Removed reference to usePaginatedFeed which does not exist in the
// codebase. Rewrote using the same direct useState + useRef pattern as
// useServices.ts / useFeed.ts so MarketScreen no longer crashes on mount.

import { useState, useEffect, useRef, useCallback } from 'react';
import MarketApi from '../api/market.api';
import type { MarketListing } from '../types/api.types';

type Filter = 'all' | 'notes' | 'items' | 'dept';

const TYPE_MAP: Record<Filter, 'item' | 'note' | undefined> = {
  all:   undefined,
  notes: 'note',
  items: 'item',
  dept:  undefined,
};

export function useMarket(filter: Filter = 'all', query = '') {
  // Featured carousel — loaded once
  const [featured, setFeatured] = useState<MarketListing[]>([]);

  // Paginated listings
  const [items,          setItems]          = useState<MarketListing[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isRefreshing,   setIsRefreshing]   = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore,        setHasMore]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);

  const cursorRef  = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const filterRef  = useRef(filter);
  const queryRef   = useRef(query);
  filterRef.current = filter;
  queryRef.current  = query;

  const load = useCallback(async (refresh = false) => {
    if (!hasMoreRef.current && !refresh) return;

    setError(null);

    if (refresh) {
      setIsRefreshing(true);
      cursorRef.current  = undefined;
      hasMoreRef.current = true;
    } else if (!cursorRef.current) {
      setIsLoading(true);
    } else {
      setIsFetchingMore(true);
    }

    try {
      const res = await MarketApi.getListings({
        type:   TYPE_MAP[filterRef.current],
        query:  queryRef.current || undefined,
        cursor: cursorRef.current,
        limit:  20,
      });

      cursorRef.current  = res.nextCursor ?? undefined;
      hasMoreRef.current = res.hasMore;
      setHasMore(res.hasMore);

      if (refresh || !cursorRef.current) {
        setItems(res.items);
      } else {
        setItems(prev => {
          const existing = new Set(prev.map(l => l.id));
          const fresh    = res.items.filter(l => !existing.has(l.id));
          return [...prev, ...fresh];
        });
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load market listings.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  }, []);

  // Load featured once
  useEffect(() => {
    MarketApi.getFeatured()
      .then(res => setFeatured(res.items))
      .catch(() => { /* non-fatal */ });
  }, []);

  // Reload paginated list when filter or query changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    cursorRef.current  = undefined;
    hasMoreRef.current = true;
    load(true);
  }, [filter, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const placeOrder = async (listingId: string, pages?: number) => {
    const res = await MarketApi.placeOrder(listingId, { pages });
    return res.order;
  };

  return {
    featured,
    listings:       items,
    isLoading,
    isRefreshing,
    isFetchingMore,
    hasMore,
    error,
    refresh:        () => load(true),
    loadMore:       () => load(false),
    placeOrder,
  };
}
