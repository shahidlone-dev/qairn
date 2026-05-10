// backend/src/middleware/upload.middleware.js
'use strict';

const multer = require('multer');

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
]);

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(
        new Error(`File type not allowed: ${file.mimetype}`),
        { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' }
      ),
      false
    );
  }
};

const storage = multer.memoryStorage();

const postMediaUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB — matches MAX_VIDEO_MB
});

// Stories cap at 50MB — videos are short-form (<=60s) and don't need the
// full post ceiling. Reduces wasted bandwidth from accidental long uploads.
const storyMediaUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const avatarUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const documentUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

function wrapMulter(multerMiddleware, field = 'file') {
  return (req, res, next) => {
    multerMiddleware.single(field)(req, res, err => {
      if (!err) return next();

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File too large.',
          code:    'FILE_TOO_LARGE',
        });
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: `Unexpected field. Use the '${field}' field name.`,
          code:    'WRONG_FIELD_NAME',
        });
      }

      if (err.status === 415) {
        return res.status(415).json({
          success: false,
          message: err.message,
          code:    'UNSUPPORTED_MEDIA_TYPE',
        });
      }

      next(err);
    });
  };
}

module.exports = {
  uploadPostMedia:  wrapMulter(postMediaUpload,  'file'),
  uploadStoryMedia: wrapMulter(storyMediaUpload, 'file'),
  uploadAvatar:     wrapMulter(avatarUpload,     'file'),
  uploadDocument:   wrapMulter(documentUpload,   'file'),
};