'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
  ElevenLabsModel,
  ElevenLabsVoiceSettings,
} from '../_types/sentences';
import {
  DEFAULT_ELEVENLABS_VOICE_SETTINGS,
  ELEVENLABS_MODEL_OPTIONS,
  ElevenLabsVoiceSettingsFields,
  describeElevenLabsVoiceSettings,
  formatElevenLabsModelLabel,
  normalizeElevenLabsModel,
  normalizeElevenLabsVoiceSettings,
} from './ElevenLabsVoiceSettingsFields';
import {
  Download,
  Loader2,
  Mic,
  Music2,
  Pause,
  Play,
  SlidersHorizontal,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';

type VoiceSegmentCandidate = {
  previewUrl: string;
  durationSeconds: number | null;
  provider: 'google' | 'elevenlabs';
  voiceName: string | null;
};

export type VoiceSegmentManagerItem = {
  id: string;
  index: number;
  text: string;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  provider?: 'google' | 'elevenlabs' | null;
  voiceName?: string | null;
  styleInstructions?: string | null;
  elevenLabsSettings?: ElevenLabsVoiceSettings | null;
  elevenLabsModel?: ElevenLabsModel | null;
};

type SentenceVoiceOverManagerModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  segmentNoun: 'sentence' | 'chunk';
  segments: VoiceSegmentManagerItem[];
  voiceProvider: 'google' | 'elevenlabs';
  fullVoiceOverPreviewUrl?: string | null;
  soundtrackPreviewUrl?: string | null;
  globalElevenLabsSettings: ElevenLabsVoiceSettings | null;
  globalElevenLabsModel: ElevenLabsModel;
  isGeneratingStyleById: Record<string, boolean>;
  isRegeneratingVoiceById: Record<string, boolean>;
  isApplyingCandidateById: Record<string, boolean>;
  voiceCandidateById: Record<string, VoiceSegmentCandidate | null>;
  isGeneratingAllVoices?: boolean;
  canDownloadAllVoices?: boolean;
  onClose: () => void;
  onOpenFullVoiceEditor?: () => void;
  onGenerateAllVoices?: () => void;
  onDownloadAllVoices?: () => void;
  onDownloadSegmentVoice?: (
    segmentId: string,
    source: 'current' | 'preview',
  ) => void;
  onOpenSegmentVoiceEditor?: (segmentId: string) => void;
  onSegmentStyleChange: (segmentId: string, value: string) => void;
  onSegmentElevenLabsSettingsChange: (
    segmentId: string,
    settings: ElevenLabsVoiceSettings | null,
  ) => void;
  onSegmentElevenLabsModelChange: (
    segmentId: string,
    model: ElevenLabsModel | null,
  ) => void;
  onGenerateSegmentStyle: (segmentId: string) => void;
  onRegenerateSegmentVoice: (segmentId: string) => void;
  onApplyCandidate: (segmentId: string) => void;
  onCancelCandidate: (segmentId: string) => void;
};

const SEGMENT_TEXT_PREVIEW_MAX_CHARS = 220;

const capitalize = (value: string) =>
  value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

const hasBracketCue = (value: string) => /\[[^\]]+\]/u.test(String(value ?? ''));

const truncateSegmentText = (value: string, maxChars: number) => {
  const normalizedValue = String(value ?? '').trim();
  if (normalizedValue.length <= maxChars) {
    return normalizedValue;
  }

  const slicedValue = normalizedValue.slice(0, maxChars);
  const lastSpaceIndex = slicedValue.lastIndexOf(' ');
  if (lastSpaceIndex >= Math.floor(maxChars * 0.6)) {
    return slicedValue.slice(0, lastSpaceIndex).trimEnd();
  }

  return slicedValue.trimEnd();
};

