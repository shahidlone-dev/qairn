// backend/src/services/post.service.js
'use strict';

const supabase = require('../config/supabase');

const PostService = {

  // ── Create post ───────────────────────────────────────────────────────────
  async createPost(userId, { content, image }) {
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: userId, content, image_url: image ?? null })
      .select(`
        id, content, image_url, created_at,
        user:users!user_id ( id, username ),
        post_likes ( count ),
        comments   ( count )
      `)
      .single();

    if (error) throw error;
    return this._shape(data, userId);
  },

  // ── Get feed (page + limit) ───────────────────────────────────────────────
  async getFeed(userId, page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    const { data, error, count } = await supabase
      .from('posts')
      .select(`
        id, content, image_url, created_at,
        user:users!user_id ( id, username ),
        post_likes ( user_id ),
        comments   ( count )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      posts:   (data ?? []).map(p => this._shape(p, userId)),
      hasMore: count > to + 1,
      total:   count,
    };
  },

  // ── Toggle like ───────────────────────────────────────────────────────────
  async toggleLike(userId, postId) {
    // Check existing like
    const { data: existing } = await supabase
      .from('post_likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);
      return { liked: false };
    }

    await supabase
      .from('post_likes')
      .insert({ user_id: userId, post_id: postId });
    return { liked: true };
  },

  // ── Add comment ───────────────────────────────────────────────────────────
  async addComment(userId, postId, content) {
    const { data, error } = await supabase
      .from('comments')
      .insert({ user_id: userId, post_id: postId, content })
      .select(`
        id, content, created_at,
        user:users!user_id ( id, username )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // ── Get comments ──────────────────────────────────────────────────────────
  async getComments(postId, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    const { data, error, count } = await supabase
      .from('comments')
      .select(`
        id, content, created_at,
        user:users!user_id ( id, username )
      `, { count: 'exact' })
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw error;

    return {
      comments: data ?? [],
      hasMore:  count > to + 1,
    };
  },

  // ── Shape post row into response ──────────────────────────────────────────
  _shape(post, userId) {
    const likes    = post.post_likes ?? [];
    const comments = post.comments   ?? [];

    return {
      id:             post.id,
      content:        post.content,
      image:          post.image_url ?? null,
      created_at:     post.created_at,
      user:           post.user,
      likes_count:    Array.isArray(likes)    ? likes.length    : (likes[0]?.count ?? 0),
      comments_count: Array.isArray(comments) ? comments.length : (comments[0]?.count ?? 0),
      is_liked:       Array.isArray(likes) && likes.some(l => l.user_id === userId),
    };
  },
};

module.exports = PostService;