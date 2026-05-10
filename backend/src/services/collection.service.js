// backend/src/services/collection.service.js
'use strict';

const supabase = require('../config/supabase');
const logger   = require('../utils/logger');

// =============================================================================
// Helper — true if the user has this post saved in ANY of their collections.
//
// The bookmark icon in the feed represents a global "saved or not" state, but
// each `collection_posts` row only describes membership in one collection.
// Without this aggregation the icon flickers off when the user removes a post
// from one collection while it's still in another.
// =============================================================================
async function userHasPostSavedAnywhere(userId, postId) {
  // Single-shot query: rows in collection_posts that belong to a collection
  // owned by `userId`. Limit 1 — we only care if at least one exists.
  const { data, error } = await supabase
    .from('collection_posts')
    .select('post_id, collections!inner(owner_id)')
    .eq('post_id', postId)
    .eq('collections.owner_id', userId)
    .limit(1);

  if (error) {
    logger.warn(`[collections] saved-anywhere lookup failed: ${error.message}`);
    // Fail open: caller will treat as "still saved" rather than randomly
    // unbookmarking a post on a transient error.
    return true;
  }
  return Array.isArray(data) && data.length > 0;
}

// =============================================================================
// Service
// =============================================================================

const CollectionService = {

  // ---------------------------------------------------------------------------
  // Get all collections for a user (Owned + Shared with them).
  //
  // Lazily creates the default "Saved" collection if it doesn't exist yet —
  // race-safe: a unique-violation from a concurrent caller falls back to a
  // re-fetch instead of throwing.
  // ---------------------------------------------------------------------------
  async getUserCollections(userId) {
    // 1. Owned collections
    let { data: owned, error } = await supabase
      .from('collections')
      .select(`
        id, name, is_default, owner_id, created_at,
        collection_members ( user_id )
      `)
      .eq('owner_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 2. Lazy-create default "Saved" if missing.
    //    We swallow unique-violation (23505) since two concurrent fetches will
    //    race on the first login of a brand-new user.
    const hasDefault = (owned ?? []).some(c => c.is_default);
    if (!hasDefault) {
      const { data: defaultCol, error: defErr } = await supabase
        .from('collections')
        .insert({ name: 'Saved', owner_id: userId, is_default: true })
        .select(`
          id, name, is_default, owner_id, created_at,
          collection_members ( user_id )
        `)
        .single();

      if (defErr && defErr.code !== '23505') {
        throw defErr;
      }

      if (defErr && defErr.code === '23505') {
        // Another request won the race — refetch so our list includes it.
        const { data: refetched } = await supabase
          .from('collections')
          .select(`
            id, name, is_default, owner_id, created_at,
            collection_members ( user_id )
          `)
          .eq('owner_id', userId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });
        owned = refetched ?? owned ?? [];
      } else if (defaultCol) {
        owned = [defaultCol, ...(owned ?? [])];
      }
    }

    // 3. Collections shared WITH the user (they appear as a member, not owner).
    //    Filter null `collections` (orphaned membership rows) defensively so
    //    downstream `.map(c.id)` never NPEs.
    const { data: shared } = await supabase
      .from('collection_members')
      .select('collections ( id, name, is_default, owner_id, created_at )')
      .eq('user_id', userId);

    const sharedCollections = (shared ?? [])
      .map(s => s.collections)
      .filter(Boolean);

    return [...(owned ?? []), ...sharedCollections];
  },

  // ---------------------------------------------------------------------------
  // Create a Custom Collection (and optionally add friends).
  // ---------------------------------------------------------------------------
  async createCollection(userId, name, memberIds = []) {
    if (!name?.trim()) throw Object.assign(new Error('Name required'), { status: 400 });

    const { data: collection, error } = await supabase
      .from('collections')
      .insert({ name: name.trim(), owner_id: userId, is_default: false })
      .select()
      .single();

    if (error) throw error;

    if (memberIds && memberIds.length > 0) {
      // Dedupe and drop self-membership (owner is implicit).
      const cleaned = [...new Set(memberIds.filter(id => id && id !== userId))];
      if (cleaned.length > 0) {
        const rows = cleaned.map(id => ({
          collection_id: collection.id,
          user_id:       id,
        }));

        const { error: memberErr } = await supabase
          .from('collection_members')
          .insert(rows);

        if (memberErr) logger.warn('Failed to add members:', memberErr.message);
      }
    }

    return collection;
  },

  // ---------------------------------------------------------------------------
  // Toggle Save Post in a SPECIFIC Collection.
  //
  // Returns:
  //   {
  //     in_this_collection: boolean,  // is the post still in THIS collection?
  //     is_saved:           boolean,  // is the post saved in ANY of the user's collections?
  //     collection_id:      string,
  //   }
  //
  // The dual flag lets the bookmark icon stay solid when the post is in
  // another collection, while the per-collection row in the sheet still
  // accurately reflects the toggle.
  // ---------------------------------------------------------------------------
  async toggleSaveInCollection(userId, postId, collectionId) {
    // Authorisation: the user must own the collection (or be a member of a
    // shared one). Members can ADD to a shared collection, but only the owner
    // can REMOVE — that's the simplest sensible policy.
    const { data: collection, error: colErr } = await supabase
      .from('collections')
      .select('id, owner_id, collection_members(user_id)')
      .eq('id', collectionId)
      .single();

    if (colErr || !collection) {
      throw Object.assign(new Error('Collection not found'), { status: 404 });
    }

    const isOwner   = collection.owner_id === userId;
    const isMember  = (collection.collection_members ?? []).some(m => m.user_id === userId);
    if (!isOwner && !isMember) {
      throw Object.assign(new Error('Forbidden'), { status: 403 });
    }

    // Already in this collection?
    const { data: existing } = await supabase
      .from('collection_posts')
      .select('post_id, added_by')
      .eq('collection_id', collectionId)
      .eq('post_id', postId)
      .maybeSingle();

    let in_this_collection;

    if (existing) {
      // Members can only remove rows they added themselves; owners can remove anything.
      if (!isOwner && existing.added_by !== userId) {
        throw Object.assign(new Error('Only the owner can remove this'), { status: 403 });
      }
      const { error: delErr } = await supabase
        .from('collection_posts')
        .delete()
        .eq('collection_id', collectionId)
        .eq('post_id', postId);
      if (delErr) throw delErr;
      in_this_collection = false;
    } else {
      const { error: insErr } = await supabase
        .from('collection_posts')
        .insert({
          collection_id: collectionId,
          post_id:       postId,
          added_by:      userId,
        });

      // 23505 = double-tap race — treat as "already saved".
      if (insErr && insErr.code !== '23505') throw insErr;
      in_this_collection = true;
    }

    // Recompute the global flag AFTER the change so the client doesn't have
    // to round-trip a second request just to update its bookmark icon.
    const is_saved = await userHasPostSavedAnywhere(userId, postId);

    return {
      in_this_collection,
      is_saved,
      collection_id: collectionId,
    };
  },

  // ---------------------------------------------------------------------------
  // Get Posts inside a specific Collection (For the Settings / Saved tab).
  // ---------------------------------------------------------------------------
  async getCollectionPosts(userId, collectionId, page = 1, limit = 15) {
    const { data: collection, error: colErr } = await supabase
      .from('collections')
      .select('owner_id, collection_members(user_id)')
      .eq('id', collectionId)
      .single();

    if (colErr || !collection) {
      throw Object.assign(new Error('Collection not found'), { status: 404 });
    }

    const isOwner  = collection.owner_id === userId;
    const isMember = (collection.collection_members ?? []).some(m => m.user_id === userId);
    if (!isOwner && !isMember) {
      throw Object.assign(new Error('Unauthorized'), { status: 403 });
    }

    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    const { data, count, error } = await supabase
      .from('collection_posts')
      .select(`
        post_id,
        created_at,
        post:posts (
          id, content, media_url, media_type, media_width, media_height, status,
          like_count, comment_count, share_count, created_at,
          user:users!user_id ( id, username, avatar_url, is_premium, is_verified ),
          post_likes ( user_id ),
          collection_posts ( added_by, collection:collections!collection_id ( owner_id ) )
        )
      `, { count: 'exact' })
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const formattedPosts = (data ?? [])
      .filter(row => row.post !== null)
      .map(row => {
        const p     = row.post;
        const likes = p.post_likes ?? [];
        const saves = p.collection_posts ?? [];
        return {
          id:            p.id,
          content:       p.content,
          media_url:     p.media_url,
          media_type:    p.media_type,
          media_width:   p.media_width,
          media_height:  p.media_height,
          status:        p.status,
          created_at:    p.created_at,
          like_count:    p.like_count    || 0,
          comment_count: p.comment_count || 0,
          share_count:   p.share_count   || 0,
          user:          p.user,
          is_liked:      likes.some(l => l.user_id === userId),
          // Global saved flag — true if any of THIS user's collections holds the post.
          is_saved:      saves.some(s => s.collection?.owner_id === userId),
        };
      });

    return {
      posts:   formattedPosts,
      hasMore: (count ?? 0) > to + 1,
      total:   count ?? 0,
    };
  },
};

module.exports = CollectionService;
