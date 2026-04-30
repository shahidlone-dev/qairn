// backend/src/routes/auth.routes.js
'use strict';

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const {
  otpLimiter,
  loginLimiter,
  usernameLimiter,
} = require('../middleware/rateLimit.middleware');
const v = require('../validations/auth.validation');

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/send-otp',       otpLimiter,      v.sendOtp,       ctrl.sendOtp);
router.post('/verify-otp',                      v.verifyOtp,     ctrl.verifyOtp);
router.post('/check-username', usernameLimiter, v.checkUsername, ctrl.checkUsername);
router.post('/signup',                          v.signup,        ctrl.signup);
router.post('/login',          loginLimiter,    v.login,         ctrl.login);
router.post('/refresh',                                          ctrl.refresh);
router.post('/reset-password',                  v.resetPassword, ctrl.resetPassword);

// ── Protected ─────────────────────────────────────────────────────────────────
router.get ('/me',    protect, ctrl.getMe);
router.post('/logout',protect, ctrl.logout);

module.exports = router;