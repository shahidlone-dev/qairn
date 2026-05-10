// src/store/usePostStore.ts
//
// PERFORMANCE OVERHAUL — Phase 1
//
// Changes vs previous version:
//   1. mergePosts now does SHALLOW COMPARISON before overwriting postsById entries.
//      Only posts with changed like_count, comment_count, status, or media_url
//      get a new object reference → downstream selectors / React.memo stay stable.
//
//   2. setFeedWithPosts — single atomic action that merges posts AND sets the feed
//      in one set() call (one re-render, not two).
//
//   3. appendFeedWithPosts — same but appends; deduplicates IDs before committing.
//
//   4. inFlight is now Record<string, Record<string,boolean>> so each post can
//      track multiple concurrent actions (liking, saving, deleting) independently.
//
//   5. selectPost / selectFeed / selectInFlight selectors are colocated here for
//      tree-shaking and import convenience.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiPost } from '../types/post.types';
import type { PendingPost } from '../types/post.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Feed = string[];

export type PostStoreState = {
  postsById:      Record<string, ApiPost>;
  feeds:          Record<string, Feed>;
  pendingUploads: Record<string, PendingPost>;
  inFlight:       Record<string, Record<string, boolean>>;
};

export type PostStoreActions = {
  // Post cache
  mergePosts:          (posts: ApiPost[]) => void;
  updatePost:          (id: string, updater: Partial<ApiPost> | ((p: ApiPost) => ApiPost)) => void;
  removePost:          (id: string) => void;
  getPost:             (id: string) => ApiPost | undefined;

  // Feeds — individual
  prependFeed:         (feedKey: string, postId: string) => void;
  setFeed:             (feedKey: string, ids: string[]) => void;
  appendFeed:          (feedKey: string, ids: string[]) => void;

  // Feeds — BATCH (Phase 1: one set() call)
  setFeedWithPosts:    (feedKey: string, posts: ApiPost[]) => void;
  appendFeedWithPosts: (feedKey: string, posts: ApiPost[]) => void;

  // Slot swap
  batchSwapFeedSlot: (tempSlot: string, realId: string, pendingUpdate: Partial<PendingPost>) => void;

  // Pending posts
  addPending:        (post: PendingPost) => void;
  updatePending:     (postId: string, update: Partial<PendingPost>) => void;
  removePending:     (postId: string) => void;
  clearAllPending:   () => void;
  getPendingList:    () => PendingPost[];
  getFailedPending:  () => PendingPost[];

  // In-flight
  setInFlight: (id: string, action: string, status: boolean) => void;
};

export type PostStore = PostStoreState & PostStoreActions;

// ---------------------------------------------------------------------------
// Shallow comparison — determines if a cached post needs updating.
// Only compares fields that change without user action; everything else
// (is_liked, is_saved) is managed optimistically by usePostActions.
// ---------------------------------------------------------------------------
function postNeedsUpdate(cached: ApiPost, incoming: ApiPost): boolean {
  return (
    cached.like_count    !== incoming.like_count    ||
    cached.comment_count !== incoming.comment_count ||
    cached.share_count   !== incoming.share_count   ||
    cached.status        !== incoming.status        ||
    cached.media_url     !== incoming.media_url     ||
    cached.content       !== incoming.content
  );
}

// ---------------------------------------------------------------------------
// Stable fallback constants — NEVER use inline literals ({} or []) as selector
// fallbacks. Zustand compares the previous and next return value by reference.
// A new {} or [] literal on every call always looks "changed", causing Zustand
// to notify subscribers → re-render → selector runs → new literal → loop.
// ---------------------------------------------------------------------------
const EMPTY_IDS:      string[]                  = [];
const EMPTY_INFLIGHT: Record<string, boolean>   = {};

