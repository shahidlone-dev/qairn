// backend/src/services/auth.service.js
'use strict';

const bcrypt          = require('bcryptjs');
const jwt             = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Verify }      = require('../config/twilio');
const { redis, keys, ttl } = require('../config/redis');
const supabase        = require('../config/supabase');
const BloomService    = require('./bloom.service');
const logger          = require('../utils/logger');

const AuthService = {

  // ── Send OTP ────────────────────────────────────────────────────────────────
  async sendOtp(phone) {
    const e164 = phone.startsWith('+') ? phone : `+91${phone}`;

    // Max 3 sends per hour per phone
    const attemptsKey = keys.otpAttempts(e164);
    const attempts    = parseInt(await redis.get(attemptsKey) ?? '0');
    if (attempts >= 3) {
      throw Object.assign(
        new Error('Too many OTP requests. Try again in 1 hour.'),
        { status: 429 }
      );
    }

    await Verify.send(e164);
    await redis.setex(attemptsKey, ttl.otpAttempts, attempts + 1);

    logger.info(`OTP sent → ${e164}`);
    return { phone: e164 };
  },

  // ── Verify OTP + store verified state in Redis ────────────────────────────
  async verifyOtp(phone, code) {
    const e164 = phone.startsWith('+') ? phone : `+91${phone}`;

    const result = await Verify.check(e164, code);
    if (result.status !== 'approved') {
      throw Object.assign(new Error('Invalid or expired OTP'), { status: 400 });
    }

    // Store verified state — signup must consume this within 10 min
    await redis.setex(keys.otp(e164), ttl.otp, 'verified');
    await redis.del(keys.otpAttempts(e164));

    logger.info(`OTP verified → ${e164}`);
    return true;
  },

  // ── Check OTP was verified before allowing signup ─────────────────────────
  async assertOtpVerified(phone) {
    const e164  = phone.startsWith('+') ? phone : `+91${phone}`;
    const state = await redis.get(keys.otp(e164));
    if (state !== 'verified') {
      throw Object.assign(
        new Error('Phone not verified. Please verify OTP first.'),
        { status: 403 }
      );
    }
  },

  // ── Register ─────────────────────────────────────────────────────────────
  async register({ username, phone, password }) {
    const e164  = phone.startsWith('+') ? phone : `+91${phone}`;
    const lower = username.toLowerCase().trim();

    // Must have completed OTP verification
    await this.assertOtpVerified(e164);

    // Username available check (bloom + DB)
    const available = await this.isUsernameAvailable(lower);
    if (!available) {
      throw Object.assign(new Error('Username already taken'), { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    const { data, error } = await supabase
      .from('users')
      .insert({
        id:         uuidv4(),
        username:   lower,
        phone:      e164,
        password:   hashed,
        created_at: new Date().toISOString(),
      })
      .select('id, username, phone, created_at, avatar_url, dept, bio, is_premium')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw Object.assign(
          new Error('Username or phone already registered'),
          { status: 409 }
        );
      }
      throw error;
    }

    // Add to bloom filter + consume OTP verified state
    await BloomService.add(lower);
    await redis.del(keys.otp(e164));

    logger.info(`User registered: @${lower}`);
    return data;
  },

  // ── Login (phone OR username) ─────────────────────────────────────────────
  async login({ identifier, password }) {
    const isPhone = /^\+?[\d\s\-()]{7,15}$/.test(identifier);
    const e164    = isPhone
      ? (identifier.startsWith('+') ? identifier : `+91${identifier}`)
      : null;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, phone, password, avatar_url, dept, bio, is_premium, is_tutor, is_helper')
      .eq(isPhone ? 'phone' : 'username', isPhone ? e164 : identifier.toLowerCase())
      .maybeSingle();

    if (error || !user) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    const { password: _, ...safeUser } = user;
    return safeUser;
  },

  // ── Get full profile (/me) ────────────────────────────────────────────────
  async getMe(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, phone, full_name, bio, avatar_url, dept, university, year, is_premium, is_tutor, is_helper, is_verified, circle_count, post_count, rating, created_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw Object.assign(new Error('User not found'), { status: 404 });
    }
    return data;
  },

  // ── Reset password (after OTP) ────────────────────────────────────────────
  async resetPassword({ phone, password }) {
    const e164 = phone.startsWith('+') ? phone : `+91${phone}`;

    // Must have verified OTP
    await this.assertOtpVerified(e164);

    const hashed = await bcrypt.hash(password, 12);
    const { error } = await supabase
      .from('users')
      .update({ password: hashed })
      .eq('phone', e164);

    if (error) throw error;

    // Consume verified state
    await redis.del(keys.otp(e164));
    logger.info(`Password reset for ${e164}`);
  },

  // ── Username availability (bloom + DB) ───────────────────────────────────
  // ── Check username availability — direct DB (bloom removed, Upstash doesn't support GETBIT) ──
  async isUsernameAvailable(username) {
    const lower = username.toLowerCase().trim();
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', lower)
        .maybeSingle();

      if (error) {
        logger.error('Username DB check error:', error.message);
        return true; // Fail open
      }

      return !data; // true = available, false = taken
    } catch (err) {
      logger.error('isUsernameAvailable error:', err.message);
      return true;
    }
  },

  // ── JWT ──────────────────────────────────────────────────────────────────
  generateAccessToken(userId) {
    return jwt.sign(
      { sub: userId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  },

  async generateRefreshToken(userId) {
    const token = uuidv4();
    await redis.setex(keys.refreshToken(userId), ttl.refreshToken, token);
    return token;
  },

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw Object.assign(new Error('Invalid or expired token'), { status: 401 });
    }
  },

  async rotateRefreshToken(userId, oldToken) {
    const stored = await redis.get(keys.refreshToken(userId));
    if (!stored || stored !== oldToken) {
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }
    return this.generateRefreshToken(userId);
  },

  async revokeTokens(userId) {
    await Promise.all([
      redis.del(keys.refreshToken(userId)),
      redis.del(keys.userSession(userId)),
    ]);
  },

  hashPassword:    (p) => bcrypt.hash(p, 12),
  comparePassword: (plain, hash) => bcrypt.compare(plain, hash),
};

module.exports = AuthService;