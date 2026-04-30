// src/api/posts.api.ts

import api from './client';
import type { Post, Comment, CursorPage, PageParams } from '../types/api.types';

const PostsApi = {

  // ── Feed (cursor paginated) ───────────────────────────────────────────────
  getFeed: (filter: 'forYou' | 'myCircle' = 'forYou', params: PageParams = {}) => {
    const q = new URLSearchParams({ filter, limit: String(params.limit ?? 15) });
    if (params.cursor) q.set('cursor', params.cursor);
    return api.get<CursorPage<Post>>(`/posts?${q}`);
  },

  // ── Single post ───────────────────────────────────────────────────────────
  getPost: (id: string) =>
    api.get<{ post: Post }>(`/posts/${id}`),

  // ── Create post ───────────────────────────────────────────────────────────
  createPost: (body: { content: string; media_url?: string; media_type?: string }) =>
    api.post<{ post: Post }>('/posts', body),

  // ── Delete post ───────────────────────────────────────────────────────────
  deletePost: (id: string) =>
    api.delete(`/posts/${id}`),

  // ── Toggle like ───────────────────────────────────────────────────────────
  likePost: (id: string) =>
    api.post<{ liked: boolean; like_count: number }>(`/posts/${id}/like`, {}),

  // ── Save post ─────────────────────────────────────────────────────────────
  savePost: (id: string) =>
    api.post<{ saved: boolean }>(`/posts/${id}/save`, {}),

  // ── Comments (cursor paginated) ───────────────────────────────────────────
  getComments: (postId: string, params: PageParams = {}) => {
    const q = new URLSearchParams({ limit: String(params.limit ?? 20) });
    if (params.cursor) q.set('cursor', params.cursor);
    return api.get<CursorPage<Comment>>(`/posts/${postId}/comments?${q}`);
  },

  // ── Add comment ───────────────────────────────────────────────────────────
  addComment: (postId: string, text: string, parentId?: string) =>
    api.post<{ comment: Comment }>(`/posts/${postId}/comment`, { text, parent_id: parentId }),
};

export default PostsApi;