// ---------------------------------------------------------------------------
// Selectors — factory functions cached at module level.
// Each unique id/key gets exactly one selector function created once and
// reused forever. This satisfies Zustand's requirement that the selector
// reference is stable across renders ("getSnapshot should be cached").
// ---------------------------------------------------------------------------
const _postSelectorCache     = new Map<string, (s: PostStore) => ApiPost | undefined>();
const _inFlightSelectorCache = new Map<string, (s: PostStore) => Record<string, boolean>>();
const _feedSelectorCache     = new Map<string, (s: PostStore) => string[]>();

export function selectPost(id: string) {
  if (!_postSelectorCache.has(id)) {
    _postSelectorCache.set(id, (s: PostStore) => s.postsById[id]);
  }
  return _postSelectorCache.get(id)!;
}

export function selectInFlight(id: string) {
  if (!_inFlightSelectorCache.has(id)) {
    // FIX: return EMPTY_INFLIGHT (stable ref) not {} (new object every call)
    _inFlightSelectorCache.set(id, (s: PostStore) => s.inFlight[id] ?? EMPTY_INFLIGHT);
  }
  return _inFlightSelectorCache.get(id)!;
}

export function selectFeed(key: string) {
  if (!_feedSelectorCache.has(key)) {
    // FIX: return EMPTY_IDS (stable ref) not [] (new array every call)
    _feedSelectorCache.set(key, (s: PostStore) => s.feeds[key] ?? EMPTY_IDS);
  }
  return _feedSelectorCache.get(key)!;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const usePostStore = create<PostStore>()(
  persist(
    (set, get) => ({

      // ── Initial state ──────────────────────────────────────────────────────
      postsById:      {},
      feeds:          {},
      pendingUploads: {},
      inFlight:       {},

      // ── Post cache ─────────────────────────────────────────────────────────

      // PHASE 1 FIX: shallow comparison prevents unnecessary reference changes.
      // If nothing meaningful changed, we keep the existing object reference
      // so React.memo and selectors downstream stay stable.
      mergePosts: (posts) => set(state => {
        let changed = false;
        const next = { ...state.postsById };

        for (const post of posts) {
          const cached = next[post.id];
          if (!cached || postNeedsUpdate(cached, post)) {
            // Preserve optimistic client-only fields (is_liked, is_saved)
            // when merging server data so a refresh doesn't clobber them.
            next[post.id] = cached
              ? { ...post, is_liked: cached.is_liked, is_saved: cached.is_saved }
              : post;
            changed = true;
          }
        }

        return changed ? { postsById: next } : state;
      }),

      updatePost: (id, updater) => set(state => {
        const existing = state.postsById[id];
        if (!existing) return state;
        const updated = typeof updater === 'function'
          ? updater(existing)
          : { ...existing, ...updater };
        return {
          postsById: { ...state.postsById, [id]: updated },
        };
      }),

      removePost: (id) => set(state => {
        const next = { ...state.postsById };
        delete next[id];
        return { postsById: next };
      }),

      getPost: (id) => get().postsById[id],

      // ── Individual feed actions ────────────────────────────────────────────

      prependFeed: (feedKey, postId) => set(state => {
        const current = state.feeds[feedKey] ?? [];
        if (current[0] === postId) return state;
        return {
          feeds: {
            ...state.feeds,
            [feedKey]: [postId, ...current.filter(id => id !== postId)],
          },
        };
      }),

      setFeed: (feedKey, ids) => set(state => ({
        feeds: { ...state.feeds, [feedKey]: ids },
      })),

      appendFeed: (feedKey, ids) => set(state => {
        const current  = state.feeds[feedKey] ?? [];
        const existing = new Set(current);
        const newIds   = ids.filter(id => !existing.has(id));
        if (newIds.length === 0) return state;
        return {
          feeds: { ...state.feeds, [feedKey]: [...current, ...newIds] },
        };
      }),

      // ── PHASE 1: Batch feed + posts in ONE set() call ──────────────────────

      setFeedWithPosts: (feedKey, posts) => set(state => {
        // Merge posts (shallow compare)
        let postsChanged = false;
        const nextPosts = { ...state.postsById };
        for (const post of posts) {
          const cached = nextPosts[post.id];
          if (!cached || postNeedsUpdate(cached, post)) {
            nextPosts[post.id] = cached
              ? { ...post, is_liked: cached.is_liked, is_saved: cached.is_saved }
              : post;
            postsChanged = true;
          }
        }

        // Dedup IDs
        const ids = [...new Set(posts.map(p => p.id))];

        return {
          postsById: postsChanged ? nextPosts : state.postsById,
          feeds: { ...state.feeds, [feedKey]: ids },
        };
      }),

      appendFeedWithPosts: (feedKey, posts) => set(state => {
        // Merge posts (shallow compare)
        let postsChanged = false;
        const nextPosts = { ...state.postsById };
        for (const post of posts) {
          const cached = nextPosts[post.id];
          if (!cached || postNeedsUpdate(cached, post)) {
            nextPosts[post.id] = cached
              ? { ...post, is_liked: cached.is_liked, is_saved: cached.is_saved }
              : post;
            postsChanged = true;
          }
        }

        // Append unique IDs only
        const current  = state.feeds[feedKey] ?? [];
        const existing = new Set(current);
        const newIds   = [...new Set(posts.map(p => p.id))].filter(id => !existing.has(id));

        return {
          postsById: postsChanged ? nextPosts : state.postsById,
          feeds: {
            ...state.feeds,
            [feedKey]: newIds.length > 0 ? [...current, ...newIds] : current,
          },
        };
      }),

      // ── Atomic slot swap ───────────────────────────────────────────────────
      batchSwapFeedSlot: (tempSlot, realId, pendingUpdate) => set(state => {
        // Replace tempSlot with realId in every feed that contains it
        const nextFeeds: Record<string, Feed> = {};
        for (const [key, feed] of Object.entries(state.feeds)) {
          const idx = feed.indexOf(tempSlot);
          if (idx === -1) {
            nextFeeds[key] = feed;
          } else {
            const next = [...feed];
            next[idx] = realId;
            nextFeeds[key] = next;
          }
        }

        // Move the pending entry from tempSlot key to realId key
        const nextPending = { ...state.pendingUploads };
        if (nextPending[tempSlot]) {
          nextPending[realId] = {
            ...nextPending[tempSlot],
            postId: realId,
            ...pendingUpdate,
          };
          delete nextPending[tempSlot];
        }

        return { feeds: nextFeeds, pendingUploads: nextPending };
      }),

      // ── Pending posts ──────────────────────────────────────────────────────
      addPending: (post) => set(state => ({
        pendingUploads: { ...state.pendingUploads, [post.postId]: post },
      })),

      updatePending: (postId, update) => set(state => {
        const existing = state.pendingUploads[postId];
        if (!existing) return state;
        return {
          pendingUploads: {
            ...state.pendingUploads,
            [postId]: { ...existing, ...update, updatedAt: Date.now() },
          },
        };
      }),

      removePending: (postId) => set(state => {
        const next = { ...state.pendingUploads };
        delete next[postId];
        return { pendingUploads: next };
      }),

      clearAllPending: () => set({ pendingUploads: {} }),

      getPendingList: () => Object.values(get().pendingUploads)
        .sort((a, b) => b.createdAt - a.createdAt),

      getFailedPending: () => Object.values(get().pendingUploads)
        .filter(p => p.status === 'failed'),

      // ── In-flight ──────────────────────────────────────────────────────────
      // PHASE 1 FIX: per-action granularity — setInFlight(id, 'liking', true)
      setInFlight: (id, action, status) => set(state => {
        const current = state.inFlight[id] ?? {};
        if (current[action] === status) return state; // no-op if unchanged
        return {
          inFlight: {
            ...state.inFlight,
            [id]: { ...current, [action]: status },
          },
        };
      }),
    }),

    {
      name:    'qaaf-post-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist pending uploads — post cache is cheap to re-fetch
      partialize: (state) => ({ pendingUploads: state.pendingUploads }),
    }
  )
);