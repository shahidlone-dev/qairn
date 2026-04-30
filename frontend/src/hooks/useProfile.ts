// src/hooks/useProfile.ts

import { useState, useEffect, useCallback } from 'react';
import { usePaginatedFeed } from './usePaginatedFeed';
import UsersApi             from '../api/users.api';
import type { User, Post, MarketListing, ServiceListing } from '../types/api.types';

type ProfileTab = 'posts' | 'listings' | 'services';

export function useProfile(username: string, activeTab: ProfileTab = 'posts') {
  const [user,      setUser]      = useState<User | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [following, setFollowing] = useState(false);

  // Load user profile
  useEffect(() => {
    setLoading(true);
    UsersApi.getProfile(username)
      .then(res => {
        setUser(res.user);
        setFollowing(res.user.is_following ?? false);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [username]);

  // Posts tab
  const posts = usePaginatedFeed<Post>(
    useCallback(params => UsersApi.getUserPosts(username, params), [username])
  );

  // Listings tab
  const listings = usePaginatedFeed<MarketListing>(
    useCallback(params => UsersApi.getUserListings(username, params), [username])
  );

  // Services tab
  const services = usePaginatedFeed<ServiceListing>(
    useCallback(params => UsersApi.getUserServices(username, params), [username])
  );

  // Load active tab content
  useEffect(() => {
    if (activeTab === 'posts')    posts.load();
    if (activeTab === 'listings') listings.load();
    if (activeTab === 'services') services.load();
  }, [activeTab, username]);

  // ── Follow / unfollow (optimistic) ────────────────────────────────────────
  const toggleFollow = async () => {
    if (!user) return;
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setUser(u => u ? {
      ...u,
      circle_count: wasFollowing ? u.circle_count - 1 : u.circle_count + 1,
    } : u);

    try {
      if (wasFollowing) await UsersApi.unfollow(user.id);
      else              await UsersApi.follow(user.id);
    } catch {
      // Revert
      setFollowing(wasFollowing);
      setUser(u => u ? {
        ...u,
        circle_count: wasFollowing ? u.circle_count + 1 : u.circle_count - 1,
      } : u);
    }
  };

  // ── Update own profile ────────────────────────────────────────────────────
  const updateProfile = async (data: Parameters<typeof UsersApi.updateMe>[0]) => {
    const res = await UsersApi.updateMe(data);
    setUser(res.user);
    return res.user;
  };

  const activeContent = {
    posts:    posts,
    listings: listings,
    services: services,
  }[activeTab];

  return {
    user,
    loading,
    error,
    following,
    toggleFollow,
    updateProfile,
    // Tab content
    activeContent,
    posts,
    listings,
    services,
  };
}