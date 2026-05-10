// src/hooks/useCreatePost.ts
//
// Implements the 3-step atomic post creation pipeline:
//
//   Step 1  POST /posts/draft        → get real post_id
//   Step 2  POST /upload/post-media  → upload media, server attaches to post
//   Step 3  POST /posts/:id/publish  → make post visible
//
// RETRY DESIGN (Requirement 3):
//   Failed posts are retried by calling POST /posts/:id/retry (resetForRetry)
//   which resets the existing post back to 'draft' WITHOUT creating a new row.
//   Steps 2 and 3 then run again with the SAME post_id.
//   This means a retry never creates a duplicate post.
//
// PERSISTENCE (Requirement 7):
//   PendingPost records are written to the Zustand store which is persisted
//   via AsyncStorage. On app restart, usePostRecovery() reconciles the local
//   pending list against the server and resumes any interrupted uploads.

import { useState, useCallback, useEffect, useRef } from 'react';
// CRITICAL: This must be imported BEFORE uuid to prevent crashes in React Native
import PostsApi, { isNonRetryable } from '../api/posts.api';
import { usePostStore } from '../store/usePostStore';
import type { PendingPost, SubmitPostParams, ApiPost } from '../types/post.types';

// =============================================================================
// Constants
// =============================================================================

const MAX_AUTO_RETRIES = 2;

function backoffMs(attempt: number): number {
  return attempt === 0 ? 0 : 2_000 * Math.pow(3, attempt - 1);
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// =============================================================================
// withRetry — wraps an async fn with exponential backoff
// =============================================================================

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  onAttempt?: (attempt: number) => void,
): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = backoffMs(attempt);
      console.warn(`[useCreatePost] ${label}: retry ${attempt}/${MAX_AUTO_RETRIES} in ${delay}ms`);
      await sleep(delay);
    }

    onAttempt?.(attempt);

    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (isNonRetryable(err)) {
        console.warn(`[useCreatePost] ${label}: non-retryable error — aborting`);
        throw err;
      }
    }
  }
  throw lastErr;
}

// =============================================================================
// _runPipeline — the actual 3-step flow
// =============================================================================

async function _runPipeline(params: {
  content:        string;
  mediaUri?:      string;
  mediaType?:     'image' | 'video';
  mimeType?:      string;
  pickerWidth?:   number | null;
  pickerHeight?:  number | null;
  idempotencyKey: string;
  tempSlot:       string; 
  hasMedia:       boolean;
  resolvedMime:   string;
  isRetry:        boolean; 
  existingPostId?: string; 
}) {
  const store = usePostStore.getState();
  const { mergePosts, updatePending, removePending, batchSwapFeedSlot } = store;

  const {
    content, mediaUri, pickerWidth, pickerHeight,
    idempotencyKey, tempSlot, hasMedia, resolvedMime,
    isRetry, existingPostId,
  } = params;

  let postId: string = existingPostId ?? tempSlot; 

  try {
    // ── STEP 1: Create draft (skip on retry — reuse existing postId) ─────────
    if (!isRetry) {
      updatePending(tempSlot, { status: 'creating_draft', progress: 5 });

      const { post: draft, duplicate } = await withRetry(
        () => PostsApi.createDraft({ content, idempotencyKey, hasMedia }),
        'createDraft',
      );

      postId = draft.id;

      if (duplicate) {
        console.info(`[useCreatePost] Duplicate key — resuming post ${postId}`);
      }

      batchSwapFeedSlot(tempSlot, postId, {
        status:    hasMedia ? 'uploading' : 'publishing',
        progress:  15,
        updatedAt: Date.now(),
      });

      mergePosts([draft]);

    } else {
      updatePending(postId, { status: 'uploading', progress: 5, error: undefined });

      await withRetry(
        () => PostsApi.resetForRetry(postId),
        'resetForRetry',
      );
    }

    // ── STEP 2: Upload media (if any) ────────────────────────────────────────
    if (hasMedia && mediaUri) {
      updatePending(postId, { status: 'uploading', progress: 20 });

      const uploadResult = await withRetry(
        () => PostsApi.uploadMedia(mediaUri, resolvedMime, postId),
        'uploadMedia',
        (attempt) => {
          if (attempt > 0) {
            updatePending(postId, { status: 'uploading', progress: 20 });
          }
        },
      );

      const currentPost = usePostStore.getState().postsById[postId];
      if (currentPost) {
        mergePosts([{
          ...currentPost,
          media_url:    uploadResult.media_url,
          media_type:   uploadResult.media_type as any,
          media_width:  uploadResult.media_width  ?? pickerWidth  ?? null,
          media_height: uploadResult.media_height ?? pickerHeight ?? null,
          status:       'uploading',
        }]);
      }

      updatePending(postId, { status: 'publishing', progress: 80 });
    }

    // ── STEP 3: Publish ──────────────────────────────────────────────────────
    updatePending(postId, { status: 'publishing', progress: 90 });

    const { post: published } = await withRetry(
      () => PostsApi.publish(postId),
      'publish',
    );

    mergePosts([published]);
    removePending(postId);

    console.info(`[useCreatePost] Post ${postId} published successfully ✅`);

  } catch (err: any) {
    console.error(`[useCreatePost] Pipeline failed for post ${postId}:`, err?.message);

    const isUpload  = err?.code === 'UPLOAD_ERROR' || err?.code === 'NETWORK_ERROR';
    const isMedia   = err?.code === 'MEDIA_NOT_ATTACHED';
    const isExpired = err?.code === 'EXPIRED' || err?.code === 'NOT_AUTHENTICATED';

    const userMessage = isExpired
      ? 'Session expired. Please log in again.'
      : isUpload
        ? 'Upload failed. Tap to retry.'
        : isMedia
          ? 'Media processing error. Tap to retry.'
          : 'Post failed. Tap to retry.';

    updatePending(postId, {
      status:  'failed',
      error:   userMessage,
      progress: 0,
    });

    if (postId !== tempSlot) {
      PostsApi.markFailed(postId, err?.message ?? 'pipeline_error').catch(e =>
        console.warn('[useCreatePost] markFailed failed:', e?.message)
      );
    }
  }
}

