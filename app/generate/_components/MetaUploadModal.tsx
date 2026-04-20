'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  Facebook,
  Instagram,
  KeyRound,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ensureManagedPublicUrl } from '@/lib/cloudinary';
import { youtubeApi } from '@/lib/api';
import {
  formatVideoDuration,
  getVideoDurationSeconds,
  getVideoFormatKind,
  getVideoFormatLabel,
} from '@/lib/video-format';
import {
  META_WALLPAPER_THEME,
  WallpaperGeneratorSection,
  type SocialUploadScriptCharacter,
} from './social/WallpaperGeneratorSection';

type MetaPlatform = 'facebook' | 'instagram';

interface MetaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  isShortVideo: boolean;
  videoDurationSeconds?: number | null;
  scriptId: string | null;
  script: string;
  scriptCharacters: SocialUploadScriptCharacter[];
  onUploaded?: (payload: {
    scriptId: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    partialFailure: boolean;
  }) => void | Promise<void>;
}

type PlatformResult = {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
};

type MetaUploadResponse = {
  scriptId: string | null;
  partialFailure: boolean;
  results: {
    facebook?: PlatformResult;
    instagram?: PlatformResult;
  };
};

type MetaConnectionStatus =
  | 'not_connected'
  | 'healthy'
  | 'attention'
  | 'reconnect_required'
  | 'error';

type MetaCredentialStatus = {
  hasMetaAccessToken: boolean;
  metaTokenExpiresAt: string | null;
  daysUntilExpiry: number | null;
  lastError: string | null;
  canAutoRefresh: boolean;
  connectionStatus: MetaConnectionStatus;
  requiresReconnect: boolean;
  connectedAt: string | null;
  lastRefreshedAt: string | null;
  lastRefreshAttemptAt: string | null;
  lastRefreshSuccessAt: string | null;
  lastRefreshErrorAt: string | null;
  nextRefreshDueAt: string | null;
  requiresReconnectAt: string | null;
  minimumRecommendedLifetimeDays: number;
  targetRefreshWindowDays: number;
};

function formatStatusDate(value: string | null | undefined): string {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleDateString();
}

function getCredentialTone(connectionStatus: MetaConnectionStatus): string {
  switch (connectionStatus) {
    case 'healthy':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'attention':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'not_connected':
    case 'reconnect_required':
    case 'error':
    default:
      return 'border-red-200 bg-red-50 text-red-800';
  }
}

function getCredentialHeadline(status: MetaCredentialStatus): string {
  switch (status.connectionStatus) {
    case 'healthy':
      return status.daysUntilExpiry !== null
        ? `Shared Meta connection healthy with about ${status.daysUntilExpiry} days remaining.`
        : 'Shared Meta connection healthy.';
    case 'attention':
      return status.daysUntilExpiry !== null
        ? `Shared Meta connection is inside the ${status.targetRefreshWindowDays}-day refresh window.`
        : 'Shared Meta connection needs attention soon.';
    case 'error':
      return status.lastError?.trim()
        ? `Shared Meta connection hit an error: ${status.lastError}`
        : 'Shared Meta connection hit an error and should be checked.';
    case 'reconnect_required':
      return status.lastError?.trim()
        ? `Reconnect required before upload: ${status.lastError}`
        : `Reconnect required before the token falls under the ${status.minimumRecommendedLifetimeDays}-day minimum lifetime.`;
    case 'not_connected':
    default:
      return 'No shared Meta connection is configured yet.';
  }
}

