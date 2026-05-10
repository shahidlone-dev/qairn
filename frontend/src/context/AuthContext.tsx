// src/context/AuthContext.tsx
//
// On startup we call TokenStore.getAccess() once. That method awaits
// ensureLoaded() internally, which performs the single disk read into
// the in-memory cache. After this first await, every subsequent API
// request reads the token synchronously from memory.

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
  const [user,       setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // First await populates the in-memory token cache from AsyncStorage.
        // After this point, all API calls read the token synchronously.
        const token = await TokenStore.getAccess();
        if (!token) return;

        // Show cached user immediately while we re-validate in background
        const cached = await AsyncStorage.getItem(USER_KEY);
        if (cached) setUserState(JSON.parse(cached));

        // Re-validate session with backend
        const fetchedUser = await AuthApi.getMe();
        if (fetchedUser?.id) {
          setUserState(fetchedUser);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(fetchedUser));
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
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