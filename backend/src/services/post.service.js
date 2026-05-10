// backend/src/services/post.service.js
'use strict';

const supabase     = require('../config/supabase');
const MediaService = require('./media.service');
const logger       = require('../utils/logger');

// =============================================================================
// Select fragments
// =============================================================================

// Full post shape for API responses.  Does NOT include media_public_id
// (internal field, never exposed to clients).
//
// `collection_posts` is joined with `collections.owner_id` so we can compute
// the GLOBAL "is_saved" flag — true if the post lives in any of the viewer's
// collections, regardless of which one. The previous shape only checked
// `added_by === viewer`, which broke as soon as a post was saved into a
// shared collection by another member.
const POST_SELECT = `
  id, content, media_url, media_type,
  media_width, media_height,
  status, failure_reason,
  like_count, comment_count, share_count,
  created_at, updated_at, is_deleted,
  user:users!user_id (
    id, username, avatar_url, dept,
    is_premium, is_verified
  ),
  post_likes ( user_id ),
  collection_posts ( added_by, collection:collections!collection_id ( owner_id ) )
`;

// Lightweight select for internal ownership / status checks.
// Avoids pulling in the full post shape for guard queries.
const POST_GUARD_SELECT = `
  id, user_id, status, media_url, media_type, media_public_id,
  media_attached_at, content, cleanup_pending
`;

const COMMENT_SELECT = `
  id, text, created_at,
  user:users!user_id ( id, username, avatar_url )
`;

// =============================================================================
// Valid status transitions
// =============================================================================
const ALLOWED_TRANSITIONS = {
  draft:      new Set(['uploading', 'failed', 'published']),
  uploading:  new Set(['processing', 'failed', 'published']),
  processing: new Set(['published', 'failed']),
  failed:     new Set(['draft']),       // retry: reset back to draft
  published:  new Set([]),              // terminal — no transitions out
};

function canTransition(from, to) {
  return ALLOWED_TRANSITIONS[from]?.has(to) ?? false;
}

// =============================================================================
// Response shaper
// =============================================================================

function shapePost(post, viewingUserId) {
  const likes = post.post_likes ?? [];
  const saves = post.collection_posts ?? [];
  return {
    id:             post.id,
    content:        post.content,
    media_url:      post.media_url    ?? null,
    media_type:     post.media_type   ?? null,
    media_width:    post.media_width  ?? null,
    media_height:   post.media_height ?? null,
    status:         post.status,
    failure_reason: post.failure_reason ?? null,
    created_at:     post.created_at,
    updated_at:     post.updated_at,
    user:           post.user,
    like_count:     post.like_count    ?? 0,
    comment_count:  post.comment_count ?? 0,
    share_count:    post.share_count   ?? 0,
    is_liked:       likes.some(l => l.user_id === viewingUserId),
    // Global "saved": true if this post sits in any collection owned by the
    // viewer. We OR with the legacy `added_by === viewer` check so old
    // collection_posts rows (created before the join shape was added) still
    // resolve correctly.
    is_saved: saves.some(s =>
      s.collection?.owner_id === viewingUserId ||
      s.added_by === viewingUserId,
    ),
  };
}

// =============================================================================
// Custom errors
// =============================================================================

class DuplicatePostError extends Error {
  constructor(post) {
    super('Duplicate idempotency key — returning existing post');
    this.name        = 'DuplicatePostError';
    this.existingPost = post;
    this.status      = 200;
  }
}

class InvalidTransitionError extends Error {
  constructor(from, to) {
    super(`Cannot transition post from '${from}' to '${to}'.`);
    this.name   = 'InvalidTransitionError';
    this.status = 409;
    this.code   = 'INVALID_TRANSITION';
    this.from   = from;
    this.to     = to;
  }
}

class PostNotFoundError extends Error {
  constructor() {
    super('Post not found.');
    this.name   = 'PostNotFoundError';
    this.status = 404;
    this.code   = 'POST_NOT_FOUND';
  }
}

// =============================================================================
// Internal helpers
// =============================================================================

async function enqueueCleanup(publicId, resourceType, postId) {
  const { error } = await supabase
    .from('cloudinary_cleanup_queue')
    .insert({
      public_id:     publicId,
      resource_type: resourceType,
      post_id:       postId ?? null,
    });

  if (error) {
    logger.error(`enqueueCleanup: failed to insert queue row for ${publicId}: ${error.message}`);
  }
}

