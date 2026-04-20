'use client';

import { Button } from '@/components/ui/button';
import {
  Layers3,
  Loader2,
  Sparkles,
  Type,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import {
  getImageMotionEffectLabel,
  getVisualEffectLabel,
  normalizeOverlaySettings,
} from '../../generate/_components/sentences/ImageEffectPreview';
import { getTextAnimationEffectLabel } from '../../generate/_components/sentences/TextAnimationPreview';
import { SentenceScenePreview, hasSentenceOverlayLayer, hasSentenceTextLayer, resolveSentenceSceneTab } from './SentenceScenePreview';
import type {
  ScriptDetail,
  ScriptListItem,
  ScriptSentenceDetail,
} from './script-types';

type ScriptDetailsModalProps = {
  isOpen: boolean;
  scriptSummary: ScriptListItem | null;
  scriptDetail: ScriptDetail | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
};

function getDisplayTitle(script: { title: string | null; script: string } | null) {
  const title = script?.title?.trim();
  if (title) return title;

  const fallback = String(script?.script ?? '')
    .split(/[\n.]/)
    .map((part) => part.trim())
    .find(Boolean);

  return fallback ? fallback.slice(0, 80) : 'Untitled script';
}

function formatDuration(seconds?: number | null) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  if (seconds < 60) return `${Math.round(seconds)}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function inferIsShortVideo(script: ScriptDetail | ScriptListItem | null) {
  const rawLength =
    script && 'length' in script ? String(script.length ?? '').trim().toLowerCase() : '';

  if (!rawLength) return true;
  if (rawLength.includes('long')) return false;
  if (rawLength.includes('short')) return true;

  const minuteMatch = rawLength.match(/(\d+(?:\.\d+)?)\s*(?:m|min|minute)/u);
  const secondMatch = rawLength.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|second)/u);
  const minutes = minuteMatch ? Number.parseFloat(minuteMatch[1]) : 0;
  const seconds = secondMatch ? Number.parseFloat(secondMatch[1]) : 0;
  const totalSeconds = minutes * 60 + seconds;

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return true;
  }

  return totalSeconds <= 180;
}

function getSentenceVisualEffect(sentence: ScriptSentenceDetail) {
  return sentence.visual_effect ?? sentence.visualEffect ?? null;
}

function getSentenceImageMotionEffect(sentence: ScriptSentenceDetail) {
  return sentence.image_motion_effect ?? sentence.imageMotionEffect ?? 'default';
}

function getSentenceTextEffect(sentence: ScriptSentenceDetail) {
  return sentence.text_animation_effect ?? sentence.textAnimationEffect ?? 'slideCutFast';
}

function getSupportingAssetLabels(sentence: ScriptSentenceDetail) {
  const labels: string[] = [];

  if (sentence.secondaryImage?.image) labels.push('Secondary image');
  if (sentence.startFrameImage?.image) labels.push('Start frame');
  if (sentence.endFrameImage?.image) labels.push('End frame');
  if (sentence.textBackgroundImage?.image) labels.push('Text background image');
  if (sentence.textBackgroundVideo?.video) labels.push('Text background video');

  return labels;
}

function getSceneSummary(sentence: ScriptSentenceDetail) {
  const sceneTab = resolveSentenceSceneTab(sentence);
  const overlaySettings = normalizeOverlaySettings(
    sentence.overlay_settings ?? sentence.overlaySettings ?? sentence.overlay?.settings ?? null,
    sceneTab === 'video' ? 'video' : 'image',
  );

  if (sceneTab === 'video') {
    return {
      title: 'Video scene',
      description: sentence.video?.video
        ? 'This sentence is driven by the saved video tab output.'
        : 'The video tab is active, but no saved clip is attached yet.',
      detailLabel: 'Playback style',
      detailValue: 'Video scene with optional overlay and text animation layers.',
    };
  }

  if (sceneTab === 'text') {
    const backgroundLabel = sentence.textBackgroundVideo?.video
      ? 'Video background'
      : sentence.textBackgroundImage?.image
        ? 'Image background'
        : sentence.video?.video
          ? 'Inherited scene video'
          : sentence.image?.image
            ? 'Inherited scene image'
            : overlaySettings.backgroundMode === 'gradient'
              ? 'Gradient background'
              : overlaySettings.backgroundMode === 'solid'
                ? 'Solid background'
                : 'No saved background';

    return {
      title: 'Text scene',
      description: `The text tab is the active scene surface for this sentence using ${backgroundLabel.toLowerCase()}.`,
      detailLabel: 'Animation preset',
      detailValue: getTextAnimationEffectLabel(getSentenceTextEffect(sentence) as any),
    };
  }

  if (sceneTab === 'overlay') {
    return {
      title: 'Overlay scene',
      description: sentence.overlay?.url
        ? 'The overlay tab is active and the preview is rendered through the saved overlay composition settings.'
        : 'The overlay tab is active, but the overlay asset is missing.',
      detailLabel: 'Background mode',
      detailValue: overlaySettings.backgroundMode ?? 'image',
    };
  }

  return {
    title: 'Image scene',
    description: sentence.image?.image
      ? 'The image tab is active and the preview is built from the saved still image scene.'
      : 'The image tab is active, but the primary still image is missing.',
    detailLabel: 'Motion preset',
    detailValue: getImageMotionEffectLabel(getSentenceImageMotionEffect(sentence) as any),
  };
}

function SkeletonCard() {
  return (
    <article className="grid gap-5 rounded-[32px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)] xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <div className="space-y-4 animate-pulse">
        <div className="flex gap-2">
          <div className="h-7 w-24 rounded-full bg-slate-200" />
          <div className="h-7 w-20 rounded-full bg-slate-200" />
        </div>
        <div className="h-7 w-3/4 rounded-full bg-slate-200" />
        <div className="aspect-16/10 w-full rounded-[28px] bg-slate-200" />
      </div>
      <div className="space-y-4 animate-pulse">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
          <div className="h-4 w-28 rounded-full bg-slate-200" />
          <div className="mt-3 h-4 w-full rounded-full bg-slate-200" />
          <div className="mt-2 h-4 w-11/12 rounded-full bg-slate-200" />
          <div className="mt-2 h-4 w-9/12 rounded-full bg-slate-200" />
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <div className="mt-4 h-10 rounded-2xl bg-slate-200" />
          <div className="mt-3 h-10 rounded-2xl bg-slate-200" />
          <div className="mt-3 h-10 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </article>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-4">
      <h4 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ScriptDetailsModal({
  isOpen,
  scriptSummary,
  scriptDetail,
  isLoading,
  error,
  onClose,
}: ScriptDetailsModalProps) {
  if (!isOpen) return null;

  const displayScript = scriptDetail ?? scriptSummary;
  const sentences = [...(scriptDetail?.sentences ?? [])].sort(
    (left, right) => left.index - right.index,
  );
  const isShortVideo = inferIsShortVideo(displayScript);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-4 lg:p-6">
        <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.85)]">
          <div className="border-b border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur lg:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-3">
                <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Sentence Storyboard
                </div>
                <div>
                  <h2 className="truncate text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">
                    {getDisplayTitle(displayScript)}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    {isLoading ? 'Loading scenes' : `${sentences.length} sentences`}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    {isShortVideo ? 'Short format preview' : 'Long format preview'}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="cursor-pointer rounded-2xl border-slate-200 bg-white"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 lg:px-6 lg:py-6">
            {isLoading ? (
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Building the storyboard preview...
                </div>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : error ? (
              <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-8 text-sm text-rose-700">
                {error}
              </div>
            ) : sentences.length === 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-8 text-sm text-slate-500">
                This script does not have sentence-level scene data yet.
              </div>
            ) : (
              <div className="space-y-5">
                {sentences.map((sentence) => {
                  const sceneTab = resolveSentenceSceneTab(sentence);
                  const hasTextLayer = hasSentenceTextLayer(sentence);
                  const hasOverlayLayer = hasSentenceOverlayLayer(sentence);
                  const isTextTabSelected = sceneTab === 'text';
                  const voiceDuration = formatDuration(
                    sentence.voice_over_duration_seconds ?? sentence.voiceOverDurationSeconds,
                  );
                  const sceneSummary = getSceneSummary(sentence);
                  const supportingAssets = getSupportingAssetLabels(sentence);
                  const visualEffectLabel = getVisualEffectLabel(
                    getSentenceVisualEffect(sentence) as any,
                  );
                  const textEffectLabel = hasTextLayer
                    ? getTextAnimationEffectLabel(getSentenceTextEffect(sentence) as any)
                    : 'No text animation';

                  return (
                    <article
                      key={sentence.id}
                      className="grid gap-5 rounded-[32px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)] xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"
                    >
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
                                Sentence {String(sentence.index + 1).padStart(2, '0')}
                              </span>
                              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                                {sceneTab}
                              </span>
                            </div>
                            <p className="max-w-4xl text-base leading-8 text-slate-900 lg:text-lg">
                              {sentence.text}
                            </p>
                          </div>
                        </div>

                        <SentenceScenePreview
                          sentence={sentence}
                          isShortVideo={isShortVideo}
                        />
                      </div>

                      <div className="space-y-4">
                        <DetailBlock title="Scene Profile">
                          <div className="space-y-3 text-sm text-slate-600">
                            <p className="text-sm font-semibold text-slate-900">
                              {sceneSummary.title}
                            </p>
                            <p className="leading-7">{sceneSummary.description}</p>
                            <dl className="space-y-3">
                              <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  {sceneSummary.detailLabel}
                                </dt>
                                <dd className="text-right text-sm font-medium text-slate-900">
                                  {sceneSummary.detailValue}
                                </dd>
                              </div>
                              <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  Visual effect
                                </dt>
                                <dd className="text-right text-sm font-medium text-slate-900">
                                  {visualEffectLabel}
                                </dd>
                              </div>
                              <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  Text treatment
                                </dt>
                                <dd className="text-right text-sm font-medium text-slate-900">
                                  {textEffectLabel}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </DetailBlock>

                        <DetailBlock title="Layer Stack">
                          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                            <div className={`rounded-2xl border px-4 py-3 ${
                              hasOverlayLayer
                                ? 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700'
                                : 'border-slate-200 bg-white text-slate-500'
                            }`}>
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <Layers3 className="h-4 w-4" />
                                Overlay
                              </div>
                              <p className="mt-2 text-xs leading-6">
                                {hasOverlayLayer
                                  ? sentence.overlay?.title || 'Overlay asset attached'
                                  : 'No overlay layer'}
                              </p>
                            </div>
                            <div className={`rounded-2xl border px-4 py-3 ${
                              hasTextLayer && isTextTabSelected
                                ? 'border-sky-200 bg-sky-50 text-sky-700'
                                : 'border-slate-200 bg-white text-slate-500'
                            }`}>
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <Type className="h-4 w-4" />
                                Text animation
                              </div>
                              <p className="mt-2 text-xs leading-6">
                                {hasTextLayer&& isTextTabSelected
                                  ? textEffectLabel
                                  : 'No animated text layer'}
                              </p>
                            </div>
                            <div className={`rounded-2xl border px-4 py-3 ${
                              sentence.voice_over_url || sentence.voiceOverUrl
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-500'
                            }`}>
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <Volume2 className="h-4 w-4" />
                                Voice clip
                              </div>
                              <p className="mt-2 text-xs leading-6">
                                {sentence.voice_over_url || sentence.voiceOverUrl
                                  ? voiceDuration || 'Clip attached'
                                  : 'No sentence voice clip'}
                              </p>
                            </div>
                          </div>
                        </DetailBlock>

                        <DetailBlock title="Supporting Assets">
                          {supportingAssets.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {supportingAssets.map((label) => (
                                <span
                                  key={`${sentence.id}-${label}`}
                                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                                >
                                  <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                                  {label}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm leading-7 text-slate-500">
                              This sentence does not have extra supporting assets beyond its active scene.
                            </p>
                          )}
                        </DetailBlock>

                        {sentence.video?.video || sentence.textBackgroundVideo?.video ? (
                          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            <Video className="h-4 w-4" />
                            Video surfaces auto-loop inside the preview so the scene reads like a composition instead of a static asset list.
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}