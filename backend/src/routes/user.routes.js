// backend/src/routes/user.routes.js
'use strict';

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/user.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');

router.get ('/me',                protect,      ctrl.getMe);
router.put ('/me',                protect,      ctrl.updateMe);

// /me/circle returns the viewer's "following" list. Registered alongside
// /me so the literal "me" segment is matched before any /:username route.
router.get ('/me/circle',         protect,      ctrl.getMyCircle);

// IMPORTANT: /search must be registered BEFORE /:username, otherwise Express
// would treat the literal "search" as a username and route to getProfile.
router.get ('/search',            protect,      ctrl.searchUsers);

router.get ('/:username',         optionalAuth, ctrl.getProfile);
router.get ('/:username/posts',   optionalAuth, ctrl.getUserPosts);
router.post('/:id/circle',        protect,      ctrl.follow);
router.delete('/:id/circle',      protect,      ctrl.unfollow);

module.exports = router;