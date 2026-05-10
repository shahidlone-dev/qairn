// backend/src/controllers/story.controller.js
//
// HTTP layer for stories. Same conventions as PostController:
//   - { success, data, ... } envelope for OK responses
//   - { success: false, message, code } envelope for errors
//   - Service-layer errors are mapped to HTTP status codes here, not re-thrown
//
// Endpoints (all behind `protect` middleware — see story.routes.js):
//   POST   /api/stories/upload        multipart file + text fields
//   POST   /api/stories/text          create a text-only story (no upload)
//   GET    /api/stories/feed          list of (user, hasUnviewed, latestAt)
//   GET    /api/stories/user/:userId  active stories for a single user
//   POST   /api/stories/:id/view      mark story as viewed
//   GET    /api/stories/:id/viewers   owner-only — who saw it
//   DELETE /api/stories/:id           soft-delete + cleanup
//
// Uploads are atomic: if Cloudinary succeeds but the DB insert fails we
// synchronously delete the Cloudinary asset to prevent orphans (mirrors the
// post upload pipeline's orphan-prevention logic).

'use strict';

const StoryService = require('../services/story.service');
const MediaService = require('../services/media.service');
const supabase     = require('../config/supabase');
const logger       = require('../utils/logger');

// =============================================================================
// Helpers
// =============================================================================

function ok(res, data, statusCode = 200, extra = {}) {
  return res.status(statusCode).json({ success: true, data, ...extra });
}

function fail(res, statusCode, message, code = 'ERROR') {
  return res.status(statusCode).json({ success: false, message, code });
}

function handleServiceError(res, err, context) {
  logger.error(`[StoryController] ${context}: ${err.message}`);

  if (err.name === 'StoryNotFoundError')   return fail(res, 404, err.message, 'STORY_NOT_FOUND');
  if (err.name === 'StoryForbiddenError')  return fail(res, 403, err.message, 'FORBIDDEN');

  if (err.status >= 400 && err.status < 500) {
    return fail(res, err.status, err.message, err.code ?? 'CLIENT_ERROR');
  }
  return fail(res, 500, 'An unexpected error occurred.', 'SERVER_ERROR');
}

function parseIntSafe(val, fallback) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : fallback;
}

// =============================================================================
// Controller
// =============================================================================

