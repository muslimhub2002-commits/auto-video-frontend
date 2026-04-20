import NextAuth, { CredentialsSignin, type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { API_URL } from '@/lib/api-config';
import type { AuthResponse } from '@/lib/auth-contract';
import { loginSchema } from '@/lib/validations/auth';

const googleClientId = (process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? '').trim();
const googleClientSecret =
  (process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? '').trim();

class InvalidLoginError extends CredentialsSignin {
  code = 'Invalid email or password';
}

const extractMessage = (message: unknown): string | null => {
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  if (Array.isArray(message)) {
    const combined = message
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .join(', ')
      .trim();

    return combined || null;
  }

  return null;
};

const readAuthResponse = async (response: Response, fallback: string) => {
  if (!response.ok) {
    let message = fallback;

    try {
      const contentType = String(response.headers.get('content-type') ?? '').toLowerCase();
      if (contentType.includes('application/json')) {
        const data = (await response.json()) as { message?: unknown };
        message = extractMessage(data?.message) ?? fallback;
      } else {
        const text = (await response.text()).trim();
        if (text) {
          message = text;
        }
      }
    } catch {
      // Ignore parser errors and keep the fallback.
    }

    throw new Error(message);
  }

  return (await response.json()) as AuthResponse;
};

const credentialsToAuthUser = (response: AuthResponse) => ({
  id: response.user.id,
  email: response.user.email,
  appUser: response.user,
  backendAccessToken: response.access_token,
  authProvider: 'credentials' as const,
});

async function loginWithCredentials(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({ email, password }),
  });

  return readAuthResponse(response, 'Invalid email or password');
}

async function exchangeGoogleIdToken(idToken: string) {
  const response = await fetch(`${API_URL}/auth/google/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({ idToken }),
  });

  return readAuthResponse(response, 'Google sign-in failed');
}

const providers: NonNullable<NextAuthConfig['providers']> = [
  Credentials({
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(rawCredentials) {
      const parsed = loginSchema.safeParse({
        email: rawCredentials?.email,
        password: rawCredentials?.password,
      });

      if (!parsed.success) {
        throw new InvalidLoginError();
      }

      try {
        const authResponse = await loginWithCredentials(
          parsed.data.email,
          parsed.data.password,
        );
        return credentialsToAuthUser(authResponse);
      } catch (error) {
        const message = error instanceof Error ? error.message.trim() : '';
        const authError = new InvalidLoginError();
        if (message) {
          authError.code = message;
        }
        throw authError;
      }
    },
  }),
];

if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'google') {
        const isVerifiedEmail = Boolean(
          profile && 'email_verified' in profile && profile.email_verified,
        );
        const hasEmail = Boolean(profile && typeof profile.email === 'string' && profile.email);
        return isVerifiedEmail && hasEmail;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.appUser && user.backendAccessToken) {
        token.appUser = user.appUser;
        token.backendAccessToken = user.backendAccessToken;
        token.authProvider = user.authProvider ?? 'credentials';
        token.sub = user.appUser.id;
        token.email = user.appUser.email;
        token.name = user.appUser.email;
      }

      if (account?.provider === 'google' && typeof account.id_token === 'string') {
        const authResponse = await exchangeGoogleIdToken(account.id_token);
        token.appUser = authResponse.user;
        token.backendAccessToken = authResponse.access_token;
        token.authProvider = 'google';
        token.sub = authResponse.user.id;
        token.email = authResponse.user.email;
        token.name = authResponse.user.email;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.appUser) {
        session.user = {
          ...session.user,
          ...token.appUser,
          name: session.user?.name ?? token.appUser.email,
          image: session.user?.image ?? null,
          emailVerified: null,
        };
      }

      if (typeof token.backendAccessToken === 'string') {
        session.backendAccessToken = token.backendAccessToken;
      }

      if (token.authProvider === 'credentials' || token.authProvider === 'google') {
        session.authProvider = token.authProvider;
      }

      return session;
    },
    authorized({ auth: authContext }) {
      return !!authContext?.user;
    },
  },
});