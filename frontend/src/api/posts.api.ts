// src/api/posts.api.ts
import * as FileSystem from 'expo-file-system/legacy';
import api, { TokenStore, BASE_URL } from './client';
import type { ApiPost, ApiComment } from '../types/post.types';

// =============================================================================
// Structured API error — carries the machine-readable code from the server
// so callers can make decisions without string-matching on message text.
// =============================================================================

export class PostApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'PostApiError';
  }
}

// Whether an error should NOT be retried (client error — retrying won't help)
export function isNonRetryable(err: unknown): boolean {
  if (err instanceof PostApiError) {
    return err.status >= 400 && err.status < 500;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    // Auth errors are non-retryable but use message-matching as fallback
    // since they come from the lower-level client.ts layer
    return msg.includes('session expired') || msg.includes('not authenticated');
  }
  return false;
}

// =============================================================================
// Internal helpers
// =============================================================================

type BackendPost = ApiPost; // Server shape matches our ApiPost type exactly

function toPost(p: BackendPost): ApiPost {
  return {
    id:             p.id,
    content:        p.content,
    media_url:      p.media_url    ?? null,
    media_type:     p.media_type   ?? null,
    media_width:    p.media_width  ?? null,
    media_height:   p.media_height ?? null,
    status:         p.status,
    failure_reason: p.failure_reason ?? null,
    created_at:     p.created_at,
    updated_at:     p.updated_at,
    user:           p.user,
    // Singular form is the canonical wire shape (matches DB columns).
    // Tolerate the legacy plural form too in case a stale server is running.
    like_count:     p.like_count    ?? (p as any).likes_count    ?? 0,
    comment_count:  p.comment_count ?? (p as any).comments_count ?? 0,
    share_count:    p.share_count   ?? (p as any).shares_count   ?? 0,
    is_liked:       p.is_liked,
    is_saved:       p.is_saved ?? false,
  };
}

function toComment(c: BackendPost): ApiComment {
  return { id: (c as any).id, text: (c as any).text, created_at: (c as any).created_at, user: (c as any).user };
}

// Unwrap the server's { success, data, ... } envelope and throw PostApiError
// on non-success responses. This replaces scattered JSON.parse in callers.
function unwrap<T>(response: { success?: boolean; data?: T; message?: string; code?: string }, httpStatus: number): T {
  if (response.success === false || (response as any).error) {
    throw new PostApiError(
      response.message ?? 'Unknown error',
      response.code    ?? 'UNKNOWN',
      httpStatus,
    );
  }
  return response.data as T;
}

// =============================================================================
// API
// =============================================================================

