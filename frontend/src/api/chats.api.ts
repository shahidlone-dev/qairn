// src/api/chats.api.ts

import api from './client';
import type { Chat, Message, CursorPage, PageParams } from '../types/api.types';

const ChatsApi = {

  // ── Chat list ─────────────────────────────────────────────────────────────
  getChats: () =>
    api.get<{ chats: Chat[] }>('/chats'),

  // ── Start DM ─────────────────────────────────────────────────────────────
  startDm: (userId: string) =>
    api.post<{ chat: Chat }>('/chats', { type: 'dm', user_id: userId }),

  // ── Create group ─────────────────────────────────────────────────────────
  createGroup: (name: string, memberIds: string[]) =>
    api.post<{ chat: Chat }>('/chats', { type: 'group', name, member_ids: memberIds }),

  // ── Messages (cursor paginated — newest first) ────────────────────────────
  getMessages: (chatId: string, params: PageParams = {}) => {
    const q = new URLSearchParams({ limit: String(params.limit ?? 30) });
    if (params.cursor) q.set('cursor', params.cursor);
    return api.get<CursorPage<Message>>(`/chats/${chatId}/messages?${q}`);
  },

  // ── Send message ──────────────────────────────────────────────────────────
  sendMessage: (chatId: string, body: {
    type:        'text' | 'image' | 'file' | 'voice';
    text?:       string;
    media_url?:  string;
    file_name?:  string;
    file_size?:  number;
    duration?:   number;
    reply_to_id?:string;
  }) =>
    api.post<{ message: Message }>(`/chats/${chatId}/messages`, body),

  // ── React to message ──────────────────────────────────────────────────────
  reactToMessage: (chatId: string, messageId: string, emoji: string) =>
    api.post<{ reactions: Message['reactions'] }>(
      `/chats/${chatId}/messages/${messageId}/react`, { emoji }
    ),

  // ── Delete message ────────────────────────────────────────────────────────
  deleteMessage: (chatId: string, messageId: string) =>
    api.delete(`/chats/${chatId}/messages/${messageId}`),

  // ── Mark as read ──────────────────────────────────────────────────────────
  markRead: (chatId: string) =>
    api.patch(`/chats/${chatId}/read`, {}),
};

export default ChatsApi;