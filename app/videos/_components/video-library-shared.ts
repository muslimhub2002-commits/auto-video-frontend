import type { VideoPlatformCategory } from '../../generate/_components/sidebar/sidebar-data';
import type { SocialUploadScriptCharacter } from '../../generate/_components/social/WallpaperGeneratorSection';

export type PublishedPlatform = Exclude<VideoPlatformCategory, 'all'>;

export type VideoListItem = {
  id: string;
  title: string | null;
  language?: string;
  script: string;
  created_at: string;
  updated_at?: string;
  sentences_count: number;
  images_count: number;
  voice_over_sentences_count: number;
  voice_over_chunks_count: number;
  video_url?: string | null;
  youtube_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  published_platforms?: PublishedPlatform[];
};

export type VideoDetail = VideoListItem & {
  subject?: string | null;
  length?: string | null;
  style?: string | null;
  technique?: string | null;
  isShortScript?: boolean;
  characters?: SocialUploadScriptCharacter[] | null;
  sentences?: Array<{
    id: string;
    index: number;
    text: string;
  }>;
};

export type VideoLibraryResponse = {
  items: VideoListItem[];
  total: number;
  page: number;
  limit: number;
  platform?: VideoPlatformCategory;
};

export type PlatformStatus = {
  platform: string;
  connectionStatus:
    | 'not_connected'
    | 'healthy'
    | 'attention'
    | 'reconnect_required'
    | 'error';
  connectedAt?: string | null;
  tokenExpiresAt?: string | null;
  metaTokenExpiresAt?: string | null;
  daysUntilExpiry?: number | null;
  creatorUsername?: string | null;
  creatorNickname?: string | null;
  privacyOptions?: string[];
  requiresReconnect?: boolean;
  canUpload?: boolean;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  supportsAnalytics?: boolean;
  lastError?: string | null;
  facebookPageId?: string | null;
  instagramAccountId?: string | null;
  hasMetaAccessToken?: boolean;
  hasFacebookPageAccessToken?: boolean;
};

export type YoutubeMetric = {
  value: number | null;
  available: boolean;
  source: 'analytics' | 'videos' | 'derived' | 'unavailable';
  label?: string;
};

export type YoutubeAnalyticsResponse = {
  scriptId: string;
  videoId: string;
  youtubeUrl: string;
  period: {
    startDate: string;
    endDate: string;
  };
  channel: {
    title: string | null;
  };
  video: {
    title: string | null;
    publishedAt: string | null;
    privacyStatus: string | null;
    duration: {
      iso8601: string | null;
      seconds: number | null;
      label: string | null;
    };
  };
  metrics: {
    views: YoutubeMetric;
    watchTimeMinutes: YoutubeMetric;
    averageViewDurationSeconds: YoutubeMetric;
    averageViewDurationLabel: YoutubeMetric;
    averageViewPercentage: YoutubeMetric;
    likes: YoutubeMetric;
    comments: YoutubeMetric;
    shares: YoutubeMetric;
    uniqueViewers: YoutubeMetric;
    engagedViews: YoutubeMetric;
  };
  analytics: {
    scopeGranted: boolean;
    metadataScopeGranted: boolean;
    available: boolean;
  };
  warnings: string[];
};

export type PublishedLink = {
  platform: PublishedPlatform;
  url: string;
  label: string;
  pillClassName: string;
  buttonClassName: string;
};

const integerFormatter = new Intl.NumberFormat();
const decimalFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const platformPresentation: Record<
  PublishedPlatform,
  {
    label: string;
    pillClassName: string;
    buttonClassName: string;
  }
