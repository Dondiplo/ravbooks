'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, DEMO_MODE } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'STAFF';
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isAccountant: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (DEMO_MODE) {
      const stored = sessionStorage.getItem('demo_user');
      if (stored) setUser(JSON.parse(stored));
      setIsLoading(false);
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await authApi.me();
      setUser(data);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    if (DEMO_MODE) {
      sessionStorage.setItem('demo_user', JSON.stringify(data.user));
    } else {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    setUser(data.user);
  };

  const logout = () => {
    if (DEMO_MODE) {
      sessionStorage.removeItem('demo_user');
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAdmin: user?.role === 'ADMIN',
        isAccountant: user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
