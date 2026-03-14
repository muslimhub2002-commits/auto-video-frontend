'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog } from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X,
  Loader2,
  Video as VideoIcon,
  Check,
  Sparkles,
  Search,
  Trash2,
  Download,
  Save,
  ExternalLink,
  Play,
  Pause,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Pagination } from './Pagination';
import { useAiSearchTerm } from './useAiSearchTerm';
import { useDebouncedValue } from './useDebouncedValue';

interface SavedVideo {
  id: string;
  video: string;
  video_type?: string | null;
  video_size?: 'portrait' | 'landscape' | null;
  width?: number | null;
  height?: number | null;
  created_at: string;
}

interface FreestockVideo {
  id: string;
  externalId: string;
  source: 'pexels' | 'pixabay';
  video: string;
  thumbnail?: string | null;
  video_type?: string | null;
  video_size?: 'portrait' | 'landscape' | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  authorName?: string | null;
  authorUrl?: string | null;
  pexelsUrl?: string | null;
  pixabayUrl?: string | null;
  downloadUrl: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface VideoLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (videoUrl: string, id: string | null) => void;
  selectedVideoUrl?: string | null;
  scriptContext?: string | null;
  currentSentenceText?: string | null;
}

type ActiveTab = 'entities' | 'freestock' | 'pixabay';

type DeleteState = {
  video: SavedVideo;
  force: boolean;
  title: string;
  description: string;
} | null;

const entityOrientationOptions = [
  { label: 'All orientations', value: '' },
  { label: 'Landscape', value: 'landscape' },
  { label: 'Portrait', value: 'portrait' },
];

const freestockOrientationOptions = [
  { label: 'Any orientation', value: '' },
  { label: 'Landscape', value: 'landscape' },
  { label: 'Portrait', value: 'portrait' },
  { label: 'Square', value: 'square' },
];

const freestockSizeOptions = [
  { label: 'Any size', value: '' },
  { label: 'Large', value: 'large' },
  { label: 'Medium', value: 'medium' },
  { label: 'Small', value: 'small' },
];

const EMPTY_SELECT_VALUE = '__all__';

const FILTER_SUMMARY_LABEL_LIMIT = 3;

const getVideoAspectClass = (orientation?: 'portrait' | 'landscape' | null) =>
  orientation === 'portrait' ? 'aspect-3/4' : 'aspect-video';

const getFreestockVideoAspectClass = (orientation?: 'portrait' | 'landscape' | null) =>
  orientation === 'portrait' ? 'aspect-4/5' : 'aspect-video';

const downloadAsset = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const toSummaryText = (value: string) => value.trim().replace(/\s+/g, ' ');

const buildFilterSummary = (items: Array<string | null | undefined>) => {
  const labels = items
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item));

  if (labels.length === 0) {
    return 'No active filters';
  }

  if (labels.length <= FILTER_SUMMARY_LABEL_LIMIT) {
    return labels.join(' • ');
  }

  return `${labels.slice(0, FILTER_SUMMARY_LABEL_LIMIT - 1).join(' • ')} • +${labels.length - (FILTER_SUMMARY_LABEL_LIMIT - 1)} more`;
};

