// backend/src/controllers/user.controller.js
'use strict';

const UserService = require('../services/user.service');

const UserController = {

  // GET /api/users/me
  async getMe(req, res, next) {
    try {
      const user = await UserService.getMe(req.user.id);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  // PUT /api/users/me
  async updateMe(req, res, next) {
    try {
      const user = await UserService.updateMe(req.user.id, req.body);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  // GET /api/users/me/circle?limit=200
  //
  // Returns the list of users the current viewer follows. Used by the
  // "Add friends to collection" picker and any other surface that wants to
  // present the viewer's social circle without a username search.
  async getMyCircle(req, res, next) {
    try {
      const limit = Math.max(1, Math.min(500, parseInt(req.query.limit) || 200));
      const users = await UserService.getMyCircle(req.user.id, limit);
      res.json({ success: true, data: users });
    } catch (err) { next(err); }
  },

  // GET /api/users/search?q=foo&limit=20
  //
  // Username-only search. Returns an empty array for queries shorter than 2
  // characters rather than 400-ing — the client can debounce-spam this and
  // we don't want a wall of red errors while the user is mid-type.
  async searchUsers(req, res, next) {
    try {
      const q     = (req.query.q ?? '').toString();
      const limit = Math.max(1, Math.min(30, parseInt(req.query.limit) || 20));

      const users = await UserService.searchByUsername(q, req.user?.id, limit);
      res.json({ success: true, data: users });
    } catch (err) { next(err); }
  },

  // GET /api/users/:username
  async getProfile(req, res, next) {
    try {
      const user = await UserService.getByUsername(req.params.username, req.user?.id);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  // GET /api/users/:username/posts
  async getUserPosts(req, res, next) {
    try {
      const page  = Math.max(1, parseInt(req.query.page)  || 1);
      const limit = Math.min(30, parseInt(req.query.limit) || 12);
      const result = await UserService.getUserPosts(
        req.params.username, req.user?.id, page, limit
      );
      res.json({ success: true, data: result.posts, meta: { page, limit, hasMore: result.hasMore, total: result.total } });
    } catch (err) { next(err); }
  },

  // POST /api/users/:id/circle
  async follow(req, res, next) {
    try {
      const result = await UserService.follow(req.user.id, req.params.id);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  // DELETE /api/users/:id/circle
  async unfollow(req, res, next) {
    try {
      const result = await UserService.unfollow(req.user.id, req.params.id);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },
};

module.exports = UserController;