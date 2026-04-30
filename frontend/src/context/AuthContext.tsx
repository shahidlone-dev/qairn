// src/context/AuthContext.tsx
import React, {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthApi, { User } from '../api/auth.api';
import { TokenStore, ApiError } from '../api/client';

type AuthState = {
  user:       User | null;
  isLoading:  boolean;
  isLoggedIn: boolean;
  setUser:    (user: User) => void;
  logout:     () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user:       null,
  isLoading:  true,
  isLoggedIn: false,
  setUser:    () => {},
  logout:     async () => {},
});

const USER_KEY = 'qaaf:user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user,      setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session on app start ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = await TokenStore.getAccess();
        if (!token) return;

        // Show cached user immediately
        const cached = await AsyncStorage.getItem(USER_KEY);
        if (cached) setUserState(JSON.parse(cached));

        // Refresh from backend in background
        const res = await AuthApi.getMe();
        if (res.data) {
          setUserState(res.data);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data));
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Token expired and refresh failed — clear session
          await TokenStore.clear();
          await AsyncStorage.removeItem(USER_KEY);
          setUserState(null);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setUser = useCallback(async (newUser: User) => {
    setUserState(newUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  const logout = useCallback(async () => {
    await AuthApi.logout();
    setUserState(null);
    await AsyncStorage.removeItem(USER_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isLoggedIn: !!user,
      setUser,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);