// backend/src/controllers/collection.controller.js
'use strict';

const CollectionService = require('../services/collection.service');

// Helper functions matching your post.controller.js style
function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function fail(res, statusCode, message, code = 'ERROR') {
  return res.status(statusCode).json({ success: false, message, code });
}

const CollectionController = {
  async getMyCollections(req, res) {
    try {
      const collections = await CollectionService.getUserCollections(req.user.id);
      return ok(res, collections);
    } catch (err) {
      return fail(res, 500, err.message, 'FETCH_FAILED');
    }
  },

  async createCustomCollection(req, res) {
    try {
      const { name, member_ids } = req.body;
      const collection = await CollectionService.createCollection(req.user.id, name, member_ids);
      return ok(res, collection, 201);
    } catch (err) {
      return fail(res, err.status || 500, err.message, 'CREATE_FAILED');
    }
  },

  async togglePostInCollection(req, res) {
    try {
      const { collectionId, postId } = req.params;
      const result = await CollectionService.toggleSaveInCollection(req.user.id, postId, collectionId);
      return ok(res, result);
    } catch (err) {
      return fail(res, 500, err.message, 'SAVE_FAILED');
    }
  },

  // FIXED: Moved this method INSIDE the CollectionController object
  async getPostsInCollection(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;
      const result = await CollectionService.getCollectionPosts(req.user.id, req.params.collectionId, page, limit);
      return ok(res, result);
    } catch (err) {
      return fail(res, err.status || 500, err.message, 'FETCH_POSTS_FAILED');
    }
  }
};

module.exports = CollectionController;