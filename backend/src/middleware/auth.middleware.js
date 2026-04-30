// backend/src/middleware/auth.middleware.js

'use strict';

const AuthService = require('../services/auth.service');

// ── Protect route — requires valid JWT ────────────────────────────────────────
const protect = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token    = header.split(' ')[1];
    const decoded  = AuthService.verifyAccessToken(token);
    req.user       = { id: decoded.sub };
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};

// ── Optional auth — attaches user if token present, continues if not ──────────
const optionalAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token  = header.split(' ')[1];
      const decoded = AuthService.verifyAccessToken(token);
      req.user      = { id: decoded.sub };
    }
  } catch (_) { /* ignore */ }
  next();
};

module.exports = { protect, optionalAuth };