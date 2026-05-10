// backend/src/services/user.service.js
'use strict';

const supabase = require('../config/supabase');

const USER_SELECT = `
  id, username, full_name, bio, avatar_url,
  dept, university, year,
  is_premium, is_tutor, is_helper, is_verified,
  circle_count, post_count, rating,
  created_at
`;

const UserService = {

  // ── Get own profile ───────────────────────────────────────────────────────
  async getMe(userId) {
    const { data, error } = await supabase
      .from('users')
      .select(USER_SELECT)
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // ── Update own profile ────────────────────────────────────────────────────
  async updateMe(userId, body) {
    const allowed = ['full_name', 'bio', 'dept', 'university', 'year', 'avatar_url'];
    const updates = {};
    allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k]; });

    if (Object.keys(updates).length === 0) {
      throw Object.assign(new Error('No valid fields to update'), { status: 400 });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select(USER_SELECT)
      .single();

    if (error) throw error;
    return data;
  },

  // ── Get the viewer's circle (people they follow) ─────────────────────────
  //
  // "Circle" here means the set of users the viewer is actively connected to
  // — i.e. people they follow. This is what fuels:
  //   - "Add friends to collection" picker
  //   - "Share with my circle" surfaces
  //   - Mentions auto-complete (later)
  //
  // We only return the FOLLOWING side. If we ever want the full social graph
  // (followers + following) we can either add a `mode` query param or expose
  // a separate /followers endpoint. Going one-direction-by-default keeps the
  // result small and predictable, and matches the product's mental model
  // where the user opts in to who's in their circle.
  async getMyCircle(userId, limit = 200) {
    const safeLimit = Math.max(1, Math.min(500, limit));

    // PostgREST nested select: pull the followed user's public fields in a
    // single query rather than a join + extra fetch.
    const { data, error } = await supabase
      .from('circles')
      .select(`
        following_id,
        created_at,
        following:users!following_id (
          id, username, full_name, avatar_url,
          dept, university,
          is_premium, is_verified, is_tutor, is_helper
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) throw error;

    // Filter rows where the joined user is missing (account deleted, etc.).
    return (data ?? [])
      .map(row => row.following)
      .filter(Boolean);
  },

  // ── Search users by username ─────────────────────────────────────────────
  //
  // Used by the in-app search screen. Username-only on purpose (the current UX
  // does not let people search for full names or bios). We use Postgres
  // ILIKE for a prefix-leaning match — `q%` would be strictly prefix, but
  // `%q%` lets people find a user mid-handle which feels more forgiving on
  // mobile. The `username_trgm_idx` (pg_trgm) index makes this fast.
  //
  // Args:
  //   q       — raw query string (already trimmed). Must be ≥ 2 chars.
  //   viewerId — current user id, excluded from results so people don't find
  //              themselves at the top of every search.
  //   limit    — clamped 1..30
  //
  // Returns up to `limit` users, sorted: exact-match first, then by
  // username length asc (shorter = more likely to be the intended user),
  // then alphabetically.
  async searchByUsername(q, viewerId, limit = 20) {
    const term = (q ?? '').trim().toLowerCase();
    if (term.length < 2) return [];

    const safe = term.replace(/[%_\\]/g, ch => `\\${ch}`); // escape ILIKE wildcards

    const { data, error } = await supabase
      .from('users')
      .select(`
        id, username, full_name, avatar_url, dept, university,
        is_premium, is_verified, is_tutor, is_helper
      `)
      .ilike('username', `%${safe}%`)
      .neq('id', viewerId ?? '00000000-0000-0000-0000-000000000000')
      .order('username', { ascending: true })
      .limit(Math.max(1, Math.min(30, limit)));

    if (error) throw error;

    const rows = data ?? [];

    // Bring exact match (if any) to the top, then shorter usernames first.
    rows.sort((a, b) => {
      const ax = a.username === term ? 0 : 1;
      const bx = b.username === term ? 0 : 1;
      if (ax !== bx) return ax - bx;
      if (a.username.length !== b.username.length) {
        return a.username.length - b.username.length;
      }
      return a.username.localeCompare(b.username);
    });

    return rows;
  },

  // ── Get public profile by username ────────────────────────────────────────
  async getByUsername(username, viewerId) {
    const { data, error } = await supabase
      .from('users')
      .select(USER_SELECT)
      .eq('username', username.toLowerCase())
      .single();

    if (error || !data) {
      throw Object.assign(new Error('User not found'), { status: 404 });
    }

    let is_following = false;
    if (viewerId && viewerId !== data.id) {
      const { data: circle } = await supabase
        .from('circles')
        .select('follower_id')
        .eq('follower_id', viewerId)
        .eq('following_id', data.id)
        .maybeSingle();
      is_following = !!circle;
    }

    return { ...data, is_following };
  },

  // ── Get user posts ─────────────────────────────────────────────────────────
  async getUserPosts(username, viewerId, page = 1, limit = 12) {
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    // FIX: Added .eq('status', 'published') and .eq('is_deleted', false).
    // Previously returned ALL posts regardless of status, leaking draft/failed/uploading
    // posts to anyone who viewed a profile. Now only published visible posts are returned.
    const { data, error, count } = await supabase
      .from('posts')
      .select(`
        id, content, media_url, media_type,
        like_count, comment_count, created_at,
        post_likes ( user_id )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'published')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const posts = (data ?? []).map(p => ({
      id:            p.id,
      content:       p.content,
      media_url:     p.media_url  ?? null,
      media_type:    p.media_type ?? null,
      like_count:    p.like_count    ?? 0,
      comment_count: p.comment_count ?? 0,
      is_liked:      (p.post_likes ?? []).some(l => l.user_id === viewerId),
      created_at:    p.created_at,
    }));

    return { posts, hasMore: (count ?? 0) > to + 1, total: count ?? 0 };
  },

  // ── Follow user ───────────────────────────────────────────────────────────
  async follow(followerId, followingId) {
    if (followerId === followingId) {
      throw Object.assign(new Error('Cannot follow yourself'), { status: 400 });
    }

    const { error } = await supabase
      .from('circles')
      .insert({ follower_id: followerId, following_id: followingId });

    if (error) {
      if (error.code === '23505') return { following: true };
      throw error;
    }

    await supabase.rpc('increment_circle_count', { user_id: followingId }).catch(() => {});

    return { following: true };
  },

  // ── Unfollow user ─────────────────────────────────────────────────────────
  async unfollow(followerId, followingId) {
    await supabase
      .from('circles')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    await supabase.rpc('decrement_circle_count', { user_id: followingId }).catch(() => {});

    return { following: false };
  },
};

module.exports = UserService;