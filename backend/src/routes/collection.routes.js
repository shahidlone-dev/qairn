// backend/src/routes/collection.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const CollectionController = require('../controllers/collection.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Get the user's collections (Default + Custom + Shared)
router.get('/', CollectionController.getMyCollections);

// Create a new custom collection (body: { name, member_ids })
router.post('/', CollectionController.createCustomCollection);

// Toggle saving a post to a specific collection
router.post('/:collectionId/posts/:postId/toggle', CollectionController.togglePostInCollection);

// Get posts inside a specific collection (For Settings page)
router.get('/:collectionId/posts', CollectionController.getPostsInCollection);

module.exports = router;