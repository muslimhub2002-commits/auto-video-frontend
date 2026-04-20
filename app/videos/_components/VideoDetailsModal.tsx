'use client';

import { useState } from 'react';
import { Calendar, Clapperboard, ExternalLink, FileText, Link2, PlayCircle, Upload, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildScriptPreview,
  formatDate,
  formatDuration,
  type PublishedLink,
  type VideoDetail,
  type VideoListItem,
} from './video-library-shared';

type VideoDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  video: VideoDetail | VideoListItem | null;
  videoTitle: string | null;
  videoUrl: string | null;
  videoFormatLabel: string;
  previewDurationSeconds: number | null;
  publishedLinks: PublishedLink[];
  scriptText: string;
  detailError: string | null;
  onOpenYouTubeUpload: () => void;
  onOpenMetaUpload: () => void;
  onOpenTikTokUpload: () => void;
  onPreviewDurationChange: (duration: number | null) => void;
};

export function VideoDetailsModal({
  isOpen,
  onClose,
  video,
  videoTitle,
  videoUrl,
  videoFormatLabel,
  previewDurationSeconds,
  publishedLinks,
  scriptText,
  detailError,
  onOpenYouTubeUpload,
  onOpenMetaUpload,
  onOpenTikTokUpload,
  onPreviewDurationChange,
}: VideoDetailsModalProps) {
  const [isFullScriptVisible, setIsFullScriptVisible] = useState(false);

  if (!isOpen || !video) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="my-4 max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto rounded-[32px] border border-white/80 bg-white/95 p-5 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.6)] lg:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
              <Clapperboard className="h-3.5 w-3.5" />
              Video Details
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                {videoTitle}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                {buildScriptPreview(video.script)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                <Calendar className="h-3.5 w-3.5" />
                Updated {formatDate(video.updated_at ?? video.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                <Video className="h-3.5 w-3.5" />
                {videoUrl ? 'Internal preview ready' : 'Internal preview missing'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                <PlayCircle className="h-3.5 w-3.5" />
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
            Close details
          </Button>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.65)]">
            {videoUrl ? (
              <video
                key={videoUrl}
                src={videoUrl}
                controls
                className="aspect-video w-full bg-black object-contain"
                onLoadedMetadata={(event) => {
                  onPreviewDurationChange(event.currentTarget.duration || null);
                }}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center p-6 text-center text-sm text-slate-300">
                This video does not currently have an internal preview URL. Publishing links may still exist, but the in-app player cannot load yet.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                <PlayCircle className="h-4 w-4" />
                Quick Summary
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Preview duration
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {formatDuration(previewDurationSeconds)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Published links
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {publishedLinks.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Video mode
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {videoFormatLabel}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Videos shorter than 3 minutes count as short-form.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Scenes
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {video.sentences_count}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                <Upload className="h-4 w-4" />
                Publish Actions
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <Button
                  type="button"
                  variant="outline"
                  className="justify-center rounded-2xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  onClick={onOpenYouTubeUpload}
                >
                  Upload to YouTube
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-center rounded-2xl border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  onClick={onOpenMetaUpload}
                >
                  Upload to Meta
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-center rounded-2xl border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                  onClick={onOpenTikTokUpload}
                >
                  Upload to TikTok
                </Button>
              </div>
            </div>
          </div>
        </div>

        {detailError ? (
          <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {detailError}
          </div>
        ) : null}

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                <Link2 className="h-4 w-4" />
                Publication Links
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                View the current platform URLs saved for this video or publish it from the actions above.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFullScriptVisible((current) => !current)}
              className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <FileText className="mr-2 h-4 w-4" />
              {isFullScriptVisible ? 'Hide Full Script' : 'See Full Script'}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
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
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                No public platform URL has been saved yet. You can publish this video directly from the actions above.
              </div>
            )}
          </div>

          {isFullScriptVisible ? (
            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                <FileText className="h-4 w-4" />
                Full Script
              </div>
              <div className="mt-4 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
                {scriptText || 'No script content is available for this video.'}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}