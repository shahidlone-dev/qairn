// backend/src/routes/post.routes.js
'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/post.controller');
const { protect } = require('../middleware/auth.middleware');

router.get ('/',             protect, ctrl.getFeed);
router.post('/',             protect, ctrl.createPost);
router.post('/:id/like',    protect, ctrl.toggleLike);
router.post('/:id/comments',protect, ctrl.addComment);
router.get ('/:id/comments',protect, ctrl.getComments);

module.exports = router;