// src/api/client.ts
//
// KEY FIX — in-memory token cache:
//   Previously every API request called AsyncStorage.getItem() before sending.
//   AsyncStorage is async disk I/O — 20-80ms per call on a real device.
//   That means every like, comment, feed load, and navigation was waiting
//   for a disk read before the network request even left the device.
//
//   Now: tokens are loaded from disk ONCE (on first use) and held in memory.
//   Subsequent requests read from the in-memory cache — ~0ms overhead.
//   The cache is updated whenever tokens are saved or cleared.

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Base URL ─────────────────────────────────────────────────────────────────
const LOCAL_IP = '10.195.92.237';
export const BASE_URL = __DEV__
  ? `http://${LOCAL_IP}:3000/api`
  : 'https://api.qaaf.app/api';

const TIMEOUT_MS = 30_000; // 30s — was 300s which masked real failures

const KEYS = {
  access:  'qaaf:access_token',
  refresh: 'qaaf:refresh_token',
  userId:  'qaaf:user_id',
};

// ─── In-memory token cache ────────────────────────────────────────────────────
// Starts null. First request triggers a one-time disk load then stays in memory.
let _memAccess:  string | null = null;
let _memRefresh: string | null = null;
let _memUserId:  string | null = null;
let _loaded = false;

async function ensureLoaded() {
  if (_loaded) return;
  _loaded = true;
  [_memAccess, _memRefresh, _memUserId] = await Promise.all([
    AsyncStorage.getItem(KEYS.access),
    AsyncStorage.getItem(KEYS.refresh),
    AsyncStorage.getItem(KEYS.userId),
  ]);
}

export const TokenStore = {
  // Synchronous read from memory (after first load)
  getAccessSync:  () => _memAccess,
  getRefreshSync: () => _memRefresh,
  getUserIdSync:  () => _memUserId,

  // Async reads kept for compatibility — now just returns from memory
  getAccess:  async () => { await ensureLoaded(); return _memAccess; },
  getRefresh: async () => { await ensureLoaded(); return _memRefresh; },
  getUserId:  async () => { await ensureLoaded(); return _memUserId; },

  async save(access: string, refresh: string, userId: string) {
    // Update memory first — instant
    _memAccess  = access;
    _memRefresh = refresh;
    _memUserId  = userId;
    _loaded     = true;
    // Persist to disk in background — don't await
    AsyncStorage.multiSet([
      [KEYS.access,  access],
      [KEYS.refresh, refresh],
      [KEYS.userId,  userId],
    ]).catch(() => {});
  },

  async clear() {
    _memAccess  = null;
    _memRefresh = null;
    _memUserId  = null;
    _loaded     = true;
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};

// ─── Error class ──────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    message: string,
    public status:  number = 0,
    public code?:   string,
    public errors?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Fetch with timeout ───────────────────────────────────────────────────────
function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new ApiError('Request timed out.', 0, 'TIMEOUT')),
      TIMEOUT_MS,
    );
    fetch(url, options)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(() => { clearTimeout(timer); reject(new ApiError('Network error. Check your connection.', 0, 'NETWORK')); });
  });
}

// ─── Token refresh (singleton queue) ─────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function attemptRefresh(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise(resolve => refreshQueue.push(resolve));
  }
  isRefreshing = true;
  try {
    await ensureLoaded();
    const userId       = _memUserId;
    const refreshToken = _memRefresh;
    if (!userId || !refreshToken) return null;

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, refreshToken }),
    });
    if (!res.ok) return null;

    const json = await res.json();
    // Update memory immediately
    _memAccess  = json.data.accessToken;
    _memRefresh = json.data.refreshToken;
    // Persist in background
    AsyncStorage.multiSet([
      [KEYS.access,  json.data.accessToken],
      [KEYS.refresh, json.data.refreshToken],
    ]).catch(() => {});

    refreshQueue.forEach(cb => cb(json.data.accessToken));
    return json.data.accessToken;
  } catch {
    refreshQueue.forEach(cb => cb(null));
    return null;
  } finally {
    isRefreshing  = false;
    refreshQueue  = [];
  }
}

// ─── Core request ─────────────────────────────────────────────────────────────
// Only GET is retried — POST/PUT/PATCH/DELETE never retry to prevent duplicates.
const RETRYABLE_METHODS = new Set(['GET']);

async function request<T = any>(
  method:          string,
  path:            string,
  body?:           object,
  auth             = true,
  retriesAllowed   = RETRYABLE_METHODS.has(method),
): Promise<T> {
  // Ensure tokens loaded before first request
  await ensureLoaded();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && _memAccess) headers['Authorization'] = `Bearer ${_memAccess}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (retriesAllowed) return request(method, path, body, auth, false);
    throw err;
  }

  // Auto-refresh on 401
  if (res.status === 401 && auth) {
    const newToken = await attemptRefresh();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetchWithTimeout(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } else {
      await TokenStore.clear();
      throw new ApiError('Session expired. Please log in again.', 401, 'EXPIRED');
    }
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new ApiError('Invalid server response', res.status);
  }

  if (!res.ok) {
    throw new ApiError(
      data?.message ?? 'Something went wrong',
      res.status,
      data?.code,
      data?.errors,
    );
  }

  return data as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const api = {
  get:    <T>(path: string, auth = true)               => request<T>('GET',    path, undefined, auth),
  post:   <T>(path: string, body: object, auth = true) => request<T>('POST',   path, body,      auth),
  put:    <T>(path: string, body: object, auth = true) => request<T>('PUT',    path, body,      auth),
  patch:  <T>(path: string, body: object, auth = true) => request<T>('PATCH',  path, body,      auth),
  delete: <T>(path: string, auth = true)               => request<T>('DELETE', path, undefined, auth),
};

export default api;
