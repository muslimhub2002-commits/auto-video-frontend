export const SHORT_FORM_MAX_SECONDS = 3 * 60;

export type VideoFormatKind = 'short' | 'long' | 'unknown';

export function formatVideoDuration(seconds?: number | null): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return 'Unknown';
  }

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`;
}

export function isShortVideoDuration(seconds?: number | null): boolean | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return seconds < SHORT_FORM_MAX_SECONDS;
}

export function getVideoFormatKind(seconds?: number | null): VideoFormatKind {
  const isShort = isShortVideoDuration(seconds);
  if (isShort === null) {
    return 'unknown';
  }

  return isShort ? 'short' : 'long';
}

export function getVideoFormatLabel(seconds?: number | null): string {
  const kind = getVideoFormatKind(seconds);

  switch (kind) {
    case 'short':
      return 'Short';
    case 'long':
      return 'Long';
    default:
      return 'Unknown';
  }
}

export async function getVideoDurationSeconds(
  url: string,
  timeoutMs = 20_000,
): Promise<number | null> {
  if (typeof document === 'undefined') {
    return null;
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    let finished = false;

    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
    };

    const complete = (value: number | null, error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      cleanup();

      if (error) {
        reject(error);
        return;
      }

      resolve(value);
    };

    const timeout = window.setTimeout(() => {
      complete(null, new Error('Timed out while reading the video duration.'));
    }, timeoutMs);

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number(video.duration);
      complete(Number.isFinite(duration) && duration > 0 ? duration : null);
    };
    video.onerror = () => {
      complete(null, new Error('Failed to read the video duration.'));
    };
    video.src = url;
  });
}