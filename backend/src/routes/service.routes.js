// backend/src/routes/service.routes.js
'use strict';
const express = require('express');
const router  = express.Router();
const { protect, optionalAuth } = require('../middleware/auth.middleware');

router.get('/',              optionalAuth, (req, res) => res.json({ success: true, message: 'GET /services — TODO' }));
router.post('/',             protect,      (req, res) => res.json({ success: true, message: 'POST /services — TODO' }));
router.get('/:id',           optionalAuth, (req, res) => res.json({ success: true, message: 'GET /services/:id — TODO' }));
router.post('/:id/book',     protect,      (req, res) => res.json({ success: true, message: 'POST /services/:id/book — TODO' }));
router.post('/:id/order',    protect,      (req, res) => res.json({ success: true, message: 'POST /services/:id/order — TODO' }));
router.patch('/:id/confirm', protect,      (req, res) => res.json({ success: true, message: 'PATCH /services/:id/confirm — TODO' }));

module.exports = router;