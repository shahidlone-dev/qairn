// src/context/VideoPlaybackContext.ts
//
// PHASE 2 / PHASE 3 OVERHAUL:
//   - Added nextPostId so VideoPreview can preload-but-not-play
//   - Mount strategy enforced here:
//       activePostId  → mount + play
//       nextPostId    → mount + preload (paused)
//       everything else → unmount (player.release() in component)

import { createContext, useContext } from 'react';

type VideoPlaybackCtx = {
  activePostId: string | null;
  nextPostId:   string | null;   // Phase 2: preload next video
  isMuted:      boolean;
  setMuted:     (m: boolean) => void;
};

export const VideoPlaybackContext = createContext<VideoPlaybackCtx>({
  activePostId: null,
  nextPostId:   null,
  isMuted:      true,
  setMuted:     () => {},
});

export const useVideoPlayback = () => useContext(VideoPlaybackContext);