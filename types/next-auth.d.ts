import type { AppUser } from '@/lib/auth-contract';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: AppUser;
    backendAccessToken?: string;
    authProvider?: 'credentials' | 'google';
  }

  interface User {
    appUser?: AppUser;
    backendAccessToken?: string;
    authProvider?: 'credentials' | 'google';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    appUser?: AppUser;
    backendAccessToken?: string;
    authProvider?: 'credentials' | 'google';
  }
}