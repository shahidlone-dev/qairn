// backend/src/controllers/post.controller.js
'use strict';

const PostService = require('../services/post.service');
const logger      = require('../utils/logger');

// =============================================================================
// Helpers
// =============================================================================

function parseIntSafe(val) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : null;
}

// Consistent success envelope
function ok(res, data, statusCode = 200, extra = {}) {
  return res.status(statusCode).json({ success: true, data, ...extra });
}

// Consistent error envelope — always includes a machine-readable `code`
function fail(res, statusCode, message, code = 'ERROR') {
  return res.status(statusCode).json({ success: false, message, code });
}

// Translate service-layer errors to HTTP responses.
// Keeps controllers thin — no business logic, just HTTP mapping.
function handleServiceError(res, err, context) {
  logger.error(`[PostController] ${context}: ${err.message}`);

  // Known structured errors from PostService
  if (err.name === 'PostNotFoundError')      return fail(res, 404, err.message, 'POST_NOT_FOUND');
  if (err.name === 'InvalidTransitionError') return fail(res, 409, err.message, err.code ?? 'INVALID_TRANSITION');
  if (err.name === 'DuplicatePostError')     return fail(res, 409, err.message, 'DUPLICATE_POST');

  // Explicit status attached to error
  if (err.status >= 400 && err.status < 500) {
    return fail(res, err.status, err.message, err.code ?? 'CLIENT_ERROR');
  }

  return fail(res, 500, 'An unexpected error occurred.', 'SERVER_ERROR');
}

// =============================================================================
// Controller
// =============================================================================

