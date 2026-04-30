// backend/src/middleware/rateLimit.middleware.js

'use strict';

const rateLimit = require('express-rate-limit');

// ── OTP send — max 3 per hour per IP ─────────────────────────────────────────
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      3,
  message:  { success: false, message: 'Too many OTP requests. Try again in 1 hour.' },
  keyGenerator: (req) => req.body.phone || req.ip,
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Login — max 10 attempts per 15 minutes per IP ─────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message:  { success: false, message: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Username check — max 30 per minute ───────────────────────────────────────
const usernameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      30,
  message:  { success: false, message: 'Too many username checks. Slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Upload — max 20 per hour ──────────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Upload limit reached. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

module.exports = { otpLimiter, loginLimiter, usernameLimiter, uploadLimiter };