// backend/src/routes/upload.routes.js
'use strict';
const express  = require('express');
const router   = express.Router();
const { protect }                    = require('../middleware/auth.middleware');
const { uploadLimiter }              = require('../middleware/rateLimit.middleware');
const { multerUpload, uploadToCloud }= require('../middleware/upload.middleware');

// Single file upload — avatar
router.post('/avatar',
  protect,
  uploadLimiter,
  multerUpload.single('file'),
  uploadToCloud('avatar'),
  (req, res) => res.json({ success: true, data: req.uploadedFile })
);

// Post image/video
router.post('/post',
  protect,
  uploadLimiter,
  multerUpload.single('file'),
  uploadToCloud('post'),
  (req, res) => res.json({ success: true, data: req.uploadedFile })
);

// Note PDF
router.post('/note',
  protect,
  uploadLimiter,
  multerUpload.single('file'),
  uploadToCloud('note'),
  (req, res) => res.json({ success: true, data: req.uploadedFile })
);

// Market item image
router.post('/item',
  protect,
  uploadLimiter,
  multerUpload.single('file'),
  uploadToCloud('item'),
  (req, res) => res.json({ success: true, data: req.uploadedFile })
);

module.exports = router;