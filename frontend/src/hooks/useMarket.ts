// src/hooks/useMarket.ts

import { useCallback, useEffect, useState } from 'react';
import { usePaginatedFeed } from './usePaginatedFeed';
import MarketApi            from '../api/market.api';
import type { MarketListing } from '../types/api.types';

type Filter = 'all' | 'notes' | 'items' | 'dept';

export function useMarket(filter: Filter = 'all', query = '') {
  const [featured, setFeatured] = useState<MarketListing[]>([]);

  const typeMap: Record<Filter, 'item' | 'note' | undefined> = {
    all:  undefined,
    notes:'note',
    items:'item',
    dept: undefined,
  };

  const feed = usePaginatedFeed<MarketListing>(
    useCallback(params => MarketApi.getListings({
      ...params,
      type:  typeMap[filter],
      query: query || undefined,
    }), [filter, query])
  );

  // Load featured once
  useEffect(() => {
    MarketApi.getFeatured()
      .then(res => setFeatured(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => { feed.load(); }, [filter, query]);

  const placeOrder = async (listingId: string, pages?: number) => {
    const res = await MarketApi.placeOrder(listingId, { pages });
    return res.order;
  };

  return {
    featured,
    listings:       feed.items,
    isLoading:      feed.isLoading,
    isRefreshing:   feed.isRefreshing,
    isFetchingMore: feed.isFetchingMore,
    hasMore:        feed.hasMore,
    error:          feed.error,
    refresh:        feed.refresh,
    loadMore:       feed.loadMore,
    placeOrder,
  };
}