export function VideoLibraryModal({
  isOpen,
  onClose,
  onSelectVideo,
  selectedVideoUrl,
  scriptContext,
  currentSentenceText,
}: VideoLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('entities');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(selectedVideoUrl ?? null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const [entityVideos, setEntityVideos] = useState<SavedVideo[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityError, setEntityError] = useState<string | null>(null);
  const [entityPage, setEntityPage] = useState(1);
  const [entityTotal, setEntityTotal] = useState(0);
  const [entityLimit, setEntityLimit] = useState(20);
  const [entityQuery, setEntityQuery] = useState('');
  const [entityOrientation, setEntityOrientation] = useState('');

  const [freestockVideos, setFreestockVideos] = useState<FreestockVideo[]>([]);
  const [freestockLoading, setFreestockLoading] = useState(false);
  const [freestockError, setFreestockError] = useState<string | null>(null);
  const [freestockPage, setFreestockPage] = useState(1);
  const [freestockTotal, setFreestockTotal] = useState(0);
  const [freestockLimit, setFreestockLimit] = useState(20);
  const [freestockQuery, setFreestockQuery] = useState('');
  const [freestockOrientation, setFreestockOrientation] = useState('');
  const [freestockSize, setFreestockSize] = useState('');
  const [pixabayVideos, setPixabayVideos] = useState<FreestockVideo[]>([]);
  const [pixabayLoading, setPixabayLoading] = useState(false);
  const [pixabayError, setPixabayError] = useState<string | null>(null);
  const [pixabayPage, setPixabayPage] = useState(1);
  const [pixabayTotal, setPixabayTotal] = useState(0);
  const [pixabayLimit, setPixabayLimit] = useState(20);
  const [pixabayQuery, setPixabayQuery] = useState('');
  const [pixabayOrientation, setPixabayOrientation] = useState('');
  const [pixabaySize, setPixabaySize] = useState('');
  const [savingVideoIds, setSavingVideoIds] = useState<Record<string, boolean>>({});
  const [savedVideoIds, setSavedVideoIds] = useState<Record<string, string>>({});
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const debouncedEntityQuery = useDebouncedValue(entityQuery, 300);
  const debouncedFreestockQuery = useDebouncedValue(freestockQuery, 300);
  const debouncedPixabayQuery = useDebouncedValue(pixabayQuery, 300);
  const {
    isGenerating: isGeneratingAiSearch,
    error: aiSearchError,
    setError: setAiSearchError,
    generateSearchTerm,
  } = useAiSearchTerm({
    medium: 'video',
    scriptContext,
    sentenceContext: currentSentenceText,
  });

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('entities');
    setIsFiltersExpanded(false);
  }, [isOpen]);

  useEffect(() => {
    setSelectedUrl(selectedVideoUrl ?? null);
  }, [isOpen, selectedVideoUrl]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'entities') return;

    let cancelled = false;

    const run = async () => {
      setEntityLoading(true);
      setEntityError(null);
      try {
        const response = await api.get<PaginatedResponse<SavedVideo>>('/videos-library', {
          params: {
            page: entityPage,
            limit: entityLimit,
            q: debouncedEntityQuery || undefined,
            orientation: entityOrientation || undefined,
          },
        });

        if (cancelled) return;
        setEntityVideos(response.data.items || []);
        setEntityTotal(response.data.total ?? 0);
        setEntityPage(response.data.page ?? entityPage);
        setEntityLimit(response.data.limit ?? entityLimit);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to fetch videos:', error);
        setEntityError('Failed to load your video library');
      } finally {
        if (!cancelled) setEntityLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, entityPage, entityLimit, debouncedEntityQuery, entityOrientation]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'freestock') return;

    let cancelled = false;

    const run = async () => {
      setFreestockLoading(true);
      setFreestockError(null);
      try {
        const response = await api.get<PaginatedResponse<FreestockVideo>>(
          '/videos-library/pexels/search',
          {
            params: {
              page: freestockPage,
              limit: freestockLimit,
              q: debouncedFreestockQuery || undefined,
              orientation: freestockOrientation || undefined,
              size: freestockSize || undefined,
            },
          },
        );

        if (cancelled) return;
        setFreestockVideos(response.data.items || []);
        setFreestockTotal(response.data.total ?? 0);
        setFreestockPage(response.data.page ?? freestockPage);
        setFreestockLimit(response.data.limit ?? freestockLimit);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to fetch Pexels videos:', error);
        setFreestockError('Failed to load freestock videos');
      } finally {
        if (!cancelled) setFreestockLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    activeTab,
    freestockPage,
    freestockLimit,
    debouncedFreestockQuery,
    freestockOrientation,
    freestockSize,
  ]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'pixabay') return;

    let cancelled = false;

    const run = async () => {
      setPixabayLoading(true);
      setPixabayError(null);
      try {
        const response = await api.get<PaginatedResponse<FreestockVideo>>(
          '/videos-library/pixabay/search',
          {
            params: {
              page: pixabayPage,
              limit: pixabayLimit,
              q: debouncedPixabayQuery || undefined,
              orientation: pixabayOrientation || undefined,
              size: pixabaySize || undefined,
            },
          },
        );

        if (cancelled) return;
        setPixabayVideos(response.data.items || []);
        setPixabayTotal(response.data.total ?? 0);
        setPixabayPage(response.data.page ?? pixabayPage);
        setPixabayLimit(response.data.limit ?? pixabayLimit);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to fetch Pixabay videos:', error);
        setPixabayError('Failed to load Pixabay videos');
      } finally {
        if (!cancelled) setPixabayLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    activeTab,
    pixabayPage,
    pixabayLimit,
    debouncedPixabayQuery,
    pixabayOrientation,
    pixabaySize,
  ]);

  const refreshEntityVideos = async () => {
    setEntityLoading(true);
    setEntityError(null);
    try {
      const response = await api.get<PaginatedResponse<SavedVideo>>('/videos-library', {
        params: {
          page: entityPage,
          limit: entityLimit,
          q: debouncedEntityQuery || undefined,
          orientation: entityOrientation || undefined,
        },
      });

      setEntityVideos(response.data.items || []);
      setEntityTotal(response.data.total ?? 0);
      setEntityPage(response.data.page ?? entityPage);
      setEntityLimit(response.data.limit ?? entityLimit);
    } catch (error) {
      console.error('Failed to refresh videos:', error);
      setEntityError('Failed to refresh your video library');
    } finally {
      setEntityLoading(false);
    }
  };

  const refreshFreestockVideos = async () => {
    setFreestockLoading(true);
    setFreestockError(null);
    try {
      const response = await api.get<PaginatedResponse<FreestockVideo>>(
        '/videos-library/pexels/search',
        {
          params: {
            page: freestockPage,
            limit: freestockLimit,
            q: debouncedFreestockQuery || undefined,
            orientation: freestockOrientation || undefined,
            size: freestockSize || undefined,
          },
        },
      );

      setFreestockVideos(response.data.items || []);
      setFreestockTotal(response.data.total ?? 0);
      setFreestockPage(response.data.page ?? freestockPage);
      setFreestockLimit(response.data.limit ?? freestockLimit);
    } catch (error) {
      console.error('Failed to refresh Pexels videos:', error);
      setFreestockError('Failed to load freestock videos');
    } finally {
      setFreestockLoading(false);
    }
  };

  const refreshPixabayVideos = async () => {
    setPixabayLoading(true);
    setPixabayError(null);
    try {
      const response = await api.get<PaginatedResponse<FreestockVideo>>(
        '/videos-library/pixabay/search',
        {
          params: {
            page: pixabayPage,
            limit: pixabayLimit,
            q: debouncedPixabayQuery || undefined,
            orientation: pixabayOrientation || undefined,
            size: pixabaySize || undefined,
          },
        },
      );

      setPixabayVideos(response.data.items || []);
      setPixabayTotal(response.data.total ?? 0);
      setPixabayPage(response.data.page ?? pixabayPage);
      setPixabayLimit(response.data.limit ?? pixabayLimit);
    } catch (error) {
      console.error('Failed to refresh Pixabay videos:', error);
      setPixabayError('Failed to load Pixabay videos');
    } finally {
      setPixabayLoading(false);
    }
  };

  const handleSelectEntityVideo = (video: SavedVideo) => {
    setSelectedUrl(video.video);
    window.setTimeout(() => {
      onSelectVideo(video.video, video.id);
      onClose();
    }, 220);
  };

  const handleSelectFreestockVideo = (video: FreestockVideo) => {
    setSelectedUrl(video.video);
    window.setTimeout(() => {
      onSelectVideo(video.video, null);
      onClose();
    }, 220);
  };

  const handleSaveFreestockVideo = async (video: FreestockVideo) => {
    setSavingVideoIds((prev) => ({ ...prev, [video.id]: true }));
    if (video.source === 'pixabay') {
      setPixabayError(null);
    } else {
      setFreestockError(null);
    }

    const importPath =
      video.source === 'pixabay' ? '/videos-library/pixabay/import' : '/videos-library/pexels/import';

    try {
      const response = await api.post<SavedVideo>(importPath, {
        videoUrl: video.video,
        downloadUrl: video.downloadUrl,
        video_type: video.video_type,
        video_size: video.video_size,
        width: video.width,
        height: video.height,
        source: video.source,
      });

      setSavedVideoIds((prev) => ({ ...prev, [video.id]: response.data.id }));
      await refreshEntityVideos();
    } catch (error) {
      console.error(`Failed to save ${video.source} video:`, error);
      if (video.source === 'pixabay') {
        setPixabayError('Failed to save this video to your library');
      } else {
        setFreestockError('Failed to save this video to your library');
      }
    } finally {
      setSavingVideoIds((prev) => ({ ...prev, [video.id]: false }));
    }
  };

  const handleDeleteVideo = async () => {
    if (!deleteState) return;

    setIsDeleting(true);
    setEntityError(null);
    try {
      await api.delete(`/videos-library/${deleteState.video.id}`, {
        params: {
          force: deleteState.force ? 'true' : undefined,
        },
      });

      if (selectedUrl === deleteState.video.video) {
        setSelectedUrl(null);
      }

      setDeleteState(null);
      await refreshEntityVideos();
    } catch (error: any) {
      const response = error?.response?.data;
      if (response?.code === 'VIDEO_REFERENCED') {
        setDeleteState({
          video: deleteState.video,
          force: true,
          title: 'Video is referenced',
          description: `This video is used by ${response.referenceCount ?? 'one or more'} script sentence(s). Deleting it may leave broken URLs in existing scripts. Delete anyway?`,
        });
      } else {
        console.error('Failed to delete video:', error);
        setDeleteState(null);
        setEntityError('Failed to delete this video');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const stopAllVideos = (resetTime = false) => {
    Object.values(videoRefs.current).forEach((videoElement) => {
      if (!videoElement) return;
      videoElement.pause();
      if (resetTime) {
        try {
          videoElement.currentTime = 0;
        } catch {
          // ignore seek reset failures
        }
      }
    });
    setPlayingVideoId(null);
  };

  const toggleVideoPlayback = async (videoId: string) => {
    const nextVideo = videoRefs.current[videoId];
    if (!nextVideo) return;

    if (playingVideoId === videoId) {
      nextVideo.pause();
      setPlayingVideoId(null);
      return;
    }

    Object.entries(videoRefs.current).forEach(([currentId, videoElement]) => {
      if (!videoElement || currentId === videoId) return;
      videoElement.pause();
      try {
        videoElement.currentTime = 0;
      } catch {
        // ignore seek reset failures
      }
    });

    try {
      nextVideo.currentTime = 0;
    } catch {
      // ignore seek reset failures
    }

    try {
      await nextVideo.play();
      setPlayingVideoId(videoId);
    } catch {
      setPlayingVideoId(null);
    }
  };

  useEffect(() => {
    if (isOpen) return;
    stopAllVideos(true);
  }, [isOpen]);

  useEffect(() => {
    stopAllVideos(true);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      stopAllVideos(true);
    };
  }, []);

  const handleAiSearch = async () => {
    const searchTerm = await generateSearchTerm();
    if (!searchTerm) return;

    if (activeTab === 'entities') {
      setEntityQuery(searchTerm);
      setEntityPage(1);
    } else if (activeTab === 'pixabay') {
      setPixabayQuery(searchTerm);
      setPixabayPage(1);
    } else {
      setFreestockQuery(searchTerm);
      setFreestockPage(1);
    }

    setAiSearchError(null);
  };

  if (!isOpen) return null;

  const activeTotal =
    activeTab === 'entities' ? entityTotal : activeTab === 'pixabay' ? pixabayTotal : freestockTotal;
  const activeCount =
    activeTab === 'entities'
      ? entityVideos.length
      : activeTab === 'pixabay'
        ? pixabayVideos.length
        : freestockVideos.length;
  const activePage =
    activeTab === 'entities' ? entityPage : activeTab === 'pixabay' ? pixabayPage : freestockPage;
  const activeLimit =
    activeTab === 'entities' ? entityLimit : activeTab === 'pixabay' ? pixabayLimit : freestockLimit;
  const activeTotalPages = activeTotal > 0 ? Math.max(1, Math.ceil(activeTotal / activeLimit)) : 1;
  const isLoading =
    activeTab === 'entities'
      ? entityLoading
      : activeTab === 'pixabay'
        ? pixabayLoading
        : freestockLoading;
  const error =
    activeTab === 'entities' ? entityError : activeTab === 'pixabay' ? pixabayError : freestockError;
  const externalProviderLabel = activeTab === 'pixabay' ? 'Pixabay' : 'Pexels';
  const externalVideos = activeTab === 'pixabay' ? pixabayVideos : freestockVideos;
  const activeFilterSummary =
    activeTab === 'entities'
      ? buildFilterSummary([
        entityQuery ? `Search: ${toSummaryText(entityQuery)}` : null,
        entityOrientation ? `Orientation: ${entityOrientation}` : null,
      ])
      : buildFilterSummary([
        (activeTab === 'pixabay' ? pixabayQuery : freestockQuery)
          ? `Search: ${toSummaryText(activeTab === 'pixabay' ? pixabayQuery : freestockQuery)}`
          : null,
        (activeTab === 'pixabay' ? pixabayOrientation : freestockOrientation)
          ? `Orientation: ${activeTab === 'pixabay' ? pixabayOrientation : freestockOrientation}`
          : null,
        (activeTab === 'pixabay' ? pixabaySize : freestockSize)
          ? `Size: ${activeTab === 'pixabay' ? pixabaySize : freestockSize}`
          : null,
      ]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="bg-linear-to-br from-white via-gray-50 to-blue-50/30 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200/50 animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-gray-200/80 bg-linear-to-r from-indigo-50/95 via-white to-pink-50/80 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-purple-500 to-indigo-600 shadow-md">
                  <VideoIcon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">Video Library</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100">
                      <Sparkles className="h-3 w-3" />
                      {activeTotal} result{activeTotal === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {activeTab === 'entities'
                      ? 'Your saved videos'
                      : activeTab === 'pixabay'
                        ? 'Popular and searchable Pixabay videos'
                        : 'Popular and searchable Pexels videos'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/85 text-gray-500 shadow-sm ring-1 ring-gray-200/80 transition hover:bg-white hover:text-gray-700"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid min-w-90 grid-cols-3 gap-1 rounded-2xl bg-white/90 p-1 shadow-sm ring-1 ring-indigo-100/80">
                  <button
                    type="button"
                    onClick={() => setActiveTab('entities')}
                    className={
                      activeTab === 'entities'
                        ? 'rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm'
                        : 'rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-gray-900'
                    }
                  >
                    Your Assets
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('freestock')}
                    className={
                      activeTab === 'freestock'
                        ? 'rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm'
                        : 'rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-gray-900'
                    }
                  >
                    Pexels
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pixabay')}
                    className={
                      activeTab === 'pixabay'
                        ? 'rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm'
                        : 'rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-gray-900'
                    }
                  >
                    Pixabay
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFiltersExpanded((current) => !current)}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white/90 px-3 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-indigo-100/80 transition hover:bg-white"
                >
                  <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                  Filters
                  <ChevronDown
                    className={isFiltersExpanded ? 'h-4 w-4 text-gray-500 transition-transform rotate-180' : 'h-4 w-4 text-gray-500 transition-transform'}
                  />
                </button>
              </div>

              {!isFiltersExpanded ? (
                <p className="text-xs text-gray-500 lg:text-right">{activeFilterSummary}</p>
              ) : null}
            </div>
          </div>

          {!isFiltersExpanded ? (
            <></>
          ) : (
            <div className="border-b border-gray-200/80 px-8 py-4 bg-white/75">
              {activeTab === 'entities' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-3">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        value={entityQuery}
                        onChange={(e) => {
                          setAiSearchError(null);
                          setEntityQuery(e.target.value);
                          setEntityPage(1);
                        }}
                        placeholder="Search saved videos by type"
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>

                    <Select
                      value={entityOrientation || EMPTY_SELECT_VALUE}
                      onValueChange={(value) => {
                        setEntityOrientation(value === EMPTY_SELECT_VALUE ? '' : value);
                        setEntityPage(1);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white text-sm text-gray-700 shadow-sm">
                        <SelectValue placeholder="All orientations" />
                      </SelectTrigger>
                      <SelectContent>
                        {entityOrientationOptions.map((option) => (
                          <SelectItem
                            key={option.value || EMPTY_SELECT_VALUE}
                            value={option.value || EMPTY_SELECT_VALUE}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleAiSearch()}
                      disabled={isGeneratingAiSearch || !currentSentenceText?.trim()}
                      className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      {isGeneratingAiSearch ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Search with AI
                    </Button>
                    <p className="text-xs text-gray-500">
                      Uses the full script and the active sentence to suggest a better search phrase.
                    </p>
                  </div>

                  {aiSearchError ? <p className="text-xs text-red-600">{aiSearchError}</p> : null}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-600">
                  Browse popular Pexels videos or refine with supported filters
                </p> */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <label className="relative block md:col-span-2">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        value={activeTab === 'pixabay' ? pixabayQuery : freestockQuery}
                        onChange={(e) => {
                          setAiSearchError(null);
                          if (activeTab === 'pixabay') {
                            setPixabayQuery(e.target.value);
                            setPixabayPage(1);
                          } else {
                            setFreestockQuery(e.target.value);
                            setFreestockPage(1);
                          }
                        }}
                        placeholder={`Search ${externalProviderLabel} videos`}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>

                    <Select
                      value={(activeTab === 'pixabay' ? pixabayOrientation : freestockOrientation) || EMPTY_SELECT_VALUE}
                      onValueChange={(value) => {
                        if (activeTab === 'pixabay') {
                          setPixabayOrientation(value === EMPTY_SELECT_VALUE ? '' : value);
                          setPixabayPage(1);
                        } else {
                          setFreestockOrientation(value === EMPTY_SELECT_VALUE ? '' : value);
                          setFreestockPage(1);
                        }
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white text-sm text-gray-700 shadow-sm">
                        <SelectValue placeholder="Any orientation" />
                      </SelectTrigger>
                      <SelectContent>
                        {freestockOrientationOptions.map((option) => (
                          <SelectItem
                            key={option.value || EMPTY_SELECT_VALUE}
                            value={option.value || EMPTY_SELECT_VALUE}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={(activeTab === 'pixabay' ? pixabaySize : freestockSize) || EMPTY_SELECT_VALUE}
                      onValueChange={(value) => {
                        if (activeTab === 'pixabay') {
                          setPixabaySize(value === EMPTY_SELECT_VALUE ? '' : value);
                          setPixabayPage(1);
                        } else {
                          setFreestockSize(value === EMPTY_SELECT_VALUE ? '' : value);
                          setFreestockPage(1);
                        }
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white text-sm text-gray-700 shadow-sm">
                        <SelectValue placeholder="Any size" />
                      </SelectTrigger>
                      <SelectContent>
                        {freestockSizeOptions.map((option) => (
                          <SelectItem
                            key={option.value || EMPTY_SELECT_VALUE}
                            value={option.value || EMPTY_SELECT_VALUE}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleAiSearch()}
                      disabled={isGeneratingAiSearch || !currentSentenceText?.trim()}
                      className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      {isGeneratingAiSearch ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Search with AI
                    </Button>
                    <p className="text-xs text-gray-500">
                      Uses the full script and the active sentence to suggest a better search phrase.
                    </p>
                  </div>

                  {aiSearchError ? <p className="text-xs text-red-600">{aiSearchError}</p> : null}
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-8 bg-linear-to-b from-transparent to-gray-50/50">
            {isLoading ? (
              <div className="animate-in fade-in duration-300">
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4  gap-4">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                      <div className="aspect-video rounded-xl bg-linear-to-br from-gray-200 to-gray-300 animate-pulse" />
                      <div className="mt-3 h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="p-5 bg-linear-to-br from-red-50 to-pink-50 rounded-2xl mb-4 shadow-lg">
                  <X className="h-10 w-10 text-red-500" />
                </div>
                <p className="text-sm text-red-600 font-semibold mb-2">{error}</p>
                <p className="text-xs text-gray-500 mb-4">Please check your connection and try again</p>
                <Button
                  onClick={() => {
                    if (activeTab === 'entities') {
                      void refreshEntityVideos();
                    } else if (activeTab === 'pixabay') {
                      void refreshPixabayVideos();
                    } else {
                      void refreshFreestockVideos();
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Loader2 className="h-3.5 w-3.5" />
                  Try Again
                </Button>
              </div>
            ) : activeCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="absolute inset-0 bg-linear-to-r from-blue-400 to-purple-500 rounded-full blur-2xl opacity-10" />
                  <div className="p-6 bg-linear-to-br from-gray-50 to-blue-50 rounded-3xl shadow-xl relative border border-gray-200">
                    <VideoIcon className="h-12 w-12 text-gray-400" />
                  </div>
                </div>
                <p className="text-base text-gray-700 font-semibold mb-2 mt-6">
                  {activeTab === 'entities'
                    ? 'No saved videos found'
                    : `No ${externalProviderLabel.toLowerCase()} videos found`}
                </p>
                <p className="text-sm text-gray-500 text-center max-w-sm">
                  {activeTab === 'entities'
                    ? 'Try a different type or orientation filter.'
                    : `Try a broader search term or loosen the ${externalProviderLabel.toLowerCase()} filters.`}
                </p>
              </div>
            ) : activeTab === 'entities' ? (
              <>
                {/* <div className="mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Click a video to select it
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>
                      Page {activePage} of {activeTotalPages}
                    </span>
                    <span>{activeTotal} total</span>
                  </div>
                </div> */}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {entityVideos.map((video) => {
                    const isSelected = selectedUrl === video.video;
                    return (
                      <div
                        key={video.id}
                        onClick={() => handleSelectEntityVideo(video)}
                        className={
                          isSelected
                            ? 'group relative overflow-hidden rounded-2xl bg-white ring-4 ring-purple-500 ring-offset-2 shadow-xl cursor-pointer'
                            : 'group relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm hover:border-purple-400 hover:shadow-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1'
                        }
                      >
                        <div className={`relative overflow-hidden ${getVideoAspectClass(video.video_size)}`}>
                          <video
                            ref={(node) => {
                              videoRefs.current[video.id] = node;
                            }}
                            src={video.video}
                            preload="metadata"
                            muted={playingVideoId !== video.id}
                            playsInline
                            controls={playingVideoId === video.id}
                            onPlay={() => setPlayingVideoId(video.id)}
                            onPause={() => {
                              if (playingVideoId === video.id) {
                                setPlayingVideoId(null);
                              }
                            }}
                            onEnded={() => {
                              if (playingVideoId === video.id) {
                                setPlayingVideoId(null);
                              }
                            }}
                            className={
                              isSelected
                                ? 'h-full w-full object-cover scale-105 blur-[1px] transition-all duration-300'
                                : 'h-full w-full object-cover transition-all duration-300 group-hover:scale-105'
                            }
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent" />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void toggleVideoPlayback(video.id);
                            }}
                            className="absolute left-3 top-3 z-10 rounded-xl bg-white/90 p-2 text-indigo-700 shadow-lg transition hover:bg-indigo-50"
                            title={playingVideoId === video.id ? 'Pause preview' : 'Play preview'}
                          >
                            {playingVideoId === video.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteState({
                                video,
                                force: false,
                                title: 'Delete video',
                                description:
                                  'Delete this video from your library? Existing scripts may still point to its URL.',
                              });
                            }}
                            className="absolute right-3 top-3 z-10 rounded-xl bg-white/90 p-2 text-red-600 shadow-lg transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {isSelected ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="rounded-full bg-purple-500 p-4 shadow-2xl">
                                <Check className="h-8 w-8 text-white" strokeWidth={3} />
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-3 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-semibold text-gray-800">
                              {video.video_type?.trim() || 'Saved video'}
                            </p>
                            {video.video_size ? (
                              <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                                {video.video_size}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* <div className="mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Select uses the remote Pexels video instantly. Save adds it to your library.
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>
                      Page {activePage} of {activeTotalPages}
                    </span>
                    <span>{activeTotal} total</span>
                  </div>
                </div> */}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {externalVideos.map((video) => {
                    const isSelected = selectedUrl === video.video;
                    const isSaving = Boolean(savingVideoIds[video.id]);
                    const isSaved = Boolean(savedVideoIds[video.id]);

                    return (
                      <div
                        key={video.id}
                        onClick={() => handleSelectFreestockVideo(video)}
                        className={
                          isSelected
                            ? 'overflow-hidden rounded-2xl bg-white ring-4 ring-purple-500 ring-offset-2 shadow-xl cursor-pointer'
                            : 'overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl'
                        }
                      >
                        <div className={`group relative w-full overflow-hidden ${getFreestockVideoAspectClass(video.video_size)}`}>
                          <video
                            ref={(node) => {
                              videoRefs.current[video.id] = node;
                            }}
                            src={video.video}
                            poster={video.thumbnail ?? undefined}
                            muted={playingVideoId !== video.id}
                            playsInline
                            preload="none"
                            controls={playingVideoId === video.id}
                            onPlay={() => setPlayingVideoId(video.id)}
                            onPause={() => {
                              if (playingVideoId === video.id) {
                                setPlayingVideoId(null);
                              }
                            }}
                            onEnded={() => {
                              if (playingVideoId === video.id) {
                                setPlayingVideoId(null);
                              }
                            }}
                            className={
                              isSelected
                                ? 'h-full w-full object-cover scale-105 blur-[1px] transition-all duration-300'
                                : 'h-full w-full object-cover transition-all duration-300 group-hover:scale-105'
                            }
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent" />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void toggleVideoPlayback(video.id);
                            }}
                            className="absolute left-3 top-3 z-10 rounded-xl bg-white/90 p-2 text-indigo-700 shadow-lg transition hover:bg-indigo-50"
                            title={playingVideoId === video.id ? 'Pause preview' : 'Play preview'}
                          >
                            {playingVideoId === video.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </button>
                          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleSaveFreestockVideo(video);
                              }}
                              disabled={isSaving || isSaved}
                              className="rounded-xl bg-white/90 text-indigo-700 shadow-lg hover:bg-white"
                            >
                              {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                downloadAsset(video.downloadUrl, `${video.externalId}.mp4`);
                              }}
                              className="rounded-xl bg-white/90 text-indigo-700 shadow-lg hover:bg-white"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                          {isSelected ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="rounded-full bg-purple-500 p-4 shadow-2xl">
                                <Check className="h-8 w-8 text-white" strokeWidth={3} />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {!isLoading && !error && activeCount > 0 ? (
            <div className="flex items-center justify-between gap-3 px-8 py-5 border-t border-gray-200/80 bg-linear-to-r from-gray-50 to-blue-50/30">
              <p className="text-xs text-gray-500">
                {activeTab === 'entities'
                  ? 'Select a video to use it in your sentence, or delete entries you no longer need.'
                  : `${externalProviderLabel} videos can be selected immediately or saved into your library first.`}
              </p>

              <div className="flex items-center gap-3">
                {activeTotalPages > 1 ? (
                  <Pagination
                    currentPage={activePage}
                    totalPages={activeTotalPages}
                    onPageChange={(nextPage) => {
                      if (activeTab === 'entities') {
                        setEntityPage(nextPage);
                      } else if (activeTab === 'pixabay') {
                        setPixabayPage(nextPage);
                      } else {
                        setFreestockPage(nextPage);
                      }
                    }}
                  />
                ) : null}

                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                  className="gap-2 hover:bg-white transition-all hover:scale-105"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <AlertDialog
        isOpen={Boolean(deleteState)}
        onClose={() => {
          if (!isDeleting) setDeleteState(null);
        }}
        onCancel={() => setDeleteState(null)}
        onConfirm={() => void handleDeleteVideo()}
        title={deleteState?.title ?? 'Delete video'}
        description={deleteState?.description ?? ''}
        confirmText={deleteState?.force ? 'Delete anyway' : 'Delete video'}
        cancelText="Cancel"
        variant={deleteState?.force ? 'warning' : 'danger'}
        isLoading={isDeleting}
      />
    </>
  );
}
