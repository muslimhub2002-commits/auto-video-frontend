'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Music,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { uploadToCloudinaryUnsigned } from '@/lib/cloudinary';

interface TikTokUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  isShortVideo: boolean;
  scriptId: string | null;
  script: string;
}

type TikTokCreatorInfo = {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
};

type TikTokUploadResponse = {
  publishId: string;
  status: string;
  tiktokUrl: string | null;
  scriptId: string | null;
  creatorUsername: string | null;
  warning?: string;
};

function isCloudinaryUrl(url: string) {
  return /^(https?:\/\/)?res\.cloudinary\.com\//i.test(url || '');
}

function getFileNameFromUrl(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    const lastSegment = String(parsed.pathname.split('/').pop() ?? '').trim();
    if (lastSegment) return lastSegment;
  } catch {
    // ignore
  }

  return 'video.mp4';
}

async function downloadVideoAsFile(url: string, timeoutMs: number): Promise<File> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Failed to download video before TikTok upload (${res.status}): ${text || res.statusText}`,
      );
    }

    const contentType = res.headers.get('content-type') || 'video/mp4';
    const buffer = await res.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      throw new Error('Downloaded video is empty.');
    }

    return new File([buffer], getFileNameFromUrl(url), { type: contentType });
  } catch (err: unknown) {
    const isAbort =
      typeof err === 'object' &&
      err !== null &&
      'name' in err &&
      (err as { name?: unknown }).name === 'AbortError';

    if (isAbort) {
      throw new Error(
        'Timed out while downloading the rendered video bytes. Confirm the video URL opens successfully in the browser.',
      );
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function TikTokUploadModal({
  isOpen,
  onClose,
  videoUrl,
  isShortVideo,
  scriptId,
  script,
}: TikTokUploadModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [caption, setCaption] = useState('');
  const [tiktokTags, setTiktokTags] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState('SELF_ONLY');
  const [disableComment, setDisableComment] = useState(false);
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const [creatorInfo, setCreatorInfo] = useState<TikTokCreatorInfo | null>(null);
  const [creatorInfoError, setCreatorInfoError] = useState<string | null>(null);
  const [isLoadingCreatorInfo, setIsLoadingCreatorInfo] = useState(false);
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [useWebSearchForSeo, setUseWebSearchForSeo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cloudinaryStage, setCloudinaryStage] = useState<'idle' | 'downloading' | 'uploading'>('idle');
  const [cloudinaryCachedForVideoUrl, setCloudinaryCachedForVideoUrl] = useState<string | null>(null);
  const [cloudinaryCachedUrl, setCloudinaryCachedUrl] = useState<string | null>(null);
  const [seoError, setSeoError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<TikTokUploadResponse | null>(null);

  const popupRef = useRef<Window | null>(null);
  const popupIntervalRef = useRef<number | null>(null);

  const TIKTOK_API_URL =
    process.env.NEXT_PUBLIC_TIKTOK_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_YOUTUBE_API_URL ||
    'https://auto-video-backend.vercel.app';

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    const timer = setTimeout(() => setIsRendered(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const stopPopupMonitor = useCallback(() => {
    if (popupIntervalRef.current !== null) {
      window.clearInterval(popupIntervalRef.current);
      popupIntervalRef.current = null;
    }
    popupRef.current = null;
  }, []);

  const applyCreatorInfo = useCallback((data: TikTokCreatorInfo) => {
    setCreatorInfo(data);
    setCreatorInfoError(null);

    const options = Array.isArray(data.privacy_level_options)
      ? data.privacy_level_options.filter(Boolean)
      : [];
    if (!options.includes(privacyLevel)) {
      const fallbackPrivacy =
        options.find((value) => value === 'SELF_ONLY') || options[0] || 'SELF_ONLY';
      setPrivacyLevel(fallbackPrivacy);
    }

    if (data.comment_disabled) setDisableComment(true);
    if (data.duet_disabled) setDisableDuet(true);
    if (data.stitch_disabled) setDisableStitch(true);
  }, [privacyLevel]);

  const loadCreatorInfo = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingCreatorInfo(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${TIKTOK_API_URL}/tiktok/creator-info`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      const data = (await response.json().catch(() => null)) as
        | TikTokCreatorInfo
        | { message?: string }
        | null;

      if (!response.ok) {
        const message =
          data && typeof data === 'object' && 'message' in data
            ? data.message
            : null;
        setCreatorInfo(null);
        setCreatorInfoError(
          typeof message === 'string' && message.trim()
            ? message
            : 'Connect TikTok to load account options.',
        );
        return;
      }

      applyCreatorInfo(data as TikTokCreatorInfo);
    } catch (err: unknown) {
      const message = err instanceof Error && err.message.trim()
        ? err.message
        : 'Failed to load TikTok account info.';
      setCreatorInfo(null);
      setCreatorInfoError(message);
    } finally {
      if (!silent) setIsLoadingCreatorInfo(false);
    }
  }, [TIKTOK_API_URL, applyCreatorInfo]);

  useEffect(() => {
    if (!isOpen) return;

    setSeoError(null);
    setUploadError(null);
    setUploadResult(null);
    void loadCreatorInfo();
  }, [isOpen, loadCreatorInfo]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    const handleMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || typeof payload !== 'object' || payload.source !== 'tiktok-oauth') {
        return;
      }

      stopPopupMonitor();
      setIsConnectingTikTok(false);
      void loadCreatorInfo(true);
    };

    document.addEventListener('keydown', handleEscape);
    window.addEventListener('message', handleMessage);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('message', handleMessage);
      stopPopupMonitor();
    };
  }, [isOpen, onClose, loadCreatorInfo, stopPopupMonitor]);

  const isBusy =
    isUploading ||
    isConnectingTikTok ||
    isLoadingCreatorInfo ||
    isGeneratingSeo ||
    cloudinaryStage !== 'idle';

  const ensureTikTokPublicVideoUrl = async (inputUrl: string): Promise<string> => {
    const trimmed = String(inputUrl ?? '').trim();
    if (!trimmed) throw new Error('Missing video URL');

    if (isCloudinaryUrl(trimmed)) return trimmed;

    if (cloudinaryCachedForVideoUrl === trimmed && cloudinaryCachedUrl) {
      return cloudinaryCachedUrl;
    }

    setCloudinaryStage('downloading');
    try {
      const file = await downloadVideoAsFile(trimmed, 600_000);
      setCloudinaryStage('uploading');
      const cloudinaryUrl = await uploadToCloudinaryUnsigned(file, {
        resourceType: 'video',
        folder: 'auto-video-generator/tiktok-uploads',
      });

      setCloudinaryCachedForVideoUrl(trimmed);
      setCloudinaryCachedUrl(cloudinaryUrl);
      return cloudinaryUrl;
    } finally {
      setCloudinaryStage('idle');
    }
  };

  const parseTagsPreserveOrder = (raw: string): string[] => {
    return (raw || '')
      .split(/[\n,]+/g)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  };

  const formatCaptionWithTags = (rawCaption: string, rawTags: string): string | undefined => {
    const trimmedCaption = rawCaption.trim();
    const normalizedTags = parseTagsPreserveOrder(rawTags)
      .map((tag) => tag.replace(/^#+/, '').trim().replace(/\s+/g, ''))
      .filter(Boolean)
      .map((tag) => `#${tag}`);

    if (!trimmedCaption && normalizedTags.length === 0) {
      return undefined;
    }

    if (!trimmedCaption) {
      return normalizedTags.join(' ');
    }

    if (normalizedTags.length === 0) {
      return trimmedCaption;
    }

    return `${trimmedCaption}\n\n${normalizedTags.join(' ')}`;
  };

  const handleGenerateSeo = async () => {
    setSeoError(null);
    const trimmedScript = (script || '').trim();
    if (!trimmedScript) {
      setSeoError('No script available to generate SEO metadata.');
      return;
    }

    setIsGeneratingSeo(true);
    try {
      const res = await api.post('/ai/youtube-seo', {
        script: trimmedScript,
        useWebSearch: useWebSearchForSeo,
        isShort: isShortVideo,
      });

      const data = res.data as { title?: string; description?: string; tags?: string[] };
      const captionParts = [data?.title, data?.description]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean);

      if (captionParts.length > 0) {
        setCaption(captionParts.join('\n\n'));
      }
      if (Array.isArray(data?.tags)) {
        setTiktokTags(data.tags.join(', '));
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
      setSeoError(messageFromApi ?? 'Failed to generate TikTok SEO metadata.');
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  const handleConnectTikTok = async () => {
    setUploadError(null);
    setIsConnectingTikTok(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${TIKTOK_API_URL}/tiktok/auth-url`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      const data = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
      if (!response.ok || !data?.url) {
        throw new Error(data?.message || 'Failed to get TikTok auth url');
      }

      const popup = window.open(data.url, 'tiktok-oauth', 'popup=yes,width=640,height=820');
      if (!popup) {
        throw new Error('TikTok login popup was blocked. Allow popups and try again.');
      }

      popupRef.current = popup;
      popup.focus();

      popupIntervalRef.current = window.setInterval(() => {
        if (!popupRef.current || popupRef.current.closed) {
          stopPopupMonitor();
          setIsConnectingTikTok(false);
          void loadCreatorInfo(true);
        }
      }, 800);
    } catch (err: unknown) {
      stopPopupMonitor();
      const message = err instanceof Error && err.message.trim()
        ? err.message
        : 'Failed to start TikTok connection.';
      setUploadError(message);
      setIsConnectingTikTok(false);
    }
  };

  const handleUpload = async () => {
    setUploadError(null);
    setUploadResult(null);

    if (!videoUrl) {
      setUploadError('Missing video URL. Generate the video first.');
      return;
    }

    if (!creatorInfo) {
      setUploadError('Connect TikTok and load your account options before uploading.');
      return;
    }

    setIsConnectingTikTok(false);
    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const publicVideoUrl = await ensureTikTokPublicVideoUrl(videoUrl);
      const formattedCaption = formatCaptionWithTags(caption, tiktokTags);
      const response = await fetch(`${TIKTOK_API_URL}/tiktok/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          videoUrl: publicVideoUrl,
          caption: formattedCaption,
          privacyLevel,
          disableComment,
          disableDuet,
          disableStitch,
          scriptId: scriptId || undefined,
          scriptText: (script || '').trim() || undefined,
        }),
      });

      const data = (await response.json().catch(() => null)) as TikTokUploadResponse | { message?: string } | null;
      if (!response.ok) {
        const message =
          data && typeof data === 'object' && 'message' in data
            ? data.message
            : null;
        throw new Error(typeof message === 'string' && message.trim() ? message : 'TikTok upload failed.');
      }

      setUploadResult(data as TikTokUploadResponse);
      if ((data as TikTokUploadResponse).tiktokUrl) {
        window.open((data as TikTokUploadResponse).tiktokUrl!, '_blank', 'noopener,noreferrer');
      }
    } catch (err: unknown) {
      const message = err instanceof Error && err.message.trim()
        ? err.message
        : 'Failed to upload to TikTok. Please try again.';
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isRendered) return null;

  const privacyOptions = Array.isArray(creatorInfo?.privacy_level_options)
    ? creatorInfo.privacy_level_options
    : [];

  return (
    <div
      className={`fixed inset-0 bg-linear-to-br from-black/75 via-neutral-950/70 to-cyan-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-linear-to-r from-neutral-950 via-rose-600 to-cyan-500 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/12 backdrop-blur-sm rounded-2xl shadow-lg">
                <Music className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Upload to TikTok</h2>
                <p className="text-rose-50/90 text-sm mt-0.5">
                  Connect your TikTok account, choose privacy, then post directly from the app.
                </p>
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

        <div className="px-8 py-8 max-h-[calc(90vh-220px)] overflow-y-auto space-y-6">
          <div className="bg-linear-to-br from-rose-50 via-white to-cyan-50 border border-rose-100 rounded-2xl p-5">
            <div className="flex gap-3">
              <div className="shrink-0 w-10 h-10 bg-neutral-950 rounded-xl flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Per-user TikTok publishing</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    TikTok requires each user to authorize posting. We load your live privacy options from TikTok before upload.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleConnectTikTok}
                    disabled={isBusy}
                    className="bg-black hover:bg-neutral-800 text-white"
                    size="sm"
                  >
                    {isConnectingTikTok ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : creatorInfo ? (
                      'Reconnect TikTok'
                    ) : (
                      'Connect TikTok'
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadCreatorInfo()}
                    disabled={isBusy}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    {isLoadingCreatorInfo ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      'Refresh account info'
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleGenerateSeo}
                    disabled={isBusy || !(script || '').trim()}
                    className="bg-linear-to-r from-rose-600 to-cyan-500 hover:from-rose-700 hover:to-cyan-600 text-white hover:text-white shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
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
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-800 bg-white/70 border border-rose-100 rounded-xl px-3 py-2 w-fit">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-rose-600"
                    checked={useWebSearchForSeo}
                    onChange={(e) => setUseWebSearchForSeo(e.target.checked)}
                    disabled={isBusy}
                  />
                  <span className="font-medium">Use web search for tags</span>
                </label>

                {creatorInfo ? (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700 bg-white border border-cyan-100 rounded-2xl px-4 py-3">
                    <div>
                      <span className="font-semibold text-gray-900">Account:</span>{' '}
                      {creatorInfo.creator_nickname || creatorInfo.creator_username || 'Connected'}
                    </div>
                    {creatorInfo.creator_username ? (
                      <div>
                        <span className="font-semibold text-gray-900">Username:</span>{' '}
                        @{creatorInfo.creator_username}
                      </div>
                    ) : null}
                    {typeof creatorInfo.max_video_post_duration_sec === 'number' ? (
                      <div>
                        <span className="font-semibold text-gray-900">Max duration:</span>{' '}
                        {creatorInfo.max_video_post_duration_sec}s
                      </div>
                    ) : null}
                  </div>
                ) : creatorInfoError ? (
                  <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{creatorInfoError}</span>
                  </div>
                ) : null}

                {seoError ? (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {seoError}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tiktok-caption" className="text-sm font-semibold text-gray-900">
                Caption
              </Label>
              <Textarea
                id="tiktok-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write the TikTok caption that will be posted with your video..."
                rows={6}
                disabled={isBusy}
                className="resize-none rounded-2xl border-gray-200 focus-visible:ring-rose-400"
              />
              <p className="text-xs text-gray-500">TikTok captions support hashtags and mentions. Keep the final text under 2200 characters.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok-tags" className="text-sm font-semibold text-gray-900">
                Hashtags
              </Label>
              <Textarea
                id="tiktok-tags"
                value={tiktokTags}
                onChange={(e) => setTiktokTags(e.target.value)}
                placeholder="viral, history, ai, storytelling"
                rows={3}
                disabled={isBusy}
                className="resize-none rounded-2xl border-gray-200 focus-visible:ring-cyan-400"
              />
              <p className="text-xs text-gray-500">Separate tags with commas or new lines. They will be appended as hashtags.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900">Privacy</Label>
              <Select value={privacyLevel} onValueChange={setPrivacyLevel} disabled={isBusy || privacyOptions.length === 0}>
                <SelectTrigger className="rounded-2xl border-gray-200 focus:ring-rose-400">
                  <SelectValue placeholder="Select privacy" />
                </SelectTrigger>
                <SelectContent>
                  {privacyOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-neutral-950 rounded-2xl px-4 py-3 text-sm text-white/90">
              <div className="font-semibold text-white mb-1">Posting behavior</div>
              <p>
                {isShortVideo
                  ? 'Short-form videos are suitable for direct TikTok posting.'
                  : 'TikTok account limits differ by creator. Check the max duration shown above before posting longer videos.'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 bg-gray-50">
              <input
                type="checkbox"
                className="h-4 w-4 accent-rose-600"
                checked={disableComment}
                onChange={(e) => setDisableComment(e.target.checked)}
                disabled={isBusy || Boolean(creatorInfo?.comment_disabled)}
              />
              <span>Disable comments</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 bg-gray-50">
              <input
                type="checkbox"
                className="h-4 w-4 accent-rose-600"
                checked={disableDuet}
                onChange={(e) => setDisableDuet(e.target.checked)}
                disabled={isBusy || Boolean(creatorInfo?.duet_disabled)}
              />
              <span>Disable duet</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 bg-gray-50">
              <input
                type="checkbox"
                className="h-4 w-4 accent-rose-600"
                checked={disableStitch}
                onChange={(e) => setDisableStitch(e.target.checked)}
                disabled={isBusy || Boolean(creatorInfo?.stitch_disabled)}
              />
              <span>Disable stitch</span>
            </label>
          </div>

          {(uploadError || uploadResult?.tiktokUrl || uploadResult?.warning) ? (
            <div className="space-y-3">
              {uploadError ? (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              ) : null}

              {uploadResult ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <div className="font-semibold">TikTok accepted the upload.</div>
                      <div>Publish status: {uploadResult.status}</div>
                      {uploadResult.tiktokUrl ? (
                        <a
                          className="underline font-semibold"
                          href={uploadResult.tiktokUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open TikTok post
                        </a>
                      ) : null}
                      {uploadResult.warning ? <div>{uploadResult.warning}</div> : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center">
            <p className="text-xs text-gray-500">
              TikTok may delay the public URL until moderation completes. Private posts can remain URL-less from the API response.
            </p>
            <div className="flex gap-3 sm:justify-end">
              <Button variant="outline" onClick={onClose} disabled={isBusy} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isBusy || !creatorInfo}
                className="rounded-xl bg-linear-to-r from-neutral-950 via-rose-600 to-cyan-500 hover:from-black hover:via-rose-700 hover:to-cyan-600 text-white"
              >
                {cloudinaryStage === 'downloading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing video...
                  </>
                ) : cloudinaryStage === 'uploading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading to Cloudinary...
                  </>
                ) : isConnectingTikTok ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading to TikTok...
                  </>
                ) : isLoadingCreatorInfo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading account...
                  </>
                ) : (
                  'Upload to TikTok'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}