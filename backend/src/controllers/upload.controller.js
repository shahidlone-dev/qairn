// backend/src/controllers/upload.controller.js
'use strict';

const MediaService = require('../services/media.service');
const PostService  = require('../services/post.service');
const logger       = require('../utils/logger');
const supabase     = require('../config/supabase');

// =============================================================================
// Upload Controller
//
// Handles Step 2 of the atomic post pipeline:
//   1. Validate postId and ownership BEFORE starting the upload
//   2. Upload to Cloudinary (expensive — only reached if step 1 passes)
//   3. Attach media to post row atomically
//   4. If step 3 fails, synchronously delete the Cloudinary asset
// =============================================================================

const UploadController = {

  // POST /api/upload/post-media?postId=:uuid
  async postMedia(req, res) {
    const postId = req.query.postId?.trim();

    // --- Basic input validation
    if (!postId) {
      return res.status(400).json({
        message: 'postId query parameter is required.',
        code:    'MISSING_POST_ID',
      });
    }

    // Validate UUID format to prevent DB injection / PGSQL cast errors
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
      return res.status(400).json({
        message: 'Invalid postId format. Must be a UUID.',
        code:    'INVALID_POST_ID',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'No file received. Ensure the field name is "file".',
        code:    'NO_FILE',
      });
    }

    // --- PRE-UPLOAD OWNERSHIP CHECK (cheap DB read before expensive upload)
    //
    // Gap fix: the previous version started the Cloudinary upload immediately,
    // relying on attachMedia() to enforce ownership. But by then we've already
    // burned bandwidth and Cloudinary credits. A malicious or buggy client
    // could trigger uploads for posts they don't own.
    //
    // We do a lightweight select here — just status + user_id, no joins.
    const { data: postGuard, error: guardErr } = await supabase
      .from('posts')
      .select('id, user_id, status, media_public_id')
      .eq('id', postId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (guardErr) {
      logger.error(`preUploadGuard DB error for post ${postId}:`, guardErr.message);
      return res.status(500).json({
        message: 'Failed to validate post.',
        code:    'DB_ERROR',
      });
    }

    if (!postGuard) {
      return res.status(404).json({
        message: 'Post not found.',
        code:    'POST_NOT_FOUND',
      });
    }

    if (postGuard.user_id !== req.user.id) {
      return res.status(403).json({
        message: 'You do not own this post.',
        code:    'FORBIDDEN',
      });
    }

    // Reject if post is in a state that cannot accept an upload
    const uploadableStates = ['draft', 'failed'];
    if (!uploadableStates.includes(postGuard.status)) {
      return res.status(409).json({
        message: `Post is in status '${postGuard.status}' and cannot accept a new upload.`,
        code:    'INVALID_POST_STATUS',
        current_status: postGuard.status,
      });
    }

    // --- Begin upload
    let uploadResult = null;

    try {
      // Step 2a: Upload to Cloudinary
      uploadResult = await MediaService.uploadPostMedia(req.file);

      logger.info(
        `[upload] ${uploadResult.media_type} uploaded: ${uploadResult.media_public_id} ` +
        `(${uploadResult.width ?? '?'}×${uploadResult.height ?? '?'}) → post ${postId}`
      );

      // Step 2b: Attach to post row — sets status → 'uploading' and records
      // media_attached_at (required by publish() for media integrity check)
      const updatedPost = await PostService.attachMedia(req.user.id, postId, {
        media_url:       uploadResult.media_url,
        media_type:      uploadResult.media_type,
        media_width:     uploadResult.width,
        media_height:    uploadResult.height,
        media_public_id: uploadResult.media_public_id,
      });

      return res.status(200).json({
        data: {
          post_id:      updatedPost.id,
          status:       updatedPost.status,
          media_url:    uploadResult.media_url,
          media_type:   uploadResult.media_type,
          media_width:  uploadResult.width,
          media_height: uploadResult.height,
        },
      });

    } catch (err) {
      logger.error(`[upload] postMedia(${postId}) failed: ${err.message}`);

      // --- ORPHAN PREVENTION
      // If Cloudinary upload succeeded but DB attach failed, we must delete
      // the Cloudinary asset synchronously before returning the error.
      // This is the primary correctness guarantee for gap #5.
      if (uploadResult?.media_public_id) {
        const isVideo = uploadResult.media_type === 'video';
        logger.warn(
          `[upload] Orphan cleanup: deleting ${uploadResult.media_public_id} ` +
          `after attach failure for post ${postId}`
        );

        try {
          await MediaService.delete(uploadResult.media_public_id, isVideo);
          logger.info(`[upload] Orphan cleanup succeeded: ${uploadResult.media_public_id}`);
        } catch (cleanupErr) {
          // Delete failed — queue for async retry rather than losing the reference
          logger.error(
            `[upload] Orphan cleanup FAILED for ${uploadResult.media_public_id}: ` +
            cleanupErr.message + ' — queuing for retry'
          );
          // Import supabase directly to avoid circular dep through PostService
          await supabase
            .from('cloudinary_cleanup_queue')
            .insert({
              public_id:     uploadResult.media_public_id,
              resource_type: isVideo ? 'video' : 'image',
              post_id:       postId,
            })
            .catch(qErr =>
              logger.error(`[upload] Cleanup queue insert failed: ${qErr.message}`)
            );
        }
      }

      const status  = err.status ?? 500;
      const code    = err.code   ?? 'UPLOAD_ERROR';
      return res.status(status).json({ message: err.message || 'Upload failed.', code });
    }
  },

  // POST /api/upload/avatar
  async avatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file received.', code: 'NO_FILE' });
      }

      const result = await MediaService.uploadAvatar(req.file);
      logger.info(`[upload] Avatar uploaded → ${result.public_id}`);

      return res.status(200).json({
        data: { avatar_url: result.avatar_url },
      });
    } catch (err) {
      logger.error('[upload] avatar error:', err.message);
      return res.status(err.status ?? 500).json({
        message: err.message || 'Avatar upload failed.',
        code:    err.code ?? 'UPLOAD_ERROR',
      });
    }
  },
};

module.exports = UploadController;