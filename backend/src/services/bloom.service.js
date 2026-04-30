// backend/src/services/bloom.service.js

'use strict';

/**
 * Bloom Filter for username existence checks.
 *
 * Why: Supabase DB query for every username check = slow + expensive.
 * Bloom filter = instant O(1) check with zero false negatives.
 * If bloom says "not exists" → definitely not taken (skip DB query).
 * If bloom says "exists"     → might be taken (confirm with DB query).
 *
 * We store the bloom filter state in Redis so it survives restarts.
 */

const { redis, keys } = require('../config/redis');
const supabase        = require('../config/supabase');
const logger          = require('../utils/logger');

// ── Bloom filter parameters ───────────────────────────────────────────────────
// m = number of bits, k = number of hash functions
// For 100k usernames, false positive rate ~0.1%
const BLOOM_M = 1_000_000; // 1M bits
const BLOOM_K = 7;

// ── Simple hash functions ─────────────────────────────────────────────────────
function getPositions(value) {
  const positions = [];
  for (let i = 0; i < BLOOM_K; i++) {
    let hash = 0;
    const str = `${i}:${value}`;
    for (let j = 0; j < str.length; j++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(j);
      hash |= 0;
    }
    positions.push(Math.abs(hash) % BLOOM_M);
  }
  return positions;
}

const BloomService = {
  // ── Add username to bloom filter ──────────────────────────────────────────
  async add(username) {
    try {
      const key       = keys.bloomFilter();
      const positions = getPositions(username.toLowerCase());
      // Set bits in Redis bitfield
      await Promise.all(positions.map(pos => redis.setbit(key, pos, 1)));
    } catch (err) {
      logger.error('Bloom add error:', err);
    }
  },

  // ── Check if username might exist ─────────────────────────────────────────
  async mightExist(username) {
    try {
      const key       = keys.bloomFilter();
      const positions = getPositions(username.toLowerCase());
      const bits      = await Promise.all(positions.map(pos => redis.getbit(key, pos)));
      // Upstash returns null for unset bits — treat null as 0
      return bits.every(b => b === 1);
    } catch (err) {
      logger.error('Bloom check error:', err);
      // Fail OPEN — let the DB query decide, don't block the user
      return true;
    }
  },

  // ── Rebuild bloom filter from DB (run on startup) ─────────────────────────
  async rebuild() {
    try {
      logger.info('Rebuilding bloom filter from DB...');
      const { data, error } = await supabase
        .from('users')
        .select('username');

      if (error) throw error;

      await Promise.all((data || []).map(u => this.add(u.username)));
      logger.info(`Bloom filter rebuilt with ${data?.length ?? 0} usernames`);
    } catch (err) {
      logger.error('Bloom rebuild error:', err);
    }
  },
};

module.exports = BloomService;