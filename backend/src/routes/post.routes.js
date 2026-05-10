// backend/src/routes/post.routes.js
'use strict';

const express        = require('express');
const router         = express.Router();
const PostController = require('../controllers/post.controller');
const { protect }    = require('../middleware/auth.middleware');

// All post routes require authentication
router.use(protect);

// ── Feed ──────────────────────────────────────────────────────────────────────
router.get('/', PostController.getFeed);

// ── Pending posts recovery (app restart) ─────────────────────────────────────
// IMPORTANT: must be registered BEFORE /:id routes to avoid 'drafts' being
// interpreted as a post ID.
router.get('/drafts', PostController.getUserDrafts);

// ── Atomic draft/publish flow ─────────────────────────────────────────────────
// Step 1: create draft → returns post_id immediately
router.post('/draft', PostController.createDraft);

// Step 3: publish after media is attached (or for text-only posts)
router.post('/:id/publish', PostController.publish);

// Step 2b alternative: reset failed post back to 'draft' before re-uploading
// Uses the SAME post_id — no new row created (satisfies Requirement 3)
router.post('/:id/retry', PostController.resetForRetry);

// Client signals it has given up on a post
router.post('/:id/fail', PostController.markFailed);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.delete('/:id', PostController.deletePost);

// ── Social ────────────────────────────────────────────────────────────────────
router.post('/:id/like', PostController.toggleLike);

// ── Comments ──────────────────────────────────────────────────────────────────
router.get( '/:id/comments', PostController.getComments);
router.post('/:id/comments', PostController.addComment);

module.exports = router;