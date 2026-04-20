'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { authService, type User } from '@/lib/auth';
import { clearClientSessionCache, seedClientSession } from '@/lib/client-session';

// Simple in-memory cache so auth is only resolved once
// per session and subsequent pages don't show a loader
// while re-fetching the same user profile.
let cachedUser: User | null = null;
let hasLoadedUser = false;

export function useAuthGuard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(cachedUser ?? session?.user ?? null);
  const [isLoading, setIsLoading] = useState(status === 'loading' || !hasLoadedUser);

  useEffect(() => {
    if (status === 'authenticated') {
      seedClientSession(session ?? null);
      if (session?.user) {
        setUser(session.user);
      }
      return;
    }

    if (status === 'unauthenticated') {
      cachedUser = null;
      hasLoadedUser = false;
      clearClientSessionCache();
      setIsLoading(false);
      router.replace('/login');
    }
  }, [router, session, status]);

  useEffect(() => {
    const loadUser = async () => {
      if (status !== 'authenticated') {
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
      } catch (error) {
        cachedUser = null;
        hasLoadedUser = false;
        clearClientSessionCache();
        await authService.logout({ redirectTo: '/login' });
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, [router, status]);

  const handleLogout = async () => {
    cachedUser = null;
    hasLoadedUser = false;
    clearClientSessionCache();
    await authService.logout({ redirectTo: '/login' });
  };

  return {
    user,
    isLoading: status === 'loading' || isLoading,
    handleLogout,
  };
}
