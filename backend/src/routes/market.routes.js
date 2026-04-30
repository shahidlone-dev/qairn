// backend/src/routes/market.routes.js
'use strict';
const express  = require('express');
const router   = express.Router();
const { protect, optionalAuth } = require('../middleware/auth.middleware');

router.get('/',              optionalAuth, (req, res) => res.json({ success: true, message: 'GET /market — TODO' }));
router.post('/',             protect,      (req, res) => res.json({ success: true, message: 'POST /market — TODO' }));
router.get('/:id',           optionalAuth, (req, res) => res.json({ success: true, message: 'GET /market/:id — TODO' }));
router.put('/:id',           protect,      (req, res) => res.json({ success: true, message: 'PUT /market/:id — TODO' }));
router.delete('/:id',        protect,      (req, res) => res.json({ success: true, message: 'DELETE /market/:id — TODO' }));
router.post('/:id/order',    protect,      (req, res) => res.json({ success: true, message: 'POST /market/:id/order — TODO' }));
router.patch('/:id/confirm', protect,      (req, res) => res.json({ success: true, message: 'PATCH /market/:id/confirm — TODO' }));

module.exports = router;