const PostsApi = {

  // ---------------------------------------------------------------------------
  // Feed
  // ---------------------------------------------------------------------------
  getFeed: async (
    filter: 'forYou' | 'myCircle' = 'forYou',
    params: { cursor?: string; limit?: number } = {}
  ) => {
    const page  = params.cursor ? parseInt(params.cursor, 10) : 1;
    const limit = params.limit ?? 15;

    const res = await api.get<{
      success:  boolean;
      data:     BackendPost[];
      meta:     { hasMore: boolean; total: number };
      message?: string;
      code?:    string;
    }>(`/posts?page=${page}&limit=${limit}&filter=${filter}`);

    return {
      items:      res.data.map(toPost),
      hasMore:    res.meta.hasMore,
      nextCursor: res.meta.hasMore ? String(page + 1) : null,
    };
  },

  // ---------------------------------------------------------------------------
  // Step 1: Create draft
  //
  // Idempotent via idempotencyKey. If the server returns duplicate=true, the
  // existing post is returned — the caller should resume from its current status.
  // ---------------------------------------------------------------------------
  createDraft: async (params: {
    content:        string;
    idempotencyKey: string;
    hasMedia:       boolean;
  }) => {
    const res = await api.post<{
      success:    boolean;
      data:       BackendPost;
      duplicate?: boolean;
      message?:   string;
      code?:      string;
    }>('/posts/draft', {
      content:         params.content,
      idempotency_key: params.idempotencyKey,
      has_media:       params.hasMedia,
    });

    return {
      post:      toPost(res.data),
      duplicate: res.duplicate ?? false,
    };
  },

  // ---------------------------------------------------------------------------
  // Step 2: Upload media (linked to postId)
  //
  // Uses Expo FileSystem.uploadAsync for native multipart encoding.
  // postId is passed as a query parameter so the server can atomically attach
  // the upload to the post row — preventing orphan assets.
  //
  // Gap fix: structured PostApiError thrown on 4xx/5xx so isNonRetryable()
  // works correctly without substring-matching on message text.
  // ---------------------------------------------------------------------------
  uploadMedia: async (
    uri:      string,
    mimeType: string,
    postId:   string,
  ) => {
    const token = await TokenStore.getAccess();
    if (!token) throw new PostApiError('Not authenticated', 'NOT_AUTHENTICATED', 401);

    const url = `${BASE_URL}/upload/post-media?postId=${encodeURIComponent(postId)}`;

    const doUpload = () =>
      FileSystem.uploadAsync(url, uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType?.MULTIPART || 'multipart',
        fieldName:  'file',
        mimeType,
        headers: { Authorization: `Bearer ${token}` },
      });

    // Two network-level attempts (different from server-side retry).
    // Server-side idempotency via postId ensures no duplicate asset on retry.
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Awaited<ReturnType<typeof doUpload>> | null = null;

      try {
        res = await doUpload();
      } catch (networkErr: any) {
        lastErr = networkErr;
        if (attempt === 0) continue; // retry once on network-level failure
        throw new PostApiError(
          `Upload network error: ${networkErr?.message ?? 'unknown'}`,
          'NETWORK_ERROR',
          0,
        );
      }

      if (res.status === 401) {
        throw new PostApiError('Session expired during upload. Please log in again.', 'EXPIRED', 401);
      }

      if (res.status === 200 || res.status === 201) {
        let json: any;
        try {
          json = JSON.parse(res.body);
        } catch {
          throw new PostApiError('Invalid server response from upload endpoint.', 'INVALID_RESPONSE', 500);
        }

        return json.data as {
          post_id:      string;
          status:       string;
          media_url:    string;
          media_type:   string;
          media_width:  number | null;
          media_height: number | null;
        };
      }

      // Parse error body for structured code
      let errMessage = `Upload failed (HTTP ${res.status})`;
      let errCode    = 'UPLOAD_ERROR';
      try {
        const errBody = JSON.parse(res.body);
        errMessage = errBody?.message ?? errMessage;
        errCode    = errBody?.code    ?? errCode;
      } catch { /* noop */ }

      // 4xx errors are non-retryable — throw immediately
      if (res.status >= 400 && res.status < 500) {
        throw new PostApiError(errMessage, errCode, res.status);
      }

      // 5xx — retry on first attempt
      lastErr = new PostApiError(errMessage, errCode, res.status);
      if (attempt === 0) continue;
      throw lastErr;
    }

    throw lastErr ?? new PostApiError('Upload failed after retry', 'UPLOAD_ERROR', 0);
  },

  // ---------------------------------------------------------------------------
  // Step 3: Publish
  //
  // Idempotent — safe to call multiple times.
  // Server validates media is fully attached before allowing transition.
  // ---------------------------------------------------------------------------
  publish: async (postId: string) => {
    const res = await api.post<{ success: boolean; data: BackendPost; message?: string; code?: string }>(
      `/posts/${postId}/publish`, {}
    );
    return { post: toPost(res.data) };
  },

  // ---------------------------------------------------------------------------
  // Retry: reset failed post back to 'draft' then resume from step 2
  //
  // Gap fix: retry now reuses the SAME post_id rather than creating a new draft.
  // The caller should call this, then immediately re-attempt uploadMedia() with
  // the existing postId.
  // ---------------------------------------------------------------------------
  resetForRetry: async (postId: string) => {
    const res = await api.post<{ success: boolean; data: BackendPost; message?: string; code?: string }>(
      `/posts/${postId}/retry`, {}
    );
    return { post: toPost(res.data) };
  },

  // ---------------------------------------------------------------------------
  // Signal failure — client has given up
  //
  // cleanup_media=true tells the server to delete the Cloudinary asset.
  // ---------------------------------------------------------------------------
  markFailed: async (postId: string, reason?: string) => {
    await api.post(`/posts/${postId}/fail`, {
      reason:        reason ?? 'client_gave_up',
      cleanup_media: true,
    });
  },

  // ---------------------------------------------------------------------------
  // Recovery: fetch user's non-published posts after app restart
  //
  // Returns draft/uploading/processing/failed posts so the client can
  // reconcile its persisted pendingPosts against the server's ground truth.
  // ---------------------------------------------------------------------------
  getUserDrafts: async (): Promise<ApiPost[]> => {
    const res = await api.get<{ success: boolean; data: BackendPost[] }>('/posts/drafts');
    return res.data.map(toPost);
  },

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  deletePost: (id: string) => api.delete(`/posts/${id}`),

  // ---------------------------------------------------------------------------
  // Likes & Saves
  // ---------------------------------------------------------------------------
  likePost: async (id: string): Promise<{ liked: boolean; like_count: number }> => {
    const res = await api.post<{ success: boolean; data: { liked: boolean; like_count: number } }>(
      `/posts/${id}/like`, {}
    );
    return res.data;
  },

  // (Removed) savePost
  //
  // The /posts/:id/save route was never registered on the server. The
  // bookmark icon goes through SaveToCollectionSheet which calls
  // CollectionsApi.toggleSaveInCollection(collectionId, postId) — that
  // returns both per-collection state and the global `is_saved` flag.

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------
  getComments: async (
    postId: string,
    params: { cursor?: string; limit?: number } = {}
  ) => {
    const page  = params.cursor ? parseInt(params.cursor, 10) : 1;
    const limit = params.limit ?? 20;
    const res = await api.get<{
      success:  boolean;
      data:     ApiComment[];
      meta:     { hasMore: boolean };
    }>(`/posts/${postId}/comments?page=${page}&limit=${limit}`);

    return {
      items:      res.data,
      hasMore:    res.meta.hasMore,
      nextCursor: res.meta.hasMore ? String(page + 1) : null,
    };
  },

  addComment: async (
    postId:    string,
    text:      string,
    parentId?: string,
  ): Promise<ApiComment> => {
    const res = await api.post<{ success: boolean; data: ApiComment }>(
      `/posts/${postId}/comments`,
      { content: text, parent_id: parentId }
    );
    return res.data;
  },
};

export default PostsApi;