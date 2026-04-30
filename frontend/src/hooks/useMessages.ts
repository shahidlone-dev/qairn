// src/hooks/useMessages.ts

import { useState, useCallback, useRef, useEffect } from 'react';
import ChatsApi from '../api/chats.api';
import type { Message } from '../types/api.types';

export function useMessages(chatId: string) {
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore,        setHasMore]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);

  const cursorRef   = useRef<string | null>(null);
  const fetchingRef = useRef(false);

  // ── Load latest messages ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    try {
      const page        = await ChatsApi.getMessages(chatId, { limit: 30 });
      cursorRef.current = page.nextCursor;
      setMessages(page.items.reverse()); // reverse so newest is at bottom
      setHasMore(page.hasMore);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [chatId]);

  // ── Load older messages (scroll up) ───────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMore || !cursorRef.current) return;
    fetchingRef.current = true;
    setIsFetchingMore(true);
    try {
      const page        = await ChatsApi.getMessages(chatId, { cursor: cursorRef.current, limit: 30 });
      cursorRef.current = page.nextCursor;
      setMessages(prev => [...page.items.reverse(), ...prev]);
      setHasMore(page.hasMore);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFetchingMore(false);
      fetchingRef.current = false;
    }
  }, [chatId, hasMore]);

  useEffect(() => { load(); }, [chatId]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (body: Parameters<typeof ChatsApi.sendMessage>[1]) => {
    // Optimistic local message
    const tempId   = `temp_${Date.now()}`;
    const tempMsg  = {
      id:         tempId,
      chat_id:    chatId,
      type:       body.type,
      text:       body.text,
      reactions:  [],
      status:     'sent' as const,
      created_at: new Date().toISOString(),
    } as any;

    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await ChatsApi.sendMessage(chatId, body);
      // Replace temp with real message
      setMessages(prev => prev.map(m => m.id === tempId ? res.message : m));
      return res.message;
    } catch (err) {
      // Remove temp on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      throw err;
    }
  };

  // ── React to message (optimistic) ─────────────────────────────────────────
  const reactToMessage = async (messageId: string, emoji: string, myUsername: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const existing = m.reactions.findIndex(r => r.username === myUsername);
      const reactions = [...m.reactions];
      if (existing >= 0) reactions[existing] = { emoji, username: myUsername };
      else reactions.push({ emoji, username: myUsername });
      return { ...m, reactions };
    }));
    try {
      await ChatsApi.reactToMessage(chatId, messageId, emoji);
    } catch {}
  };

  // ── Delete message ────────────────────────────────────────────────────────
  const deleteMessage = async (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    try {
      await ChatsApi.deleteMessage(chatId, messageId);
    } catch {}
  };

  return {
    messages,
    isLoading,
    isFetchingMore,
    hasMore,
    error,
    loadMore,
    sendMessage,
    reactToMessage,
    deleteMessage,
  };
}