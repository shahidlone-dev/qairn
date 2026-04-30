// src/hooks/useServices.ts

import { useCallback, useEffect } from 'react';
import { usePaginatedFeed } from './usePaginatedFeed';
import ServicesApi          from '../api/services.api';
import type { ServiceListing } from '../types/api.types';

type ServiceType = 'tutor' | 'assignment';

export function useServices(type: ServiceType, query = '') {
  const feed = usePaginatedFeed<ServiceListing>(
    useCallback(params => ServicesApi.getServices({
      ...params,
      type,
      query: query || undefined,
    }), [type, query])
  );

  useEffect(() => { feed.load(); }, [type, query]);

  const bookSession = async (serviceId: string, hours: number) => {
    const res = await ServicesApi.bookSession(serviceId, { hours });
    return res.booking;
  };

  const orderAssignment = async (
    serviceId:    string,
    pages:        number,
    instructions?:string,
  ) => {
    const res = await ServicesApi.orderAssignment(serviceId, { pages, instructions });
    return res.booking;
  };

  return {
    services:       feed.items,
    isLoading:      feed.isLoading,
    isRefreshing:   feed.isRefreshing,
    isFetchingMore: feed.isFetchingMore,
    hasMore:        feed.hasMore,
    error:          feed.error,
    refresh:        feed.refresh,
    loadMore:       feed.loadMore,
    bookSession,
    orderAssignment,
  };
}