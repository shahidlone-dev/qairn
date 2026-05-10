// frontend/src/api/collections.api.ts
//
// Bug fix:
//   The previous version called `api.get<any>(path)` and then accessed
//   `res.data` and `res.status`. But `api.get` already returns the parsed
//   JSON body — i.e. the envelope itself. The code was unwrapping the
//   envelope's `data` field and then passing it to `unwrap()` AGAIN, which
//   meant the error-handling branches in `unwrap` were unreachable.
//
//   The functional path only worked thanks to the `Array.isArray` shortcut
//   for /collections (naked array OR envelope-wrapped array both happen to
//   resolve), and the catch-all "return as-is" fallback for the other
//   endpoints. The error reporting (PostApiError on `success: false`) was
//   silently dead.
//
// Cleanup:
//   - `unwrap` now receives the full envelope and uses it correctly.
//   - The fallback for naked-array / naked-object responses is preserved
//     since older server builds may still return that shape.

import api from './client';
import { PostApiError } from './posts.api';

// =============================================================================
// Types
// =============================================================================

export interface ApiCollection {
  id: string;
  name: string;
  is_default: boolean;
  owner_id: string;
  created_at: string;
  collection_members?: { user_id: string }[];
}

export interface ServerEnvelope<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  code?: string;
}

/**
 * Robust unwrap. Accepts either:
 *   - the full server envelope `{ success, data, ... }`
 *   - a naked value (legacy server builds / array endpoints)
 * and returns the inner data.
 */
function unwrap<T>(response: any, httpStatus = 200): T {
  // Naked array (the original `/collections` shape)
  if (Array.isArray(response)) {
    return response as unknown as T;
  }

  // Wrapped envelope from the modern server
  if (response && typeof response === 'object' && 'success' in response) {
    if (response.success === false) {
      throw new PostApiError(
        response.message ?? 'Unknown error',
        response.code    ?? 'UNKNOWN',
        httpStatus,
      );
    }
    return response.data as T;
  }

  // Anything else — assume the caller already has the data
  return response as T;
}

// =============================================================================
// API
// =============================================================================

const CollectionsApi = {
  // ---------------------------------------------------------------------------
  // Get all collections (Owned + Shared)
  // ---------------------------------------------------------------------------
  getMyCollections: async (): Promise<ApiCollection[]> => {
    try {
      const env = await api.get<any>('/collections');
      return unwrap<ApiCollection[]>(env) ?? [];
    } catch (err) {
      console.error('CollectionsApi.getMyCollections failed:', err);
      return [];
    }
  },

  // ---------------------------------------------------------------------------
  // Create a Custom Collection
  // ---------------------------------------------------------------------------
  createCollection: async (name: string, memberIds: string[] = []): Promise<ApiCollection> => {
    const env = await api.post<any>('/collections', {
      name,
      member_ids: memberIds,
    });
    return unwrap<ApiCollection>(env);
  },

  // ---------------------------------------------------------------------------
  // Toggle saving a post to a SPECIFIC collection.
  //
  // Server response shape:
  //   {
  //     in_this_collection: boolean,   // is the post currently in this collection?
  //     is_saved:           boolean,   // is the post saved in ANY of the user's collections?
  //     collection_id:      string,
  //   }
  //
  // The previous server only returned per-collection state which made the
  // bookmark icon flicker when the post was saved in multiple collections.
  // ---------------------------------------------------------------------------
  toggleSaveInCollection: async (
    collectionId: string,
    postId: string,
  ): Promise<{
    in_this_collection: boolean;
    is_saved:           boolean;
    collection_id:      string;
  }> => {
    const env = await api.post<any>(`/collections/${collectionId}/posts/${postId}/toggle`, {});
    return unwrap(env);
  },

  // ---------------------------------------------------------------------------
  // Get Posts inside a specific collection (For Settings / Saved tab)
  // ---------------------------------------------------------------------------
  getCollectionPosts: async (
    collectionId: string,
    params: { cursor?: string; limit?: number } = {},
  ) => {
    const page  = params.cursor ? parseInt(params.cursor, 10) : 1;
    const limit = params.limit ?? 15;

    const env = await api.get<any>(
      `/collections/${collectionId}/posts?page=${page}&limit=${limit}`,
    );
    const data = unwrap<{ posts: any[]; hasMore: boolean; total: number }>(env);

    return {
      items:      data?.posts ?? [],
      hasMore:    data?.hasMore ?? false,
      nextCursor: data?.hasMore ? String(page + 1) : null,
    };
  },
};

export default CollectionsApi;
