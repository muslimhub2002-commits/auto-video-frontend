'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, type User } from '@/lib/auth';

// Simple in-memory cache so auth is only resolved once
// per session and subsequent pages don't show a loader
// while re-fetching the same user profile.
let cachedUser: User | null = null;
let hasLoadedUser = false;

export function useAuthGuard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(cachedUser);
  const [isLoading, setIsLoading] = useState(!hasLoadedUser);

  useEffect(() => {
    const loadUser = async () => {
      // If we've already loaded the user once in this
      // session, just reuse it and avoid showing loader
      // or re-calling the profile endpoint on each page.
      if (hasLoadedUser && cachedUser) {
        setUser(cachedUser);
        setIsLoading(false);
        return;
      }

      if (!authService.isAuthenticated()) {
        router.push('/login');
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
        authService.logout();
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const handleLogout = () => {
    authService.logout();
    cachedUser = null;
    hasLoadedUser = false;
    router.push('/login');
  };

  return { user, isLoading, handleLogout };
}
