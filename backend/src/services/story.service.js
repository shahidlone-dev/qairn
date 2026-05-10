// backend/src/services/story.service.js
//
// Story domain service. Mirrors the shape & error conventions of post.service.js
// but with a much simpler lifecycle:
//
//   - Stories have no "draft" state. A story is created ONLY after the media
//     is fully uploaded to Cloudinary, so we don't need the multi-step
//     create-draft / attach-media / publish dance that posts use.
//   - Stories auto-expire 24 hours after creation. The `stories.expires_at`
//     column is the single source of truth — queries always filter by
//     `expires_at > now()` and `is_deleted = false`.
//   - Hard-deletion of expired stories + Cloudinary cleanup is the
//     responsibility of a periodic job (see jobs/story.reaper.job.js).
//
// ─────────────────────────────────────────────────────────────────────────────
// Supabase schema (run once in SQL editor)
// ─────────────────────────────────────────────────────────────────────────────
//
// create table public.stories (
//   id                uuid primary key default gen_random_uuid(),
//   user_id           uuid not null references public.users(id) on delete cascade,
//   media_url         text,
//   media_type        text not null check (media_type in ('image','video','text')),
//   media_public_id   text,
//   text_content      text,
//   background_color  text,
//   duration_ms       integer not null default 5000,
//   width             integer,
//   height            integer,
//   created_at        timestamptz not null default now(),
//   expires_at        timestamptz not null default (now() + interval '24 hours'),
//   is_deleted        boolean not null default false
// );
// create index stories_user_active_idx
//   on public.stories (user_id, expires_at desc)
//   where is_deleted = false;
// create index stories_active_idx
//   on public.stories (expires_at desc)
//   where is_deleted = false;
//
// create table public.story_views (
//   id          uuid primary key default gen_random_uuid(),
//   story_id    uuid not null references public.stories(id) on delete cascade,
//   viewer_id   uuid not null references public.users(id)   on delete cascade,
//   viewed_at   timestamptz not null default now(),
//   unique (story_id, viewer_id)
// );
// create index story_views_viewer_idx on public.story_views (viewer_id);
// create index story_views_story_idx  on public.story_views (story_id);

'use strict';

const supabase = require('../config/supabase');
const logger   = require('../utils/logger');

// =============================================================================
// Errors
// =============================================================================

class StoryNotFoundError extends Error {
  constructor(message = 'Story not found.') {
    super(message);
    this.name   = 'StoryNotFoundError';
    this.status = 404;
  }
}

class StoryForbiddenError extends Error {
  constructor(message = 'You do not own this story.') {
    super(message);
    this.name   = 'StoryForbiddenError';
    this.status = 403;
  }
}

// =============================================================================
// Helpers
// =============================================================================

const STORY_COLUMNS = `
  id, user_id, media_url, media_type, media_public_id,
  text_content, background_color, duration_ms,
  width, height, created_at, expires_at
`;

const USER_JOIN_COLUMNS = `
  id, username, full_name, avatar_url
`;

function mapRow(row) {
  if (!row) return null;
  return {
    id:               row.id,
    user_id:          row.user_id,
    media_url:        row.media_url,
    media_type:       row.media_type,
    media_public_id:  row.media_public_id ?? null,
    text_content:     row.text_content    ?? null,
    background_color: row.background_color ?? null,
    duration_ms:      row.duration_ms     ?? 5000,
    width:            row.width  ?? null,
    height:           row.height ?? null,
    created_at:       row.created_at,
    expires_at:       row.expires_at,
  };
}

// =============================================================================
// Service
// =============================================================================