const PostController = {

  // ---------------------------------------------------------------------------
  // POST /api/posts/draft   (Step 1)
  //
  // Creates a post in 'draft' state and returns the real post_id immediately.
  // Idempotent via idempotency_key: duplicate requests return the existing draft
  // with { duplicate: true } in the envelope.
  //
  // Body: { content, idempotency_key, has_media }
  // ---------------------------------------------------------------------------
  async createDraft(req, res) {
    try {
      const { content = '', idempotency_key, has_media = false } = req.body;

      // --- Input validation
      if (!content?.trim() && !has_media) {
        return fail(res, 400, 'Post must have content or media.', 'MISSING_CONTENT');
      }

      if (content && typeof content !== 'string') {
        return fail(res, 400, 'content must be a string.', 'INVALID_CONTENT');
      }

      if (content?.length > 2000) {
        return fail(res, 400, 'content must be 2000 characters or fewer.', 'CONTENT_TOO_LONG');
      }

      if (idempotency_key !== undefined) {
        if (typeof idempotency_key !== 'string') {
          return fail(res, 400, 'idempotency_key must be a string.', 'INVALID_IDEMPOTENCY_KEY');
        }
        // Enforce UUID v4 format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotency_key)) {
          return fail(res, 400, 'idempotency_key must be a valid UUID v4.', 'INVALID_IDEMPOTENCY_KEY_FORMAT');
        }
      }

      let draft;
      let duplicate = false;

      try {
        draft = await PostService.createDraft(req.user.id, {
          content,
          idempotencyKey: idempotency_key,
          hasMedia:       Boolean(has_media),
        });
      } catch (err) {
        if (err instanceof PostService.DuplicatePostError) {
          // Return existing post — client can continue from where it left off
          return ok(res, err.existingPost, 200, { duplicate: true });
        }
        throw err;
      }

      return ok(res, draft, 201, { duplicate });

    } catch (err) {
      return handleServiceError(res, err, 'createDraft');
    }
  },

  // ---------------------------------------------------------------------------
  // POST /api/posts/:id/publish   (Step 3)
  //
  // Transitions post to 'published'. Idempotent — safe to call multiple times.
  // Validates that media is fully attached before allowing publish.
  // ---------------------------------------------------------------------------
  async publish(req, res) {
    try {
      if (!req.params.id) {
        return fail(res, 400, 'Post ID is required.', 'MISSING_POST_ID');
      }

      const post = await PostService.publish(req.user.id, req.params.id);
      return ok(res, post);
    } catch (err) {
      return handleServiceError(res, err, `publish(${req.params.id})`);
    }
  },

  // ---------------------------------------------------------------------------
  // POST /api/posts/:id/fail
  //
  // Client signals it has given up on a post (e.g., too many upload retries).
  // cleanupMedia=true is sent when the client wants the server to delete the
  // Cloudinary asset associated with this post.
  //
  // Body: { reason?, cleanup_media? }
  // ---------------------------------------------------------------------------
  async markFailed(req, res) {
    try {
      const { reason = 'client_gave_up', cleanup_media = true } = req.body;

      await PostService.markFailed(
        req.user.id,
        req.params.id,
        reason,
        { cleanupMedia: Boolean(cleanup_media) }
      );

      return ok(res, { post_id: req.params.id, status: 'failed' });
    } catch (err) {
      return handleServiceError(res, err, `markFailed(${req.params.id})`);
    }
  },

  // ---------------------------------------------------------------------------
  // POST /api/posts/:id/retry
  //
  // Resets a 'failed' post back to 'draft' so the upload pipeline can restart
  // from step 2 using the SAME post_id. Does NOT create a new post.
  //
  // The client should call this BEFORE re-attempting the upload, then proceed
  // directly to step 2 (upload) → step 3 (publish) using the existing post_id.
  // ---------------------------------------------------------------------------
  async resetForRetry(req, res) {
    try {
      const post = await PostService.resetForRetry(req.user.id, req.params.id);
      return ok(res, post);
    } catch (err) {
      return handleServiceError(res, err, `resetForRetry(${req.params.id})`);
    }
  },

  // ---------------------------------------------------------------------------
  // GET /api/posts/drafts
  //
  // Returns the authenticated user's non-published posts (draft, uploading,
  // processing, failed). Used by the client on app restart to recover pending
  // posts and resume any incomplete uploads.
  // ---------------------------------------------------------------------------
  async getUserDrafts(req, res) {
    try {
      const posts = await PostService.getUserDrafts(req.user.id);
      return ok(res, posts);
    } catch (err) {
      return handleServiceError(res, err, 'getUserDrafts');
    }
  },

  // ---------------------------------------------------------------------------
  // GET /api/posts
  // ---------------------------------------------------------------------------
  async getFeed(req, res) {
    try {
      const page   = parseIntSafe(req.query.page)  ?? 1;
      const limit  = Math.min(parseIntSafe(req.query.limit) ?? 15, 50);
      const filter = req.query.filter ?? 'forYou';

      if (!['forYou', 'myCircle'].includes(filter)) {
        return fail(res, 400, "filter must be 'forYou' or 'myCircle'.", 'INVALID_FILTER');
      }

      if (page < 1) return fail(res, 400, 'page must be >= 1.', 'INVALID_PAGE');

      const result = await PostService.getFeed(req.user.id, page, limit, filter);

      return ok(res, result.posts, 200, {
        meta: { page, limit, hasMore: result.hasMore, total: result.total },
      });
    } catch (err) {
      return handleServiceError(res, err, 'getFeed');
    }
  },

  // ---------------------------------------------------------------------------
  // DELETE /api/posts/:id
  // ---------------------------------------------------------------------------
  async deletePost(req, res) {
    try {
      await PostService.deletePost(req.user.id, req.params.id);
      return ok(res, { post_id: req.params.id, deleted: true });
    } catch (err) {
      return handleServiceError(res, err, `deletePost(${req.params.id})`);
    }
  },

  // ---------------------------------------------------------------------------
  // POST /api/posts/:id/like
  // ---------------------------------------------------------------------------
  async toggleLike(req, res) {
    try {
      const result = await PostService.toggleLike(req.user.id, req.params.id);
      return ok(res, result);
    } catch (err) {
      return handleServiceError(res, err, `toggleLike(${req.params.id})`);
    }
  },

  // (Removed) POST /api/posts/:id/save
  //
  // The bookmark UX now goes through SaveToCollectionSheet which calls
  // /api/collections/:collectionId/posts/:postId/toggle. The old endpoint
  // was never wired in post.routes.js and PostService had no matching
  // implementation, so it always 404'd or 500'd. Use the collections route.

  // ---------------------------------------------------------------------------
  // POST /api/posts/:id/comments
  // ---------------------------------------------------------------------------
  async addComment(req, res) {
    try {
      const { content, parent_id } = req.body;

      if (!content?.trim()) {
        return fail(res, 400, 'Comment cannot be empty.', 'EMPTY_COMMENT');
      }
      if (content.length > 1000) {
        return fail(res, 400, 'Comment must be 1000 characters or fewer.', 'COMMENT_TOO_LONG');
      }

      const comment = await PostService.addComment(
        req.user.id, req.params.id, content, parent_id
      );
      return ok(res, comment, 201);
    } catch (err) {
      return handleServiceError(res, err, `addComment(${req.params.id})`);
    }
  },

  // ---------------------------------------------------------------------------
  // GET /api/posts/:id/comments
  // ---------------------------------------------------------------------------
  async getComments(req, res) {
    try {
      const page  = parseIntSafe(req.query.page)  ?? 1;
      const limit = Math.min(parseIntSafe(req.query.limit) ?? 20, 100);
      const result = await PostService.getComments(req.params.id, page, limit);
      return ok(res, result.comments, 200, {
        meta: { page, limit, hasMore: result.hasMore },
      });
    } catch (err) {
      return handleServiceError(res, err, `getComments(${req.params.id})`);
    }
  },
};

module.exports = PostController;