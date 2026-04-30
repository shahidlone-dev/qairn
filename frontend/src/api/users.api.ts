// src/api/users.api.ts

import api from './client';
import type { User, Post, MarketListing, ServiceListing, CursorPage, PageParams } from '../types/api.types';

const UsersApi = {

  // ── Own profile ───────────────────────────────────────────────────────────
  getMe: () =>
    api.get<{ user: User }>('/users/me'),

  updateMe: (body: Partial<Pick<User, 'full_name' | 'bio' | 'dept' | 'university' | 'year'>>) =>
    api.put<{ user: User }>('/users/me', body),

  updateAvatar: (avatar_url: string) =>
    api.patch<{ user: User }>('/users/me/avatar', { avatar_url }),

  // ── Public profile ────────────────────────────────────────────────────────
  getProfile: (username: string) =>
    api.get<{ user: User }>(`/users/${username}`, false),

  // ── Profile content tabs (paginated) ─────────────────────────────────────
  getUserPosts: (username: string, params: PageParams = {}) => {
    const q = new URLSearchParams({ limit: String(params.limit ?? 12) });
    if (params.cursor) q.set('cursor', params.cursor);
    return api.get<CursorPage<Post>>(`/users/${username}/posts?${q}`, false);
  },

  getUserListings: (username: string, params: PageParams = {}) => {
    const q = new URLSearchParams({ limit: String(params.limit ?? 12) });
    if (params.cursor) q.set('cursor', params.cursor);
    return api.get<CursorPage<MarketListing>>(`/users/${username}/listings?${q}`, false);
  },

  getUserServices: (username: string, params: PageParams = {}) => {
    const q = new URLSearchParams({ limit: String(params.limit ?? 12) });
    if (params.cursor) q.set('cursor', params.cursor);
    return api.get<CursorPage<ServiceListing>>(`/users/${username}/services?${q}`, false);
  },

  // ── Circle (follow/unfollow) ──────────────────────────────────────────────
  follow: (userId: string) =>
    api.post<{ following: boolean }>(`/users/${userId}/circle`, {}),

  unfollow: (userId: string) =>
    api.delete<{ following: boolean }>(`/users/${userId}/circle`),

  // ── Search users ──────────────────────────────────────────────────────────
  search: (query: string, params: PageParams = {}) => {
    const q = new URLSearchParams({ query, limit: String(params.limit ?? 20) });
    if (params.cursor) q.set('cursor', params.cursor);
    return api.get<CursorPage<User>>(`/users/search?${q}`, false);
  },
};

export default UsersApi;