// =============================================================================
// Hook
// =============================================================================

export const useCreatePost = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitPost = useCallback(async ({
    content,
    mediaUri,
    mediaType,
    mimeType,
    pickerWidth  = null,
    pickerHeight = null,
    onNavigated,
  }: SubmitPostParams) => {

    if (isSubmitting) return;
    setIsSubmitting(true);

    // ✅ NEW: Pure JavaScript UUID Generator (Bypasses the Native Module crash entirely)
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const idempotencyKey = generateUUID();

    console.log(`[submitPost] ✅ Setup complete. Starting pipeline for draft ${idempotencyKey}`);

    const hasMedia       = Boolean(mediaUri && mediaType);
    const resolvedMime   = mimeType ?? (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');

    const tempSlot = `temp_${idempotencyKey}`;
    const now      = Date.now();

    const pending: PendingPost = {
      postId:         tempSlot,
      tempSlot,
      idempotencyKey,
      status:         'creating_draft',
      progress:       0,
      retryCount:     0,
      content,
      mediaUri,
      mediaType,
      mimeType,
      pickerWidth,
      pickerHeight,
      createdAt:      now,
      updatedAt:      now,
    };

    const store = usePostStore.getState();
    store.addPending(pending);
    store.prependFeed('forYou', tempSlot);

    if (onNavigated) {
      onNavigated();
    } else {
      console.warn('[submitPost] ⚠️ onNavigated callback is missing!');
    }
    
    setIsSubmitting(false);

    _runPipeline({
      content,
      mediaUri,
      mediaType,
      mimeType,
      pickerWidth,
      pickerHeight,
      idempotencyKey,
      tempSlot,
      hasMedia,
      resolvedMime,
      isRetry:  false,
    });

  }, [isSubmitting]);

  const retryPost = useCallback(async (postId: string) => {
    const store   = usePostStore.getState();
    const pending = store.pendingUploads[postId];

    if (!pending || pending.status !== 'failed') return;
    if (!pending.mediaUri && !pending.content) return;

    const hasMedia     = Boolean(pending.mediaUri && pending.mediaType);
    const resolvedMime = pending.mimeType ?? (pending.mediaType === 'video' ? 'video/mp4' : 'image/jpeg');

    store.updatePending(postId, {
      status:     'uploading',
      error:      undefined,
      retryCount: (pending.retryCount ?? 0) + 1,
      progress:   0,
    });

    await _runPipeline({
      content:        pending.content,
      mediaUri:       pending.mediaUri,
      mediaType:      pending.mediaType,
      pickerWidth:    pending.pickerWidth,
      pickerHeight:   pending.pickerHeight,
      idempotencyKey: pending.idempotencyKey,
      tempSlot:       postId,
      hasMedia,
      resolvedMime,
      isRetry:        true,
      existingPostId: postId,
    });
  }, []);

  return { submitPost, retryPost, isSubmitting };
};

// =============================================================================
// usePostRecovery — call once at app startup to reconcile persisted state
// =============================================================================

export function usePostRecovery() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function reconcile() {
      const store = usePostStore.getState();
      const localPending = store.pendingUploads;

      if (Object.keys(localPending).length === 0) return;

      let serverDrafts: ApiPost[];
      try {
        serverDrafts = await PostsApi.getUserDrafts();
      } catch (err) {
        console.warn('[usePostRecovery] Failed to fetch drafts:', (err as Error)?.message);
        return;
      }

      const serverMap = new Map(serverDrafts.map(p => [p.id, p]));

      for (const [localId, pending] of Object.entries(localPending)) {
        if (localId.startsWith('temp_')) {
          store.removePending(localId);
          continue;
        }

        const serverPost = serverMap.get(localId);

        if (!serverPost) {
          store.removePending(localId);
          continue;
        }

        if (serverPost.status === 'published') {
          store.mergePosts([serverPost]);
          store.removePending(localId);
          continue;
        }

        store.mergePosts([serverPost]);
        store.updatePending(localId, {
          status:   'failed',
          error:    serverPost.failure_reason ?? 'Post was interrupted. Tap to retry.',
          progress: 0,
        });

        const currentFeed = store.feeds['forYou'] ?? [];
        if (!currentFeed.includes(localId)) {
          store.prependFeed('forYou', localId);
        }
      }
    }

    reconcile().catch(err =>
      console.error('[usePostRecovery] Unhandled error:', err?.message)
    );
  }, []);
}