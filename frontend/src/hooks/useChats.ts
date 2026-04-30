// src/hooks/useChats.ts

import { useState, useEffect, useCallback } from 'react';
import ChatsApi from '../api/chats.api';
import type { Chat } from '../types/api.types';

export function useChats() {
  const [chats,     setChats]     = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await ChatsApi.getChats();
      setChats(res.chats);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // ── Move chat to top on new message ──────────────────────────────────────
  const bumpChat = useCallback((chatId: string, lastMessage: any) => {
    setChats(prev => {
      const chat = prev.find(c => c.id === chatId);
      if (!chat) return prev;
      const updated = { ...chat, last_message: lastMessage, updated_at: new Date().toISOString() };
      return [updated, ...prev.filter(c => c.id !== chatId)];
    });
  }, []);

  return { chats, isLoading, error, refresh: load, bumpChat };
}