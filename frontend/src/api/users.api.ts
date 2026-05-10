// src/api/users.api.ts

import * as FileSystem from 'expo-file-system/legacy';
import api, { TokenStore, BASE_URL } from './client';
import type { User, Post } from '../types/api.types';

// ─── Backend post shape from getUserPosts endpoint ────────────────────────────
type BackendUserPost = {
  id:            string;
  content:       string;
  media_url:     string | null;
  media_type:    'image' | 'video' | 'reel' | null;
  like_count:    number;
  comment_count: number;
  is_liked:      boolean;
  created_at:    string;
};

// ─── Search result row ───────────────────────────────────────────────────────
// Search returns a thinner shape than the full profile: just the fields the
// search list needs to render an avatar row. Keep it in sync with the
// columns selected in user.service.searchByUsername().
export type SearchUser = {
  id:           string;
  username:     string;
  full_name:    string | null;
  avatar_url:   string | null;
  dept:         string | null;
  university:   string | null;
  is_premium:   boolean;
  is_verified:  boolean;
  is_tutor:     boolean;
  is_helper:    boolean;
};

// ─── Combined profile + posts response ────────────────────────────────────────
type ProfileResponse = {
  user:    User;
  posts:   Post[];
  hasMore: boolean;
  total:   number;
};

function toPost(p: BackendUserPost, user: Pick<User, 'id' | 'username' | 'avatar_url' | 'dept' | 'is_premium' | 'is_verified'>): Post {
  return {
    id:            p.id,
    content:       p.content,
    media_url:     p.media_url  ?? undefined,
    media_type:    p.media_type ?? undefined,
    like_count:    p.like_count,
    comment_count: p.comment_count,
    share_count:   0,
    is_liked:      p.is_liked,
    is_saved:      false,
    created_at:    p.created_at,
    user,
  };
}

const UsersApi = {

  getMe: () => api.get<User>('/users/me'),

  updateMe: (body: object) => api.put<User>('/users/me', body),

  getProfile: (username: string) =>
    api.get<User>(`/users/${username}`),

  getUserPosts: (username: string, params: { cursor?: string; limit?: number } = {}) => {
    const page  = params.cursor ? parseInt(params.cursor) : 1;
    const limit = params.limit ?? 12;
    return api.get<{
      data: BackendUserPost[];
      meta: { page: number; limit: number; hasMore: boolean; total: number };
    }>(`/users/${username}/posts?page=${page}&limit=${limit}`);
  },

  // ── getUserProfile: combined call used by useProfile hook ─────────────────
  // useProfile was calling UsersApi.getUserProfile(username, { cursor, limit })
  // but this function didn't exist — profile screen crashed on every load.
  // Now it fires both requests in parallel and merges the result.
  getUserProfile: async (
    username: string,
    params: { cursor?: string; limit?: number } = {},
  ): Promise<ProfileResponse> => {
    const page  = params.cursor ? parseInt(params.cursor) : 1;
    const limit = params.limit ?? 12;

    const [userRes, postsRes] = await Promise.all([
      // Only fetch user on page 1 (first load or refresh) — skip on pagination
      page === 1
        ? api.get<{ data: User }>(`/users/${username}`)
        : Promise.resolve(null),
      api.get<{
        data: BackendUserPost[];
        meta: { hasMore: boolean; total: number };
      }>(`/users/${username}/posts?page=${page}&limit=${limit}`),
    ]);

    // On paginated loads userRes is null — the hook keeps the user from state
    const user = (userRes as any)?.data ?? null;

    const posts = (postsRes.data ?? []).map(p =>
      toPost(p, user ? {
        id:          user.id,
        username:    user.username,
        avatar_url:  user.avatar_url,
        dept:        user.dept,
        is_premium:  user.is_premium,
        is_verified: user.is_verified,
      } : {
        // Fallback shape for pagination pages where user isn't refetched
        id: '', username, avatar_url: undefined,
        dept: undefined, is_premium: false, is_verified: false,
      })
    );

    return {
      user,
      posts,
      hasMore: postsRes.meta.hasMore,
      total:   postsRes.meta.total,
    };
  },

  follow:   (userId: string) => api.post(`/users/${userId}/circle`, {}),
  unfollow: (userId: string) => api.delete(`/users/${userId}/circle`),

  // ── Username search ──────────────────────────────────────────────────────
  // Powers the Campus search screen. Server returns up to `limit` users
  // matching `q` (case-insensitive substring on username). Empty query
  // resolves to an empty array on the server side, so the caller can fire
  // this on every keystroke without guarding.
  search: (q: string, limit = 20) =>
    api.get<{ data: SearchUser[] }>(
      `/users/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),

  // Used by EditProfile when removing the avatar (`null` clears the column).
  // For SETTING a new avatar, use `uploadAndSetAvatar` below — it does the
  // upload + persist atomically and returns the refreshed user.
  updateAvatar: (avatar_url: string | null) =>
    api.put<{ success: boolean; data: User }>('/users/me', { avatar_url }),

  // ── uploadAndSetAvatar ────────────────────────────────────────────────────
  //
  // The avatar pipeline is a two-step write on the server:
  //   1) POST /api/upload/avatar (multipart) — uploads the file to Cloudinary
  //      and returns `{ avatar_url, public_id }`.
  //   2) PUT  /api/users/me { avatar_url } — persists the URL on the user row.
  //
  // The custom `api` client always JSON-stringifies the body, which makes it
  // unable to send multipart. The previous EditProfileScreen tried to pass a
  // FormData through `api.post` directly — that produced an empty `"{}"` body
  // server-side and the upload silently failed. We do the multipart leg with
  // `expo-file-system`'s `uploadAsync` (same pattern as PostsApi.uploadMedia
  // and StoriesApi.upload), then persist via the JSON `api` client.
  //
  // Returns the refreshed `User` row so callers can drop it straight into the
  // auth store with no extra fetch.
  uploadAndSetAvatar: async (uri: string, mimeType: string = 'image/jpeg'): Promise<User> => {
    const token = await TokenStore.getAccess();
    if (!token) throw new Error('Not authenticated');

    const url = `${BASE_URL}/upload/avatar`;

    const res = await FileSystem.uploadAsync(url, uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType?.MULTIPART || 'multipart',
      fieldName:  'file',
      mimeType,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status < 200 || res.status >= 300) {
      let msg = `Avatar upload failed (HTTP ${res.status})`;
      try {
        const body = JSON.parse(res.body);
        msg = body?.message ?? msg;
      } catch { /* ignore */ }
      throw new Error(msg);
    }

    let parsed: { data?: { avatar_url?: string } } = {};
    try { parsed = JSON.parse(res.body); }
    catch { throw new Error('Invalid response from upload endpoint.'); }

    const avatarUrl = parsed?.data?.avatar_url;
    if (!avatarUrl) throw new Error('Upload succeeded but server returned no avatar_url.');

    // Persist the URL on the user row and return the refreshed user.
    const userRes = await api.put<{ success: boolean; data: User }>('/users/me', {
      avatar_url: avatarUrl,
    });
    return userRes.data;
  },
};

export default UsersApi;