> = {
  youtube: {
    label: 'YouTube',
    pillClassName: 'border-red-200 bg-red-50 text-red-700',
    buttonClassName:
      'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  },
  facebook: {
    label: 'Facebook',
    pillClassName: 'border-blue-200 bg-blue-50 text-blue-700',
    buttonClassName:
      'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
  },
  instagram: {
    label: 'Instagram',
    pillClassName: 'border-pink-200 bg-pink-50 text-pink-700',
    buttonClassName:
      'border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100',
  },
  tiktok: {
    label: 'TikTok',
    pillClassName: 'border-slate-200 bg-slate-100 text-slate-700',
    buttonClassName:
      'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200',
  },
};

export function getDisplayTitle(video: { title: string | null; script: string }) {
  const title = video.title?.trim();
  if (title) return title;

  const fallback = video.script
    .split(/[\n.]/)
    .map((part) => part.trim())
    .find(Boolean);

  return fallback ? fallback.slice(0, 88) : 'Untitled video';
}

export function buildScriptPreview(scriptText: string) {
  const normalized = scriptText.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 220) return normalized;
  return `${normalized.slice(0, 217)}...`;
}

export function formatDate(value?: string | null) {
  if (!value) return 'Unknown date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDuration(seconds?: number | null) {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) {
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

export function getPublishedPlatforms(video: {
  published_platforms?: PublishedPlatform[];
  youtube_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
}): PublishedPlatform[] {
  if (
    Array.isArray(video.published_platforms) &&
    video.published_platforms.length > 0
  ) {
    return video.published_platforms;
  }

  const platforms: PublishedPlatform[] = [];
  if (String(video.youtube_url ?? '').trim()) platforms.push('youtube');
  if (String(video.facebook_url ?? '').trim()) platforms.push('facebook');
  if (String(video.instagram_url ?? '').trim()) platforms.push('instagram');
  if (String(video.tiktok_url ?? '').trim()) platforms.push('tiktok');
  return platforms;
}

export function getPublishedLinks(video: {
  youtube_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
}): PublishedLink[] {
  return (Object.keys(platformPresentation) as PublishedPlatform[])
    .map((platform) => {
      const key = `${platform}_url` as const;
      const url = String(video[key] ?? '').trim();
      if (!url) return null;

      return {
        platform,
        url,
        ...platformPresentation[platform],
      };
    })
    .filter((item): item is PublishedLink => Boolean(item));
}

export function getPlatformStatusEndpoint(
  platform: VideoPlatformCategory,
): string | null {
  switch (platform) {
    case 'youtube':
      return '/youtube/status';
    case 'facebook':
      return '/meta/facebook/status';
    case 'instagram':
      return '/meta/instagram/status';
    case 'tiktok':
      return '/tiktok/status';
    default:
      return null;
  }
}

export function getConnectionTone(status?: PlatformStatus | null) {
  switch (status?.connectionStatus) {
    case 'healthy':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'attention':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'reconnect_required':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

export function getConnectionLabel(status?: PlatformStatus | null) {
  switch (status?.connectionStatus) {
    case 'healthy':
      return 'Healthy';
    case 'attention':
      return 'Needs attention';
    case 'reconnect_required':
      return 'Reconnect required';
    case 'error':
      return 'Error';
    default:
      return 'Not connected';
  }
}

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
      if (first) return first;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function formatMetricValue(
  metric: YoutubeMetric,
  variant: 'integer' | 'percent' | 'minutes' | 'duration',
) {
  if (!metric.available || metric.value === null || !Number.isFinite(metric.value)) {
    return 'Unavailable';
  }

  if (metric.label?.trim()) {
    return metric.label;
  }

  switch (variant) {
    case 'percent':
      return `${decimalFormatter.format(metric.value)}%`;
    case 'minutes':
      return `${integerFormatter.format(Math.round(metric.value))} min`;
    case 'duration':
      return formatDuration(metric.value);
    case 'integer':
    default:
      return integerFormatter.format(Math.round(metric.value));
  }
}

export function mergeVideoDetail(
  baseVideo: VideoListItem | null | undefined,
  detail: Partial<VideoDetail>,
): VideoDetail {
  const merged = {
    ...(baseVideo ?? {}),
    ...detail,
  } as VideoDetail;

  merged.published_platforms = getPublishedPlatforms(merged);
  return merged;
}