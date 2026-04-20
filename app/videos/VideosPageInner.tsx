'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { api, youtubeApi } from '@/lib/api';
import { getVideoFormatKind, getVideoFormatLabel } from '@/lib/video-format';
import { HeaderBar } from '../generate/_components/HeaderBar';
import { MetaUploadModal } from '../generate/_components/MetaUploadModal';
import { Pagination } from '../generate/_components/Pagination';
import { Sidebar } from '../generate/_components/Sidebar';
import { TikTokUploadModal } from '../generate/_components/TikTokUploadModal';
import { YouTubeUploadModal } from '../generate/_components/YouTubeUploadModal';
import {
  normalizeVideoPlatform,
  videoPlatforms,
  type VideoPlatformCategory,
} from '../generate/_components/sidebar/sidebar-data';
import { useAuthGuard } from '../generate/_hooks/useAuthGuard';
import { VideoAnalyticsModal } from './_components/VideoAnalyticsModal';
import { VideoDetailsModal } from './_components/VideoDetailsModal';
import { VideoLibraryCard } from './_components/VideoLibraryCard';
import {
  getApiErrorMessage,
  getDisplayTitle,
  getPlatformStatusEndpoint,
  getPublishedLinks,
  getPublishedPlatforms,
  mergeVideoDetail,
  type PlatformStatus,
  type PublishedPlatform,
  type VideoDetail,
  type VideoLibraryResponse,
  type VideoListItem,
  type YoutubeAnalyticsResponse,
} from './_components/video-library-shared';
import { Clapperboard, Loader2, Search, Sparkles } from 'lucide-react';

const PAGE_SIZE = 8;

type ModalKind = 'details' | 'analytics';

type VideosPageInnerProps = {
  initialPlatform?: VideoPlatformCategory;
};

