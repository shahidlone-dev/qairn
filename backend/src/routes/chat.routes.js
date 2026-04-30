// backend/src/routes/chat.routes.js
'use strict';
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');

router.get('/',            protect, (req, res) => res.json({ success: true, message: 'GET /chats — TODO' }));
router.post('/',           protect, (req, res) => res.json({ success: true, message: 'POST /chats — TODO' }));
router.get('/:id',         protect, (req, res) => res.json({ success: true, message: 'GET /chats/:id — TODO' }));
router.get('/:id/messages',protect, (req, res) => res.json({ success: true, message: 'GET /chats/:id/messages — TODO' }));
router.post('/:id/messages',protect,(req, res) => res.json({ success: true, message: 'POST /chats/:id/messages — TODO' }));

module.exports = router;