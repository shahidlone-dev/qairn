// src/hooks/useServices.ts
// FIX: Removed reference to usePaginatedFeed which does not exist in the codebase.
// Rewrote using the same direct useState + useEffect pattern as useFeed.ts so
// ServicesScreen no longer crashes on mount.

import { useState, useEffect, useRef, useCallback } from 'react';
import ServicesApi from '../api/services.api';
import type { ServiceListing, ServiceBooking } from '../types/api.types';

type ServiceType = 'tutor' | 'assignment';

export function useServices(type: ServiceType, query = '') {
  const [items,          setItems]          = useState<ServiceListing[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isRefreshing,   setIsRefreshing]   = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore,        setHasMore]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);

  const cursorRef  = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const typeRef    = useRef(type);
  const queryRef   = useRef(query);
  typeRef.current  = type;
  queryRef.current = query;

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
      const res = await ServicesApi.getServices({
        type:   typeRef.current,
        query:  queryRef.current || undefined,
        cursor: cursorRef.current,
        limit:  20,
      });

      // res is CursorPage<ServiceListing>
      cursorRef.current  = res.nextCursor ?? undefined;
      hasMoreRef.current = res.hasMore;
      setHasMore(res.hasMore);

      if (refresh || !cursorRef.current) {
        setItems(res.items);
      } else {
        setItems(prev => {
          const existing = new Set(prev.map(s => s.id));
          const fresh    = res.items.filter(s => !existing.has(s.id));
          return [...prev, ...fresh];
        });
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load services.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  }, []);

  // Reload when type or query changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    cursorRef.current  = undefined;
    hasMoreRef.current = true;
    load(true);
  }, [type, query]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutation helpers ────────────────────────────────────────────────────────

  const bookSession = async (serviceId: string, hours: number): Promise<ServiceBooking> => {
    const res = await ServicesApi.bookSession(serviceId, { hours });
    return res.booking;
  };

  const orderAssignment = async (
    serviceId:     string,
    pages:         number,
    instructions?: string,
  ): Promise<ServiceBooking> => {
    const res = await ServicesApi.orderAssignment(serviceId, { pages, instructions });
    return res.booking;
  };

  return {
    services:       items,
    isLoading,
    isRefreshing,
    isFetchingMore,
    hasMore,
    error,
    refresh:        () => load(true),
    loadMore:       () => load(false),
    bookSession,
    orderAssignment,
  };
}