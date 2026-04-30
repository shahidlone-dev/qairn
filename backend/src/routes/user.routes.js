// backend/src/routes/user.routes.js
'use strict';
const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth.middleware');

router.get('/me',           protect, (req, res) => res.json({ success: true, message: 'GET /users/me — TODO' }));
router.put('/me',           protect, (req, res) => res.json({ success: true, message: 'PUT /users/me — TODO' }));
router.get('/:username',            (req, res) => res.json({ success: true, message: 'GET /users/:username — TODO' }));
router.post('/:id/circle',  protect, (req, res) => res.json({ success: true, message: 'POST /users/:id/circle — TODO' }));
router.delete('/:id/circle',protect, (req, res) => res.json({ success: true, message: 'DELETE /users/:id/circle — TODO' }));

module.exports = router;