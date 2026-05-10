// backend/src/routes/story.routes.js
'use strict';

const express          = require('express');
const router           = express.Router();
const StoryController  = require('../controllers/story.controller');
const { protect }      = require('../middleware/auth.middleware');
const { uploadStoryMedia } = require('../middleware/upload.middleware');

// Stories require auth in all cases — even read endpoints, because the
// `is_viewed` projection is keyed on `req.user.id`.
router.use(protect);

// ── Reads ─────────────────────────────────────────────────────────────────────
router.get('/feed',           StoryController.getFeed);
router.get('/user/:userId',   StoryController.getByUser);
router.get('/:id/viewers',    StoryController.listViewers);

// ── Writes ────────────────────────────────────────────────────────────────────
router.post('/text',          StoryController.createText);
router.post('/upload',        uploadStoryMedia, StoryController.upload);
router.post('/:id/view',      StoryController.markViewed);
router.delete('/:id',         StoryController.deleteStory);

module.exports = router;
