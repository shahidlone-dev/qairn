// src/hooks/useFeedEngine.ts
//
// PHASE 2 / PHASE 3: Centralized Feed Engine
//
// This hook owns video playback authority for the main campus feed.
// It replaces the ad-hoc onViewableItemsChanged logic in CampusScreen.
//
// Outputs:
//   activePostId  — the video that should be playing RIGHT NOW
//   nextPostId    — the video just below active; should be preloaded (paused)
//   viewabilityConfig — pass directly to FlatList
//   onViewableItemsChanged — pass directly to FlatList (stable ref)
//
// Non-negotiable rules enforced:
//   - Max 2 video instances at any time (active + next)
//   - High-velocity scroll detection pauses playback
//   - Stable refs via useRef so FlatList never re-renders

import { useRef, useState, useCallback } from 'react';
import { ViewToken } from 'react-native';
import { usePostStore } from '../store/usePostStore';

type FeedEngineResult = {
  activePostId:           string | null;
  nextPostId:             string | null;
  viewabilityConfig:      React.RefObject<{ itemVisiblePercentThreshold: number; minimumViewTime: number }>;
  onViewableItemsChanged: React.RefObject<(info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void>;
  /** Call this from your scroll velocity tracker to suspend playback */
  suspendPlayback:        () => void;
  /** Call this to resume after velocity drops */
  resumePlayback:         () => void;
};

export function useFeedEngine(feedIds: string[]): FeedEngineResult {
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [nextPostId,   setNextPostId]   = useState<string | null>(null);

  // Suspended when scroll velocity is too high
  const suspendedRef      = useRef(false);
  const lastActiveRef     = useRef<string | null>(null);
  const lastActiveIdxRef  = useRef<number>(-1);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 50,
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (suspendedRef.current) return;

      if (viewableItems.length === 0) {
        setActivePostId(null);
        setNextPostId(null);
        lastActiveRef.current    = null;
        lastActiveIdxRef.current = -1;
        return;
      }

      const state = usePostStore.getState();

      // Find the first visible video post
      let foundActiveId:  string | null = null;
      let foundActiveIdx: number        = -1;

      for (const token of viewableItems) {
        const id   = token.item as string;
        const post = state.postsById[id];
        if (post?.media_type === 'video' && post.media_url) {
          foundActiveId  = id;
          foundActiveIdx = token.index ?? -1;
          break;
        }
      }

      // No state change if active didn't move
      if (foundActiveId === lastActiveRef.current) return;

      lastActiveRef.current    = foundActiveId;
      lastActiveIdxRef.current = foundActiveIdx;

      setActivePostId(foundActiveId);

      // Find next video for preloading
      if (foundActiveId === null || foundActiveIdx < 0) {
        setNextPostId(null);
        return;
      }

      let foundNextId: string | null = null;
      // Look ahead in feedIds from the current active index
      for (let i = foundActiveIdx + 1; i < feedIds.length; i++) {
        const id   = feedIds[i];
        const post = state.postsById[id];
        if (post?.media_type === 'video' && post.media_url) {
          foundNextId = id;
          break;
        }
      }
      setNextPostId(foundNextId);
    }
  );

  const suspendPlayback = useCallback(() => {
    suspendedRef.current = true;
    setActivePostId(null);
    setNextPostId(null);
  }, []);

  const resumePlayback = useCallback(() => {
    suspendedRef.current = false;
    // Re-fire with last known active — viewability will correct on next scroll event
    if (lastActiveRef.current) {
      setActivePostId(lastActiveRef.current);
    }
  }, []);

  return {
    activePostId,
    nextPostId,
    viewabilityConfig,
    onViewableItemsChanged,
    suspendPlayback,
    resumePlayback,
  };
}