async function safeDeleteCloudinaryAsset(publicId, isVideo, postId) {
  if (!publicId) return;
  const resourceType = isVideo ? 'video' : 'image';
  try {
    await MediaService.delete(publicId, isVideo);
  } catch (err) {
    logger.warn(`safeDeleteCloudinaryAsset: delete failed for ${publicId} — queuing retry. ` + err.message);
    await enqueueCleanup(publicId, resourceType, postId);
  }
}

// =============================================================================
// Service
// =============================================================================

const PostService = {
  DuplicatePostError,
  InvalidTransitionError,
  PostNotFoundError,

  // ---------------------------------------------------------------------------
  // STEP 1 — createDraft
  // ---------------------------------------------------------------------------
  async createDraft(userId, { content, idempotencyKey, hasMedia }) {
    if (!content?.trim() && !hasMedia) {
      const err = new Error('Post must have content or media.');
      err.status = 400;
      err.code   = 'MISSING_CONTENT';
      throw err;
    }

    if (idempotencyKey) {
      const { data: existing, error: lookupErr } = await supabase
        .from('posts')
        .select(POST_SELECT)
        .eq('idempotency_key', idempotencyKey)
        .eq('user_id', userId)
        .maybeSingle();

      if (lookupErr) logger.error('createDraft pre-check error:', lookupErr.message);
      if (existing) throw new DuplicatePostError(shapePost(existing, userId));
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id:          userId,
        content:          content?.trim() ?? '',
        status:           'draft',
        idempotency_key:  idempotencyKey ?? null,
        draft_expires_at: expiresAt,
      })
      .select(POST_SELECT)
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: raceRow, error: raceErr } = await supabase
          .from('posts')
          .select(POST_SELECT)
          .eq('idempotency_key', idempotencyKey)
          .eq('user_id', userId)
          .single();

        if (raceErr || !raceRow) {
          logger.error('createDraft race recovery failed:', raceErr?.message);
          throw error;
        }
        throw new DuplicatePostError(shapePost(raceRow, userId));
      }
      logger.error('createDraft INSERT error:', error.message);
      throw error;
    }

    return shapePost(data, userId);
  },

  // ---------------------------------------------------------------------------
  // STEP 2 — attachMedia
  // ---------------------------------------------------------------------------
  async attachMedia(userId, postId, {
    media_url,
    media_type,
    media_width,
    media_height,
    media_public_id,
  }) {
    if (!media_url)        throw Object.assign(new Error('media_url is required.'),    { status: 400, code: 'MISSING_MEDIA_URL' });
    if (!media_type)       throw Object.assign(new Error('media_type is required.'),   { status: 400, code: 'MISSING_MEDIA_TYPE' });
    if (!media_public_id)  throw Object.assign(new Error('media_public_id is required.'), { status: 400, code: 'MISSING_PUBLIC_ID' });

    const validTypes = ['image', 'video', 'reel'];
    if (!validTypes.includes(media_type)) {
      throw Object.assign(
        new Error(`Invalid media_type '${media_type}'. Must be one of: ${validTypes.join(', ')}`),
        { status: 400, code: 'INVALID_MEDIA_TYPE' }
      );
    }

    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select(POST_GUARD_SELECT)
      .eq('id', postId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (fetchErr) {
      logger.error('attachMedia fetch error:', fetchErr.message);
      throw fetchErr;
    }
    if (!post) throw new PostNotFoundError();

    if (!canTransition(post.status, 'uploading')) {
      throw new InvalidTransitionError(post.status, 'uploading');
    }

    if (post.status === 'failed' && post.media_public_id) {
      const oldIsVideo = post.media_type === 'video' || post.media_type === 'reel';
      if (post.cleanup_pending) {
        await enqueueCleanup(post.media_public_id, oldIsVideo ? 'video' : 'image', postId);
      }
    }

    const { data, error } = await supabase
      .from('posts')
      .update({
        media_url,
        media_type,
        media_width:      media_width  ?? null,
        media_height:     media_height ?? null,
        media_public_id,
        media_attached_at: new Date().toISOString(),
        status:            'uploading',
        failure_reason:   null,
        cleanup_pending:   false,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId)
      .select(POST_SELECT)
      .single();

    if (error) {
      logger.error('attachMedia UPDATE error:', error.message);
      throw error;
    }
    if (!data) throw new PostNotFoundError();

    return shapePost(data, userId);
  },

  // ---------------------------------------------------------------------------
  // STEP 3 — publish
  // ---------------------------------------------------------------------------
  async publish(userId, postId) {
    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select(POST_GUARD_SELECT)
      .eq('id', postId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (fetchErr) {
      logger.error('publish fetch error:', fetchErr.message);
      throw fetchErr;
    }
    if (!post) throw new PostNotFoundError();

    if (post.status === 'published') {
      const { data: full, error: fullErr } = await supabase
        .from('posts')
        .select(POST_SELECT)
        .eq('id', postId)
        .single();
      if (fullErr || !full) throw new PostNotFoundError();
      return shapePost(full, userId);
    }

    if (!canTransition(post.status, 'published')) {
      throw new InvalidTransitionError(post.status, 'published');
    }

    if (post.media_type) {
      if (!post.media_url || !post.media_attached_at) {
        const err = new Error(
          `Cannot publish: post has media_type '${post.media_type}' ` +
          `but media has not been fully attached. Complete the upload first.`
        );
        err.status = 400;
        err.code   = 'MEDIA_NOT_ATTACHED';
        throw err;
      }
    }

    if (!post.content?.trim() && !post.media_url) {
      const err = new Error('Post must have content or media before publishing.');
      err.status = 400;
      err.code   = 'EMPTY_POST';
      throw err;
    }

    const { data, error } = await supabase
      .from('posts')
      .update({
        status:           'published',
        draft_expires_at: null,
        failure_reason:   null,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId)
      .eq('status', post.status)
      .select(POST_SELECT)
      .maybeSingle();

    if (error) {
      logger.error('publish UPDATE error:', error.message);
      throw error;
    }

    if (!data) {
      const { data: refetched, error: refetchErr } = await supabase
        .from('posts')
        .select(POST_SELECT)
        .eq('id', postId)
        .single();

      if (refetchErr || !refetched) throw new PostNotFoundError();

      if (refetched.status === 'published') {
        return shapePost(refetched, userId);
      }

      throw new InvalidTransitionError(refetched.status, 'published');
    }

    return shapePost(data, userId);
  },

  // ---------------------------------------------------------------------------
  // markFailed
  // ---------------------------------------------------------------------------
  async markFailed(userId, postId, reason, { cleanupMedia = false } = {}) {
    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select(POST_GUARD_SELECT)
      .eq('id', postId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (fetchErr) {
      logger.error('markFailed fetch error:', fetchErr.message);
      throw fetchErr;
    }
    if (!post) throw new PostNotFoundError();

    if (post.status === 'failed') {
      logger.info(`markFailed: post ${postId} already in failed state`);
      return;
    }

    if (!canTransition(post.status, 'failed')) {
      throw new InvalidTransitionError(post.status, 'failed');
    }

    let cleanupPending = false;
    if (cleanupMedia && post.media_public_id) {
      const isVideo = post.media_type === 'video' || post.media_type === 'reel';
      try {
        await MediaService.delete(post.media_public_id, isVideo);
        cleanupPending = false;
      } catch (cleanupErr) {
        logger.warn(
          `markFailed: Cloudinary delete failed for ${post.media_public_id} — queuing. ` +
          cleanupErr.message
        );
        await enqueueCleanup(
          post.media_public_id,
          isVideo ? 'video' : 'image',
          postId
        );
        cleanupPending = true;
      }
    } else if (!cleanupMedia && post.media_public_id) {
      cleanupPending = true;
    }

    const { error: updateErr } = await supabase
      .from('posts')
      .update({
        status:          'failed',
        failure_reason:  reason ?? 'unknown',
        cleanup_pending: cleanupPending,
        draft_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId);

    if (updateErr) {
      logger.error('markFailed UPDATE error:', updateErr.message);
      throw updateErr;
    }

    logger.info(`Post ${postId} marked failed: ${reason}`);
  },

  // ---------------------------------------------------------------------------
  // resetForRetry
  // ---------------------------------------------------------------------------
  async resetForRetry(userId, postId) {
    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select(POST_GUARD_SELECT)
      .eq('id', postId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!post) throw new PostNotFoundError();

    if (post.status !== 'failed') {
      const err = new Error(`Cannot reset post in status '${post.status}'. Only failed posts can be reset.`);
      err.status = 409;
      err.code   = 'INVALID_TRANSITION';
      throw err;
    }

    const { data, error } = await supabase
      .from('posts')
      .update({
        status:            'draft',
        failure_reason:    null,
        media_url:         null,
        media_type:        null,
        media_width:       null,
        media_height:      null,
        media_public_id:   null,
        media_attached_at: null,
        cleanup_pending:   false,
        draft_expires_at:  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at:        new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId)
      .eq('status', 'failed')
      .select(POST_SELECT)
      .maybeSingle();

    if (error) {
      logger.error('resetForRetry UPDATE error:', error.message);
      throw error;
    }

    if (!data) {
      const { data: refetched } = await supabase
        .from('posts').select(POST_SELECT).eq('id', postId).single();
      if (!refetched) throw new PostNotFoundError();
      return shapePost(refetched, userId);
    }

    return shapePost(data, userId);
  },

  // ---------------------------------------------------------------------------
  // deletePost (soft)
  // ---------------------------------------------------------------------------
  async deletePost(userId, postId) {
    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select('media_public_id, media_type')
      .eq('id', postId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!post) throw new PostNotFoundError();

    const { error: deleteErr } = await supabase
      .from('posts')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', postId)
      .eq('user_id', userId);

    if (deleteErr) throw deleteErr;

    if (post.media_public_id) {
      const isVideo = post.media_type === 'video' || post.media_type === 'reel';
      safeDeleteCloudinaryAsset(post.media_public_id, isVideo, postId).catch(err =>
        logger.error(`deletePost: safeDelete threw: ${err.message}`)
      );
    }
  },

  // ---------------------------------------------------------------------------
  // getFeed
  // ---------------------------------------------------------------------------
  async getFeed(userId, page = 1, limit = 15, filter = 'forYou') {
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    const baseQuery = () => supabase
      .from('posts')
      .select(POST_SELECT, { count: 'exact' })
      .eq('status', 'published')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(from, to);

    let query = baseQuery();

    if (filter === 'myCircle') {
      const { data: circle, error: circleErr } = await supabase
        .from('circles')
        .select('following_id')
        .eq('follower_id', userId);

      if (circleErr) throw circleErr;

      const ids = (circle ?? []).map(c => c.following_id);
      if (ids.length === 0) return { posts: [], hasMore: false, total: 0 };
      query = baseQuery().in('user_id', ids);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      posts:   (data ?? []).map(p => shapePost(p, userId)),
      hasMore: (count ?? 0) > to + 1,
      total:   count ?? 0,
    };
  },

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------
  async getById(postId, viewingUserId) {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('id', postId)
      .eq('is_deleted', false)
      .single();

    if (error || !data) throw new PostNotFoundError();

    if (data.user?.id !== viewingUserId && data.status !== 'published') {
      throw new PostNotFoundError();
    }

    return shapePost(data, viewingUserId);
  },

  // ---------------------------------------------------------------------------
  // getUserDrafts
  // ---------------------------------------------------------------------------
  async getUserDrafts(userId) {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .in('status', ['draft', 'uploading', 'processing', 'failed'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data ?? []).map(p => shapePost(p, userId));
  },

  // ---------------------------------------------------------------------------
  // toggleLike
  // ---------------------------------------------------------------------------
  async toggleLike(userId, postId) {
    const { data: existing } = await supabase
      .from('post_likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (existing) {
      await supabase.from('post_likes').delete()
        .eq('user_id', userId).eq('post_id', postId);
      const { error } = await supabase.rpc('decrement_like_count', { post_id: postId });
      if (error) logger.warn('decrement_like_count:', error.message);
    } else {
      await supabase.from('post_likes').insert({ user_id: userId, post_id: postId });
      const { error } = await supabase.rpc('increment_like_count', { post_id: postId });
      if (error) logger.warn('increment_like_count:', error.message);
    }

    const { count } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    return { liked: !existing, like_count: count ?? 0 };
  },

  // ---------------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------------
  async addComment(userId, postId, content, parentId) {
    const { data, error } = await supabase
      .from('comments')
      .insert({ user_id: userId, post_id: postId, text: content, parent_id: parentId ?? null })
      .select(COMMENT_SELECT)
      .single();

    if (error) throw error;

    const { error: incErr } = await supabase.rpc('increment_comment_count', { post_id: postId });
    if (incErr) logger.warn('increment_comment_count:', incErr.message);

    return data;
  },

  async getComments(postId, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    const { data, error, count } = await supabase
      .from('comments')
      .select(COMMENT_SELECT, { count: 'exact' })
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw error;
    return { comments: data ?? [], hasMore: (count ?? 0) > to + 1 };
  },
};

module.exports = PostService;