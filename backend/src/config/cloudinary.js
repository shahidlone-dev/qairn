// backend/src/config/cloudinary.js

'use strict';

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ── Upload presets per type ───────────────────────────────────────────────────
const folders = {
  avatar:  'qaaf/avatars',
  post:    'qaaf/posts',
  note:    'qaaf/notes',
  item:    'qaaf/items',
  message: 'qaaf/messages',
};

// ── Upload helper ─────────────────────────────────────────────────────────────
const upload = (buffer, folder, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        quality:       'auto',
        fetch_format:  'auto',
        ...options,
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });

// ── Delete helper ─────────────────────────────────────────────────────────────
const destroy = (publicId, options = {}) =>
  cloudinary.uploader.destroy(publicId, options);

module.exports = { cloudinary, folders, upload, destroy };