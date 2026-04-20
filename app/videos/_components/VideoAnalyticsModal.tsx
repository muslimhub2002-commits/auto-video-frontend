'use client';

import { useState } from 'react';
import { BarChart3, Calendar, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage, startYoutubeReconnect } from '@/lib/youtube-auth';
import type { VideoPlatformCategory } from '../../generate/_components/sidebar/sidebar-data';
import {
  formatDate,
  formatDuration,
  formatMetricValue,
  getDisplayTitle,
  type PlatformStatus,
  type VideoDetail,
  type VideoListItem,
  type YoutubeAnalyticsResponse,
} from './video-library-shared';

type VideoAnalyticsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  video: VideoDetail | VideoListItem | null;
  activePlatform: VideoPlatformCategory;
  activePlatformLabel: string;
  previewDurationSeconds: number | null;
  videoFormatLabel: string;
  isLoadingPlatformStatus: boolean;
  platformStatus: PlatformStatus | null;
  platformStatusError: string | null;
  isLoadingYoutubeAnalytics: boolean;
  youtubeAnalytics: YoutubeAnalyticsResponse | null;
  youtubeAnalyticsError: string | null;
};

function AnalyticsSkeletonLine({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-full bg-slate-200/80 ${className}`}
    />
  );
}

function YoutubeAnalyticsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">Loading YouTube analytics.</span>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={`analytics-summary-skeleton-${index}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <AnalyticsSkeletonLine className="h-3 w-28" />
            <AnalyticsSkeletonLine className="mt-3 h-8 w-24 rounded-xl" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={`analytics-metric-skeleton-${index}`}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <AnalyticsSkeletonLine className="h-3 w-24" />
            <AnalyticsSkeletonLine className="mt-3 h-9 w-20 rounded-xl" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <div
            key={`analytics-detail-skeleton-${index}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <AnalyticsSkeletonLine className="h-3 w-32" />
            <div className="mt-3 space-y-2">
              <AnalyticsSkeletonLine className="h-4 w-full rounded-lg" />
              <AnalyticsSkeletonLine className="h-4 w-5/6 rounded-lg" />
              <AnalyticsSkeletonLine className="h-4 w-3/4 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VideoAnalyticsModal({
  isOpen,
  onClose,
  video,
  activePlatform,
  activePlatformLabel,
  previewDurationSeconds,
  videoFormatLabel,
  platformStatus,
  isLoadingYoutubeAnalytics,
  youtubeAnalytics,
  youtubeAnalyticsError,
}: VideoAnalyticsModalProps) {
  const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);

  if (!isOpen || !video) {
    return null;
  }

  const channelTitle = String(youtubeAnalytics?.channel.title ?? '').trim();

  const reconnectWarningPattern =
    /reconnect youtube|grant analytics access|grant read access|unlock full metrics|access token/i;
  const youtubeReconnectWarnings = (youtubeAnalytics?.warnings ?? []).filter(
    (warning) => reconnectWarningPattern.test(warning),
  );
  const remainingWarnings = (youtubeAnalytics?.warnings ?? []).filter(
    (warning) => !reconnectWarningPattern.test(warning),
  );
  const shouldShowYoutubeReconnect =
    activePlatform === 'youtube' &&
    (Boolean(platformStatus?.requiresReconnect) ||
      platformStatus?.supportsAnalytics === false ||
      youtubeAnalytics?.analytics.scopeGranted === false ||
      youtubeAnalytics?.analytics.metadataScopeGranted === false ||
      youtubeReconnectWarnings.length > 0 ||
      reconnectWarningPattern.test(youtubeAnalyticsError ?? ''));

  const reconnectMessage = platformStatus?.canUpload
    ? 'Uploads are still available, but this YouTube connection is missing the read scopes required for video metadata and full analytics.'
    : 'This YouTube connection needs to be refreshed before analytics can load completely.';

  const handleReconnectYouTube = async () => {
    setReconnectError(null);
    setIsConnectingYouTube(true);
    try {
      await startYoutubeReconnect();
    } catch (error) {
      setReconnectError(
        getApiErrorMessage(error, 'Failed to start YouTube reconnection.'),
      );
    } finally {
      setIsConnectingYouTube(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="my-4 max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-white/80 bg-white/95 p-5 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.6)] lg:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                {getDisplayTitle(video)}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                Review platform health and analytics signals for the current {activePlatformLabel.toLowerCase()} mode.
              </p>
              {channelTitle ? (
                <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-slate-900">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-red-700">
                    Channel
                  </span>
                  <span className="truncate font-semibold text-slate-900">
                    {channelTitle}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                <Calendar className="h-3.5 w-3.5" />
                Updated {formatDate(video.updated_at ?? video.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                <BarChart3 className="h-3.5 w-3.5" />
                {videoFormatLabel}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <X className="mr-2 h-4 w-4" />
            Close analytics
          </Button>
        </div>

        <div className="mt-6 space-y-6">
          {/* <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              Platform Health
            </div>

            <div className="mt-4">
              {activePlatform === 'all' ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                  Choose a specific platform mode on the videos page to view platform health and analytics.
                </div>
              ) : isLoadingPlatformStatus ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading {activePlatformLabel.toLowerCase()} connection health...
                </div>
              ) : platformStatusError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-700">
                  {platformStatusError}
                </div>
              ) : platformStatus ? (
                <div className="space-y-4">
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${getConnectionTone(platformStatus)}`}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {getConnectionLabel(platformStatus)}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                        Upload readiness
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {platformStatus.canUpload
                          ? `${activePlatformLabel} is ready to accept uploads from this account.`
                          : `${activePlatformLabel} is not ready for upload yet. Review the status note and reconnect if needed.`}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                        Last platform note
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {platformStatus.lastError?.trim() || 'No blocking platform error is currently reported.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Connected at
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatDate(platformStatus.connectedAt)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Reconnect
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {platformStatus.requiresReconnect ? 'Required' : 'Not required'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Expiry window
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {platformStatus.daysUntilExpiry == null
                          ? 'Unknown'
                          : `${platformStatus.daysUntilExpiry} days`}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Platform id
                      </p>
                      <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                        {platformStatus.creatorUsername ||
                          platformStatus.facebookPageId ||
                          platformStatus.instagramAccountId ||
                          platformStatus.creatorNickname ||
                          'Unavailable'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                  No platform health data is available yet.
                </div>
              )}
            </div>
          </div> */}

          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <BarChart3 className="h-4 w-4" />
              Analytics View
            </div>

            <div className="mt-4">
              {activePlatform !== 'youtube' ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                  Detailed analytics are currently available in YouTube mode. Switch the videos page to YouTube to load watch-time and engagement metrics for this record.
                </div>
              ) : isLoadingYoutubeAnalytics ? (
                <YoutubeAnalyticsSkeleton />
              ) : (
                <div className="space-y-4">
                  {youtubeAnalyticsError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-700">
                      {youtubeAnalyticsError}
                    </div>
                  ) : null}

                  {youtubeAnalytics ? (
                    <>
                      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            <BarChart3 className="h-4 w-4" />
                            Video duration
                          </div>
                          <p className="mt-3 text-lg font-black text-slate-900">
                            {youtubeAnalytics.video.duration.label || formatDuration(previewDurationSeconds)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Average view duration
                          </div>
                          <p className="mt-3 text-lg font-black text-slate-900">
                            {formatMetricValue(youtubeAnalytics.metrics.averageViewDurationLabel, 'duration')}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Watch time
                          </div>
                          <p className="mt-3 text-lg font-black text-slate-900">
                            {formatMetricValue(youtubeAnalytics.metrics.watchTimeMinutes, 'minutes')}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Average View Percentage
                          </div>
                          <p className="mt-3 text-lg font-black text-slate-900">
                            {formatMetricValue(youtubeAnalytics.metrics.averageViewPercentage, 'percent')}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Views
                          </p>
                          <p className="mt-3 text-xl font-black text-slate-900">
                            {formatMetricValue(youtubeAnalytics.metrics.views, 'integer')}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Unique viewers
                          </p>
                          <p className="mt-3 text-xl font-black text-slate-900">
                            {formatMetricValue(youtubeAnalytics.metrics.uniqueViewers, 'integer')}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Engaged views
                          </p>
                          <p className="mt-3 text-xl font-black text-slate-900">
                            {formatMetricValue(youtubeAnalytics.metrics.engagedViews, 'integer')}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Likes
                          </p>
                          <p className="mt-3 text-xl font-black text-slate-900">
                            {formatMetricValue(youtubeAnalytics.metrics.likes, 'integer')}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Comments
                          </p>
                          <p className="mt-3 text-xl font-black text-slate-900">
                            {formatMetricValue(youtubeAnalytics.metrics.comments, 'integer')}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Shares
                          </p>
                          <p className="mt-3 text-xl font-black text-slate-900">
                            {formatMetricValue(youtubeAnalytics.metrics.shares, 'integer')}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Analytics window
                          </div>
                          <p className="mt-3 text-sm leading-7 text-slate-600">
                            {youtubeAnalytics.period.startDate} to {youtubeAnalytics.period.endDate}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Scope status
                          </div>
                          <p className="mt-3 text-sm leading-7 text-slate-600">
                            {youtubeAnalytics.analytics.scopeGranted
                              ? 'The current YouTube connection includes analytics read access.'
                              : 'Reconnect YouTube to grant analytics access for this page.'}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : !youtubeAnalyticsError ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                      No analytics are available for this selection yet.
                    </div>
                  ) : null}

                  {shouldShowYoutubeReconnect ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">
                            YouTube Reconnect
                          </div>
                          <p className="mt-2 text-sm leading-7 text-amber-900">
                            {reconnectMessage}
                          </p>
                          <p className="mt-1 text-xs leading-6 text-amber-800">
                            Approve the refreshed YouTube consent flow, then reopen analytics to load the new scopes.
                          </p>
                        </div>

                        <Button
                          type="button"
                          onClick={handleReconnectYouTube}
                          disabled={isConnectingYouTube}
                          className="rounded-2xl bg-red-600 text-white hover:bg-red-700 hover:text-white"
                        >
                          {isConnectingYouTube ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Starting reconnect...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Reconnect YouTube
                            </>
                          )}
                        </Button>
                      </div>

                      {reconnectError ? (
                        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                          {reconnectError}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {remainingWarnings.length > 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                      {remainingWarnings.map((warning) => (
                        <div key={warning}>{warning}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}