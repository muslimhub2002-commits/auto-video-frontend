import type { AppUser } from './auth-contract';

export type ClientSession = {
  user: AppUser;
  backendAccessToken: string;
  authProvider?: 'credentials' | 'google';
};

let cachedSession: ClientSession | null | undefined;
let cachedAt = 0;

const SESSION_CACHE_TTL_MS = 10_000;
const CLIENT_SESSION_STORAGE_KEY = 'avg.client-session';

const canUseBrowserSession = () => typeof window !== 'undefined';

function readStoredSession(): ClientSession | null {
  if (!canUseBrowserSession()) {
    return null;
  }

  const raw = window.localStorage.getItem(CLIENT_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ClientSession;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.backendAccessToken !== 'string' ||
      !parsed.user
    ) {
      window.localStorage.removeItem(CLIENT_SESSION_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(CLIENT_SESSION_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: ClientSession | null) {
  if (!canUseBrowserSession()) {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(CLIENT_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(CLIENT_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearClientSessionCache() {
  cachedSession = null;
  cachedAt = 0;
  writeStoredSession(null);
}

export function seedClientSession(session: ClientSession | null) {
  cachedSession = session;
  cachedAt = Date.now();
  writeStoredSession(session);
}

export function getCachedClientSession() {
  if (
    cachedSession !== undefined &&
    Date.now() - cachedAt < SESSION_CACHE_TTL_MS
  ) {
    return cachedSession;
  }

  const session = readStoredSession();
  cachedSession = session;
  cachedAt = Date.now();
  return session;
}

export async function getClientSession(forceRefresh = false): Promise<ClientSession | null> {
  if (!canUseBrowserSession()) {
    return null;
  }

  if (!forceRefresh) {
    return getCachedClientSession();
  }

  const session = readStoredSession();
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
  window.location.href = resolvedCallbackUrl;
}