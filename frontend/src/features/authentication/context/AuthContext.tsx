'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from '@/features/authentication/types/auth.types';
import { bffFetch } from '@/lib/api/bff-client';
import { BFF_ENDPOINTS, APP_ROUTES } from '@/config/endpoints';
import { useRouter } from 'next/navigation';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isError: boolean;
  setUser: (user: User | null) => void;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: user, isLoading, isError } = useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await bffFetch<{ user: User }>(BFF_ENDPOINTS.AUTH.ME);
      if (res.ok && res.data?.user) {
        return res.data.user;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const setUser = useCallback(
    (newUser: User | null) => {
      queryClient.setQueryData(['auth', 'me'], newUser);
    },
    [queryClient]
  );

  const refreshSession = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    await bffFetch(BFF_ENDPOINTS.AUTH.LOGOUT, { method: 'POST' });
    setUser(null);
    queryClient.clear();
    router.push(APP_ROUTES.LOGIN);
    router.refresh();
  }, [queryClient, router, setUser]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isAuthenticated: !!user,
        isLoading,
        isError,
        setUser,
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
