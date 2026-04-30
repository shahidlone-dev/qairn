// src/hooks/usePaginatedFeed.ts
// Generic infinite scroll hook — works for any cursor-paginated endpoint

import { useState, useCallback, useRef } from 'react';
import type { CursorPage, PageParams } from '../types/api.types';

type FetchFn<T> = (params: PageParams) => Promise<CursorPage<T>>;

type State<T> = {
  items:     T[];
  isLoading: boolean;
  isRefreshing: boolean;
  isFetchingMore: boolean;
  hasMore:   boolean;
  error:     string | null;
};

export function usePaginatedFeed<T>(
  fetchFn:  FetchFn<T>,
  limit     = 15,
) {
  const [state, setState] = useState<State<T>>({
    items:          [],
    isLoading:      true,
    isRefreshing:   false,
    isFetchingMore: false,
    hasMore:        true,
    error:          null,
  });

  const cursorRef    = useRef<string | null>(null);
  const fetchingRef  = useRef(false);

  // ── Initial load / refresh ────────────────────────────────────────────────
  const load = useCallback(async (refresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setState(s => ({
      ...s,
      isLoading:    refresh ? false : s.items.length === 0,
      isRefreshing: refresh,
      error:        null,
    }));

    try {
      const page = await fetchFn({ limit });
      cursorRef.current = page.nextCursor;
      setState(s => ({
        ...s,
        items:          refresh ? page.items : [...s.items, ...page.items],
        hasMore:        page.hasMore,
        isLoading:      false,
        isRefreshing:   false,
        error:          null,
      }));
    } catch (err: any) {
      setState(s => ({
        ...s,
        isLoading:    false,
        isRefreshing: false,
        error:        err.message ?? 'Failed to load',
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [fetchFn, limit]);

  // ── Load more (next page) ─────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !state.hasMore || !cursorRef.current) return;
    fetchingRef.current = true;

    setState(s => ({ ...s, isFetchingMore: true }));

    try {
      const page = await fetchFn({ cursor: cursorRef.current!, limit });
      cursorRef.current = page.nextCursor;
      setState(s => ({
        ...s,
        items:          [...s.items, ...page.items],
        hasMore:        page.hasMore,
        isFetchingMore: false,
      }));
    } catch (err: any) {
      setState(s => ({
        ...s,
        isFetchingMore: false,
        error:          err.message ?? 'Failed to load more',
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [fetchFn, limit, state.hasMore]);

  // ── Optimistic update ─────────────────────────────────────────────────────
  const updateItem = useCallback((id: string, updater: (item: T) => T) => {
    setState(s => ({
      ...s,
      items: s.items.map((item: any) =>
        item.id === id ? updater(item) : item
      ),
    }));
  }, []);

  // ── Remove item ───────────────────────────────────────────────────────────
  const removeItem = useCallback((id: string) => {
    setState(s => ({
      ...s,
      items: s.items.filter((item: any) => item.id !== id),
    }));
  }, []);

  // ── Prepend item (for new posts) ──────────────────────────────────────────
  const prependItem = useCallback((item: T) => {
    setState(s => ({ ...s, items: [item, ...s.items] }));
  }, []);

  return {
    ...state,
    load,
    refresh: () => {
      cursorRef.current = null;
      load(true);
    },
    loadMore,
    updateItem,
    removeItem,
    prependItem,
  };
}