export function SentenceVoiceOverManagerModal({
  isOpen,
  title,
  description,
  segmentNoun,
  segments,
  voiceProvider,
  fullVoiceOverPreviewUrl,
  soundtrackPreviewUrl,
  globalElevenLabsSettings,
  globalElevenLabsModel,
  isGeneratingStyleById,
  isRegeneratingVoiceById,
  isApplyingCandidateById,
  voiceCandidateById,
  isGeneratingAllVoices,
  canDownloadAllVoices,
  onClose,
  onOpenFullVoiceEditor,
  onGenerateAllVoices,
  onDownloadAllVoices,
  onDownloadSegmentVoice,
  onOpenSegmentVoiceEditor,
  onSegmentStyleChange,
  onSegmentElevenLabsSettingsChange,
  onSegmentElevenLabsModelChange,
  onGenerateSegmentStyle,
  onRegenerateSegmentVoice,
  onApplyCandidate,
  onCancelCandidate,
}: SentenceVoiceOverManagerModalProps) {
  const [expandedSettingsSegmentId, setExpandedSettingsSegmentId] = useState<string | null>(
    null,
  );
  const [expandedTextBySegmentId, setExpandedTextBySegmentId] = useState<Record<string, boolean>>(
    {},
  );
  const [playbackMode, setPlaybackMode] = useState<'none' | 'voiceOver' | 'withSoundtrack'>(
    'none',
  );
  const voiceOverAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundtrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackResetTimeoutRef = useRef<number | null>(null);
  const capitalizedSegmentNoun = capitalize(segmentNoun);

  const stopPlaybackAudio = () => {
    const voiceOverAudio = voiceOverAudioRef.current;
    if (voiceOverAudio) {
      voiceOverAudio.pause();
      voiceOverAudio.currentTime = 0;
      voiceOverAudio.onended = null;
      voiceOverAudio.onerror = null;
    }

    const soundtrackAudio = soundtrackAudioRef.current;
    if (soundtrackAudio) {
      soundtrackAudio.pause();
      soundtrackAudio.currentTime = 0;
      soundtrackAudio.onended = null;
      soundtrackAudio.onerror = null;
    }
  };

  const schedulePlaybackModeReset = () => {
    if (playbackResetTimeoutRef.current !== null) {
      window.clearTimeout(playbackResetTimeoutRef.current);
    }

    playbackResetTimeoutRef.current = window.setTimeout(() => {
      setPlaybackMode('none');
      playbackResetTimeoutRef.current = null;
    }, 0);
  };

  const stopPlayback = () => {
    stopPlaybackAudio();
    setPlaybackMode('none');
  };

  const ensureAudioElement = (
    ref: { current: HTMLAudioElement | null },
    url: string,
  ) => {
    const trimmedUrl = String(url ?? '').trim();
    if (!trimmedUrl) return null;

    if (!ref.current) {
      ref.current = new Audio(trimmedUrl);
      ref.current.preload = 'auto';
    } else if (ref.current.src !== trimmedUrl) {
      ref.current.pause();
      ref.current.src = trimmedUrl;
      ref.current.load();
    }

    return ref.current;
  };

  const togglePlayback = async (mode: 'voiceOver' | 'withSoundtrack') => {
    const voiceOverUrl = String(fullVoiceOverPreviewUrl ?? '').trim();
    const soundtrackUrl = String(soundtrackPreviewUrl ?? '').trim();
    if (!voiceOverUrl) return;
    if (mode === 'withSoundtrack' && !soundtrackUrl) return;

    if (playbackMode === mode) {
      stopPlayback();
      return;
    }

    stopPlayback();

    const voiceOverAudio = ensureAudioElement(voiceOverAudioRef, voiceOverUrl);
    if (!voiceOverAudio) return;

    const soundtrackAudio =
      mode === 'withSoundtrack'
        ? ensureAudioElement(soundtrackAudioRef, soundtrackUrl)
        : null;

    voiceOverAudio.currentTime = 0;
    voiceOverAudio.onended = () => stopPlayback();
    voiceOverAudio.onerror = () => stopPlayback();

    if (soundtrackAudio) {
      soundtrackAudio.currentTime = 0;
      soundtrackAudio.onerror = () => stopPlayback();
    }

    try {
      await Promise.all([
        voiceOverAudio.play(),
        soundtrackAudio ? soundtrackAudio.play() : Promise.resolve(),
      ]);
      setPlaybackMode(mode);
    } catch (error) {
      console.error('Segment manager playback failed', error);
      stopPlayback();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopPlaybackAudio();
      schedulePlaybackModeReset();
    }

    return () => {
      stopPlaybackAudio();
      if (playbackResetTimeoutRef.current !== null) {
        window.clearTimeout(playbackResetTimeoutRef.current);
        playbackResetTimeoutRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    stopPlaybackAudio();
    schedulePlaybackModeReset();
  }, [fullVoiceOverPreviewUrl, soundtrackPreviewUrl]);

  if (!isOpen) return null;

  const items = segments.filter((segment) => String(segment.text ?? '').trim());

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={() => {
        stopPlayback();
        onClose();
      }}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-linear-to-r from-sky-50 via-white to-indigo-50 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onDownloadAllVoices ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onDownloadAllVoices}
                disabled={!canDownloadAllVoices}
                className="gap-1.5 border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
              >
                <Download className="h-3.5 w-3.5" />
                Download all
              </Button>
            ) : null}
            {onGenerateAllVoices ? (
              <Button
                type="button"
                size="sm"
                onClick={onGenerateAllVoices}
                disabled={isGeneratingAllVoices || items.length === 0}
                className="gap-1.5 bg-linear-to-r from-sky-600 to-indigo-600 text-white hover:from-sky-700 hover:to-indigo-700"
              >
                {isGeneratingAllVoices ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating all
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3.5 w-3.5" />
                    Generate all voices
                  </>
                )}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void togglePlayback('voiceOver')}
              disabled={!String(fullVoiceOverPreviewUrl ?? '').trim()}
              className="gap-1.5 border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
            >
              {playbackMode === 'voiceOver' ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Voice-over
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void togglePlayback('withSoundtrack')}
              disabled={
                !String(fullVoiceOverPreviewUrl ?? '').trim() ||
                !String(soundtrackPreviewUrl ?? '').trim()
              }
              className="gap-1.5 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
            >
              {playbackMode === 'withSoundtrack' ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Music2 className="h-3.5 w-3.5" />
              )}
              With soundtrack
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                stopPlayback();
                onOpenFullVoiceEditor?.();
              }}
              disabled={!onOpenFullVoiceEditor || !String(fullVoiceOverPreviewUrl ?? '').trim()}
              className="gap-1.5 border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Settings
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                stopPlayback();
                onClose();
              }}
              className="h-9 w-9 rounded-full p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            {items.map((segment) => {
              const candidate = voiceCandidateById[segment.id];
              const segmentText = String(segment.text ?? '').trim();
              const truncatedSegmentText = truncateSegmentText(
                segmentText,
                SEGMENT_TEXT_PREVIEW_MAX_CHARS,
              );
              const canExpandSegmentText = truncatedSegmentText.length < segmentText.length;
              const isSegmentTextExpanded = Boolean(expandedTextBySegmentId[segment.id]);
              const currentAudioUrl = String(segment.audioUrl ?? '').trim();
              const hasVoice = Boolean(currentAudioUrl);
              const resolvedProvider = segment.provider ?? voiceProvider;
              const resolvedVoiceName =
                String(segment.voiceName ?? '').trim() || 'Attached voice';
              const hasCustomElevenLabsSettings = Boolean(segment.elevenLabsSettings);
              const hasCustomElevenLabsModel = Boolean(segment.elevenLabsModel);
              const resolvedElevenLabsModel = normalizeElevenLabsModel(
                segment.elevenLabsModel ?? globalElevenLabsModel,
              );
              const isElevenLabsModelLocked =
                resolvedElevenLabsModel === 'eleven_v3' && hasBracketCue(segmentText);
              const resolvedElevenLabsSettingsSummary = hasCustomElevenLabsSettings
                ? describeElevenLabsVoiceSettings(segment.elevenLabsSettings, {
                    model: resolvedElevenLabsModel,
                  })
                : globalElevenLabsSettings
                  ? `Using global defaults: ${describeElevenLabsVoiceSettings(globalElevenLabsSettings, {
                      model: globalElevenLabsModel,
                    })}`
                  : `Using ${formatElevenLabsModelLabel(globalElevenLabsModel)} defaults.`;
              const isSettingsOpen = expandedSettingsSegmentId === segment.id;
              const isGeneratingStyle = Boolean(isGeneratingStyleById[segment.id]);
              const isRegenerating = Boolean(isRegeneratingVoiceById[segment.id]);
              const isApplyingCandidate = Boolean(isApplyingCandidateById[segment.id]);
              const isSegmentEditDisabled =
                !hasVoice ||
                Boolean(candidate) ||
                isGeneratingStyle ||
                isRegenerating ||
                isApplyingCandidate;

              return (
                <div
                  key={segment.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                        {capitalizedSegmentNoun} {segment.index + 1}
                      </p>
                      <div className="mt-1 max-w-6xl text-sm font-medium leading-6 text-gray-900">
                        <span>
                          {isSegmentTextExpanded ? segmentText : truncatedSegmentText}
                          {canExpandSegmentText && !isSegmentTextExpanded ? '... ' : ' '}
                        </span>
                        {canExpandSegmentText ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTextBySegmentId((current) => ({
                                ...current,
                                [segment.id]: !current[segment.id],
                              }))
                            }
                            className="inline text-sm cursor-pointer font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 transition hover:text-sky-800"
                          >
                            {isSegmentTextExpanded ? 'Show less' : 'Read more'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-600 shadow-sm">
                        <Mic className="h-3.5 w-3.5 text-sky-600" />
                        {hasVoice
                          ? `${capitalizedSegmentNoun} voice ready`
                          : `No ${segmentNoun} voice yet`}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-800">
                        <span>
                          {resolvedProvider === 'google' ? 'AI Studio' : 'ElevenLabs'}
                        </span>
                        <span className="text-sky-400">/</span>
                        <span>{resolvedVoiceName}</span>
                      </div>
                      {resolvedProvider === 'elevenlabs' ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-800">
                          <span>{formatElevenLabsModelLabel(resolvedElevenLabsModel)}</span>
                          <span className="text-indigo-300">/</span>
                          <span>
                            {hasCustomElevenLabsSettings || hasCustomElevenLabsModel
                              ? 'Custom EL config'
                              : 'Global EL defaults'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {hasVoice ? (
                    <div className="mb-3 rounded-xl border border-sky-100 bg-white px-3 py-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>Current {segmentNoun} voice</span>
                          {typeof segment.durationSeconds === 'number' &&
                          segment.durationSeconds > 0 ? (
                            <span>{segment.durationSeconds.toFixed(1)}s</span>
                          ) : null}
                        </div>
                      </div>
                      <audio
                        controls
                        controlsList={onDownloadSegmentVoice ? 'nodownload' : undefined}
                        src={currentAudioUrl || undefined}
                        className="w-full"
                      />
                    </div>
                  ) : null}

                  {resolvedProvider === 'google' ? (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800">
                          {capitalizedSegmentNoun} style instructions
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onGenerateSegmentStyle(segment.id)}
                          disabled={isGeneratingStyle || isRegenerating || isApplyingCandidate}
                          className="h-8 gap-1.5 border-amber-200 text-[11px] text-amber-800 hover:bg-amber-50"
                        >
                          {isGeneratingStyle ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Generating
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              Generate with AI
                            </>
                          )}
                        </Button>
                      </div>
                      <Textarea
                        value={segment.styleInstructions ?? ''}
                        onChange={(event) =>
                          onSegmentStyleChange(segment.id, event.target.value)
                        }
                        placeholder={`Add style instructions for this ${segmentNoun} only.`}
                        className="min-h-20 bg-white"
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {resolvedProvider === 'elevenlabs' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setExpandedSettingsSegmentId((current) =>
                            current === segment.id ? null : segment.id,
                          )
                        }
                        className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        {isSettingsOpen ? 'Hide settings' : `${capitalizedSegmentNoun} settings`}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        stopPlayback();
                        onOpenSegmentVoiceEditor?.(segment.id);
                      }}
                      disabled={isSegmentEditDisabled || !onOpenSegmentVoiceEditor}
                      className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      {`Edit ${segmentNoun} voice`}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setExpandedSettingsSegmentId((current) =>
                          current === segment.id ? null : current,
                        );
                        onRegenerateSegmentVoice(segment.id);
                      }}
                      disabled={isRegenerating || isApplyingCandidate || isGeneratingStyle}
                      className="gap-1.5 bg-linear-to-r from-sky-600 to-indigo-600 text-white hover:from-sky-700 hover:to-indigo-700"
                    >
                      {isRegenerating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Regenerating
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3.5 w-3.5" />
                          {hasVoice
                            ? `Regenerate ${capitalizedSegmentNoun} Voice`
                            : `Generate ${capitalizedSegmentNoun} Voice`}
                        </>
                      )}
                    </Button>
                    {hasVoice && onDownloadSegmentVoice ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onDownloadSegmentVoice(segment.id, 'current')}
                        className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    ) : null}
                  </div>

                  {resolvedProvider === 'elevenlabs' && isSettingsOpen ? (
                    <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-4">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-indigo-950">
                            {capitalizedSegmentNoun} ElevenLabs settings
                          </p>
                          <p className="text-xs leading-5 text-indigo-900/80">
                            {resolvedElevenLabsSettingsSummary}
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-medium text-indigo-800">
                          <input
                            type="checkbox"
                            checked={hasCustomElevenLabsSettings}
                            onChange={(event) => {
                              if (!event.target.checked) {
                                onSegmentElevenLabsSettingsChange(segment.id, null);
                                return;
                              }

                              onSegmentElevenLabsSettingsChange(
                                segment.id,
                                normalizeElevenLabsVoiceSettings(
                                  segment.elevenLabsSettings ??
                                    globalElevenLabsSettings ??
                                    DEFAULT_ELEVENLABS_VOICE_SETTINGS,
                                ),
                              );
                            }}
                            className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Use custom settings
                        </label>
                      </div>

                      <div className="mb-3 rounded-2xl border border-indigo-200 bg-white px-4 py-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-indigo-950">
                              {capitalizedSegmentNoun} model
                            </p>
                            <p className="text-xs leading-5 text-indigo-900/80">
                              {hasCustomElevenLabsModel
                                ? 'This sentence overrides the global ElevenLabs model.'
                                : `Using the global default: ${formatElevenLabsModelLabel(globalElevenLabsModel)}.`}
                            </p>
                          </div>
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                            {formatElevenLabsModelLabel(resolvedElevenLabsModel)}
                          </span>
                        </div>
                        <Select
                          value={segment.elevenLabsModel ?? '__inherit__'}
                          onValueChange={(value) =>
                            onSegmentElevenLabsModelChange(
                              segment.id,
                              value === '__inherit__'
                                ? null
                                : normalizeElevenLabsModel(value),
                            )
                          }
                          disabled={isElevenLabsModelLocked}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Use global ElevenLabs model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__inherit__">
                              Use global default ({formatElevenLabsModelLabel(globalElevenLabsModel)})
                            </SelectItem>
                            {ELEVENLABS_MODEL_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-xs leading-5 text-indigo-900/80">
                          {isElevenLabsModelLocked
                            ? 'This sentence already contains a bracket cue, so model selection stays locked while Eleven v3 is active.'
                            : ELEVENLABS_MODEL_OPTIONS.find(
                                (option) => option.value === resolvedElevenLabsModel,
                              )?.description}
                        </p>
                      </div>

                      {hasCustomElevenLabsSettings ? (
                        <ElevenLabsVoiceSettingsFields
                          value={segment.elevenLabsSettings}
                          model={resolvedElevenLabsModel}
                          onChange={(settings) =>
                            onSegmentElevenLabsSettingsChange(segment.id, settings)
                          }
                          showReset
                          resetLabel={`Reset ${segmentNoun} settings`}
                        />
                      ) : (
                        <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/70 px-4 py-4 text-sm text-indigo-900">
                          <p className="font-medium">Using global defaults</p>
                          <p className="mt-1 text-xs leading-5 text-indigo-900/80">
                            {globalElevenLabsSettings
                              ? describeElevenLabsVoiceSettings(globalElevenLabsSettings, {
                                  model: globalElevenLabsModel,
                                })
                              : `No custom global defaults saved yet. ${formatElevenLabsModelLabel(globalElevenLabsModel)} provider defaults will be used.`}
                          </p>
                        </div>
                      )}

                      <p className="mt-3 text-[11px] text-indigo-900/75">
                        These settings apply the next time you regenerate this {segmentNoun} and replace its clip.
                      </p>
                    </div>
                  ) : null}

                  {candidate ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-semibold text-emerald-900">
                            New preview
                          </p>
                          <span className="text-xs text-emerald-800">
                            {candidate.provider === 'google' ? 'AI Studio' : 'ElevenLabs'}
                            {candidate.voiceName ? ` / ${candidate.voiceName}` : ''}
                          </span>
                          {typeof candidate.durationSeconds === 'number' &&
                          candidate.durationSeconds > 0 ? (
                            <span className="text-xs text-emerald-800">
                              {candidate.durationSeconds.toFixed(1)}s
                            </span>
                          ) : null}
                        </div>
                        {onDownloadSegmentVoice ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onDownloadSegmentVoice(segment.id, 'preview')}
                            className="h-7 gap-1.5 border-emerald-200 bg-white px-2.5 text-[11px] text-emerald-700 hover:bg-emerald-100"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </Button>
                        ) : null}
                      </div>
                      <audio
                        controls
                        controlsList={onDownloadSegmentVoice ? 'nodownload' : undefined}
                        src={candidate.previewUrl}
                        className="w-full"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onCancelCandidate(segment.id)}
                          disabled={isApplyingCandidate}
                          className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onApplyCandidate(segment.id)}
                          disabled={isApplyingCandidate}
                          className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          {isApplyingCandidate ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Replacing
                            </>
                          ) : (
                            `Replace this ${segmentNoun} voice`
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}