const StoryController = {

  // ---------------------------------------------------------------------------
  // POST /api/stories/upload   (multipart/form-data)
  //
  // Required form fields:
  //   file               — the image/video binary (multer field name 'file')
  //
  // Optional form fields:
  //   duration_ms        — integer (clamped server-side)
  //   text_content       — overlay caption (max 200 chars)
  //   background_color   — hex string for text/overlay backdrop
  //
  // Behavior:
  //   1. Upload to Cloudinary (qaaf/stories/...)
  //   2. Insert story row referencing the asset
  //   3. If insert fails, delete the Cloudinary asset synchronously
  // ---------------------------------------------------------------------------
  async upload(req, res) {
    if (!req.file) {
      return fail(res, 400, 'No file received. Use field name "file".', 'NO_FILE');
    }

    let uploadResult = null;

    try {
      uploadResult = await MediaService.uploadStoryMedia(req.file);

      logger.info(
        `[story.upload] ${uploadResult.media_type} uploaded: ${uploadResult.media_public_id} ` +
        `(${uploadResult.width ?? '?'}×${uploadResult.height ?? '?'}) → user ${req.user.id}`
      );

      // Optional caption / styling sent alongside the file
      const textContent =
        typeof req.body.text_content === 'string' ? req.body.text_content.trim() : null;
      if (textContent && textContent.length > 200) {
        // Caption too long is a soft error — we already burned the upload.
        // Truncate rather than reject; user feedback shows the truncated copy.
        logger.warn(`[story.upload] truncating long caption (${textContent.length})`);
      }

      const story = await StoryService.create(req.user.id, {
        mediaUrl:        uploadResult.media_url,
        mediaType:       uploadResult.media_type,
        mediaPublicId:   uploadResult.media_public_id,
        textContent:     textContent ? textContent.slice(0, 200) : null,
        backgroundColor: typeof req.body.background_color === 'string'
                          ? req.body.background_color : null,
        durationMs:      parseIntSafe(req.body.duration_ms, undefined),
        width:           uploadResult.width,
        height:          uploadResult.height,
      });

      return ok(res, story, 201);
    } catch (err) {
      logger.error(`[story.upload] failed: ${err.message}`);

      // Orphan prevention — same pattern as upload.controller.js
      if (uploadResult?.media_public_id) {
        const isVideo = uploadResult.media_type === 'video';
        try {
          await MediaService.delete(uploadResult.media_public_id, isVideo);
          logger.info(`[story.upload] orphan cleanup ok: ${uploadResult.media_public_id}`);
        } catch (cleanupErr) {
          logger.error(
            `[story.upload] orphan cleanup FAILED for ${uploadResult.media_public_id}: ` +
            cleanupErr.message + ' — queuing for retry'
          );
          await supabase
            .from('cloudinary_cleanup_queue')
            .insert({
              public_id:     uploadResult.media_public_id,
              resource_type: isVideo ? 'video' : 'image',
              post_id:       null,
            })
            .catch(qErr =>
              logger.error(`[story.upload] cleanup queue insert failed: ${qErr.message}`)
            );
        }
      }

      return handleServiceError(res, err, 'upload');
    }
  },

  // ---------------------------------------------------------------------------
  // POST /api/stories/text   (application/json)
  //
  // Body: { text_content, background_color?, duration_ms? }
  //
  // Text-only stories don't touch Cloudinary so we have a separate route to
  // avoid forcing the client through multipart for what is essentially a
  // tiny JSON insert.
  // ---------------------------------------------------------------------------
  async createText(req, res) {
    try {
      const { text_content, background_color, duration_ms } = req.body ?? {};

      if (typeof text_content !== 'string' || !text_content.trim()) {
        return fail(res, 400, 'text_content is required.', 'MISSING_TEXT_CONTENT');
      }
      if (text_content.length > 200) {
        return fail(res, 400, 'text_content must be 200 characters or fewer.', 'TEXT_TOO_LONG');
      }

      const story = await StoryService.create(req.user.id, {
        mediaType:       'text',
        textContent:     text_content.trim(),
        backgroundColor: typeof background_color === 'string' ? background_color : null,
        durationMs:      parseIntSafe(duration_ms, undefined),
      });

      return ok(res, story, 201);
    } catch (err) {
      return handleServiceError(res, err, 'createText');
    }
  },

  // ---------------------------------------------------------------------------
  // GET /api/stories/feed
  //
  // Returns:
  //   {
  //     my:     { user, latest_story_at, story_count, unviewed_count } | null
  //     others: [...same shape, unviewed-first sort...]
  //   }
  // ---------------------------------------------------------------------------
  async getFeed(req, res) {
    try {
      const data = await StoryService.getFeed(req.user.id);
      return ok(res, data);
    } catch (err) {
      return handleServiceError(res, err, 'getFeed');
    }
  },

  // ---------------------------------------------------------------------------
  // GET /api/stories/user/:userId
  //
  // Returns the target user's active stories with `is_viewed` per story.
  // ---------------------------------------------------------------------------
  async getByUser(req, res) {
    try {
      const targetUserId = req.params.userId?.trim();
      if (!targetUserId) return fail(res, 400, 'userId is required.', 'MISSING_USER_ID');

      const stories = await StoryService.getActiveByUser(targetUserId, req.user.id);
      return ok(res, stories);
    } catch (err) {
      return handleServiceError(res, err, 'getByUser');
    }
  },

  // ---------------------------------------------------------------------------
  // POST /api/stories/:id/view
  // ---------------------------------------------------------------------------
  async markViewed(req, res) {
    try {
      const storyId = req.params.id?.trim();
      if (!storyId) return fail(res, 400, 'id is required.', 'MISSING_STORY_ID');

      const recorded = await StoryService.markViewed(req.user.id, storyId);
      return ok(res, { recorded });
    } catch (err) {
      return handleServiceError(res, err, 'markViewed');
    }
  },

  // ---------------------------------------------------------------------------
  // GET /api/stories/:id/viewers   (owner only)
  // ---------------------------------------------------------------------------
  async listViewers(req, res) {
    try {
      const storyId = req.params.id?.trim();
      if (!storyId) return fail(res, 400, 'id is required.', 'MISSING_STORY_ID');

      const viewers = await StoryService.listViewers(req.user.id, storyId);
      return ok(res, viewers);
    } catch (err) {
      return handleServiceError(res, err, 'listViewers');
    }
  },

  // ---------------------------------------------------------------------------
  // DELETE /api/stories/:id
  //
  // Soft-deletes the row and best-effort deletes the Cloudinary asset. If the
  // delete from Cloudinary fails we queue it for the cleanup processor so we
  // never block the user's UI on a dangling asset.
  // ---------------------------------------------------------------------------
  async deleteStory(req, res) {
    try {
      const storyId = req.params.id?.trim();
      if (!storyId) return fail(res, 400, 'id is required.', 'MISSING_STORY_ID');

      const removed = await StoryService.delete(req.user.id, storyId);

      if (removed.media_public_id) {
        const isVideo = removed.media_type === 'video';
        MediaService.delete(removed.media_public_id, isVideo).catch(async cleanupErr => {
          logger.error(
            `[story.delete] cloud delete failed for ${removed.media_public_id}: ` +
            cleanupErr.message + ' — queuing'
          );
          await supabase
            .from('cloudinary_cleanup_queue')
            .insert({
              public_id:     removed.media_public_id,
              resource_type: isVideo ? 'video' : 'image',
              post_id:       null,
            })
            .catch(qErr =>
              logger.error(`[story.delete] cleanup queue insert failed: ${qErr.message}`)
            );
        });
      }

      return ok(res, { id: removed.id });
    } catch (err) {
      return handleServiceError(res, err, 'deleteStory');
    }
  },
};

module.exports = StoryController;
