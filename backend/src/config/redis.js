// backend/src/config/redis.js

'use strict';

const { Redis } = require('@upstash/redis');

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in .env');
}

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ── Key helpers ───────────────────────────────────────────────────────────────
const keys = {
  otp:          (phone)    => `otp:${phone}`,
  otpAttempts:  (phone)    => `otp:attempts:${phone}`,
  refreshToken: (userId)   => `refresh:${userId}`,
  userSession:  (userId)   => `session:${userId}`,
  rateLimit:    (ip, route)=> `rl:${ip}:${route}`,
  bloomFilter:  ()         => `bloom:usernames`,
};

// ── TTLs (seconds) ────────────────────────────────────────────────────────────
const ttl = {
  otp:          10 * 60,        // 10 minutes
  otpAttempts:  60 * 60,        // 1 hour lockout window
  refreshToken: 30 * 24 * 3600, // 30 days
  session:      7  * 24 * 3600, // 7 days
};

module.exports = { redis, keys, ttl };