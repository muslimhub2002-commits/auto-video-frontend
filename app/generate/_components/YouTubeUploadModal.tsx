'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { uploadToCloudinaryUnsigned } from '@/lib/cloudinary';
import { LlmModelSelect } from './LlmModelSelect';

interface YouTubeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  isShortVideo: boolean;
  scriptId: string | null;
  script: string;
  scriptCharacters: Array<{
    key: string;
    name: string;
    description: string;
    isSahaba: boolean;
    isProphet: boolean;
    isWoman: boolean;
  }>;
}

export function YouTubeUploadModal({
  isOpen,
  onClose,
  videoUrl,
  isShortVideo,
  scriptId,
  script,
  scriptCharacters,
}: YouTubeUploadModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  // YouTube endpoints may be hosted on a different backend than rendering.
  // Use a dedicated env override so we don't accidentally point YouTube calls
  // at the render backend (NEXT_PUBLIC_API_URL).
  const YOUTUBE_API_URL =
    process.env.NEXT_PUBLIC_YOUTUBE_API_URL ||
    'https://auto-video-backend.vercel.app';

  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeDescription, setYoutubeDescription] = useState('');
  const [youtubeTags, setYoutubeTags] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState<
    'public' | 'unlisted' | 'private'
  >('public');
  const [categoryId, setCategoryId] = useState<string>('24');
  const [selfDeclaredMadeForKids, setSelfDeclaredMadeForKids] = useState<boolean>(false);
  const [publicStatsViewable, setPublicStatsViewable] = useState<boolean>(true);
  const [isUploadingToYouTube, setIsUploadingToYouTube] = useState(false);
  const [cloudinaryStage, setCloudinaryStage] = useState<
    'idle' | 'downloading' | 'uploading'
  >('idle');
  const [cloudinaryCachedForVideoUrl, setCloudinaryCachedForVideoUrl] =
    useState<string | null>(null);
  const [cloudinaryCachedUrl, setCloudinaryCachedUrl] = useState<string | null>(null);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedYoutubeUrl, setUploadedYoutubeUrl] = useState<string | null>(null);
  const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);
  const [enableScheduling, setEnableScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledHour, setScheduledHour] = useState('12');
  const [useWebSearchForSeo, setUseWebSearchForSeo] = useState(false);

  // Wallpaper generation (only for non-shorts)
  const [wallpaperPromptModel, setWallpaperPromptModel] = useState('claude-sonnet-4-5');
  const [wallpaperImageStyle, setWallpaperImageStyle] = useState<string>('cinematic');
  const [wallpaperImageModel, setWallpaperImageModel] = useState('leonardo');
  const [isGeneratingWallpaper, setIsGeneratingWallpaper] = useState(false);
  const [wallpaperError, setWallpaperError] = useState<string | null>(null);
  const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);
  const [wallpaperUploadError, setWallpaperUploadError] = useState<string | null>(null);
  const [wallpaperUploadedUrl, setWallpaperUploadedUrl] = useState<string | null>(null);
  const [wallpaperLocalFileName, setWallpaperLocalFileName] = useState<string | null>(null);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [wallpaperHeadline, setWallpaperHeadline] = useState<string | null>(null);
  const [wallpaperSafeCharacters, setWallpaperSafeCharacters] = useState<
    Array<{ key: string; name: string; description: string }>
  >([]);
  const [wallpaperUsedCharacterKeys, setWallpaperUsedCharacterKeys] = useState<string[]>([]);

  const WALLPAPER_STYLE_PRESETS = [
    {
      key: 'anime',
      label: 'Anime',
      style: 'Anime style, detailed, vibrant, high quality',
    },
    {
      key: 'realism',
      label: 'Realism',
      style: 'Photorealistic, ultra-detailed, natural lighting, high quality',
    },
    {
      key: 'cinematic',
      label: 'Cinematic',
      style: 'Cinematic film still, dramatic lighting, shallow depth of field, ultra-detailed',
    },
    {
      key: '3d',
      label: '3D Render',
      style: '3D render, high detail, global illumination, physically based rendering, high quality',
    },
    {
      key: 'watercolor',
      label: 'Watercolor',
      style: 'Watercolor illustration, soft washes, textured paper, high quality',
    },
    {
      key: 'classical oil-painting',
      label: 'Classical oil-painting',
      style: 'Classical oil painting, rich brushwork, museum-quality, high detail, dramatic composition',
    },
  ] as const;

  const wallpaperFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleGenerateWallpaper = async () => {
    setWallpaperError(null);
    setWallpaperUploadError(null);
    setWallpaperUploadedUrl(null);
    setWallpaperUrl(null);
    setWallpaperHeadline(null);
    setWallpaperSafeCharacters([]);
    setWallpaperUsedCharacterKeys([]);

    const trimmedScript = (script || '').trim();
    if (!trimmedScript) {
      setWallpaperError('No script available. Generate or paste a script first.');
      return;
    }

    setIsGeneratingWallpaper(true);
    try {
      const stylePreset =
        WALLPAPER_STYLE_PRESETS.find((s) => s.key === wallpaperImageStyle) ||
        WALLPAPER_STYLE_PRESETS[0];

      const res = await api.post('/ai/youtube-wallpaper', {
        script: trimmedScript,
        title: (youtubeTitle || '').trim() || undefined,
        promptModel: wallpaperPromptModel,
        imageModel: wallpaperImageModel,
        style: stylePreset.style,
        characters: Array.isArray(scriptCharacters) ? scriptCharacters : [],
      });

      const data = res.data as {
        headline?: string;
        usedCharacterKeys?: string[];
        safeCharacters?: Array<{ key: string; name: string; description: string }>;
        prompt?: string;
        imageBase64?: string;
        imageUrl?: string;
      };

      const nextUrl =
        (data?.imageUrl && String(data.imageUrl)) ||
        (data?.imageBase64
          ? `data:image/png;base64,${data.imageBase64}`
          : null);

      if (!nextUrl) {
        throw new Error('Wallpaper generated, but no image URL was returned.');
      }

      setWallpaperUrl(nextUrl);
      if (typeof data?.headline === 'string' && data.headline.trim()) {
        setWallpaperHeadline(data.headline.trim());
      }
      if (Array.isArray(data?.safeCharacters)) {
        setWallpaperSafeCharacters(
          data.safeCharacters
            .map((c) => ({
              key: String(c?.key ?? '').trim(),
              name: String(c?.name ?? '').trim(),
              description: String(c?.description ?? '').trim(),
            }))
            .filter((c) => c.key && c.name && c.description),
        );
      }
      if (Array.isArray(data?.usedCharacterKeys)) {
        setWallpaperUsedCharacterKeys(
          data.usedCharacterKeys
            .map((k) => String(k ?? '').trim())
            .filter(Boolean),
        );
      }
    } catch (err: unknown) {
      const messageFromApi = (() => {
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const response = (err as { response?: { data?: { message?: unknown } } }).response;
          const message = response?.data?.message;
          if (typeof message === 'string' && message.trim()) return message;
        }
        if (err instanceof Error && err.message.trim()) return err.message;
        return null;
      })();
      setWallpaperError(messageFromApi ?? 'Failed to generate wallpaper. Please try again.');
    } finally {
      setIsGeneratingWallpaper(false);
    }
  };

  const handleUploadWallpaper = async (file: File) => {
    setWallpaperUploadError(null);
    setWallpaperError(null);
    setWallpaperLocalFileName(file.name || null);

    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setWallpaperUploadError('Wallpaper image is too large. Please use an image under 15MB.');
      return;
    }

    if (!file.type?.startsWith('image/')) {
      setWallpaperUploadError('Please select a valid image file (PNG/JPG/WebP).');
      return;
    }

    setIsUploadingWallpaper(true);
    try {
      const url = await uploadToCloudinaryUnsigned(file, {
        resourceType: 'image',
        folder: 'auto-video-generator/wallpapers',
      });

      setWallpaperUrl(url);
      setWallpaperUploadedUrl(url);
      setWallpaperHeadline(null);
      setWallpaperSafeCharacters([]);
      setWallpaperUsedCharacterKeys([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      setWallpaperUploadError(message || 'Failed to upload wallpaper. Please try again.');
    } finally {
      setIsUploadingWallpaper(false);
    }
  };

  const handleWallpaperFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    // Allow selecting the same file twice.
    e.target.value = '';
    if (!file) return;

    await handleUploadWallpaper(file);
  };

  const getCairoTodayISODate = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
  };

  const getTimeZoneOffsetMinutes = (timeZone: string, date: Date) => {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });

    const parts = dtf.formatToParts(date);
    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value);
    const second = Number(parts.find((p) => p.type === 'second')?.value);

    // Interpret the formatted wall-clock time as if it were UTC, then compare.
    const asUTC = Date.UTC(year, month - 1, day, hour, minute, second);
    return (asUTC - date.getTime()) / 60000;
  };

  const toRFC3339InCairo = (dateISO: string, hour24: number) => {
    const [yStr, mStr, dStr] = dateISO.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);

    // Start with a naive guess, then adjust using Cairo's offset (handles DST).
    const utcGuess = new Date(Date.UTC(y, m - 1, d, hour24, 0, 0));
    let offsetMin = getTimeZoneOffsetMinutes('Africa/Cairo', utcGuess);
    let utcInstant = new Date(utcGuess.getTime() - offsetMin * 60_000);

    // One more pass in case DST boundary changes the offset.
    offsetMin = getTimeZoneOffsetMinutes('Africa/Cairo', utcInstant);
    utcInstant = new Date(utcGuess.getTime() - offsetMin * 60_000);

    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const offH = String(Math.floor(abs / 60)).padStart(2, '0');
    const offM = String(abs % 60).padStart(2, '0');

    const hh = String(hour24).padStart(2, '0');
    return {
      publishAt: `${dateISO}T${hh}:00:00${sign}${offH}:${offM}`,
      publishAtMs: utcInstant.getTime(),
    };
  };

  const parseTagsPreserveOrder = (raw: string): string[] => {
    return (raw || '')
      // Support both comma-separated and newline-separated tags.
      .split(/[\n,]+/g)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  };

  const isCloudinaryUrl = (url: string) => {
    return /^(https?:\/\/)?res\.cloudinary\.com\//i.test(url || '');
  };

  const getFileNameFromUrl = (urlString: string): string => {
    try {
      const u = new URL(urlString);
      const last = (u.pathname.split('/').pop() || '').trim();
      if (last && /\.(mp4|mov|webm|mkv)$/i.test(last)) return last;
    } catch {
      // ignore
    }
    return 'video.mp4';
  };

  const fetchWithTimeout = async (url: string, timeoutMs: number) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };

  const downloadVideoAsFile = async (url: string, timeoutMs: number): Promise<File> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        // Avoid any caching weirdness when repeatedly retrying the same local URL.
        cache: 'no-store',
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `Failed to download video before Cloudinary upload (${res.status}): ${text || res.statusText}`,
        );
      }

      const contentType = res.headers.get('content-type') || 'video/mp4';
      const contentLengthHeader = res.headers.get('content-length');
      const expectedLength = contentLengthHeader ? Number(contentLengthHeader) : null;

      const fileName = getFileNameFromUrl(url);

      // Prefer streaming so we can detect stalled connections.
      const body = res.body;
      if (body && typeof body.getReader === 'function') {
        const reader = body.getReader();
        const chunks: ArrayBuffer[] = [];
        let received = 0;

        while (true) {
          // If the server stops sending bytes (but keeps the connection open), abort.
          const stallMs = 60_000;
          let stallTimer: ReturnType<typeof setTimeout> | null = null;
          const { done, value } = await Promise.race([
            reader.read(),
            new Promise<never>((_, reject) => {
              stallTimer = setTimeout(() => {
                controller.abort();
                reject(
                  new Error(
                    'Video download stalled (no progress for 60s). This can happen if the backend /static server keeps the connection open without finishing the MP4 response.',
                  ),
                );
              }, stallMs);
            }),
          ]).finally(() => {
            if (stallTimer) clearTimeout(stallTimer);
          });
          if (done) break;
          if (value) {
            // Convert to a real ArrayBuffer slice so it matches BlobPart types reliably.
            const ab = value.buffer.slice(
              value.byteOffset,
              value.byteOffset + value.byteLength,
            );
            chunks.push(ab);
            received += value.byteLength;
          }
        }

        if (received === 0) {
          throw new Error(
            'Downloaded video is empty (0 bytes). This usually means the server closed the connection early or the static route is misconfigured.',
          );
        }

        if (expectedLength && Number.isFinite(expectedLength) && received < expectedLength) {
          throw new Error(
            `Downloaded incomplete video (${received}/${expectedLength} bytes). Try reloading and re-rendering; also confirm /static/videos responses complete in the browser.`,
          );
        }

        return new File(chunks, fileName, { type: contentType });
      }

      // Fallback: buffer whole response.
      const buffer = await res.arrayBuffer();
      if (!buffer || buffer.byteLength === 0) {
        throw new Error(
          'Downloaded video is empty (0 bytes). This usually means the server closed the connection early or the static route is misconfigured.',
        );
      }
      return new File([buffer], fileName, { type: contentType });
    } catch (err: unknown) {
      const isAbort =
        typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        (err as { name?: unknown }).name === 'AbortError';

      if (isAbort) {
        throw new Error(
          'Timed out while downloading the rendered video bytes. Large videos can take a while. Confirm the /static/videos URL stays open and downloading in the browser.',
        );
      }

      throw err;
    } finally {
      clearTimeout(timeout);
    }
  };

  const ensureYoutubePublicVideoUrl = async (inputUrl: string): Promise<string> => {
    const trimmed = String(inputUrl ?? '').trim();
    if (!trimmed) throw new Error('Missing video URL');

    // If it's already publicly reachable (Cloudinary), no extra work.
    if (isCloudinaryUrl(trimmed)) return trimmed;

    // Cache per source videoUrl so we don't re-upload on retries.
    if (cloudinaryCachedForVideoUrl === trimmed && cloudinaryCachedUrl) {
      return cloudinaryCachedUrl;
    }
    // Browser security: an HTTPS page cannot fetch an HTTP localhost URL (mixed content).
    // This commonly happens when the frontend is on Vercel (https) but rendering is local (http://127.0.0.1).
    if (
      typeof window !== 'undefined' &&
      window.location?.protocol === 'https:' &&
      /^http:\/\//i.test(trimmed)
    ) {
      try {
        const parsed = new URL(trimmed);
        const host = (parsed.hostname || '').toLowerCase();
        const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
        if (isLocal) {
          throw new Error(
            'Cannot upload this video for YouTube because the app is running on HTTPS but the rendered video URL is HTTP (localhost). Your browser blocks downloading it (mixed content). Run the frontend locally (http) or expose the local backend over HTTPS (e.g. via a tunnel) so the video URL is https.',
          );
        }
      } catch {
        // ignore URL parsing errors here; fetch will error with a useful message.
      }
    }

    setCloudinaryStage('downloading');
    try {
      let file: File;
      try {
        // End-to-end timeout (fetch + reading the full body).
        // 10 minutes is deliberate for longer renders and slower disks.
        file = await downloadVideoAsFile(trimmed, 600_000);
      } catch (err: unknown) {
        const isAbort =
          typeof err === 'object' &&
          err !== null &&
          'name' in err &&
          (err as { name?: unknown }).name === 'AbortError';

        if (isAbort) {
          throw new Error(
            'Timed out while downloading the rendered video. Make sure the backend is running and the /static/videos URL is reachable.',
          );
        }

        // This is what browsers typically throw for CORS/mixed-content/network failures.
        throw new Error(
          err instanceof Error && err.message.trim()
            ? err.message
            : 'Failed to download the rendered video from the provided URL. If the request appears in the Network tab but then fails, this is often a CORS issue on the backend /static route. Also confirm the backend is running and the URL opens in a new tab.',
        );
      }

      setCloudinaryStage('uploading');
      const cloudinaryUrl = await uploadToCloudinaryUnsigned(file, {
        resourceType: 'video',
        folder: 'auto-video-generator/youtube-uploads',
      });

      setCloudinaryCachedForVideoUrl(trimmed);
      setCloudinaryCachedUrl(cloudinaryUrl);
      return cloudinaryUrl;
    } finally {
      setCloudinaryStage('idle');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Default scheduling date to "today" in Egypt.
      if (!scheduledDate) {
        setScheduledDate(getCairoTodayISODate());
      }
      // Allow the element to mount before transitioning in
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    const timer = setTimeout(() => setIsRendered(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // Reset wallpaper preview/errors each time modal opens to avoid stale UI.
    setWallpaperError(null);
    setWallpaperUrl(null);
    setWallpaperHeadline(null);
    setWallpaperSafeCharacters([]);
    setWallpaperUsedCharacterKeys([]);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleGenerateSeo = async () => {
    setSeoError(null);
    const trimmed = (script || '').trim();
    if (!trimmed) {
      setSeoError('No script available to generate SEO metadata.');
      return;
    }

    setIsGeneratingSeo(true);
    try {
      const res = await api.post('/ai/youtube-seo', {
        script: trimmed,
        useWebSearch: useWebSearchForSeo,
        isShort: isShortVideo,
      });
      const data = res.data as { title?: string; description?: string; tags?: string[] };

      if (data?.title) setYoutubeTitle(data.title);
      if (typeof data?.description === 'string') setYoutubeDescription(data.description);
      if (Array.isArray(data?.tags)) setYoutubeTags(data.tags.join(', '));
    } catch (err: unknown) {
      const messageFromApi = (() => {
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const response = (err as { response?: { data?: { message?: unknown } } }).response;
          const message = response?.data?.message;
          if (typeof message === 'string' && message.trim()) return message;
        }
        if (err instanceof Error && err.message.trim()) return err.message;
        return null;
      })();
      setSeoError(messageFromApi ?? 'Failed to generate SEO metadata.');
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  const handleConnectYouTube = async () => {
    setUploadError(null);
    setUploadedYoutubeUrl(null);
    setIsConnectingYouTube(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${YOUTUBE_API_URL}/youtube/auth-url`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'Failed to get YouTube auth url');
      }

      const data = await response.json();
      const url = data?.url as string | undefined;
      if (!url) throw new Error('Missing YouTube auth url');

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const messageFromApi = (() => {
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const response = (err as { response?: { data?: { message?: unknown } } }).response;
          const message = response?.data?.message;
          if (typeof message === 'string' && message.trim()) return message;
        }
        if (err instanceof Error && err.message.trim()) return err.message;
        return null;
      })();
      setUploadError(messageFromApi ?? 'Failed to start YouTube connection.');
    } finally {
      setIsConnectingYouTube(false);
    }
  };

  const handleYouTubeUpload = async () => {
    setUploadError(null);
    setUploadedYoutubeUrl(null);

    if (!videoUrl) {
      setUploadError('Missing video URL. Generate the video first.');
      return;
    }

    if (!youtubeTitle.trim()) {
      setUploadError('Please enter a title for your YouTube video.');
      return;
    }

    let publishAt: string | undefined;
    if (enableScheduling) {
      const date = (scheduledDate || '').trim();
      const hour = (scheduledHour || '').trim();

      if (!date) {
        setUploadError('Please select a scheduled date.');
        return;
      }

      if (hour === '' || Number.isNaN(Number(hour))) {
        setUploadError('Please select a scheduled hour.');
        return;
      }

      const hourNum = Math.max(0, Math.min(23, Number(hour)));
      const computed = toRFC3339InCairo(date, hourNum);
      publishAt = computed.publishAt;

      const publishAtMs = computed.publishAtMs;
      if (!Number.isFinite(publishAtMs)) {
        setUploadError('Invalid scheduled date/time.');
        return;
      }

      const minMs = Date.now() + 2 * 60 * 1000;
      if (publishAtMs < minMs) {
        setUploadError('Schedule time must be at least 2 minutes in the future.');
        return;
      }
    }

    setIsUploadingToYouTube(true);
    try {
      const tags = parseTagsPreserveOrder(youtubeTags);
      tags.join(',');
      const token = localStorage.getItem('token');
      // 1) Upload the rendered video to Cloudinary first, then use that public URL
      // for YouTube upload (Vercel must be able to download it).
      const publicVideoUrl = await ensureYoutubePublicVideoUrl(videoUrl);

      // 2) Upload to YouTube using the Cloudinary URL.
      const response = await fetch(`${YOUTUBE_API_URL}/youtube/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          videoUrl: publicVideoUrl,
          title: youtubeTitle,
          description: youtubeDescription,
          tags,
          privacyStatus: enableScheduling ? 'private' : privacyStatus,
          categoryId,
          selfDeclaredMadeForKids,
          publicStatsViewable,
          scriptId: scriptId || undefined,
          scriptText: (script || '').trim() || undefined,
          ...(publishAt ? { publishAt } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Upload failed');
      }

      const data = await response.json();
      const videoId = data?.videoId as string | undefined;
      if (!videoId) throw new Error('Upload succeeded but missing videoId');

      const url =
        (typeof data?.youtubeUrl === 'string' && data.youtubeUrl.trim())
          ? String(data.youtubeUrl).trim()
          : `https://www.youtube.com/watch?v=${videoId}`;
      setUploadedYoutubeUrl(url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error: unknown) {
      const messageFromApi = (() => {
        if (typeof error === 'object' && error !== null && 'response' in error) {
          const response = (error as { response?: { data?: { message?: unknown } } }).response;
          const message = response?.data?.message;
          if (typeof message === 'string' && message.trim()) return message;
        }
        if (error instanceof Error && error.message.trim()) return error.message;
        return null;
      })();
      setUploadError(messageFromApi ?? 'Failed to upload to YouTube. Please try again.');
    } finally {
      setIsUploadingToYouTube(false);
    }
  };

  if (!isRendered) return null;

  const isBusy =
    isUploadingToYouTube ||
    cloudinaryStage !== 'idle' ||
    isConnectingYouTube ||
    isGeneratingWallpaper;

  return (
    <div
      className={`fixed inset-0 bg-linear-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-100 transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Fixed */}
        <div className="relative bg-linear-to-r from-red-600 via-red-600 to-red-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg">
                <svg
                  className="h-7 w-7 text-white drop-shadow-lg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-md">Upload to YouTube</h2>
                <p className="text-red-100 text-sm mt-0.5">Share your video with the world</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 group"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-white group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable with custom scrollbar */}
        <div className="px-8 py-8 max-h-[calc(90vh-220px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 space-y-7">
          {/* Intro Message */}
          <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex gap-3">
              <div className="shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">Ready to publish?</h4>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Complete the form below to upload your AI-generated video to YouTube. All fields marked with{' '}
                  <span className="text-red-600 font-semibold">*</span> are required.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleConnectYouTube}
                    disabled={isBusy}
                    variant="outline"
                    className="border-2 border-blue-200 hover:border-blue-300 hover:bg-white text-blue-900"
                    size="sm"
                  >
                    {isConnectingYouTube ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>Connect YouTube</>
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleGenerateSeo}
                    disabled={isGeneratingSeo || isBusy || !(script || '').trim()}
                    className="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white hover:text-white shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    size="sm"
                  >
                    {isGeneratingSeo ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating SEO...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate SEO with AI
                      </>
                    )}
                  </Button>

                  <label className="flex items-center gap-2 text-sm text-blue-900 bg-white/70 border border-blue-200 rounded-xl px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-purple-600"
                      checked={useWebSearchForSeo}
                      onChange={(e) => setUseWebSearchForSeo(e.target.checked)}
                      disabled={isGeneratingSeo || isBusy}
                    />
                    <span className="font-medium">Use web search (viral tags)</span>
                  </label>

                  {seoError && (
                    <span className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                      {seoError}
                    </span>
                  )}
                </div>

                {(uploadError || uploadedYoutubeUrl) && (
                  <div className="mt-4 space-y-2">
                    {uploadError && (
                      <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        {uploadError}
                      </div>
                    )}
                    {uploadedYoutubeUrl && (
                      <div className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                        Uploaded successfully.{' '}
                        <a className="underline font-semibold" href={uploadedYoutubeUrl} target="_blank" rel="noreferrer">
                          Open on YouTube
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title Field */}
          <div className="space-y-3">
            <Label htmlFor="youtube-title" className="text-base font-semibold text-gray-900 flex items-center gap-2">
              Video Title <span className="text-red-600">*</span>
            </Label>
            <div className="relative group">
              <Input
                id="youtube-title"
                type="text"
                placeholder="e.g., How I Built an AI Video Generator"
                value={youtubeTitle}
                onChange={(e) => setYoutubeTitle(e.target.value)}
                className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200 placeholder:text-gray-400"
                maxLength={100}
                disabled={isBusy}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 group-focus-within:text-red-600 transition-colors">
                {youtubeTitle.length}/100
              </div>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Choose a catchy title that accurately describes your video
            </p>
          </div>

          {/* Description Field */}
          <div className="space-y-3">
            <Label htmlFor="youtube-description" className="text-base font-semibold text-gray-900 flex items-center gap-2">
              Description
              <span className="text-xs font-normal text-gray-500">(Optional)</span>
            </Label>
            <div className="relative group">
              <Textarea
                id="youtube-description"
                placeholder="Tell viewers what your video is about. Include relevant keywords to help people find your content..."
                value={youtubeDescription}
                onChange={(e) => setYoutubeDescription(e.target.value)}
                className="w-full min-h-35 px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200 resize-none placeholder:text-gray-400 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                maxLength={5000}
                disabled={isBusy}
              />
              <div className="absolute right-4 bottom-3 text-xs font-medium text-gray-400 group-focus-within:text-red-600 transition-colors">
                {youtubeDescription.length}/5000
              </div>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Add timestamps, links, and relevant information
            </p>
          </div>

          {/* Tags Field */}
          <div className="space-y-3">
            <Label htmlFor="youtube-tags" className="text-base font-semibold text-gray-900 flex items-center gap-2">
              Tags
              <span className="text-xs font-normal text-gray-500">(Optional)</span>
            </Label>
            <Input
              id="youtube-tags"
              type="text"
              placeholder="AI, artificial intelligence, video generator, automation"
              value={youtubeTags}
              onChange={(e) => setYoutubeTags(e.target.value)}
              className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200 placeholder:text-gray-400"
              disabled={isBusy}
            />
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Separate multiple tags with commas
            </p>
          </div>

          {/* Wallpaper Generator (Long-form only) */}
          {!isShortVideo && (
            <div className="bg-linear-to-br from-amber-50 via-rose-50 to-purple-50 border-2 border-amber-200/70 rounded-2xl p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-gray-900">Wallpaper Generator</h4>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                    For regular (16:9) videos, generate a high-quality wallpaper image based on your script.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <LlmModelSelect
                  value={wallpaperPromptModel}
                  onValueChange={setWallpaperPromptModel}
                  label="Prompt Model"
                  disabled={isBusy}
                />

                <Select
                  value={wallpaperImageStyle}
                  onValueChange={setWallpaperImageStyle}
                  disabled={isBusy}
                >
                  <SelectTrigger label="Image Style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WALLPAPER_STYLE_PRESETS.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={wallpaperImageModel}
                  onValueChange={setWallpaperImageModel}
                  disabled={isBusy}
                >
                  <SelectTrigger label="Image Model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leonardo">Leonardo AI</SelectItem>
                    <SelectItem value="grok-imagine-image">Grok — grok-imagine-image</SelectItem>
                    <SelectItem value="gpt-image-1">OpenAI — gpt-image-1</SelectItem>
                    <SelectItem value="gpt-image-1-mini">OpenAI — gpt-image-1-mini</SelectItem>
                    <SelectItem value="gpt-image-1.5">OpenAI — gpt-image-1.5</SelectItem>
                    <SelectItem value="modelslab:flux">Flux (ModelsLab)</SelectItem>
                    <SelectItem value="modelslab:flux-2-pro">Flux 2 Pro (ModelsLab)</SelectItem>
                    <SelectItem value="imagen-4">Imagen 4</SelectItem>
                    <SelectItem value="imagen-4-ultra">Imagen 4 Ultra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <Button
                  type="button"
                  onClick={handleGenerateWallpaper}
                  disabled={isBusy || !(script || '').trim()}
                  className="h-12 md:w-auto bg-linear-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isGeneratingWallpaper ? (
                    <>
                      <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                      <span>Generating wallpaper...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2.5 h-5 w-5" />
                      <span>Generate Wallpaper</span>
                    </>
                  )}
                </Button>

                <p className="text-sm text-gray-600">
                  Uses your full script as the prompt to create a wallpaper image.
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-amber-200/60 rounded-2xl p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Upload Wallpaper
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Prefer your own design? Upload a 16:9 image and we’ll use it as the current wallpaper preview.
                    </p>
                    <p className="text-xs text-gray-600">
                      PNG/JPG/WebP. Recommended 1280×720 or higher. Max 15MB.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 md:shrink-0">
                    <input
                      ref={wallpaperFileInputRef}
                      id="wallpaper-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleWallpaperFileChange}
                      disabled={isBusy || isUploadingWallpaper}
                      className="hidden"
                    />

                    <Button
                      type="button"
                      onClick={() => wallpaperFileInputRef.current?.click()}
                      disabled={isBusy || isUploadingWallpaper}
                      className="h-12 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-xl border-2 border-amber-200/80 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      {isUploadingWallpaper ? (
                        <>
                          <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <span>Choose Image</span>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setWallpaperError(null);
                        setWallpaperUploadError(null);
                        setWallpaperUploadedUrl(null);
                        setWallpaperLocalFileName(null);
                        setWallpaperUrl(null);
                        setWallpaperHeadline(null);
                        setWallpaperSafeCharacters([]);
                        setWallpaperUsedCharacterKeys([]);
                      }}
                      disabled={isBusy || (!wallpaperUrl && !wallpaperUploadedUrl)}
                      className="h-12 rounded-xl"
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">Selected:</span>{' '}
                    {wallpaperLocalFileName ? (
                      <span className="font-medium">{wallpaperLocalFileName}</span>
                    ) : (
                      <span className="text-gray-500">No file selected</span>
                    )}
                  </div>

                  {wallpaperUploadedUrl && (
                    <div className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 w-fit">
                      Uploaded and set as current wallpaper
                    </div>
                  )}
                </div>

                {wallpaperUploadError && (
                  <div className="mt-4 text-sm text-rose-900 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    {wallpaperUploadError}
                  </div>
                )}
              </div>

              {wallpaperError && (
                <div className="text-sm text-rose-900 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  {wallpaperError}
                </div>
              )}

              {wallpaperUrl && (
                <div className="bg-white/80 backdrop-blur-sm border border-amber-200/60 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                    Wallpaper Preview
                  </p>

                  {wallpaperHeadline && (
                    <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                        Headline
                      </p>
                      <p className="text-sm font-bold text-amber-950 mt-1">
                        {wallpaperHeadline}
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
                    <img
                      src={wallpaperUrl}
                      alt="Generated wallpaper"
                      className="w-full h-auto"
                    />
                  </div>

                  {wallpaperSafeCharacters.length > 0 && (
                    <div className="mt-4 rounded-xl bg-white border border-amber-200/60 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        Safe Characters (non-Prophet / non-Sahaba / non-women)
                      </p>
                      <div className="space-y-2">
                        {wallpaperSafeCharacters.map((c) => {
                          const isUsed = wallpaperUsedCharacterKeys.includes(c.key);
                          return (
                            <div
                              key={c.key}
                              className={`rounded-lg border px-3 py-2 ${isUsed
                                ? 'border-emerald-200 bg-emerald-50'
                                : 'border-gray-200 bg-gray-50'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-gray-900">
                                  {c.key} — {c.name}
                                </p>
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isUsed
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                    }`}
                                >
                                  {isUsed ? 'Used' : 'Available'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                                {c.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">Privacy</Label>
              <Select value={privacyStatus} onValueChange={(v) => setPrivacyStatus(v as typeof privacyStatus)}>
                <SelectTrigger className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200">
                  <SelectValue placeholder="Select privacy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all duration-200">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">Entertainment</SelectItem>
                  <SelectItem value="22">People & Blogs</SelectItem>
                  <SelectItem value="27">Education</SelectItem>
                  <SelectItem value="28">Science & Technology</SelectItem>
                  <SelectItem value="26">Howto & Style</SelectItem>
                  <SelectItem value="10">Music</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-red-600"
                  checked={selfDeclaredMadeForKids}
                  onChange={(e) => setSelfDeclaredMadeForKids(e.target.checked)}
                  disabled={isBusy}
                />
                Self-declare as made for kids
              </label>
              <p className="mt-2 text-sm text-gray-500">
                Only enable this if your content is made specifically for children.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-red-600"
                  checked={publicStatsViewable}
                  onChange={(e) => setPublicStatsViewable(e.target.checked)}
                  disabled={isBusy}
                />
                Show extended public stats on YouTube
              </label>
              <p className="mt-2 text-sm text-gray-500">
                This maps to YouTube&apos;s public stats visibility setting. Even when turned off, YouTube may still show basic counts such as views or ratings on the watch page.
              </p>
            </div>
          </div>

          {/* Schedule Publishing Section */}
          <div className="bg-linear-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="relative">
                <input
                  type="checkbox"
                  id="enable-scheduling"
                  className="peer h-5 w-5 rounded border-2 border-purple-300 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 cursor-pointer checked:scale-110 checked:border-purple-500"
                  checked={enableScheduling}
                  onChange={(e) => setEnableScheduling(e.target.checked)}
                  disabled={isBusy}
                />
                <div
                  className={`absolute inset-0 rounded bg-purple-500 opacity-0 transition-opacity duration-300 pointer-events-none ${enableScheduling ? 'animate-ping' : ''
                    }`}
                  style={{ animationIterationCount: 1, animationDuration: '0.5s' }}
                ></div>
              </div>
              <div className="flex-1">
                <label htmlFor="enable-scheduling" className="text-base font-bold text-gray-900 cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Schedule Publishing
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Egypt Time (Africa/Cairo)</span>
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Set a specific date and time for your video to go public automatically
                </p>
              </div>
            </div>

            {enableScheduling && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t-2 border-purple-200/50 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="schedule-date" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Date
                  </Label>
                  <Input
                    id="schedule-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={getCairoTodayISODate()}
                    className="w-full h-12 px-4 text-base border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200"
                    disabled={isBusy}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule-hour" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Time
                  </Label>
                  <Select value={scheduledHour} onValueChange={setScheduledHour} disabled={isBusy}>
                    <SelectTrigger className="w-full h-12 px-4 text-base border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200">
                      <SelectValue placeholder="Select hour" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {`${((i + 11) % 12) + 1}:00 ${i < 12 ? 'AM' : 'PM'}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 bg-purple-100 border border-purple-300 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-purple-700 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs text-purple-900 leading-relaxed">
                      <span className="font-semibold">Note:</span> Scheduled videos will be set to &quot;Private&quot; until the publish time. Make sure to schedule at least 2 minutes in the future.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Card */}
          <div className="bg-linear-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <h3 className="font-bold text-gray-900 text-lg">Preview</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title</p>
                <p className="text-gray-900 font-medium wrap-break-word">
                  {youtubeTitle || <span className="text-gray-400 italic">No title entered yet</span>}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</p>
                <p className="text-gray-700 text-sm wrap-break-word whitespace-pre-wrap line-clamp-3">
                  {youtubeDescription || <span className="text-gray-400 italic">No description entered yet</span>}
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {youtubeTags ? (
                    parseTagsPreserveOrder(youtubeTags).map((tag, idx) => (
                      <span
                        key={`${idx}-${tag}`}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg border border-gray-200"
                      >
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic text-sm">No tags entered yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer - Fixed */}
        <div className="bg-linear-to-b from-gray-50 to-white px-8 py-6 border-t-2 border-gray-100">
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 font-semibold rounded-xl transition-all duration-200"
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={handleYouTubeUpload}
              disabled={isBusy || !youtubeTitle.trim()}
              className="flex-1 h-12 bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white hover:text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {cloudinaryStage === 'downloading' ? (
                <>
                  <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                  <span>Downloading rendered video...</span>
                </>
              ) : cloudinaryStage === 'uploading' ? (
                <>
                  <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                  <span>Uploading video to Cloudinary...</span>
                </>
              ) : isUploadingToYouTube ? (
                <>
                  <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                  <span>Uploading to YouTube...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span>Upload to YouTube</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
