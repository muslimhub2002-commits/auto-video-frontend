import { API_URL } from './api-config';
import { getBackendAccessToken } from './client-session';

export type CloudinaryResourceType = 'image' | 'video' | 'audio';

export type ManagedUploadProviderName =
  | 'cloudinary'
  | 'uploadcare'
  | 'filestack'
  | 'smash';

export type CloudinaryUploadOptions = {
  resourceType: CloudinaryResourceType;
  folder: string;
  excludedProviders?: ManagedUploadProviderName[];
};

export type EnsurePublicUrlOptions = {
  resourceType: CloudinaryResourceType;
  folder: string;
  filename?: string;
  excludedProviders?: ManagedUploadProviderName[];
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MANAGED_UPLOAD_URL_REGEX =
  /^(https?:\/\/)?(res\.cloudinary\.com|(?:[a-z0-9-]+\.)?ucarecdn\.com|(?:[a-z0-9-]+\.)?ucarecd\.net|cdn\.filestackcontent\.com|(?:[a-z0-9-]+\.)?fromsmash\.com)\//i;

const getAuthHeaders = async (contentType?: string) => {
  const headers = new Headers({
    Accept: 'application/json',
  });

  const token = await getBackendAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  return headers;
};

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

const readErrorMessageFromResponse = async (
  response: Response,
  fallback: string,
) => {
  try {
    const contentType = String(response.headers.get('content-type') ?? '').toLowerCase();

    if (contentType.includes('application/json')) {
      const data = (await response.json()) as { message?: unknown };
      const message = extractMessage(data?.message);
      if (message) {
        return `${fallback} (${response.status}): ${message}`;
      }
    } else {
      const text = (await response.text()).trim();
      if (text) {
        return `${fallback} (${response.status}): ${text}`;
      }
    }
  } catch {
    // Ignore parser errors and fall back to status text.
  }

  return `${fallback} (${response.status}): ${response.statusText || 'Request failed'}`;
};

export function isManagedUploadUrl(url: string): boolean {
  return MANAGED_UPLOAD_URL_REGEX.test(String(url ?? '').trim());
}

const needsManagedUrlNormalization = (url: string): boolean => {
  try {
    const parsed = new URL(String(url ?? '').trim());
    const host = parsed.hostname.toLowerCase();
    if (host !== 'ucarecdn.com' && !host.endsWith('.ucarecdn.com')) {
      return false;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments.length === 1 && UUID_REGEX.test(segments[0]);
  } catch {
    return false;
  }
};

export async function uploadManagedFile(
  file: File,
  options: CloudinaryUploadOptions,
): Promise<string> {
  const form = new FormData();
  form.append('file', file, file.name);
  form.append('folder', options.folder);
  form.append('resourceType', options.resourceType);
  if (options.excludedProviders?.length) {
    form.append('excludedProviders', options.excludedProviders.join(','));
  }

  const response = await fetch(`${API_URL}/uploads/file`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: form,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessageFromResponse(response, 'Managed upload failed'),
    );
  }

  const data = (await response.json()) as { url?: string };
  const url = String(data?.url ?? '').trim();
  if (!url) {
    throw new Error('Managed upload failed: missing url');
  }

  return url;
}

export async function ensureManagedPublicUrl(
  url: string,
  options: EnsurePublicUrlOptions,
): Promise<string> {
  const trimmedUrl = String(url ?? '').trim();
  if (!trimmedUrl) {
    throw new Error('Missing public URL input');
  }

  if (isManagedUploadUrl(trimmedUrl) && !needsManagedUrlNormalization(trimmedUrl)) {
    return trimmedUrl;
  }

  const response = await fetch(`${API_URL}/uploads/ensure-public-url`, {
    method: 'POST',
    headers: await getAuthHeaders('application/json'),
    credentials: 'include',
    body: JSON.stringify({
      url: trimmedUrl,
      folder: options.folder,
      resourceType: options.resourceType,
      ...(options.filename ? { filename: options.filename } : {}),
      ...(options.excludedProviders?.length
        ? { excludedProviders: options.excludedProviders.join(',') }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessageFromResponse(response, 'Failed to prepare public URL'),
    );
  }

  const data = (await response.json()) as { url?: string };
  const preparedUrl = String(data?.url ?? '').trim();
  if (!preparedUrl) {
    throw new Error('Failed to prepare public URL: missing url');
  }

  return preparedUrl;
}

export const uploadToCloudinaryUnsigned = uploadManagedFile;

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await mapper(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}
