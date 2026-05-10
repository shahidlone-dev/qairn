// src/api/stories.api.ts
//
// Stories API client.
//
// Mirrors the conventions of posts.api.ts:
//   - StoryApiError carries a machine-readable code so callers can branch
//     without string-matching on messages
//   - Multipart uploads use Expo FileSystem.uploadAsync with one network-level
//     retry — the server is idempotent at the row level (a duplicate upload
//     just creates a second story; ergonomically that's "user retried before
//     the first request was acked" which is acceptable for stories)

import * as FileSystem from 'expo-file-system/legacy';
import api, { TokenStore, BASE_URL } from './client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type StoryMediaType = 'image' | 'video' | 'text';

export interface ApiStory {
  id:                string;
  user_id:           string;
  media_url:         string | null;
  media_type:        StoryMediaType;
  media_public_id:   string | null;
  text_content:      string | null;
  background_color:  string | null;
  duration_ms:       number;
  width:             number | null;
  height:            number | null;
  created_at:        string;
  expires_at:        string;
  is_viewed?:        boolean;
}

export interface StoryFeedUser {
  id:          string;
  username:    string | null;
  full_name:   string | null;
  avatar_url:  string | null;
}

export interface StoryFeedEntry {
  user:             StoryFeedUser;
  latest_story_at:  string;
  story_count:      number;
  unviewed_count:   number;
}

export interface StoryFeedResponse {
  my:     StoryFeedEntry | null;
  others: StoryFeedEntry[];
}

export interface StoryViewerEntry extends StoryFeedUser {
  viewed_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class StoryApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'StoryApiError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

const StoriesApi = {

  // ---------------------------------------------------------------------------
  // GET /api/stories/feed
  // ---------------------------------------------------------------------------
  getFeed: async (): Promise<StoryFeedResponse> => {
    const res = await api.get<{ success: boolean; data: StoryFeedResponse }>(
      '/stories/feed'
    );
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // GET /api/stories/user/:userId
  // ---------------------------------------------------------------------------
  getByUser: async (userId: string): Promise<ApiStory[]> => {
    const res = await api.get<{ success: boolean; data: ApiStory[] }>(
      `/stories/user/${encodeURIComponent(userId)}`
    );
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // POST /api/stories/upload   (multipart)
  //
  // Uploads a single image or video file. Returns the created story row.
  // ---------------------------------------------------------------------------
  upload: async (
    uri:      string,
    mimeType: string,
    extras?:  { textContent?: string; backgroundColor?: string; durationMs?: number },
  ): Promise<ApiStory> => {
    const token = await TokenStore.getAccess();
    if (!token) throw new StoryApiError('Not authenticated', 'NOT_AUTHENTICATED', 401);

    const url = `${BASE_URL}/stories/upload`;

    const params: Record<string, string> = {};
    if (extras?.textContent)     params.text_content     = extras.textContent;
    if (extras?.backgroundColor) params.background_color = extras.backgroundColor;
    if (extras?.durationMs != null) params.duration_ms   = String(extras.durationMs);

    const doUpload = () =>
      FileSystem.uploadAsync(url, uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType?.MULTIPART || 'multipart',
        fieldName:  'file',
        mimeType,
        parameters: params,
        headers: { Authorization: `Bearer ${token}` },
      });

    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Awaited<ReturnType<typeof doUpload>> | null = null;

      try {
        res = await doUpload();
      } catch (networkErr: any) {
        lastErr = networkErr;
        if (attempt === 0) continue;
        throw new StoryApiError(
          `Story upload network error: ${networkErr?.message ?? 'unknown'}`,
          'NETWORK_ERROR',
          0,
        );
      }

      if (res.status === 401) {
        throw new StoryApiError('Session expired. Please log in again.', 'EXPIRED', 401);
      }

      if (res.status === 200 || res.status === 201) {
        let json: any;
        try { json = JSON.parse(res.body); }
        catch { throw new StoryApiError('Invalid server response.', 'INVALID_RESPONSE', 500); }

        if (json?.success === false) {
          throw new StoryApiError(
            json.message ?? 'Upload failed.',
            json.code    ?? 'UPLOAD_ERROR',
            res.status,
          );
        }
        return json.data as ApiStory;
      }

      let errMessage = `Story upload failed (HTTP ${res.status})`;
      let errCode    = 'UPLOAD_ERROR';
      try {
        const body = JSON.parse(res.body);
        errMessage = body?.message ?? errMessage;
        errCode    = body?.code    ?? errCode;
      } catch { /* noop */ }

      if (res.status >= 400 && res.status < 500) {
        throw new StoryApiError(errMessage, errCode, res.status);
      }

      lastErr = new StoryApiError(errMessage, errCode, res.status);
      if (attempt === 0) continue;
      throw lastErr;
    }

    throw lastErr ?? new StoryApiError('Upload failed after retry', 'UPLOAD_ERROR', 0);
  },

  // ---------------------------------------------------------------------------
  // POST /api/stories/text   (text-only story, no upload)
  // ---------------------------------------------------------------------------
  createText: async (params: {
    text: string;
    backgroundColor?: string;
    durationMs?: number;
  }): Promise<ApiStory> => {
    const res = await api.post<{ success: boolean; data: ApiStory }>('/stories/text', {
      text_content:     params.text,
      background_color: params.backgroundColor ?? null,
      duration_ms:      params.durationMs ?? undefined,
    });
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // POST /api/stories/:id/view
  // ---------------------------------------------------------------------------
  markViewed: async (storyId: string): Promise<void> => {
    await api.post(`/stories/${encodeURIComponent(storyId)}/view`, {});
  },

  // ---------------------------------------------------------------------------
  // GET /api/stories/:id/viewers   (owner only)
  // ---------------------------------------------------------------------------
  listViewers: async (storyId: string): Promise<StoryViewerEntry[]> => {
    const res = await api.get<{ success: boolean; data: StoryViewerEntry[] }>(
      `/stories/${encodeURIComponent(storyId)}/viewers`
    );
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // DELETE /api/stories/:id
  // ---------------------------------------------------------------------------
  remove: async (storyId: string): Promise<void> => {
    await api.delete(`/stories/${encodeURIComponent(storyId)}`);
  },
};

export default StoriesApi;
