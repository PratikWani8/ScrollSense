import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../api/types';
import { api } from '../api/client';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, timezone?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('scrollsense_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('scrollsense_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('scrollsense_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          localStorage.setItem('scrollsense_user', JSON.stringify(res.user));
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };
    verifyAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('scrollsense_token', res.token);
    localStorage.setItem('scrollsense_user', JSON.stringify(res.user));
  };

  const register = async (email: string, password: string, displayName: string, timezone?: string) => {
    const res = await api.register({ email, password, displayName, timezone });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('scrollsense_token', res.token);
    localStorage.setItem('scrollsense_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('scrollsense_token');
    localStorage.removeItem('scrollsense_user');
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      localStorage.setItem('scrollsense_user', JSON.stringify(res.user));
    } catch {
      // Ignored
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
