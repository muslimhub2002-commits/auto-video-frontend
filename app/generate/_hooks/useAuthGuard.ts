'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, type User } from '@/lib/auth';
import {
  clearClientSessionCache,
  getCachedClientSession,
  getClientSession,
  seedClientSession,
} from '@/lib/client-session';

// Simple in-memory cache so auth is only resolved once
// per session and subsequent pages don't show a loader
// while re-fetching the same user profile.
let cachedUser: User | null = null;
let hasLoadedUser = false;

export function useAuthGuard() {
  const router = useRouter();
  const initialSession = getCachedClientSession();
  const [user, setUser] = useState<User | null>(cachedUser ?? initialSession?.user ?? null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>(
    initialSession?.backendAccessToken ? 'authenticated' : 'loading',
  );
  const [isLoading, setIsLoading] = useState(!hasLoadedUser);

  useEffect(() => {
    const resolveSession = async () => {
      const session = await getClientSession();
      if (session?.backendAccessToken && session.user) {
        seedClientSession(session);
        setUser(session.user);
        setAuthStatus('authenticated');
        return;
      }

      cachedUser = null;
      hasLoadedUser = false;
      clearClientSessionCache();
      setAuthStatus('unauthenticated');
      setIsLoading(false);
      router.replace('/login');
    };

    if (authStatus === 'loading') {
      void resolveSession();
    }
  }, [authStatus, router]);

  useEffect(() => {
    const loadUser = async () => {
      if (authStatus !== 'authenticated') {
        return;
      }

      // If we've already loaded the user once in this
      // session, just reuse it and avoid showing loader
      // or re-calling the profile endpoint on each page.
      if (hasLoadedUser && cachedUser) {
        setUser(cachedUser);
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authService.getProfile();
        cachedUser = userData;
        hasLoadedUser = true;
        setUser(userData);
        const session = await getClientSession();
        if (session?.backendAccessToken) {
          seedClientSession({
            ...session,
            user: userData,
          });
        }
      } catch {
        cachedUser = null;
        hasLoadedUser = false;
        clearClientSessionCache();
        await authService.logout({ redirectTo: '/login' });
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, [authStatus]);

  const handleLogout = async () => {
    cachedUser = null;
    hasLoadedUser = false;
    clearClientSessionCache();
    await authService.logout({ redirectTo: '/login' });
  };

  return {
    user,
    isLoading: authStatus === 'loading' || isLoading,
    handleLogout,
  };
}
