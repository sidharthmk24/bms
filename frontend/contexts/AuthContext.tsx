"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  primaryRole: string;
  role: string; // alias for primaryRole for backward compatibility in some places
  originalRoles?: string[];
  originalPrimaryRole?: string;
  originalRole?: string; // alias for backward compatibility
  branchId?: string | null;
  branch?: {
    id: string;
    name: string;
    code: string;
    type: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  impersonate: (role: string, branchId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  impersonate: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        try {
          // Verify token by fetching current user
          const response = await api.get('/auth/me');
          if (response.success && response.data) {
            setUser(response.data);
          } else {
            throw new Error('Failed to fetch user');
          }
        } catch (error) {
          console.error('Auth initialization failed', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      } else {
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [router, pathname]);

  const login = async (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    const response = await api.get('/auth/me');
    if (response.success && response.data) {
      setUser(response.data);
      router.push('/dashboard');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      router.push('/login');
    }
  };

  const impersonate = async (role: string, branchId?: string) => {
    try {
      const response = await api.post('/auth/impersonate', { role, branchId });
      if (response.success && response.data) {
        localStorage.setItem('token', response.data.accessToken);
        setToken(response.data.accessToken);
        setUser(response.data.user);
        
        let dashboardUrl = '/dashboard';
        switch (role) {
          case 'SUPER_ADMIN': dashboardUrl = '/dashboard/super-admin'; break;
          case 'ADMIN': dashboardUrl = '/dashboard/admin'; break;
          case 'CENTRAL_INVENTORY_MANAGER': dashboardUrl = '/dashboard/central-inventory'; break;
          case 'FINANCE': dashboardUrl = '/dashboard/finance'; break;
          case 'BRANCH_MANAGER': dashboardUrl = '/dashboard/branch-manager'; break;
          case 'BRANCH_INVENTORY': dashboardUrl = '/dashboard/branch-inventory'; break;
          case 'BRANCH_FRONT_OFFICE': dashboardUrl = '/dashboard/branch-front-office'; break;
        }

        router.push(dashboardUrl);
        // Force reload to completely refresh SSE connections and state
        setTimeout(() => window.location.href = dashboardUrl, 100);
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to impersonate role');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, impersonate }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
