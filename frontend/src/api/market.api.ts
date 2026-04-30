// src/api/market.api.ts

import api from './client';
import type { MarketListing, MarketOrder, CursorPage, PageParams } from '../types/api.types';

type ListingFilters = PageParams & {
  type?:  'item' | 'note';
  dept?:  string;
  query?: string;
};

const MarketApi = {

  // ── Get listings (paginated) ──────────────────────────────────────────────
  getListings: (filters: ListingFilters = {}) => {
    const q = new URLSearchParams({ limit: String(filters.limit ?? 20) });
    if (filters.cursor) q.set('cursor',  filters.cursor);
    if (filters.type)   q.set('type',    filters.type);
    if (filters.dept)   q.set('dept',    filters.dept);
    if (filters.query)  q.set('query',   filters.query);
    return api.get<CursorPage<MarketListing>>(`/market?${q}`, false);
  },

  // ── Get featured ─────────────────────────────────────────────────────────
  getFeatured: () =>
    api.get<{ items: MarketListing[] }>('/market/featured', false),

  // ── Single listing ────────────────────────────────────────────────────────
  getListing: (id: string) =>
    api.get<{ listing: MarketListing }>(`/market/${id}`, false),

  // ── Create listing ────────────────────────────────────────────────────────
  createListing: (body: Partial<MarketListing>) =>
    api.post<{ listing: MarketListing }>('/market', body),

  // ── Update listing ────────────────────────────────────────────────────────
  updateListing: (id: string, body: Partial<MarketListing>) =>
    api.put<{ listing: MarketListing }>(`/market/${id}`, body),

  // ── Delete listing ────────────────────────────────────────────────────────
  deleteListing: (id: string) =>
    api.delete(`/market/${id}`),

  // ── Place order ───────────────────────────────────────────────────────────
  placeOrder: (listingId: string, body: { pages?: number }) =>
    api.post<{ order: MarketOrder }>(`/market/${listingId}/order`, body),

  // ── Confirm order received ────────────────────────────────────────────────
  confirmOrder: (listingId: string) =>
    api.patch<{ order: MarketOrder }>(`/market/${listingId}/confirm`, {}),

  // ── Get my orders ─────────────────────────────────────────────────────────
  getMyOrders: (role: 'buyer' | 'seller' = 'buyer') =>
    api.get<{ orders: MarketOrder[] }>(`/market/orders?role=${role}`),
};

export default MarketApi;