export function MetaUploadModal({
  isOpen,
  onClose,
  videoUrl,
  isShortVideo,
  videoDurationSeconds,
  scriptId,
  script,
  scriptCharacters,
  onUploaded,
}: MetaUploadModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<MetaPlatform[]>(['facebook','instagram']);
  const [facebookTitle, setFacebookTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [metaTags, setMetaTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [useWebSearchForSeo, setUseWebSearchForSeo] = useState(false);
  const [cloudinaryStage, setCloudinaryStage] = useState<'idle' | 'downloading' | 'uploading'>('idle');
  const [cloudinaryCachedForVideoUrl, setCloudinaryCachedForVideoUrl] = useState<string | null>(null);
  const [cloudinaryCachedUrl, setCloudinaryCachedUrl] = useState<string | null>(null);
  const [credentialStatus, setCredentialStatus] = useState<MetaCredentialStatus | null>(null);
  const [isLoadingCredStatus, setIsLoadingCredStatus] = useState(false);
  const [showTokenPanel, setShowTokenPanel] = useState(false);
  const [newShortToken, setNewShortToken] = useState('');
  const [isExchangingToken, setIsExchangingToken] = useState(false);
  const [isRefreshingCredentials, setIsRefreshingCredentials] = useState(false);
  const [tokenExchangeError, setTokenExchangeError] = useState<string | null>(null);
  const [credentialActionNotice, setCredentialActionNotice] = useState<string | null>(null);
  const [seoError, setSeoError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<MetaUploadResponse | null>(null);
  const [isWallpaperBusy, setIsWallpaperBusy] = useState(false);
  const [resolvedVideoDurationSeconds, setResolvedVideoDurationSeconds] =
    useState<number | null>(videoDurationSeconds ?? null);
  const [isResolvingVideoFormat, setIsResolvingVideoFormat] = useState(false);
  const [videoFormatError, setVideoFormatError] = useState<string | null>(null);

  const effectiveVideoDurationSeconds =
    typeof videoDurationSeconds === 'number' && videoDurationSeconds > 0
      ? videoDurationSeconds
      : resolvedVideoDurationSeconds;
  const resolvedVideoFormatKind = getVideoFormatKind(effectiveVideoDurationSeconds);
  const resolvedIsShortVideo =
    resolvedVideoFormatKind === 'short'
      ? true
      : resolvedVideoFormatKind === 'long'
        ? false
        : isShortVideo;
  const resolvedVideoFormatLabel =
    resolvedVideoFormatKind === 'unknown'
      ? videoUrl
        ? 'Checking format'
        : isShortVideo
          ? 'Short'
          : 'Long'
      : getVideoFormatLabel(effectiveVideoDurationSeconds);

  const META_API_URL =
    process.env.NEXT_PUBLIC_META_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000';
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

  const loadCredentialStatus = useCallback(async () => {
    setIsLoadingCredStatus(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${META_API_URL}/meta/credentials`, {
        headers: {
          Accept: 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      if (res.ok) {
        const data = await res.json() as MetaCredentialStatus;
        setCredentialStatus(data);
        if (
          !data.hasMetaAccessToken ||
          data.requiresReconnect ||
          data.connectionStatus === 'error'
        ) {
          setShowTokenPanel(true);
        }
      }
    } catch {
      // non-critical
    } finally {
      setIsLoadingCredStatus(false);
    }
  }, [META_API_URL]);

  const handleExchangeToken = async () => {
    setTokenExchangeError(null);
    setCredentialActionNotice(null);
    const trimmed = newShortToken.trim();
    if (!trimmed) {
      setTokenExchangeError('Paste a short-lived Meta access token first.');
      return;
    }
    setIsExchangingToken(true);
    try {
      const authToken = localStorage.getItem('token');
      const res = await fetch(`${META_API_URL}/meta/credentials/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? `Bearer ${authToken}` : '',
        },
        body: JSON.stringify({ shortLivedToken: trimmed }),
      });
      const data = (await res.json().catch(() => null)) as {
        exchanged?: boolean;
        status?: typeof credentialStatus;
        message?: string;
      } | null;
      if (!res.ok) {
        throw new Error(
          (data && 'message' in data && typeof data.message === 'string' && data.message.trim())
            ? data.message
            : 'Token exchange failed.',
        );
      }
      if (data?.status) {
        setCredentialStatus(data.status as typeof credentialStatus);
      }
      setCredentialActionNotice(
        'Shared Meta connection updated. The backend will now keep it inside the monthly safety window when auto-refresh is available.',
      );
      setNewShortToken('');
      setShowTokenPanel(false);
    } catch (err: unknown) {
      setTokenExchangeError(
        err instanceof Error && err.message.trim()
          ? err.message
          : 'Token exchange failed. Make sure the token is valid.',
      );
    } finally {
      setIsExchangingToken(false);
    }
  };

  const handleRefreshCredentials = async () => {
    setTokenExchangeError(null);
    setCredentialActionNotice(null);
    setIsRefreshingCredentials(true);
    try {
      const authToken = localStorage.getItem('token');
      const res = await fetch(`${META_API_URL}/meta/credentials/refresh`, {
        method: 'POST',
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : '',
        },
      });
      const data = (await res.json().catch(() => null)) as {
        refreshed?: boolean;
        status?: MetaCredentialStatus;
        message?: string;
      } | null;
      if (!res.ok) {
        throw new Error(
          data?.message && data.message.trim()
            ? data.message
            : 'Meta credential refresh failed.',
        );
      }
      if (data?.status) {
        setCredentialStatus(data.status);
      }
      setCredentialActionNotice('Shared Meta connection refreshed successfully.');
    } catch (err: unknown) {
      setTokenExchangeError(
        err instanceof Error && err.message.trim()
          ? err.message
          : 'Meta credential refresh failed.',
      );
    } finally {
      setIsRefreshingCredentials(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setSeoError(null);
    setUploadError(null);
    setUploadResult(null);
    setTokenExchangeError(null);
    setCredentialActionNotice(null);
    void loadCredentialStatus();
  }, [isOpen, loadCredentialStatus]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setIsResolvingVideoFormat(false);
      return;
    }

    if (typeof videoDurationSeconds === 'number' && videoDurationSeconds > 0) {
      setResolvedVideoDurationSeconds(videoDurationSeconds);
      setVideoFormatError(null);
      setIsResolvingVideoFormat(false);
      return;
    }

    if (!videoUrl) {
      setResolvedVideoDurationSeconds(null);
      setVideoFormatError(null);
      setIsResolvingVideoFormat(false);
      return;
    }

    let cancelled = false;
    setIsResolvingVideoFormat(true);
    setVideoFormatError(null);

    void getVideoDurationSeconds(videoUrl)
      .then((duration) => {
        if (cancelled) return;
        setResolvedVideoDurationSeconds(duration);
      })
      .catch((error) => {
        if (cancelled) return;
        setResolvedVideoDurationSeconds(null);
        setVideoFormatError(
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Failed to confirm the video format from the uploaded file.',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolvingVideoFormat(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, videoDurationSeconds, videoUrl]);

  const isBusy =
    isUploading ||
    isGeneratingSeo ||
    cloudinaryStage !== 'idle' ||
    isExchangingToken ||
    isRefreshingCredentials ||
    isWallpaperBusy;

  const togglePlatform = (platform: MetaPlatform) => {
    setSelectedPlatforms((current) => {
      if (current.includes(platform)) {
        return current.filter((value) => value !== platform);
      }
      return [...current, platform];
    });
  };

  const ensureMetaPublicVideoUrl = async (inputUrl: string): Promise<string> => {
    const trimmed = String(inputUrl ?? '').trim();
    if (!trimmed) throw new Error('Missing video URL');

    if (cloudinaryCachedForVideoUrl === trimmed && cloudinaryCachedUrl) {
      return cloudinaryCachedUrl;
    }

    setCloudinaryStage('downloading');
    try {
      const preparedUrl = await ensureManagedPublicUrl(trimmed, {
        resourceType: 'video',
        folder: 'auto-video-generator/meta-uploads',
        filename: 'meta-upload.mp4',
      });

      setCloudinaryCachedForVideoUrl(trimmed);
      setCloudinaryCachedUrl(preparedUrl);
      return preparedUrl;
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

  const formatMetaCaption = (rawCaption: string, rawTags: string): string | undefined => {
    const trimmedCaption = rawCaption.trim();
    const normalizedTags = parseTagsPreserveOrder(rawTags).map((tag) => {
      const collapsed = tag
        .replace(/^#+/, '')
        .trim()
        .replace(/\s+/g, '');
      return collapsed ? `#${collapsed}` : '';
    }).filter(Boolean);

    if (!trimmedCaption && normalizedTags.length === 0) {
      return undefined;
    }

    if (normalizedTags.length === 0) {
      return trimmedCaption || undefined;
    }

    if (!trimmedCaption) {
      return normalizedTags.join(' ');
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
      const res = await youtubeApi.post('/ai/youtube-seo', {
        script: trimmedScript,
        useWebSearch: useWebSearchForSeo,
        isShort: resolvedIsShortVideo,
      });
      const data = res.data as { title?: string; description?: string; tags?: string[] };

      if (data?.title) setFacebookTitle(data.title);
      if (typeof data?.description === 'string') setCaption(data.description);
      if (Array.isArray(data?.tags)) setMetaTags(data.tags.join(', '));
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

  const handleUpload = async () => {
    setSeoError(null);
    setUploadError(null);
    setUploadResult(null);

    if (!videoUrl) {
      setUploadError('Missing video URL. Generate the video first.');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setUploadError('Select at least one platform to upload to.');
      return;
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const publicVideoUrl = await ensureMetaPublicVideoUrl(videoUrl);
      const formattedCaption = formatMetaCaption(caption, metaTags);
      const response = await fetch(`${META_API_URL}/meta/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          videoUrl: publicVideoUrl,
          platforms: selectedPlatforms,
          title: facebookTitle.trim() || undefined,
          caption: formattedCaption,
          isShortVideo: resolvedIsShortVideo,
          scriptId: scriptId || undefined,
          scriptText: (script || '').trim() || undefined,
        }),
      });

      const data = (await response.json().catch(() => null)) as MetaUploadResponse | { message?: string } | null;
      if (!response.ok) {
        const message = data && typeof data === 'object' && 'message' in data
          ? data.message
          : null;
        throw new Error(typeof message === 'string' && message.trim() ? message : 'Meta upload failed.');
      }

      setUploadResult(data as MetaUploadResponse);
      await onUploaded?.({
        scriptId: String((data as MetaUploadResponse).scriptId ?? scriptId ?? '').trim() || null,
        facebookUrl:
          String((data as MetaUploadResponse).results.facebook?.url ?? '').trim() || null,
        instagramUrl:
          String((data as MetaUploadResponse).results.instagram?.url ?? '').trim() || null,
        partialFailure: Boolean((data as MetaUploadResponse).partialFailure),
      });
    } catch (err: unknown) {
      const message = err instanceof Error && err.message.trim()
        ? err.message
        : 'Failed to upload to Meta platforms. Please try again.';
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isRendered) return null;

  const selectedFacebook = selectedPlatforms.includes('facebook');
  const selectedInstagram = selectedPlatforms.includes('instagram');

  return (
    <div
      className={`fixed inset-0 bg-linear-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-linear-to-r from-sky-700 via-blue-700 to-indigo-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg">
                <Clapperboard className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Upload to Meta Platforms</h2>
                <p className="text-blue-100 text-sm mt-0.5">
                  Publish this video to Facebook, Instagram, or both.
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
          <div className="bg-linear-to-br from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl p-5">
            <div className="flex gap-3">
              <div className="shrink-0 w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center">
                <Clapperboard className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sky-900 mb-1">Publish directly from the app</h4>
                <p className="text-sm text-sky-700 leading-relaxed">
                  {resolvedIsShortVideo
                    ? 'Short videos will be sent to Instagram as Reels. Facebook will receive a native video post.'
                    : 'Full-length videos will be published as native video posts. Make sure the caption fits both platforms.'}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">
                    {resolvedVideoFormatLabel} format
                  </span>
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">
                    {effectiveVideoDurationSeconds
                      ? formatVideoDuration(effectiveVideoDurationSeconds)
                      : isResolvingVideoFormat
                        ? 'Reading duration'
                        : 'Duration unknown'}
                  </span>
                </div>

                <p className="mt-3 text-xs text-sky-700">
                  Videos shorter than 3 minutes are treated as short-form. Long-form-only helpers stay hidden for short uploads.
                </p>

                {videoFormatError ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {videoFormatError}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleGenerateSeo}
                    disabled={isBusy || !(script || '').trim()}
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
                      disabled={isBusy}
                    />
                    <span className="font-medium">Use web search (viral tags)</span>
                  </label>

                  {seoError ? (
                    <span className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                      {seoError}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {resolvedVideoFormatKind === 'long' ? (
            <WallpaperGeneratorSection
              isOpen={isOpen}
              isShortVideo={resolvedIsShortVideo}
              script={script}
              scriptCharacters={scriptCharacters}
              disabled={isBusy}
              onBusyChange={setIsWallpaperBusy}
              theme={META_WALLPAPER_THEME}
              copy={{
                title: 'Cover Image Generator',
                description: 'Create a long-form promotional image from your script, then refine its look or download it as a standalone social asset.',
                promptNote: 'Uses your full script to generate a 16:9 promo-style wallpaper image.',
                standaloneNote: 'This asset stays standalone in Meta upload flow and does not change the upload payload.',
              }}
            />
          ) : null}

          {/* ── Token status banner ── */}
          {!isLoadingCredStatus && credentialStatus ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm flex items-center justify-between gap-3 ${getCredentialTone(
                credentialStatus.connectionStatus,
              )}`}
            >
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  {credentialStatus.connectionStatus === 'healthy' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{getCredentialHeadline(credentialStatus)}</span>
                </div>
                <div className="text-xs opacity-90 space-y-1">
                  <p>
                    Expires: {formatStatusDate(credentialStatus.metaTokenExpiresAt)}. Last successful refresh:{' '}
                    {formatStatusDate(credentialStatus.lastRefreshSuccessAt || credentialStatus.lastRefreshedAt)}.
                  </p>
                  <p>
                    Next planned refresh: {formatStatusDate(credentialStatus.nextRefreshDueAt)}.{' '}
                    {credentialStatus.canAutoRefresh
                      ? 'Automatic refresh is enabled on the backend.'
                      : 'Automatic refresh is unavailable until META_APP_SECRET is configured.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {credentialStatus.canAutoRefresh && credentialStatus.hasMetaAccessToken ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRefreshCredentials()}
                    disabled={isBusy}
                    className="border-current/30 bg-white/60 text-current hover:bg-white"
                  >
                    {isRefreshingCredentials ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      'Refresh now'
                    )}
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowTokenPanel((v) => !v)}
                  className="text-xs underline font-medium whitespace-nowrap"
                >
                  {showTokenPanel ? 'Hide' : 'Manage token'}
                </button>
              </div>
            </div>
          ) : null}

          {/* ── Token exchange panel ── */}
          {showTokenPanel ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 bg-blue-700 rounded-xl flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-900">
                    Reconnect the shared Meta account
                  </h4>
                  <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                    Open the{' '}
                    <a
                      href="https://developers.facebook.com/tools/explorer"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-medium"
                    >
                      Facebook Graph API Explorer
                    </a>
                    , select your app, click <strong>Generate Access Token</strong>, and grant{' '}
                    <code className="bg-blue-100 px-1 rounded text-xs">pages_manage_videos</code>{' '}
                    +{' '}
                    <code className="bg-blue-100 px-1 rounded text-xs">pages_read_engagement</code>{' '}
                    permissions. Paste the short-lived token below — the backend will exchange it
                    for a long-lived token and keep the shared connection above the monthly
                    safety threshold whenever automatic refresh is available.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Paste short-lived Meta access token here..."
                  value={newShortToken}
                  onChange={(e) => setNewShortToken(e.target.value)}
                  disabled={isExchangingToken}
                  className="flex-1 text-sm"
                />
                <Button
                  type="button"
                  onClick={() => void handleExchangeToken()}
                  disabled={isExchangingToken || !newShortToken.trim()}
                  className="bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap"
                  size="sm"
                >
                  {isExchangingToken ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exchanging...
                    </>
                  ) : (
                    'Exchange & Save'
                  )}
                </Button>
              </div>

              {tokenExchangeError ? (
                <div className="flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{tokenExchangeError}</span>
                </div>
              ) : null}

              {credentialActionNotice ? (
                <div className="flex items-center gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{credentialActionNotice}</span>
                </div>
              ) : null}

              {credentialStatus ? (
                <div className="rounded-2xl border border-blue-200 bg-white/80 px-4 py-3 text-xs text-blue-900 space-y-1">
                  <p>
                    Status: <span className="font-semibold capitalize">{credentialStatus.connectionStatus.replace('_', ' ')}</span>
                  </p>
                  <p>
                    Minimum safe lifetime target: {credentialStatus.minimumRecommendedLifetimeDays} days.
                    Reconnect by {formatStatusDate(credentialStatus.requiresReconnectAt)} if auto-refresh cannot recover the token.
                  </p>
                  {credentialStatus.lastError ? (
                    <p>Last backend error: {credentialStatus.lastError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-900">Platforms</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => togglePlatform('facebook')}
                className={`rounded-2xl border px-4 py-4 text-left transition-all ${selectedFacebook ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${selectedFacebook ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    <Facebook className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Facebook</div>
                    <div className="text-sm text-gray-600">Native Page video post</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => togglePlatform('instagram')}
                className={`rounded-2xl border px-4 py-4 text-left transition-all ${selectedInstagram ? 'border-pink-500 bg-pink-50 shadow-md' : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/40'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${selectedInstagram ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    <Instagram className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Instagram</div>
                    <div className="text-sm text-gray-600">{resolvedIsShortVideo ? 'Publish as Reel' : 'Publish as video post'}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="facebook-title" className="text-sm font-semibold text-gray-900">
              Facebook Title
            </Label>
            <Input
              id="facebook-title"
              value={facebookTitle}
              onChange={(e) => setFacebookTitle(e.target.value)}
              placeholder="Optional title for the Facebook video post"
              disabled={isBusy || !selectedFacebook}
            />
            <p className="text-xs text-gray-500">Used only for Facebook. Instagram ignores this field.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-caption" className="text-sm font-semibold text-gray-900">
              Description / Caption
            </Label>
            <Textarea
              id="meta-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a description or caption that works for Facebook and Instagram"
              className="min-h-36"
              disabled={isBusy}
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Shared across selected platforms. Generated tags are appended as hashtags on publish.</span>
              <span>{caption.length}/2200</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-tags" className="text-sm font-semibold text-gray-900">
              Tags
            </Label>
            <Input
              id="meta-tags"
              value={metaTags}
              onChange={(e) => setMetaTags(e.target.value)}
              placeholder="history, facts, documentary, islamic stories"
              disabled={isBusy}
            />
            <p className="text-xs text-gray-500">
              SEO tags are converted into hashtags and appended to the caption when uploading.
            </p>
          </div>

          {cloudinaryStage !== 'idle' ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {cloudinaryStage === 'downloading'
                  ? 'Preparing a public video URL for Meta...'
                  : 'Preparing a public video URL for Meta...'}
              </span>
            </div>
          ) : null}

          {uploadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          ) : null}

          {uploadResult ? (
            <div className="space-y-3">
              {uploadResult.partialFailure ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Upload finished with a partial failure. Review the platform results below.
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Upload finished successfully.
                </div>
              )}

              {(['facebook', 'instagram'] as const).map((platform) => {
                const result = uploadResult.results[platform];
                if (!result) return null;

                return (
                  <div
                    key={platform}
                    className={`rounded-2xl border px-4 py-4 ${result.success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 capitalize">{platform}</div>
                        {result.success ? (
                          <>
                            <p className="text-sm text-gray-700 mt-1">Published successfully.</p>
                            {result.url ? (
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex mt-3 text-sm font-medium text-blue-700 hover:text-blue-800"
                              >
                                Open {platform} post
                              </a>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-sm text-red-700 mt-1">{result.error || 'Upload failed.'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="bg-linear-to-b from-gray-50 to-white px-8 py-6 border-t-2 border-gray-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isBusy}
            className="border-gray-300 hover:bg-gray-50"
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={() => void handleUpload()}
            disabled={isBusy || selectedPlatforms.length === 0 || Boolean(credentialStatus?.requiresReconnect)}
            className="bg-linear-to-r from-sky-700 to-indigo-700 hover:from-sky-800 hover:to-indigo-800 text-white shadow-lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>Upload to Meta Platforms</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}