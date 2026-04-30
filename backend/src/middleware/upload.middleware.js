// backend/src/middleware/upload.middleware.js

'use strict';

const multer  = require('multer');
const { upload: cloudinaryUpload, folders } = require('../config/cloudinary');

// ── Store in memory, then stream to Cloudinary ────────────────────────────────
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`File type not allowed: ${file.mimetype}`), false);
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// ── Upload to Cloudinary helper ───────────────────────────────────────────────
const uploadToCloud = (folderKey) => async (req, res, next) => {
  if (!req.file) return next();
  try {
    const result   = await cloudinaryUpload(req.file.buffer, folders[folderKey] || 'qaaf/misc');
    req.uploadedFile = {
      url:      result.secure_url,
      publicId: result.public_id,
      format:   result.format,
      size:     result.bytes,
      width:    result.width,
      height:   result.height,
    };
    next();
  } catch (err) {
    next(Object.assign(err, { status: 500, message: 'Upload failed' }));
  }
};

module.exports = { multerUpload, uploadToCloud };