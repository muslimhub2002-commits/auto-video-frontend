import { youtubeApi } from './api';

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as {
      response?: { data?: { message?: unknown } };
    }).response;
    const message = response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    if (Array.isArray(message)) {
      const first = message.find(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      );
      if (first) {
        return first;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export async function startYoutubeReconnect(socialAccountId?: string | null) {
  const response = await youtubeApi.get<{ url?: string }>('/youtube/auth-url', {
    params: socialAccountId ? { socialAccountId } : undefined,
  });
  const url = String(response.data?.url ?? '').trim();

  if (!url) {
    throw new Error('Missing YouTube auth url');
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}