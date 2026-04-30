// src/api/client.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform }  from 'react-native';

// ─── Base URL ─────────────────────────────────────────────────────────────────
const LOCAL_IP = '10.135.133.238'; // ← your PC IP
const BASE_URL = __DEV__
  ? `http://${LOCAL_IP}:3000/api`
  : 'https://api.qaaf.app/api';

// ─── Config ───────────────────────────────────────────────────────────────────
const TIMEOUT_MS   = 10_000; // 10 seconds
const MAX_RETRIES  = 1;      // retry once on network error

// ─── Token store ──────────────────────────────────────────────────────────────
const KEYS = {
  access:  'qaaf:access_token',
  refresh: 'qaaf:refresh_token',
  userId:  'qaaf:user_id',
};

export const TokenStore = {
  getAccess:   () => AsyncStorage.getItem(KEYS.access),
  getRefresh:  () => AsyncStorage.getItem(KEYS.refresh),
  getUserId:   () => AsyncStorage.getItem(KEYS.userId),

  async save(access: string, refresh: string, userId: string) {
    await AsyncStorage.multiSet([
      [KEYS.access,  access],
      [KEYS.refresh, refresh],
      [KEYS.userId,  userId],
    ]);
  },

  async clear() {
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
      () => reject(new ApiError('Request timed out. Check your connection.', 0, 'TIMEOUT')),
      TIMEOUT_MS
    );
    fetch(url, options)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(new ApiError('Network error. Check your connection.', 0, 'NETWORK')); });
  });
}

// ─── Token refresh ────────────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function attemptRefresh(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise(resolve => refreshQueue.push(resolve));
  }
  isRefreshing = true;
  try {
    const [userId, refreshToken] = await Promise.all([
      TokenStore.getUserId(),
      TokenStore.getRefresh(),
    ]);
    if (!userId || !refreshToken) return null;

    const res  = await fetch(`${BASE_URL}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, refreshToken }),
    });
    if (!res.ok) return null;

    const json = await res.json();
    await AsyncStorage.setItem(KEYS.access,  json.data.accessToken);
    await AsyncStorage.setItem(KEYS.refresh, json.data.refreshToken);

    refreshQueue.forEach(cb => cb(json.data.accessToken));
    return json.data.accessToken;
  } catch {
    refreshQueue.forEach(cb => cb(null));
    return null;
  } finally {
    isRefreshing = false;
    refreshQueue = [];
  }
}

// ─── Core request ─────────────────────────────────────────────────────────────
async function request<T = any>(
  method:  string,
  path:    string,
  body?:   object,
  auth     = true,
  retries  = MAX_RETRIES,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await TokenStore.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // Retry on network errors
    if (retries > 0) return request(method, path, body, auth, retries - 1);
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

  // Parse response
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