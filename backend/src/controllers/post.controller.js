// backend/src/controllers/post.controller.js
'use strict';

const PostService = require('../services/post.service');

const PostController = {

  // POST /api/posts
  async createPost(req, res, next) {
    try {
      const post = await PostService.createPost(req.user.id, req.body);
      res.status(201).json({ success: true, data: post });
    } catch (err) { next(err); }
  },

  // GET /api/posts?page=1&limit=10
  async getFeed(req, res, next) {
    try {
      const page  = Math.max(1, parseInt(req.query.page)  || 1);
      const limit = Math.min(50, parseInt(req.query.limit) || 10);
      const { posts, hasMore, total } = await PostService.getFeed(req.user.id, page, limit);
      res.json({
        success: true,
        data:    posts,
        meta:    { page, limit, hasMore, total },
      });
    } catch (err) { next(err); }
  },

  // POST /api/posts/:id/like
  async toggleLike(req, res, next) {
    try {
      const result = await PostService.toggleLike(req.user.id, req.params.id);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  // POST /api/posts/:id/comments
  async addComment(req, res, next) {
    try {
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content required' });
      const comment = await PostService.addComment(req.user.id, req.params.id, content.trim());
      res.status(201).json({ success: true, data: comment });
    } catch (err) { next(err); }
  },

  // GET /api/posts/:id/comments?page=1&limit=20
  async getComments(req, res, next) {
    try {
      const page  = Math.max(1, parseInt(req.query.page)  || 1);
      const limit = Math.min(100, parseInt(req.query.limit) || 20);
      const { comments, hasMore } = await PostService.getComments(req.params.id, page, limit);
      res.json({ success: true, data: comments, meta: { page, limit, hasMore } });
    } catch (err) { next(err); }
  },
};

module.exports = PostController;