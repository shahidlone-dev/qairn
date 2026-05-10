// backend/src/jobs/draft.reaper.job.js
//
// Dual-purpose background job:
//
//   1. DRAFT REAPER — hard-deletes posts that are stuck in non-published states
//      past their draft_expires_at timestamp, and removes their Cloudinary assets.
//
//   2. CLEANUP QUEUE PROCESSOR — retries failed Cloudinary deletes that were
//      enqueued by the upload pipeline when MediaService.delete() threw.
//
// Usage (Express startup):
//   const DraftReaperJob = require('./jobs/draft.reaper.job');
//   DraftReaperJob.start();
//
// Usage (one-shot / serverless cron):
//   const result = await DraftReaperJob.reap();
//   const cleaned = await DraftReaperJob.processCleanupQueue();
'use strict';

const supabase     = require('../config/supabase');
const MediaService = require('../services/media.service');
const logger       = require('../utils/logger');

// =============================================================================
// Tunables
// =============================================================================

const REAPER_INTERVAL_MS   = 30 * 60 * 1000; // every 30 minutes
const BATCH_SIZE            = 50;
const STALE_STATUSES        = ['draft', 'uploading', 'processing', 'failed'];

// Cleanup queue: exponential backoff — wait at least N minutes between attempts
const CLEANUP_MIN_BACKOFF_MINUTES = 5;
// Cap backoff at 4 hours (attempt 7+ all use 4h backoff)
const CLEANUP_MAX_BACKOFF_MINUTES = 240;

// =============================================================================
// Internal helpers
// =============================================================================

function backoffMinutes(attempts) {
  const minutes = CLEANUP_MIN_BACKOFF_MINUTES * Math.pow(2, attempts - 1);
  return Math.min(minutes, CLEANUP_MAX_BACKOFF_MINUTES);
}

// =============================================================================
// Job
// =============================================================================