export function VideosPageInner({
  initialPlatform = 'all',
}: VideosPageInnerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading, handleLogout } = useAuthGuard();

  const activePlatform = normalizeVideoPlatform(
    searchParams.get('platform') ?? initialPlatform,
  );
  const activePlatformItem =
    videoPlatforms.find((item) => item.category === activePlatform) ??
    videoPlatforms[0];

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoListItem | null>(null);
  const [selectedVideoDetail, setSelectedVideoDetail] =
    useState<VideoDetail | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isLoadingPlatformStatus, setIsLoadingPlatformStatus] = useState(false);
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(
    null,
  );
  const [platformStatusError, setPlatformStatusError] = useState<string | null>(
    null,
  );
  const [previewDurationSeconds, setPreviewDurationSeconds] = useState<number | null>(
    null,
  );
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [isLoadingYoutubeAnalytics, setIsLoadingYoutubeAnalytics] =
    useState(false);
  const [youtubeAnalytics, setYoutubeAnalytics] =
    useState<YoutubeAnalyticsResponse | null>(null);
  const [youtubeAnalyticsError, setYoutubeAnalyticsError] = useState<string | null>(
    null,
  );
  const [libraryReloadToken, setLibraryReloadToken] = useState(0);
  const [activeModal, setActiveModal] = useState<ModalKind | null>(null);
  const [pendingModalAction, setPendingModalAction] = useState<ModalKind | null>(
    null,
  );

  const detailCacheRef = useRef<Map<string, VideoDetail>>(new Map());
  const statusCacheRef = useRef<Map<PublishedPlatform, PlatformStatus>>(new Map());
  const analyticsCacheRef = useRef<Map<string, YoutubeAnalyticsResponse>>(
    new Map(),
  );
  const detailRequestRef = useRef<string | null>(null);

  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
  const previewReadyCount = videos.filter((video) =>
    String(video.video_url ?? '').trim(),
  ).length;
  const publishedCount = videos.filter(
    (video) => getPublishedPlatforms(video).length > 0,
  ).length;
  const activePlatformPublishedCount =
    activePlatform === 'all'
      ? publishedCount
      : videos.filter((video) =>
          getPublishedPlatforms(video).includes(activePlatform),
        ).length;

  const activeSelectedVideo = selectedVideoDetail ?? selectedVideo;
  const activeSelectedVideoId = activeSelectedVideo?.id ?? null;
  const activeSelectedYoutubeUrl = String(
    activeSelectedVideo?.youtube_url ?? '',
  ).trim();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchText]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchText, activePlatform]);

  useEffect(() => {
    async function fetchVideoLibrary() {
      setIsLoadingVideos(true);
      setListError(null);

      try {
        const response = await api.get<VideoLibraryResponse>(
          '/scripts/video-library',
          {
            params: {
              page,
              limit: PAGE_SIZE,
              ...(activePlatform !== 'all' ? { platform: activePlatform } : {}),
              ...(debouncedSearchText ? { title: debouncedSearchText } : {}),
            },
          },
        );

        setVideos(response.data.items ?? []);
        setTotal(response.data.total ?? 0);
      } catch (error) {
        console.error('Failed to load video library:', error);
        setListError('Failed to load the video library. Try again in a moment.');
      } finally {
        setIsLoadingVideos(false);
      }
    }

    void fetchVideoLibrary();
  }, [activePlatform, debouncedSearchText, libraryReloadToken, page]);

  useEffect(() => {
    setPreviewDurationSeconds(null);
  }, [activeSelectedVideoId]);

  useEffect(() => {
    if (
      activeModal !== 'analytics' ||
      !activeSelectedVideoId ||
      activePlatform === 'all'
    ) {
      setPlatformStatus(null);
      setPlatformStatusError(null);
      setIsLoadingPlatformStatus(false);
      return;
    }

    const endpoint = getPlatformStatusEndpoint(activePlatform);
    if (!endpoint) {
      setPlatformStatus(null);
      setPlatformStatusError(null);
      setIsLoadingPlatformStatus(false);
      return;
    }

    const platformKey = activePlatform as PublishedPlatform;
    const platformApiClient = activePlatform === 'youtube' ? youtubeApi : api;
    const platformStatusEndpoint = endpoint;

    const cachedStatus = statusCacheRef.current.get(platformKey);
    if (cachedStatus) {
      setPlatformStatus(cachedStatus);
      setPlatformStatusError(null);
      setIsLoadingPlatformStatus(false);
      return;
    }

    let cancelled = false;

    async function loadPlatformStatus() {
      setIsLoadingPlatformStatus(true);
      setPlatformStatusError(null);

      try {
        const response = await platformApiClient.get<PlatformStatus>(
          platformStatusEndpoint,
        );
        if (cancelled) return;

        statusCacheRef.current.set(platformKey, response.data);
        setPlatformStatus(response.data);
      } catch (error) {
        console.error('Failed to load platform status:', error);
        if (!cancelled) {
          setPlatformStatus(null);
          setPlatformStatusError(
            `Failed to load ${activePlatformItem.label.toLowerCase()} connection health.`,
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPlatformStatus(false);
        }
      }
    }

    void loadPlatformStatus();

    return () => {
      cancelled = true;
    };
  }, [activeModal, activePlatform, activePlatformItem.label, activeSelectedVideoId]);

  useEffect(() => {
    if (activeModal !== 'analytics' || activePlatform !== 'youtube') {
      setIsLoadingYoutubeAnalytics(false);
      return;
    }

    if (!activeSelectedVideoId) {
      setYoutubeAnalytics(null);
      setYoutubeAnalyticsError(null);
      setIsLoadingYoutubeAnalytics(false);
      return;
    }

    if (!activeSelectedYoutubeUrl) {
      setYoutubeAnalytics(null);
      setYoutubeAnalyticsError('This video has not been published to YouTube yet.');
      setIsLoadingYoutubeAnalytics(false);
      return;
    }

    const analyticsVideoId = activeSelectedVideoId;

    const cached = analyticsCacheRef.current.get(analyticsVideoId);
    if (cached) {
      setYoutubeAnalytics(cached);
      setYoutubeAnalyticsError(null);
      setIsLoadingYoutubeAnalytics(false);
      return;
    }

    let cancelled = false;

    async function loadAnalytics() {
      setIsLoadingYoutubeAnalytics(true);
      setYoutubeAnalyticsError(null);

      try {
        const response = await youtubeApi.get<YoutubeAnalyticsResponse>(
          `/youtube/analytics/${encodeURIComponent(analyticsVideoId)}`,
        );
        if (cancelled) return;

        analyticsCacheRef.current.set(analyticsVideoId, response.data);
        setYoutubeAnalytics(response.data);
      } catch (error) {
        console.error('Failed to load YouTube analytics:', error);
        if (!cancelled) {
          setYoutubeAnalytics(null);
          setYoutubeAnalyticsError(
            getApiErrorMessage(
              error,
              'Failed to load YouTube analytics for this video.',
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingYoutubeAnalytics(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [activeModal, activePlatform, activeSelectedVideoId, activeSelectedYoutubeUrl]);

  const loadVideoDetail = useCallback(
    async (videoId: string, baseVideo?: VideoListItem | null) => {
      const cached = detailCacheRef.current.get(videoId);
      if (cached) {
        return cached;
      }

      const response = await api.get<VideoDetail>(
        `/scripts/video-library/${encodeURIComponent(videoId)}`,
      );

      const merged = mergeVideoDetail(
        baseVideo,
        response.data as Partial<VideoDetail>,
      );
      detailCacheRef.current.set(videoId, merged);
      return merged;
    },
    [],
  );

  const handleSelectVideo = useCallback(
    async (video: VideoListItem) => {
      detailRequestRef.current = video.id;
      setSelectedVideo(video);
      setSelectedVideoDetail(detailCacheRef.current.get(video.id) ?? null);
      setDetailError(null);

      if (detailCacheRef.current.has(video.id)) {
        setIsLoadingDetails(false);
        return;
      }

      setIsLoadingDetails(true);

      try {
        const detail = await loadVideoDetail(video.id, video);
        if (detailRequestRef.current !== video.id) return;
        setSelectedVideoDetail(detail);
      } catch (error) {
        console.error('Failed to load video detail:', error);
        if (detailRequestRef.current === video.id) {
          setDetailError('Failed to load the selected video details.');
        }
      } finally {
        if (detailRequestRef.current === video.id) {
          setIsLoadingDetails(false);
        }
      }
    },
    [loadVideoDetail],
  );

  const openModalForVideo = useCallback(
    (video: VideoListItem, modalKind: ModalKind) => {
      setPendingModalAction(modalKind);
      setActiveModal(modalKind);
      void handleSelectVideo(video).finally(() => {
        setPendingModalAction((current) =>
          current === modalKind ? null : current,
        );
      });
    },
    [handleSelectVideo],
  );

  const handleCloseSelectedVideo = useCallback(() => {
    detailRequestRef.current = null;
    setActiveModal(null);
    setPendingModalAction(null);
    setSelectedVideo(null);
    setSelectedVideoDetail(null);
    setDetailError(null);
    setPlatformStatus(null);
    setPlatformStatusError(null);
    setPreviewDurationSeconds(null);
    setYoutubeAnalytics(null);
    setYoutubeAnalyticsError(null);
  }, []);

  async function refreshVideoRecord(scriptId?: string | null) {
    const normalizedId = String(scriptId ?? '').trim();
    if (!normalizedId) return;

    const currentVideo =
      videos.find((video) => video.id === normalizedId) ??
      (selectedVideo?.id === normalizedId ? selectedVideo : null);

    try {
      const detail = await loadVideoDetail(normalizedId, currentVideo);
      setVideos((current) =>
        current.map((video) =>
          video.id === normalizedId
            ? {
                ...video,
                ...detail,
                published_platforms: getPublishedPlatforms(detail),
              }
            : video,
        ),
      );

      if (selectedVideo?.id === normalizedId) {
        setSelectedVideo((current) =>
          current && current.id === normalizedId
            ? {
                ...current,
                ...detail,
                published_platforms: getPublishedPlatforms(detail),
              }
            : current,
        );
        setSelectedVideoDetail(detail);
      }
    } catch (error) {
      console.error('Failed to refresh video record:', error);
    }
  }

  async function handlePublishSuccess(params: {
    scriptId: string | null;
    invalidatePlatforms: PublishedPlatform[];
  }) {
    const normalizedId =
      String(params.scriptId ?? '').trim() || selectedVideo?.id || null;

    params.invalidatePlatforms.forEach((platform) => {
      statusCacheRef.current.delete(platform);
    });

    if (normalizedId) {
      detailCacheRef.current.delete(normalizedId);
      analyticsCacheRef.current.delete(normalizedId);
      await refreshVideoRecord(normalizedId);
    }

    setLibraryReloadToken((current) => current + 1);
  }

  function handlePlatformChange(platform: VideoPlatformCategory) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('platform', platform);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const effectiveSelectedVideo = selectedVideoDetail ?? selectedVideo;
  const selectedVideoTitle = effectiveSelectedVideo
    ? getDisplayTitle(effectiveSelectedVideo)
    : null;
  const selectedPublishedLinks = effectiveSelectedVideo
    ? getPublishedLinks(effectiveSelectedVideo)
    : [];
  const selectedScriptCharacters = Array.isArray(selectedVideoDetail?.characters)
    ? selectedVideoDetail.characters
    : [];
  const selectedScriptText = String(
    selectedVideoDetail?.script ?? selectedVideo?.script ?? '',
  ).trim();
  const selectedVideoUrl =
    String(selectedVideoDetail?.video_url ?? selectedVideo?.video_url ?? '').trim() ||
    null;
  const selectedResolvedDurationSeconds =
    previewDurationSeconds ?? youtubeAnalytics?.video.duration.seconds ?? null;
  const selectedVideoFormatKind = getVideoFormatKind(
    selectedResolvedDurationSeconds,
  );
  const selectedIsShortVideo =
    selectedVideoFormatKind === 'short'
      ? true
      : selectedVideoFormatKind === 'long'
        ? false
        : Boolean(selectedVideoDetail?.isShortScript);
  const selectedVideoFormatLabel =
    effectiveSelectedVideo == null
      ? 'Unknown'
      : selectedVideoFormatKind === 'unknown'
        ? 'Unknown'
        : getVideoFormatLabel(selectedResolvedDurationSeconds);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar user={user} isOpen={isSidebarOpen} onLogout={handleLogout} />

      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar onToggleSidebar={() => setIsSidebarOpen((current) => !current)} />

        <main className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
            <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.55)] lg:p-8">
              <div className="absolute -left-20 top-0 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />
              <div className="absolute right-0 top-10 h-52 w-52 rounded-full bg-indigo-300/20 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Videos Hub
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                      {activePlatformItem.label}
                    </h1>
                    <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                      Review publication readiness, open detailed playback, and inspect platform analytics without leaving the library.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-110">
                  <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Visible videos
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{total}</p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Internal preview ready
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {previewReadyCount}
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {activePlatform === 'all'
                        ? 'Published videos'
                        : `${activePlatformItem.label} published`}
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {activePlatformPublishedCount}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/80 bg-white/90 p-4 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.55)] sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search video titles and script text"
                      className="h-12 rounded-2xl border-slate-200 bg-white pl-11 text-sm shadow-none"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Platform selection changes analytics context. Search always scans the whole video library.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {videoPlatforms.map((item) => {
                  const isActive = item.category === activePlatform;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handlePlatformChange(item.category ?? 'all')}
                      className={`min-w-45 cursor-pointer rounded-[24px] border px-4 py-3 text-left transition ${
                        isActive
                          ? `${item.accent} shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)]`
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-[11px] font-black uppercase tracking-[0.18em]">
                        {item.code}
                      </div>
                      <div className="mt-2 text-sm font-semibold">{item.label}</div>
                      <div className="mt-1 text-xs opacity-80">{item.meta}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              {listError ? (
                <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-8 text-sm text-rose-700">
                  {listError}
                </div>
              ) : isLoadingVideos ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className="animate-pulse rounded-[32px] border border-slate-200/80 bg-white/90 p-5"
                    >
                      <div className="h-4 w-28 rounded-full bg-slate-200" />
                      <div className="mt-4 h-7 w-2/5 rounded-full bg-slate-200" />
                      <div className="mt-4 space-y-2">
                        <div className="h-3 rounded-full bg-slate-200" />
                        <div className="h-3 w-11/12 rounded-full bg-slate-200" />
                        <div className="h-3 w-8/12 rounded-full bg-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : videos.length === 0 ? (
                <div className="rounded-[32px] border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center shadow-[0_24px_50px_-40px_rgba(15,23,42,0.45)]">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-500">
                    <Clapperboard className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-slate-900">
                    No videos found
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
                    {debouncedSearchText
                      ? 'Nothing in the current video library matched your search.'
                      : 'Render a video or publish an existing one to populate this library.'}
                  </p>
                </div>
              ) : (
                <>
                  {videos.map((video) => (
                    <VideoLibraryCard
                      key={video.id}
                      video={video}
                      activePlatformLabel={activePlatformItem.label}
                      isSelected={activeSelectedVideoId === video.id && activeModal !== null}
                      isDetailsLoading={
                        isLoadingDetails &&
                        detailRequestRef.current === video.id &&
                        pendingModalAction === 'details'
                      }
                      isAnalyticsLoading={
                        isLoadingDetails &&
                        detailRequestRef.current === video.id &&
                        pendingModalAction === 'analytics'
                      }
                      onSeeDetails={(nextVideo) => {
                        openModalForVideo(nextVideo, 'details');
                      }}
                      onSeeAnalytics={(nextVideo) => {
                        openModalForVideo(nextVideo, 'analytics');
                      }}
                    />
                  ))}

                  <div className="pt-2">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      <VideoDetailsModal
        key={`${effectiveSelectedVideo?.id ?? 'empty'}-${
          activeModal === 'details' ? 'open' : 'closed'
        }`}
        isOpen={activeModal === 'details'}
        onClose={handleCloseSelectedVideo}
        video={effectiveSelectedVideo}
        videoTitle={selectedVideoTitle}
        videoUrl={selectedVideoUrl}
        videoFormatLabel={selectedVideoFormatLabel}
        previewDurationSeconds={previewDurationSeconds}
        publishedLinks={selectedPublishedLinks}
        scriptText={selectedScriptText}
        detailError={detailError}
        onOpenYouTubeUpload={() => setShowYouTubeModal(true)}
        onOpenMetaUpload={() => setShowMetaModal(true)}
        onOpenTikTokUpload={() => setShowTikTokModal(true)}
        onPreviewDurationChange={setPreviewDurationSeconds}
      />

      <VideoAnalyticsModal
        isOpen={activeModal === 'analytics'}
        onClose={handleCloseSelectedVideo}
        video={effectiveSelectedVideo}
        activePlatform={activePlatform}
        activePlatformLabel={activePlatformItem.label}
        previewDurationSeconds={selectedResolvedDurationSeconds}
        videoFormatLabel={selectedVideoFormatLabel}
        isLoadingPlatformStatus={isLoadingPlatformStatus}
        platformStatus={platformStatus}
        platformStatusError={platformStatusError}
        isLoadingYoutubeAnalytics={isLoadingYoutubeAnalytics}
        youtubeAnalytics={youtubeAnalytics}
        youtubeAnalyticsError={youtubeAnalyticsError}
      />

      <YouTubeUploadModal
        isOpen={showYouTubeModal}
        onClose={() => setShowYouTubeModal(false)}
        videoUrl={selectedVideoUrl}
        isShortVideo={selectedIsShortVideo}
        videoDurationSeconds={selectedResolvedDurationSeconds}
        scriptId={effectiveSelectedVideo?.id ?? null}
        script={selectedScriptText}
        scriptCharacters={selectedScriptCharacters}
        onUploaded={async ({ scriptId }) => {
          await handlePublishSuccess({
            scriptId,
            invalidatePlatforms: ['youtube'],
          });
        }}
      />

      <MetaUploadModal
        isOpen={showMetaModal}
        onClose={() => setShowMetaModal(false)}
        videoUrl={selectedVideoUrl}
        isShortVideo={selectedIsShortVideo}
        videoDurationSeconds={selectedResolvedDurationSeconds}
        scriptId={effectiveSelectedVideo?.id ?? null}
        script={selectedScriptText}
        scriptCharacters={selectedScriptCharacters}
        onUploaded={async ({ scriptId }) => {
          await handlePublishSuccess({
            scriptId,
            invalidatePlatforms: ['facebook', 'instagram'],
          });
        }}
      />

      <TikTokUploadModal
        isOpen={showTikTokModal}
        onClose={() => setShowTikTokModal(false)}
        videoUrl={selectedVideoUrl}
        isShortVideo={selectedIsShortVideo}
        videoDurationSeconds={selectedResolvedDurationSeconds}
        scriptId={effectiveSelectedVideo?.id ?? null}
        script={selectedScriptText}
        scriptCharacters={selectedScriptCharacters}
        onUploaded={async ({ scriptId }) => {
          await handlePublishSuccess({
            scriptId,
            invalidatePlatforms: ['tiktok'],
          });
        }}
      />
    </div>
  );
}