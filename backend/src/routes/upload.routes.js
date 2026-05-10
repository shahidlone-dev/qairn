// backend/src/routes/upload.routes.js
'use strict';

const express          = require('express');
const router           = express.Router();
const UploadController = require('../controllers/upload.controller');
const { protect }      = require('../middleware/auth.middleware');
const { uploadPostMedia, uploadAvatar } = require('../middleware/upload.middleware');

router.use(protect);

// Step 2: upload media linked to a draft post_id
// POST /api/upload/post-media?postId=:uuid
router.post('/post-media', uploadPostMedia, UploadController.postMedia);

// Avatar — independent of the post flow
router.post('/avatar', uploadAvatar, UploadController.avatar);

module.exports = router;