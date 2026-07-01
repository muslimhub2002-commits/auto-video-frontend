import type { Session } from 'next-auth';

let cachedSession: Session | null | undefined;
let cachedAt = 0;

const SESSION_CACHE_TTL_MS = 10_000;

const canUseBrowserSession = () => typeof window !== 'undefined';

export function clearClientSessionCache() {
  cachedSession = undefined;
  cachedAt = 0;
}

export function seedClientSession(session: Session | null) {
  cachedSession = session;
  cachedAt = Date.now();
}

export async function getClientSession(forceRefresh = false): Promise<Session | null> {
  if (!canUseBrowserSession()) {
    return null;
  }

  if (
    !forceRefresh &&
    cachedSession !== undefined &&
    Date.now() - cachedAt < SESSION_CACHE_TTL_MS
  ) {
    return cachedSession;
  }

  const { getSession } = await import('next-auth/react');
  const session = await getSession();
  seedClientSession(session);
  return session;
}

export async function getBackendAccessToken(forceRefresh = false) {
  const session = await getClientSession(forceRefresh);
  return session?.backendAccessToken ?? null;
}

export async function getSessionUser(forceRefresh = false) {
  const session = await getClientSession(forceRefresh);
  return session?.user ?? null;
}

function resolveClientCallbackUrl(callbackUrl: string) {
  if (!canUseBrowserSession()) {
    return callbackUrl;
  }

  return new URL(callbackUrl, window.location.origin).toString();
}

export async function signOutClient(callbackUrl = '/login') {
  clearClientSessionCache();

  if (!canUseBrowserSession()) {
    return;
  }

  const resolvedCallbackUrl = resolveClientCallbackUrl(callbackUrl);
  const { signOut } = await import('next-auth/react');
  const result = await signOut({
    redirect: false,
    callbackUrl: resolvedCallbackUrl,
  });

  window.location.href = result?.url || resolvedCallbackUrl;
}