const DraftReaperJob = {
  _timer: null,
  _running: false,

  // ---------------------------------------------------------------------------
  // start() — wire into Express startup
  // ---------------------------------------------------------------------------
  start() {
    if (this._timer) {
      logger.warn('DraftReaperJob: already running — ignoring duplicate start()');
      return;
    }

    logger.info('DraftReaperJob: starting (interval: 30 min)');

    this._timer = setInterval(() => {
      this._runAll().catch(err =>
        logger.error('DraftReaperJob: uncaught error in scheduled run:', err.message)
      );
    }, REAPER_INTERVAL_MS);

    // Run immediately on startup to process anything that survived a server restart
    this._runAll().catch(err =>
      logger.error('DraftReaperJob: uncaught error in startup run:', err.message)
    );
  },

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  },

  async _runAll() {
    // Prevent overlapping runs — important for slow Cloudinary deletes
    if (this._running) {
      logger.info('DraftReaperJob: skipping — previous run still in progress');
      return;
    }
    this._running = true;
    try {
      const reaped  = await this.reap();
      const cleaned = await this.processCleanupQueue();
      logger.info(`DraftReaperJob: run complete — reaped ${reaped} posts, cleaned ${cleaned} orphans`);
    } finally {
      this._running = false;
    }
  },

  // ---------------------------------------------------------------------------
  // reap() — hard-delete stale non-published posts + their Cloudinary assets
  //
  // Idempotent: safe to run multiple times. Uses keyset pagination (cursor on
  // post ID) so restarting mid-batch doesn't re-process already-deleted posts.
  // ---------------------------------------------------------------------------
  async reap() {
    const now = new Date().toISOString();
    logger.info(`DraftReaperJob.reap(): scanning for stale posts as of ${now}`);

    let deleted = 0;
    let cursor  = null; // last processed id for keyset pagination

    while (true) {
      let query = supabase
        .from('posts')
        .select('id, media_public_id, media_type, status')
        .in('status', STALE_STATUSES)
        .eq('is_deleted', false)
        .lte('draft_expires_at', now)
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);

      if (cursor) {
        query = query.gt('id', cursor);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('DraftReaperJob.reap(): DB batch error:', error.message);
        break; // stop this pass; next scheduled run will retry
      }

      if (!data || data.length === 0) break;

      for (const post of data) {
        try {
          await this._reapOne(post);
          deleted++;
        } catch (err) {
          // Log and continue — don't abort the batch for one failure
          logger.warn(`DraftReaperJob.reap(): failed to reap ${post.id}: ${err.message}`);
        }
      }

      cursor = data[data.length - 1].id;
      if (data.length < BATCH_SIZE) break;
    }

    logger.info(`DraftReaperJob.reap(): deleted ${deleted} posts`);
    return deleted;
  },

  async _reapOne(post) {
    // 1. Delete Cloudinary asset synchronously before DB row — ensures no
    //    orphan asset if the DB delete succeeds but Cloudinary fails.
    //    If Cloudinary fails, we DO NOT delete the DB row so next run retries.
    if (post.media_public_id) {
      const isVideo = post.media_type === 'video' || post.media_type === 'reel';
      try {
        await MediaService.delete(post.media_public_id, isVideo);
      } catch (err) {
        // Queue for later retry, then bail — don't delete DB row yet
        logger.warn(
          `DraftReaperJob._reapOne(${post.id}): Cloudinary delete failed — queuing. ${err.message}`
        );
        await supabase
          .from('cloudinary_cleanup_queue')
          .insert({
            public_id:     post.media_public_id,
            resource_type: isVideo ? 'video' : 'image',
            post_id:       post.id,
          })
          // If insert fails, just log — we'll have a dangling asset but won't crash
          .catch(qErr => logger.error('DraftReaperJob: queue insert failed:', qErr.message));
        throw err; // bubble up so _reapOne is counted as failed (not deleted)
      }
    }

    // 2. Hard-delete the DB row
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id)
      .in('status', STALE_STATUSES); // safety: don't accidentally delete published posts

    if (error) {
      logger.error(`DraftReaperJob._reapOne(${post.id}): DB delete error:`, error.message);
      throw error;
    }

    logger.info(`DraftReaperJob._reapOne(${post.id}): reaped (status: ${post.status})`);
  },

  // ---------------------------------------------------------------------------
  // processCleanupQueue() — retry Cloudinary deletes that previously failed
  //
  // Uses exponential backoff: a row is only eligible for retry if
  // last_attempt is old enough (based on attempt count).
  // Rows that reach max_attempts are marked completed=true (give up).
  // ---------------------------------------------------------------------------
  async processCleanupQueue() {
    const now = new Date();
    logger.info('DraftReaperJob.processCleanupQueue(): scanning queue');

    let processed = 0;
    let cursor    = null;

    while (true) {
      // Fetch rows that are due for retry based on backoff
      // We use a cutoff: last_attempt + backoff(attempts) <= now
      // Implemented as: last_attempt IS NULL OR last_attempt <= (now - backoff)
      // Since we can't compute per-row backoff in a single SQL query without
      // a generated column, we fetch all eligible and filter in JS.
      let query = supabase
        .from('cloudinary_cleanup_queue')
        .select('id, public_id, resource_type, post_id, attempts, last_attempt, max_attempts')
        .eq('completed', false)
        .lt('attempts', 10)                 // raw cap before per-row max_attempts check
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);

      if (cursor) {
        query = query.gt('id', cursor);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('processCleanupQueue: DB error:', error.message);
        break;
      }

      if (!data || data.length === 0) break;

      for (const row of data) {
        // Per-row backoff check
        if (row.last_attempt) {
          const backoffMs = backoffMinutes(row.attempts) * 60 * 1000;
          const retryAfter = new Date(new Date(row.last_attempt).getTime() + backoffMs);
          if (retryAfter > now) continue; // not yet due
        }

        const maxAttempts = row.max_attempts ?? 10;
        if (row.attempts >= maxAttempts) {
          // Give up — mark completed so it doesn't block future queries
          await supabase
            .from('cloudinary_cleanup_queue')
            .update({ completed: true })
            .eq('id', row.id)
            .catch(err => logger.error(`processCleanupQueue: give-up update failed: ${err.message}`));
          logger.warn(
            `processCleanupQueue: giving up on ${row.public_id} after ${row.attempts} attempts`
          );
          continue;
        }

        const isVideo = row.resource_type === 'video';

        try {
          await MediaService.delete(row.public_id, isVideo);

          // Success — mark completed
          await supabase
            .from('cloudinary_cleanup_queue')
            .update({ completed: true, last_attempt: now.toISOString() })
            .eq('id', row.id);

          processed++;
          logger.info(`processCleanupQueue: cleaned ${row.public_id}`);
        } catch (err) {
          // Increment attempt count and record error
          await supabase
            .from('cloudinary_cleanup_queue')
            .update({
              attempts:     row.attempts + 1,
              last_attempt: now.toISOString(),
              last_error:   err.message?.slice(0, 500) ?? 'unknown',
            })
            .eq('id', row.id)
            .catch(updateErr =>
              logger.error(`processCleanupQueue: attempt update failed: ${updateErr.message}`)
            );

          logger.warn(
            `processCleanupQueue: attempt ${row.attempts + 1} failed for ${row.public_id}: ${err.message}`
          );
        }
      }

      cursor = data[data.length - 1].id;
      if (data.length < BATCH_SIZE) break;
    }

    logger.info(`processCleanupQueue: processed ${processed} items`);
    return processed;
  },
};

module.exports = DraftReaperJob;