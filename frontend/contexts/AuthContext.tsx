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

  // Run ONCE on mount only — pathname must NOT be a dependency here.
  // Including pathname causes initializeAuth to re-run on every navigation,
  // which triggers a fresh /auth/me call and can race-condition the user back to /login.
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.success && res.data) {
            const currentToken = localStorage.getItem('token') || storedToken;
            setToken(currentToken);
            setUser(res.data);
          } else {
            throw new Error('Token invalid');
          }
        } catch {
          // Token is stale — clear it NOW so the login page starts fresh
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setToken(null);
          setUser(null);
          if (window.location.pathname !== '/login') {
            router.push('/login');
          }
        }
      } else {
        if (window.location.pathname !== '/login') {
          router.push('/login');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = run once on mount only

  const login = async (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    try {
      const response = await api.get('/auth/me');
      if (response.success && response.data) {
        setUser(response.data);
        router.push('/dashboard');
      }
    } catch (e) {
      console.error('Failed to fetch user after login', e);
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