const StoryService = {

  StoryNotFoundError,
  StoryForbiddenError,

  // ---------------------------------------------------------------------------
  // create() — insert a story row AFTER media is on Cloudinary.
  //
  // Inputs:
  //   userId  — owner
  //   payload — { mediaUrl, mediaType, mediaPublicId?, textContent?,
  //               backgroundColor?, durationMs?, width?, height? }
  //
  // Validation lives here (not the controller) because the upload pipeline
  // also calls this directly without going through the HTTP layer.
  // ---------------------------------------------------------------------------
  async create(userId, payload) {
    if (!userId) {
      const e = new Error('userId is required.');
      e.status = 400; throw e;
    }

    const {
      mediaUrl, mediaType, mediaPublicId,
      textContent, backgroundColor,
      durationMs, width, height,
    } = payload ?? {};

    if (!mediaType || !['image', 'video', 'text'].includes(mediaType)) {
      const e = new Error('mediaType must be one of image|video|text.');
      e.status = 400; e.code = 'INVALID_MEDIA_TYPE'; throw e;
    }

    // Visual stories must have a Cloudinary URL; text stories must have content.
    if (mediaType === 'text') {
      if (!textContent?.trim()) {
        const e = new Error('text_content is required for text stories.');
        e.status = 400; e.code = 'MISSING_TEXT_CONTENT'; throw e;
      }
    } else if (!mediaUrl) {
      const e = new Error('media_url is required for image/video stories.');
      e.status = 400; e.code = 'MISSING_MEDIA_URL'; throw e;
    }

    // Clamp duration (1s..15s for images, up to 60s for video). Defaults applied.
    const clampDuration = (ms, lo, hi) => {
      const n = Number.isFinite(ms) ? ms : (mediaType === 'video' ? 15000 : 5000);
      return Math.max(lo, Math.min(hi, n));
    };
    const finalDuration = mediaType === 'video'
      ? clampDuration(durationMs, 1000, 60_000)
      : clampDuration(durationMs, 1000, 15_000);

    const insertRow = {
      user_id:          userId,
      media_url:        mediaUrl ?? null,
      media_type:       mediaType,
      media_public_id:  mediaPublicId ?? null,
      text_content:     textContent ?? null,
      background_color: backgroundColor ?? null,
      duration_ms:      finalDuration,
      width:            Number.isFinite(width)  ? width  : null,
      height:           Number.isFinite(height) ? height : null,
    };

    const { data, error } = await supabase
      .from('stories')
      .insert(insertRow)
      .select(STORY_COLUMNS)
      .single();

    if (error) {
      logger.error(`StoryService.create DB error: ${error.message}`);
      const e = new Error('Failed to create story.');
      e.status = 500; e.code = 'DB_ERROR'; throw e;
    }

    return mapRow(data);
  },

  // ---------------------------------------------------------------------------
  // getById() — for ownership / existence checks. Returns null when missing.
  // ---------------------------------------------------------------------------
  async getById(storyId) {
    if (!storyId) return null;
    const { data, error } = await supabase
      .from('stories')
      .select(STORY_COLUMNS)
      .eq('id', storyId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      logger.error(`StoryService.getById error: ${error.message}`);
      return null;
    }
    return mapRow(data);
  },

  // ---------------------------------------------------------------------------
  // getActiveByUser() — all of `targetUserId`'s active (non-expired) stories.
  //
  // viewerId (optional) is used to populate `is_viewed` per story so the client
  // can highlight the seen-segment marker without a second round-trip.
  // ---------------------------------------------------------------------------
  async getActiveByUser(targetUserId, viewerId = null) {
    if (!targetUserId) return [];

    const nowIso = new Date().toISOString();

    const { data: rows, error } = await supabase
      .from('stories')
      .select(STORY_COLUMNS)
      .eq('user_id', targetUserId)
      .eq('is_deleted', false)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error(`StoryService.getActiveByUser error: ${error.message}`);
      return [];
    }

    const stories = (rows ?? []).map(mapRow);
    if (stories.length === 0 || !viewerId) {
      return stories.map(s => ({ ...s, is_viewed: false }));
    }

    const ids = stories.map(s => s.id);
    const { data: views } = await supabase
      .from('story_views')
      .select('story_id')
      .eq('viewer_id', viewerId)
      .in('story_id', ids);

    const viewedSet = new Set((views ?? []).map(v => v.story_id));

    return stories.map(s => ({ ...s, is_viewed: viewedSet.has(s.id) }));
  },

  // ---------------------------------------------------------------------------
  // getFeed() — list of (user, hasUnviewed, latestAt) for everyone with
  // active stories. The frontend's StoryRow uses this to render rings.
  //
  // We split "my stories" from "their stories" for UI convenience.
  // ---------------------------------------------------------------------------
  async getFeed(viewerId) {
    if (!viewerId) {
      const e = new Error('viewerId is required.');
      e.status = 400; throw e;
    }

    const nowIso = new Date().toISOString();

    // 1. All active stories with author info, newest first.
    //    PostgREST: nested select via FK relationship `users(...)`.
    const { data: rows, error } = await supabase
      .from('stories')
      .select(`
        ${STORY_COLUMNS},
        author:users!user_id ( ${USER_JOIN_COLUMNS} )
      `)
      .eq('is_deleted', false)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      logger.error(`StoryService.getFeed error: ${error.message}`);
      return { my: null, others: [] };
    }

    // 2. Stories the viewer has already seen (for hasUnviewed flag).
    const ids = (rows ?? []).map(r => r.id);
    let viewedSet = new Set();
    if (ids.length > 0) {
      const { data: views } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', viewerId)
        .in('story_id', ids);
      viewedSet = new Set((views ?? []).map(v => v.story_id));
    }

    // 3. Group by user_id, keep latest createdAt and aggregate counters.
    const byUser = new Map();
    for (const r of rows ?? []) {
      const existing = byUser.get(r.user_id);
      const isViewed = viewedSet.has(r.id);

      if (!existing) {
        byUser.set(r.user_id, {
          user: r.author ?? { id: r.user_id, username: null, full_name: null, avatar_url: null },
          latest_story_at: r.created_at,
          story_count:     1,
          unviewed_count:  isViewed ? 0 : 1,
        });
      } else {
        existing.story_count += 1;
        if (!isViewed) existing.unviewed_count += 1;
        if (r.created_at > existing.latest_story_at) {
          existing.latest_story_at = r.created_at;
        }
      }
    }

    // 4. Split self vs. others; sort others by unviewed-first then latest.
    const my = byUser.get(viewerId) ?? null;
    if (my) byUser.delete(viewerId);

    const others = Array.from(byUser.values()).sort((a, b) => {
      const aUnseen = a.unviewed_count > 0 ? 1 : 0;
      const bUnseen = b.unviewed_count > 0 ? 1 : 0;
      if (aUnseen !== bUnseen) return bUnseen - aUnseen;
      return b.latest_story_at.localeCompare(a.latest_story_at);
    });

    return { my, others };
  },

  // ---------------------------------------------------------------------------
  // markViewed() — idempotent insert into story_views. UNIQUE constraint on
  // (story_id, viewer_id) means duplicate calls are no-ops. We never fail the
  // request on an existing-row error.
  //
  // Self-views are ignored (don't pollute "viewers" count).
  // ---------------------------------------------------------------------------
  async markViewed(viewerId, storyId) {
    if (!viewerId || !storyId) return false;

    const story = await this.getById(storyId);
    if (!story) throw new StoryNotFoundError();

    if (story.user_id === viewerId) return false; // self-view is a no-op

    const { error } = await supabase
      .from('story_views')
      .insert({ story_id: storyId, viewer_id: viewerId });

    // 23505 = unique_violation = "already viewed" → not an error for us
    if (error && error.code !== '23505') {
      logger.error(`StoryService.markViewed error: ${error.message}`);
    }
    return true;
  },

  // ---------------------------------------------------------------------------
  // delete() — soft-delete (sets is_deleted) so queries naturally exclude it.
  // The reaper job removes the row + Cloudinary asset later.
  //
  // Returns the row's media_public_id so the controller can delete from
  // Cloudinary synchronously when feasible.
  // ---------------------------------------------------------------------------
  async delete(userId, storyId) {
    if (!userId || !storyId) {
      const e = new Error('userId and storyId are required.');
      e.status = 400; throw e;
    }

    const story = await this.getById(storyId);
    if (!story) throw new StoryNotFoundError();
    if (story.user_id !== userId) throw new StoryForbiddenError();

    const { error } = await supabase
      .from('stories')
      .update({ is_deleted: true })
      .eq('id', storyId);

    if (error) {
      logger.error(`StoryService.delete DB error: ${error.message}`);
      const e = new Error('Failed to delete story.');
      e.status = 500; e.code = 'DB_ERROR'; throw e;
    }

    return { id: storyId, media_public_id: story.media_public_id ?? null, media_type: story.media_type };
  },

  // ---------------------------------------------------------------------------
  // listViewers() — who has seen this story, newest first.
  // Used by the "Seen by" tray inside the viewer for the OWNER only.
  // ---------------------------------------------------------------------------
  async listViewers(ownerId, storyId) {
    if (!ownerId || !storyId) return [];
    const story = await this.getById(storyId);
    if (!story) throw new StoryNotFoundError();
    if (story.user_id !== ownerId) throw new StoryForbiddenError();

    const { data, error } = await supabase
      .from('story_views')
      .select(`
        viewed_at,
        viewer:users!story_views_viewer_id_fkey ( ${USER_JOIN_COLUMNS} )
      `)
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false })
      .limit(500);

    if (error) {
      logger.error(`StoryService.listViewers error: ${error.message}`);
      return [];
    }

    return (data ?? [])
      .filter(v => v.viewer)
      .map(v => ({ ...v.viewer, viewed_at: v.viewed_at }));
  },
};

module.exports = StoryService;
