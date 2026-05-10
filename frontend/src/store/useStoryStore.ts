// src/store/useStoryStore.ts
//
// Single source of truth for story-related UI state on the client.
//
// Now BACKEND-AWARE:
//   - `feed` is hydrated from /api/stories/feed and tells us EXACTLY which
//     users have unviewed stories (replacing the deterministic id-suffix
//     heuristic that shipped while the backend was being built).
//   - `userHasStory()` and the selectors are still exported with their old
//     names so existing call sites (StoryRow, ChatRow, PostCard) work without
//     changes — but they now read the feed first and fall back to the
//     heuristic only when we haven't refreshed yet.
//   - `viewedStories` continues to be persisted locally so a user who saw a
//     story keeps it dimmed even after a cold start, without waiting for the
//     server round-trip.
//
// IMPORTANT:
// - Zustand selectors MUST return stable primitive values.
// - Never return new objects/arrays from selectors.
// - React 19 + useSyncExternalStore is strict about snapshot stability.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import StoriesApi, {
  type StoryFeedEntry,
  type StoryFeedResponse,
} from '../api/stories.api';
import { TokenStore } from '../api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Has-story heuristic (legacy fallback while backend isn't reachable)
// ─────────────────────────────────────────────────────────────────────────────

const HAS_STORY_BUCKETS = new Set([
  '0', '2', '5', '8', 'a', 'c', 'e',
]);

/** Deterministic "user has story" guess used until we have a real feed. */
export function userHasStory(userId?: string | null): boolean {
  if (!userId) return false;
  const last = userId.charAt(userId.length - 1).toLowerCase();
  return HAS_STORY_BUCKETS.has(last);
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type StoryStore = {
  /** User IDs whose stories were viewed by the current viewer. */
  viewedStories: Set<string>;

  /** Set of user IDs known (by the backend) to have at least one active story. */
  serverUserIds: Set<string>;

  /** Latest feed response. `null` until first refresh succeeds. */
  feed: StoryFeedResponse | null;

  /** True while a refresh request is in flight. */
  isRefreshing: boolean;

  /** Last refresh ts (epoch ms). 0 if never refreshed. */
  lastRefreshedAt: number;

  /** Last refresh error message, if any. */
  lastError: string | null;

  // ── actions ──
  refreshFeed: () => Promise<void>;

  /** Mark a story as viewed (backend-aware). userId is the AUTHOR. */
  markViewed: (userId: string, storyId?: string) => void;

  /** Clear all viewed stories (logout/reset). */
  clearViewed: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useStoryStore = create<StoryStore>()(
  persist(
    (set, get) => ({
      viewedStories:    new Set<string>(),
      serverUserIds:    new Set<string>(),
      feed:             null,
      isRefreshing:     false,
      lastRefreshedAt:  0,
      lastError:        null,

      // ─────────────────────────────────────────────────────────────────────
      // refreshFeed — pulls /api/stories/feed and updates serverUserIds.
      //
      // Errors are swallowed (kept in `lastError`) — we never want a transient
      // network failure to crash a screen that is just rendering rings.
      // ─────────────────────────────────────────────────────────────────────
      refreshFeed: async () => {
        if (get().isRefreshing) return;
        set({ isRefreshing: true, lastError: null });
        try {
          const data = await StoriesApi.getFeed();

          const ids = new Set<string>();
          if (data.my)        ids.add(data.my.user.id);
          for (const entry of data.others) ids.add(entry.user.id);

          set({
            feed:            data,
            serverUserIds:   ids,
            lastRefreshedAt: Date.now(),
            isRefreshing:    false,
          });
        } catch (err: any) {
          set({
            isRefreshing: false,
            lastError:    err?.message ?? 'Failed to refresh stories.',
          });
        }
      },

      // ─────────────────────────────────────────────────────────────────────
      // markViewed — local + server. Server call is fire-and-forget; the local
      // set is updated synchronously so the ring dims immediately. The backend
      // call is idempotent so duplicate triggers are safe.
      //
      // SELF-VIEW POLICY:
      //   - We never add the current user's own id to `viewedStories`. Their
      //     ring should stay lit so they can re-watch their own story any
      //     number of times (Instagram / WhatsApp behaviour).
      //   - We also skip the server-side `markViewed` call for self — the
      //     viewer count on the owner's "Seen by" tray would otherwise be
      //     polluted with their own taps.
      // ─────────────────────────────────────────────────────────────────────
      markViewed: (userId: string, storyId?: string) => {
        if (!userId) return;

        const selfId = TokenStore.getUserIdSync();
        const isSelf = !!selfId && selfId === userId;

        if (!isSelf) {
          const current = get().viewedStories;
          if (!current.has(userId)) {
            const next = new Set(current);
            next.add(userId);
            set({ viewedStories: next });
          }

          if (storyId) {
            // Best-effort: don't await, don't surface errors here.
            StoriesApi.markViewed(storyId).catch(() => {});
          }
        }
      },

      clearViewed: () => {
        set({
          viewedStories:   new Set<string>(),
          serverUserIds:   new Set<string>(),
          feed:            null,
          lastRefreshedAt: 0,
          lastError:       null,
        });
      },
    }),
    {
      name: 'qaaf:story-store',
      storage: createJSONStorage(() => AsyncStorage),

      // We persist ONLY the viewed set. Feed is always re-fetched on launch
      // so the cache can't go stale across the 24h expiry.
      partialize: (state) => ({
        viewedStories: Array.from(state.viewedStories),
      }),

      merge: (persistedState, currentState) => {
        const typedPersisted =
          persistedState as Partial<{ viewedStories: string[] }>;

        return {
          ...currentState,
          viewedStories: new Set(typedPersisted?.viewedStories ?? []),
        };
      },
    },
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// Stable Primitive Selectors
// ─────────────────────────────────────────────────────────────────────────────

/** True if the user has viewed this user's stories. */
export const selectStoryViewed =
  (userId?: string | null) =>
  (state: StoryStore): boolean => {
    if (!userId) return false;
    return state.viewedStories.has(userId);
  };

/**
 * True if the avatar should render a story ring.
 *
 * Resolution order:
 *   1. If we have a server feed snapshot, trust it (`serverUserIds`).
 *   2. Otherwise fall back to the legacy heuristic so the UI doesn't appear
 *      empty before the first /feed call resolves.
 *
 * Self-view policy: the current user's own ring stays lit as long as they
 * have an active story — `viewedStories` is ignored when userId === selfId.
 */
export const selectShowStoryRing =
  (userId?: string | null) =>
  (state: StoryStore): boolean => {
    if (!userId) return false;

    const knownActive = state.serverUserIds.size > 0
      ? state.serverUserIds.has(userId)
      : userHasStory(userId);

    if (!knownActive) return false;

    const selfId = TokenStore.getUserIdSync();
    if (selfId && selfId === userId) return true;

    return !state.viewedStories.has(userId);
  };

/** True if tapping the avatar should open the story viewer. */
export const selectShouldOpenStory =
  (userId?: string | null) =>
  (state: StoryStore): boolean => {
    if (!userId) return false;

    const knownActive = state.serverUserIds.size > 0
      ? state.serverUserIds.has(userId)
      : userHasStory(userId);

    if (!knownActive) return false;

    const selfId = TokenStore.getUserIdSync();
    if (selfId && selfId === userId) return true;

    return !state.viewedStories.has(userId);
  };
