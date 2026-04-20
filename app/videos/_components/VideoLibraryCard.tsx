'use client';

import { BarChart3, Calendar, Clapperboard, ExternalLink, Link2, Loader2, PlayCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildScriptPreview,
  formatDate,
  getDisplayTitle,
  getPublishedLinks,
  type VideoListItem,
} from './video-library-shared';

type VideoLibraryCardProps = {
  video: VideoListItem;
  activePlatformLabel: string;
  isSelected: boolean;
  isDetailsLoading: boolean;
  isAnalyticsLoading: boolean;
  onSeeDetails: (video: VideoListItem) => void;
  onSeeAnalytics: (video: VideoListItem) => void;
};

export function VideoLibraryCard({
  video,
  activePlatformLabel,
  isSelected,
  isDetailsLoading,
  isAnalyticsLoading,
  onSeeDetails,
  onSeeAnalytics,
}: VideoLibraryCardProps) {
  const publishedLinks = getPublishedLinks(video);

  return (
    <article
      className={`rounded-[32px] border bg-white/90 p-5 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.6)] transition ${
        isSelected ? 'border-sky-200 ring-1 ring-sky-200' : 'border-white/80'
      } lg:p-6`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              {video.language || 'Language N/A'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(video.updated_at ?? video.created_at)}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                String(video.video_url ?? '').trim()
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              {String(video.video_url ?? '').trim()
                ? 'Internal preview ready'
                : 'Preview missing'}
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              {getDisplayTitle(video)}
            </h2>
            <p className="text-sm leading-7 text-slate-600">
              {buildScriptPreview(video.script)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <Clapperboard className="h-4 w-4" />
              {video.sentences_count} scenes
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <Link2 className="h-4 w-4" />
              {publishedLinks.length > 0
                ? `${publishedLinks.length} platform links`
                : 'Not published yet'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {publishedLinks.length > 0 ? (
              publishedLinks.map((link) => (
                <a
                  key={`${video.id}-${link.platform}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition hover:brightness-95 ${link.pillClassName}`}
                >
                  {link.label}
                  <ExternalLink className="h-4 w-4" />
                </a>
              ))
            ) : (
              <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                Internal video only
              </span>
            )}
          </div>
        </div>

        <div className="w-full space-y-3 xl:w-72">
          <Button
            type="button"
            variant="outline"
            onClick={() => onSeeDetails(video)}
            className="w-full cursor-pointer justify-between rounded-2xl border-slate-200 bg-white py-6 text-slate-900 transition-transform duration-300 hover:scale-[1.02] hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              {isDetailsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {isDetailsLoading ? 'Loading details' : 'See Details'}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onSeeAnalytics(video)}
            className="w-full cursor-pointer justify-between rounded-2xl border-sky-200 bg-sky-50 py-6 text-sky-800 transition-transform duration-300 hover:scale-[1.02] hover:bg-sky-100"
          >
            <span className="flex items-center gap-2">
              {isAnalyticsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              {isAnalyticsLoading ? 'Loading analytics' : 'See Analytics'}
            </span>
          </Button>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Active platform mode
            </p>
            <p className="mt-2 leading-7">
              {activePlatformLabel} controls the analytics context and platform health for this video.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}