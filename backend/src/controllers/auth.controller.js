// backend/src/controllers/auth.controller.js
'use strict';

const AuthService = require('../services/auth.service');
const logger      = require('../utils/logger');

const AuthController = {

  // POST /api/auth/send-otp
  async sendOtp(req, res, next) {
    try {
      const { phone } = req.body;
      await AuthService.sendOtp(phone);
      res.json({ success: true, message: 'OTP sent' });
    } catch (err) { next(err); }
  },

  // POST /api/auth/verify-otp
  async verifyOtp(req, res, next) {
    try {
      const { phone, code } = req.body;
      await AuthService.verifyOtp(phone, code);
      res.json({ success: true, message: 'Phone verified' });
    } catch (err) { next(err); }
  },

  // POST /api/auth/check-username
  async checkUsername(req, res, next) {
    try {
      const { username } = req.body;
      const available    = await AuthService.isUsernameAvailable(username);
      logger.info(`Username check: @${username} → ${available ? 'available ✅' : 'taken ❌'}`);
      res.json({ success: true, available });
    } catch (err) { next(err); }
  },

  // POST /api/auth/signup
  async signup(req, res, next) {
    try {
      const { username, phone, password } = req.body;
      const user         = await AuthService.register({ username, phone, password });
      const accessToken  = AuthService.generateAccessToken(user.id);
      const refreshToken = await AuthService.generateRefreshToken(user.id);
      logger.info(`Signup success: @${user.username}`);
      res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
    } catch (err) { next(err); }
  },

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { identifier, password } = req.body;
      const user         = await AuthService.login({ identifier, password });
      const accessToken  = AuthService.generateAccessToken(user.id);
      const refreshToken = await AuthService.generateRefreshToken(user.id);
      res.json({ success: true, data: { user, accessToken, refreshToken } });
    } catch (err) { next(err); }
  },

  // GET /api/auth/me
  async getMe(req, res, next) {
    try {
      const user = await AuthService.getMe(req.user.id);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  },

  // POST /api/auth/refresh
  async refresh(req, res, next) {
    try {
      const { userId, refreshToken } = req.body;
      const newRefresh = await AuthService.rotateRefreshToken(userId, refreshToken);
      const newAccess  = AuthService.generateAccessToken(userId);
      res.json({ success: true, data: { accessToken: newAccess, refreshToken: newRefresh } });
    } catch (err) { next(err); }
  },

  // POST /api/auth/logout
  async logout(req, res, next) {
    try {
      await AuthService.revokeTokens(req.user.id);
      res.json({ success: true, message: 'Logged out' });
    } catch (err) { next(err); }
  },

  // POST /api/auth/reset-password
  async resetPassword(req, res, next) {
    try {
      const { phone, password } = req.body;
      await AuthService.resetPassword({ phone, password });
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) { next(err); }
  },
};

module.exports = AuthController;