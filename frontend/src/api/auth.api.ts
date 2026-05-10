// src/api/auth.api.ts
import api, { TokenStore } from './client';

export type User = {
  id:          string;
  username:    string;
  phone:       string;
  full_name?:  string;
  bio?:        string;
  avatar_url?: string;
  dept?:       string;
  university?: string;
  year?:       number;
  is_premium:  boolean;
  is_tutor:    boolean;
  is_helper:   boolean;
  is_verified: boolean;
};

const AuthApi = {
  sendOtp:       (phone: string) =>
    api.post('/auth/send-otp', { phone }, false),

  verifyOtp:     (phone: string, code: string) =>
    api.post('/auth/verify-otp', { phone, code }, false),

  checkUsername: async (username: string): Promise<boolean> => {
    // Backend returns { success: true, available: bool } — available is at top level
    const res = await api.post('/auth/check-username', { username }, false) as any;
    return res.available === true;
  },

  signup: async (params: { username: string; phone: string; password: string }) => {
    type Envelope = { success: boolean; data: { user: User; accessToken: string; refreshToken: string } };
    const res = await api.post<Envelope>('/auth/signup', params, false);
    if (!res.data) throw new Error('Signup failed');
    await TokenStore.save(res.data.accessToken, res.data.refreshToken, res.data.user.id);
    return res.data;
  },

  login: async (params: { identifier: string; password: string }) => {
    type Envelope = { success: boolean; data: { user: User; accessToken: string; refreshToken: string } };
    const res = await api.post<Envelope>('/auth/login', params, false);
    if (!res.data) throw new Error('Login failed');
    await TokenStore.save(res.data.accessToken, res.data.refreshToken, res.data.user.id);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    // Server returns { success: true, data: User } — unwrap to the User.
    const res = await api.get<{ success: boolean; data: User }>('/auth/me');
    return res.data;
  },

  resetPassword: (phone: string, password: string) =>
    api.post('/auth/reset-password', { phone, password }, false),

  logout: async () => {
    try { await api.post('/auth/logout', {}); } catch (_) {}
    await TokenStore.clear();
  },
};

export default AuthApi;