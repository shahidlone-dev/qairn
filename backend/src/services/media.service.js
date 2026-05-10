// backend/src/services/media.service.js
// No changes from the previous version — Cloudinary reliability improvements
// (upload_large, chunked uploads, exponential backoff) are retained as-is.
'use strict';

const { cloudinary, folders } = require('../config/cloudinary');
const logger                  = require('../utils/logger');
const fsPromises              = require('fs').promises;
const fsSync                  = require('fs');
const os                      = require('os');
const path                    = require('path');
const crypto                  = require('crypto');

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_MB  = 10;
const MAX_VIDEO_MB  = 100;

// ── Temp file helpers ─────────────────────────────────────────────────────────

function writeTempFile(buffer, ext) {
  const name     = `qaaf_${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const tempPath = path.join(os.tmpdir(), name);
  fsSync.writeFileSync(tempPath, buffer);
  return tempPath;
}

function cleanTemp(tempPath) {
  fsPromises.unlink(tempPath).catch(() => {});
}

// ── Core Cloudinary upload (Smart Routing) ───────────────────────────────────

async function cloudinaryUpload(tempPath, options = {}) {
  return new Promise((resolve, reject) => {
    // 1. Check the physical size of the file on disk
    const stats = fsSync.statSync(tempPath);
    const fileSize = stats.size;
    const CHUNK_THRESHOLD = 6_000_000; // 6 Megabytes

const callback = (err, result) => {
      if (err) {
        // 👇 ADD THIS MASSIVE DEBUG LOG 👇
        console.error("🚨=============================================🚨");
        console.error("🚨 RAW UPLOAD ERROR TRIGGERED!");
        console.error("🚨 RAW ERROR OBJECT:", JSON.stringify(err, null, 2));
        if (err.error) console.error("🚨 INNER CLOUDINARY ERROR:", err.error);
        console.error("🚨=============================================🚨");

        const msg = err?.message || err?.error?.message || JSON.stringify(err);
        return reject(new Error(`Cloudinary Error: ${msg}`));
      }
      resolve(result);
    };

    // 2. Smart Routing: Use standard upload for small files to avoid timeout glitches
    if (fileSize > CHUNK_THRESHOLD) {
      logger.info(`[upload] File is ${(fileSize / 1000000).toFixed(2)}MB - Using chunked upload_large...`);
      cloudinary.uploader.upload_large(tempPath, {
        chunk_size: 6_000_000,
        timeout:    1_200_000, // 20 minutes
        ...options,
      }, callback);
    } else {
      logger.info(`[upload] File is ${(fileSize / 1000).toFixed(2)}KB - Using fast standard upload...`);
      cloudinary.uploader.upload(tempPath, {
        timeout:    1_200_000, // 20 minutes
        ...options,
      }, callback);
    }
  });
}

// ── Exponential backoff ───────────────────────────────────────────────────────

const RETRY_DELAYS = [0, 5_000, 15_000];

async function withRetry(fn, label) {
  let lastError;
  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    if (RETRY_DELAYS[attempt] > 0) {
      logger.info(`${label}: retry in ${RETRY_DELAYS[attempt] / 1000}s…`);
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
    }
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      logger.warn(`${label}: attempt ${attempt + 1}/${RETRY_DELAYS.length} failed — ${err.message}`);
    }
  }
  throw new Error(`${label} failed after ${RETRY_DELAYS.length} attempts: ${lastError?.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────

const MediaService = {

  validate(file) {
    const isImage = ALLOWED_IMAGE.includes(file.mimetype);
    const isVideo = ALLOWED_VIDEO.includes(file.mimetype);

    if (!isImage && !isVideo) {
      const err = new Error(`File type not allowed: ${file.mimetype}`);
      err.status = 400;
      err.code   = 'INVALID_MIME_TYPE';
      throw err;
    }

    const maxBytes = (isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB) * 1024 * 1024;
    if (file.size > maxBytes) {
      const err = new Error(`File too large. Max ${isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB} MB`);
      err.status = 400;
      err.code   = 'FILE_TOO_LARGE';
      throw err;
    }

    return { isImage, isVideo };
  },

  async uploadPostMedia(file) {
    const { isVideo } = this.validate(file);

    if (!file.buffer || file.buffer.length === 0) {
      const err = new Error('File buffer is empty — device failed to send data.');
      err.status = 400;
      err.code   = 'EMPTY_BUFFER';
      throw err;
    }

    const folder = isVideo
      ? `${folders.post}/videos`
      : `${folders.post}/images`;

    const ext = isVideo
      ? (file.mimetype === 'video/quicktime' ? 'mov' : 'mp4')
      : (file.mimetype === 'image/png'  ? 'png'
       : file.mimetype === 'image/webp' ? 'webp'
       : file.mimetype === 'image/gif'  ? 'gif'
       : 'jpg');

    const tempPath = writeTempFile(file.buffer, ext);

    const uploadOptions = isVideo
      ? { folder, resource_type: 'video' }
      : {
          folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'webp' },
            { width: 1080, crop: 'limit' },
          ],
        };

    try {
      const result = await withRetry(
        () => cloudinaryUpload(tempPath, uploadOptions),
        `uploadPostMedia(${ext})`
      );

      return {
        media_url:       result.secure_url,
        media_type:      isVideo ? 'video' : 'image',
        media_public_id: result.public_id,
        width:           result.width   ?? null,
        height:          result.height  ?? null,
        duration:        result.duration ?? null,
        format:          result.format  ?? null,
      };
    } finally {
      cleanTemp(tempPath);
    }
  },

  // ── Story media upload ────────────────────────────────────────────────────
  // Stories share the same validation rules as posts but live in a separate
  // Cloudinary folder so retention policies / transformations can diverge.
  // Image transform is tuned for 9:16 vertical viewing.
  async uploadStoryMedia(file) {
    const { isVideo } = this.validate(file);

    if (!file.buffer || file.buffer.length === 0) {
      const err = new Error('File buffer is empty — device failed to send data.');
      err.status = 400;
      err.code   = 'EMPTY_BUFFER';
      throw err;
    }

    const folder = isVideo
      ? `${folders.story}/videos`
      : `${folders.story}/images`;

    const ext = isVideo
      ? (file.mimetype === 'video/quicktime' ? 'mov' : 'mp4')
      : (file.mimetype === 'image/png'  ? 'png'
       : file.mimetype === 'image/webp' ? 'webp'
       : file.mimetype === 'image/gif'  ? 'gif'
       : 'jpg');

    const tempPath = writeTempFile(file.buffer, ext);

    const uploadOptions = isVideo
      ? { folder, resource_type: 'video' }
      : {
          folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'webp' },
            { width: 1080, height: 1920, crop: 'limit' },
          ],
        };

    try {
      const result = await withRetry(
        () => cloudinaryUpload(tempPath, uploadOptions),
        `uploadStoryMedia(${ext})`
      );

      return {
        media_url:       result.secure_url,
        media_type:      isVideo ? 'video' : 'image',
        media_public_id: result.public_id,
        width:           result.width    ?? null,
        height:          result.height   ?? null,
        duration:        result.duration ?? null,
        format:          result.format   ?? null,
      };
    } finally {
      cleanTemp(tempPath);
    }
  },

  async uploadAvatar(file) {
    this.validate(file);

    if (!file.buffer || file.buffer.length === 0) {
      const err = new Error('File buffer is empty.');
      err.status = 400;
      err.code   = 'EMPTY_BUFFER';
      throw err;
    }

    const ext      = file.mimetype === 'image/png' ? 'png' : 'jpg';
    const tempPath = writeTempFile(file.buffer, ext);

    try {
      const result = await cloudinaryUpload(tempPath, {
        folder:         folders.avatar,
        resource_type:  'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'webp' },
        ],
      });
      return { avatar_url: result.secure_url, public_id: result.public_id };
    } finally {
      cleanTemp(tempPath);
    }
  },

  async delete(publicId, isVideo = false) {
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: isVideo ? 'video' : 'image',
      });
      logger.info(`Cloudinary: deleted ${publicId}`);
    } catch (err) {
      logger.error(`Cloudinary delete error (${publicId}):`, err.message);
      throw err; // re-throw so callers can queue for retry
    }
  },

  transform(publicId, opts = {}) {
    return cloudinary.url(publicId, {
      secure: true, quality: 'auto', fetch_format: 'auto', ...opts,
    });
  },
};

module.exports = MediaService;