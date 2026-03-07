'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Sparkles,
  FileText,
  X,
  Image as ImageIcon,
  Library,
  Music2,
  Upload,
  Play,
  Pause,
  Pencil,
  Save,
  Video as VideoIcon,
  ArrowUp,
  ArrowDown,
  Trash2,
  Volume2,
  Users,
  Repeat2,
  Clock,
  Timer,
} from 'lucide-react';

import { ForcedCharactersModal } from './ForcedCharactersModal';
import { ForcedEraModal } from './ForcedEraModal';
import type { ScriptEra } from './ErasModal';
import { SoundEffectEditModal } from '../SoundEffectEditModal';

import type { SentenceItem } from '../../_types/sentences';

type VisualEffectValue = SentenceItem['visualEffect'];

const VISUAL_EFFECT_SELECT_VALUES = [
  'colorGrading',
  'animatedLighting',
  'glassSubtle',
  'glassReflections',
  'glassStrong',
] as const;

type VisualEffectSelectValue = (typeof VISUAL_EFFECT_SELECT_VALUES)[number];

function isVisualEffectSelectValue(value: string): value is VisualEffectSelectValue {
  return (VISUAL_EFFECT_SELECT_VALUES as readonly string[]).includes(value);
}

function VisualEffectPreview({
  effect,
  children,
}: {
  effect: VisualEffectValue;
  children: ReactNode;
}) {
  const normalized = effect ?? null;

  const isColorGrading = normalized === 'colorGrading';
  const isAnimatedLighting = normalized === 'animatedLighting';
  const isGlassSubtle = normalized === 'glassSubtle';
  const isGlassReflections = normalized === 'glassReflections';
  const isGlassStrong = normalized === 'glassStrong';

  const glassFilter = isGlassSubtle
    ? 'contrast(1.06) saturate(1.08) brightness(1.02)'
    : isGlassReflections
      ? 'contrast(1.07) saturate(1.10) brightness(1.02)'
      : isGlassStrong
        ? 'contrast(1.10) saturate(1.12) brightness(1.03)'
        : undefined;

  const shouldShowGlassOverlay = isGlassReflections || isGlassStrong;
  const glassOverlayOpacity = isGlassStrong ? 0.22 : 0.16;

  const mediaFilter = [
    isColorGrading ? 'contrast(1.12) saturate(1.16) brightness(0.98)' : null,
    glassFilter ?? null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="relative">
      <style>{`
        @keyframes av-light-sweep {
          0% { transform: translate(-10%, -6%) scale(1.05); }
          50% { transform: translate(10%, 4%) scale(1.12); }
          100% { transform: translate(-6%, 8%) scale(1.08); }
        }
      `}</style>

      <div style={{ filter: mediaFilter }}>
        {children}
      </div>

      {isAnimatedLighting ? (
        <div
          className="pointer-events-none absolute -inset-[20%]"
          style={{
            animation: 'av-light-sweep 5200ms ease-in-out infinite',
            opacity: 0.34,
            mixBlendMode: 'screen',
            background:
              'radial-gradient(circle at 40% 35%, rgba(255, 80, 200, 0.55) 0%, rgba(80, 160, 255, 0.30) 38%, rgba(0,0,0,0) 70%)',
          }}
        />
      ) : null}

      {shouldShowGlassOverlay ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: glassOverlayOpacity,
            mixBlendMode: 'screen',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0.00) 45%, rgba(255,255,255,0.10) 62%, rgba(255,255,255,0.00) 100%)',
          }}
        />
      ) : null}
    </div>
  );
}

type ScriptCharacter = {
  key: string;
  name: string;
  description: string;
  isSahaba: boolean;
  isProphet: boolean;
  isWoman: boolean;
};

type SentenceEditorCardProps = {
  item: SentenceItem;
  index: number;
  isShortVideo: boolean;
  isFirst: boolean;
  isLast: boolean;

  onOpenSoundEffectsLibrary: () => void;
  onSoundEffectsChange: (next: NonNullable<SentenceItem['soundEffects']>) => void;
  onUploadSoundEffect: (files: File[]) => void | Promise<void>;
  isUploadingSoundEffect: boolean;
  onSaveSoundEffectsMix: () => void | Promise<void>;
  isSavingSoundEffectsMix: boolean;

  onSelectVideoFromLibrary?: () => void;

  videoModel: 'gemini' | 'grok';

  scriptCharacters: ScriptCharacter[];
  onForcedCharacterKeysChange: (next: string[] | null) => void;

  scriptEras: ScriptEra[];
  onForcedEraKeyChange: (next: string | null) => void;

  onVisualEffectChange: (
    value: NonNullable<SentenceItem['visualEffect']> | null,
  ) => void;

  enhanceError: string | null;
  isEnhancing: boolean;
  isApplyingPrompt: boolean;
  isEnhanceMenuOpen: boolean;
  onToggleEnhanceMenu: () => void;
  onAutoEnhance: () => void;
  onCustomPrompt: () => void;

  onMergeUp: () => void;
  onMergeDown: () => void;
  onRequestDelete: () => void;

  onSentenceTextChange: (next: string) => void;
  onSentenceMediaModeChange: (mode: 'single' | 'frames') => void;

  onSentenceImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onSentenceFrameImageUpload: (which: 'start' | 'end', e: ChangeEvent<HTMLInputElement>) => void;

  onGenerateSentenceImage: () => void | Promise<void>;
  onGenerateSentenceReferenceImage?: () => void | Promise<void>;
  onGenerateSentenceFrameImage?: (which: 'start' | 'end') => void | Promise<void>;
  onSelectFromLibrary: (which: 'single' | 'start' | 'end' | 'reference') => void;
  onRemoveSentenceImage: () => void;
  onRemoveSentenceFrameImage: (which: 'start' | 'end') => void;

  onVideoGenerationModeChange?: (
    mode: 'frames' | 'text' | 'referenceImage',
  ) => void;
  onVideoPromptChange?: (next: string) => void;
  isGeneratingVideoPrompt: boolean;
  onGenerateVideoPrompt?: () => void | Promise<void>;
  onSentenceReferenceImageUpload?: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveReferenceImage?: () => void;

  onOpenEnhanceImagePromptModal: () => void;
  isApplyingImagePrompt: boolean;
  imagePromptError?: string;

  isGeneratingVideo: boolean;
  onGenerateVideo?: (canGenerateVideo: boolean) => void | Promise<void>;
  onRemoveGeneratedVideo?: () => void;

  onPreviewImage: (url: string, effect: SentenceItem['visualEffect'] | null) => void;
};

export function SentenceEditorCard({
  item,
  index,
  isShortVideo,
  isFirst,
  isLast,

  onOpenSoundEffectsLibrary,
  onSoundEffectsChange,
  onUploadSoundEffect,
  isUploadingSoundEffect,
  onSaveSoundEffectsMix,
  isSavingSoundEffectsMix,

  onSelectVideoFromLibrary,

  videoModel,

  scriptCharacters,
  onForcedCharacterKeysChange,

  scriptEras,
  onForcedEraKeyChange,

  onVisualEffectChange,

  enhanceError,
  isEnhancing,
  isApplyingPrompt,
  isEnhanceMenuOpen,
  onToggleEnhanceMenu,
  onAutoEnhance,
  onCustomPrompt,

  onMergeUp,
  onMergeDown,
  onRequestDelete,

  onSentenceTextChange,
  onSentenceMediaModeChange,

  onSentenceImageUpload,
  onSentenceFrameImageUpload,

  onGenerateSentenceImage,
  onGenerateSentenceReferenceImage,
  onGenerateSentenceFrameImage,
  onSelectFromLibrary,
  onRemoveSentenceImage,
  onRemoveSentenceFrameImage,

  onOpenEnhanceImagePromptModal,
  isApplyingImagePrompt,
  imagePromptError,

  isGeneratingVideo,
  onGenerateVideo,
  onRemoveGeneratedVideo,
  onVideoGenerationModeChange,
  onVideoPromptChange,
  onSentenceReferenceImageUpload,
  onRemoveReferenceImage,

  isGeneratingVideoPrompt,
  onGenerateVideoPrompt,

  onPreviewImage,
}: SentenceEditorCardProps) {
  const videoAspectClass = isShortVideo ? 'aspect-9/16' : 'aspect-video';
  const generatedVideoClassName = isShortVideo
    ? 'block w-full aspect-9/16 object-cover h-96'
    : 'block w-full aspect-video object-cover';
  const hasAnyVideo = Boolean(item.video || item.videoUrl);
  const isSubscribeClip = item.videoUrl === '/subscribe.mp4';
  const hasAnyImage = Boolean(item.image || item.imageUrl);
  const mediaMode: 'single' | 'frames' = item.mediaMode ?? 'single';

  const soundEffects = Array.isArray(item.soundEffects) ? item.soundEffects : [];

  const [mixStatus, setMixStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [singleStatusByIndex, setSingleStatusByIndex] = useState<
    Record<number, 'idle' | 'loading' | 'playing'>
  >({});

  const [isSoundEffectsOpen, setIsSoundEffectsOpen] = useState(true);

  const [editingSoundEffectIndex, setEditingSoundEffectIndex] = useState<number | null>(null);
  const [isSavingSoundEffectEdit, setIsSavingSoundEffectEdit] = useState(false);

  const soundEffectsPreviewRef = useRef<{
    timeouts: number[];
    audios: HTMLAudioElement[];
  }>({ timeouts: [], audios: [] });

  const soundEffectsEverStartedRef = useRef<Set<string>>(new Set());

  const truncateSoundEffectTitle = (value: string) => {
    const v = String(value ?? '').trim();
    if (!v) return 'Sound effect';
    return v.length > 18 ? `${v.slice(0, 18)}…` : v;
  };

  const getSfxPreviewKey = (sfx: { id?: unknown; url: string }) => {
    const id = (sfx as any)?.id;
    if (typeof id === 'string' && id.trim().length > 0) return `id:${id}`;
    return `url:${String(sfx.url ?? '')}`;
  };

  const stopAllScheduledAudio = () => {
    const timeouts = soundEffectsPreviewRef.current.timeouts;
    const audios = soundEffectsPreviewRef.current.audios;

    for (const t of timeouts) window.clearTimeout(t);
    soundEffectsPreviewRef.current.timeouts = [];

    for (const audio of audios) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
    }
    soundEffectsPreviewRef.current.audios = [];

    setMixStatus('idle');
    setSingleStatusByIndex({});
  };

  const scheduleAudio = (params: {
    url: string;
    delaySeconds: number;
    volumePercent: number;
    onPlaying?: () => void;
    onEnded?: () => void;
    onError?: () => void;
  }) => {
    const audio = new Audio(params.url);
    audio.volume = Math.max(0, Math.min(1, (Number(params.volumePercent) || 0) / 100));
    if (params.onEnded) audio.onended = params.onEnded;
    if (params.onError) audio.onerror = params.onError;
    soundEffectsPreviewRef.current.audios.push(audio);

    const delayMs = Math.max(0, Number(params.delaySeconds) || 0) * 1000;
    const timeoutId = window.setTimeout(() => {
      const playPromise = audio.play();
      if (!playPromise || typeof (playPromise as any).then !== 'function') {
        params.onPlaying?.();
        return;
      }

      (playPromise as Promise<void>)
        .then(() => {
          params.onPlaying?.();
        })
        .catch(() => {
          params.onError?.();
        });
    }, delayMs);

    soundEffectsPreviewRef.current.timeouts.push(timeoutId);
  };

  const playMix = () => {
    if (soundEffects.length === 0) return;

    // Stop any single first.
    stopAllScheduledAudio();

    const shouldShowLoading = soundEffects.some((sfx) => {
      const key = getSfxPreviewKey({ id: (sfx as any)?.id, url: sfx.url });
      return !soundEffectsEverStartedRef.current.has(key);
    });
    setMixStatus(shouldShowLoading ? 'loading' : 'playing');

    let started = 0;
    let ended = 0;
    const total = soundEffects.length;

    for (const sfx of soundEffects) {
      const key = getSfxPreviewKey({ id: (sfx as any)?.id, url: sfx.url });
      scheduleAudio({
        url: sfx.url,
        delaySeconds: sfx.delaySeconds,
        volumePercent: sfx.volumePercent,
        onPlaying: () => {
          started += 1;
          soundEffectsEverStartedRef.current.add(key);
          setMixStatus('playing');
        },
        onEnded: () => {
          ended += 1;
          if (ended >= total) setMixStatus('idle');
        },
        onError: () => {
          // Autoplay policy or load error.
          setMixStatus('idle');
        },
      });
    }
  };

  const playSingle = (sfxIndex: number) => {
    const sfx = soundEffects[sfxIndex];
    if (!sfx) return;

    const key = getSfxPreviewKey({ id: (sfx as any)?.id, url: sfx.url });
    const shouldShowLoading = !soundEffectsEverStartedRef.current.has(key);

    // Stop any mix first.
    stopAllScheduledAudio();
    setSingleStatusByIndex({ [sfxIndex]: shouldShowLoading ? 'loading' : 'playing' });

    scheduleAudio({
      url: sfx.url,
      delaySeconds: sfx.delaySeconds,
      volumePercent: sfx.volumePercent,
      onPlaying: () => {
        soundEffectsEverStartedRef.current.add(key);
        setSingleStatusByIndex({ [sfxIndex]: 'playing' });
      },
      onEnded: () => setSingleStatusByIndex({}),
      onError: () => setSingleStatusByIndex({}),
    });
  };

  useEffect(() => {
    return () => {
      stopAllScheduledAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sentenceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sentenceDraftTextRef = useRef<string>(String(item.text ?? ''));
  const sentenceCommitTimeoutRef = useRef<number | null>(null);
  const sentenceIsComposingRef = useRef(false);

  const commitSentenceText = (next: string) => {
    onSentenceTextChange(next);
  };

  const scheduleCommitSentenceText = (next: string) => {
    sentenceDraftTextRef.current = next;

    if (sentenceCommitTimeoutRef.current !== null) {
      window.clearTimeout(sentenceCommitTimeoutRef.current);
    }

    // Debounce to avoid re-rendering the whole scene editor on every keystroke.
    sentenceCommitTimeoutRef.current = window.setTimeout(() => {
      sentenceCommitTimeoutRef.current = null;
      commitSentenceText(sentenceDraftTextRef.current);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (sentenceCommitTimeoutRef.current !== null) {
        window.clearTimeout(sentenceCommitTimeoutRef.current);
        sentenceCommitTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Keep the uncontrolled textarea in sync with external changes (AI edits, merges, etc.),
    // but never clobber the user's active typing.
    const next = String(item.text ?? '');
    sentenceDraftTextRef.current = next;

    const el = sentenceTextareaRef.current;
    if (!el) return;

    const isFocused = typeof document !== 'undefined' && document.activeElement === el;
    if (isFocused) return;
    if (el.value === next) return;
    el.value = next;
  }, [item.id, item.text]);

  const videoGenerationMode =
    (item.videoGenerationMode ?? 'referenceImage') as NonNullable<
      SentenceItem['videoGenerationMode']
    >;

  const effectiveVideoGenerationMode =
    videoModel === 'grok' && videoGenerationMode === 'frames'
      ? 'referenceImage'
      : videoGenerationMode;

  const [isForcedCharactersOpen, setIsForcedCharactersOpen] = useState(false);
  const [isForcedEraOpen, setIsForcedEraOpen] = useState(false);

  const forcedCount = Array.isArray(item.forcedCharacterKeys)
    ? item.forcedCharacterKeys.length
    : 0;
  const canPickForcedCharacters = Array.isArray(scriptCharacters) && scriptCharacters.length > 0;

  const canPickForcedEra = Array.isArray(scriptEras) && scriptEras.length > 0;
  const forcedEraKey = String(item.forcedEraKey ?? '').trim() || null;

  const visualEffectValue =
    item.visualEffect && item.visualEffect !== 'none'
      ? item.visualEffect
      : '__none__';

  const visualEffectLabel =
    visualEffectValue === '__none__'
      ? 'None'
      : visualEffectValue === 'colorGrading'
        ? 'Color grading'
        : visualEffectValue === 'animatedLighting'
          ? 'Animated lighting'
          : visualEffectValue === 'glassSubtle'
            ? 'Glass (subtle)'
            : visualEffectValue === 'glassReflections'
              ? 'Glass (reflections)'
              : visualEffectValue === 'glassStrong'
                ? 'Glass (strong)'
                : 'None';

  const startPreviewUrl = item.startImage ? URL.createObjectURL(item.startImage) : item.startImageUrl;
  const endPreviewUrl = item.endImage ? URL.createObjectURL(item.endImage) : item.endImageUrl;
  const referencePreviewUrl = item.referenceImage
    ? URL.createObjectURL(item.referenceImage)
    : item.referenceImageUrl;
  const hasStart = Boolean(startPreviewUrl);
  const hasEnd = Boolean(endPreviewUrl);
  const canGenerateVideo =
    mediaMode === 'frames' &&
    (effectiveVideoGenerationMode === 'frames'
      ? hasStart && hasEnd
      : effectiveVideoGenerationMode === 'text'
        ? Boolean(String(item.videoPrompt ?? '').trim())
        : Boolean(referencePreviewUrl) && Boolean(String(item.videoPrompt ?? '').trim()));

  const videoModeLabel =
    effectiveVideoGenerationMode === 'text'
      ? 'Text'
      : effectiveVideoGenerationMode === 'referenceImage'
        ? 'Reference'
        : 'Frames';

  const [isVideoModeMenuOpen, setIsVideoModeMenuOpen] = useState(false);
  const [isVideoModeMenuMounted, setIsVideoModeMenuMounted] = useState(false);
  const [isVideoModeMenuShown, setIsVideoModeMenuShown] = useState(false);
  const videoModeMenuRef = useRef<HTMLDivElement | null>(null);

  const openVideoModeMenu = () => {
    setIsVideoModeMenuMounted(true);
    setIsVideoModeMenuOpen(true);
    setIsVideoModeMenuShown(false);
    window.requestAnimationFrame(() => {
      setIsVideoModeMenuShown(true);
    });
  };

  const closeVideoModeMenu = () => {
    setIsVideoModeMenuShown(false);
    setIsVideoModeMenuOpen(false);
  };

  useEffect(() => {
    if (isVideoModeMenuOpen) return;
    if (!isVideoModeMenuMounted) return;
    const t = window.setTimeout(() => {
      setIsVideoModeMenuMounted(false);
    }, 170);
    return () => window.clearTimeout(t);
  }, [isVideoModeMenuOpen, isVideoModeMenuMounted]);

  useEffect(() => {
    if (!isVideoModeMenuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = videoModeMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      closeVideoModeMenu();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isVideoModeMenuOpen]);

  return (
    <div
      className="group relative bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      <div className="p-4">
        {/* Centered media mode tabs (applies to whole scene) */}
        <div className="flex items-center justify-between pb-4 gap-3">
          <div className="w-12" />
          <div className="inline-flex items-center gap-1 p-1 bg-linear-to-br from-gray-50 to-gray-100 rounded-2xl shadow-sm border border-gray-200">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onSentenceMediaModeChange('single')}
              className={
                mediaMode === 'single'
                  ? 'h-9 px-4 text-sm font-bold rounded-xl bg-white text-indigo-600 shadow-md hover:bg-white hover:text-indigo-600'
                  : 'h-9 px-4 text-sm font-semibold rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Image
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onSentenceMediaModeChange('frames')}
              className={
                mediaMode === 'frames'
                  ? 'h-9 px-4 text-sm font-bold rounded-xl bg-white text-indigo-600 shadow-md hover:bg-white hover:text-indigo-600'
                  : 'h-9 px-4 text-sm font-semibold rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }
            >
              <VideoIcon className="h-4 w-4 mr-2" />
              Video
            </Button>
          </div>

          <div className="shrink-0">
            <Select
              value={visualEffectValue}
              onValueChange={(v) => {
                if (v === '__none__') {
                  onVisualEffectChange(null);
                  return;
                }
                if (isVisualEffectSelectValue(v)) {
                  onVisualEffectChange(v);
                  return;
                }

                onVisualEffectChange(null);
              }}
            >
              <SelectTrigger
                className={
                  visualEffectValue === '__none__'
                    ? 'border-none focus-none h-9 w-48 bg-white border-gray-200 text-gray-600 shadow-sm [&>svg]:text-gray-600'
                    : 'border-none focus-none h-9 w-48 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 outline-none font-semibold text-white border-transparent shadow-md [&>svg]:text-white'
                }
                title={`Visual effect: ${visualEffectLabel}`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <SelectValue placeholder="Effect" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                <SelectItem value="colorGrading">Color grading</SelectItem>
                <SelectItem value="animatedLighting">Animated lighting</SelectItem>
                <SelectItem value="glassSubtle">Glass (subtle)</SelectItem>
                <SelectItem value="glassReflections">Glass (reflections)</SelectItem>
                <SelectItem value="glassStrong">Glass (strong)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-0">
          {/* Text Content Section */}
          <div className="space-y-4 lg:col-span-4">
            {/* Sentence Text */}
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-8 w-8 rounded-xl bg-linear-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                  {index + 1}
                </div>
                {item.isSuspense && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-lg">
                    <VideoIcon className="h-3.5 w-3.5" />
                    Suspense
                  </span>
                )}
              </div>
              <div className="relative flex-1">
                <div className="absolute top-3 left-3 z-10 p-1.5 bg-indigo-50 rounded-lg">
                  <FileText className="h-4 w-4 text-indigo-600" />
                </div>
                <textarea
                  ref={sentenceTextareaRef}
                  defaultValue={item.text}
                  onCompositionStart={() => {
                    sentenceIsComposingRef.current = true;
                  }}
                  onCompositionEnd={(e) => {
                    sentenceIsComposingRef.current = false;
                    scheduleCommitSentenceText(e.currentTarget.value);
                  }}
                  onChange={(e) => {
                    const next = e.target.value;
                    sentenceDraftTextRef.current = next;
                    if (sentenceIsComposingRef.current) return;
                    scheduleCommitSentenceText(next);
                  }}
                  onBlur={(e) => {
                    if (sentenceCommitTimeoutRef.current !== null) {
                      window.clearTimeout(sentenceCommitTimeoutRef.current);
                      sentenceCommitTimeoutRef.current = null;
                    }
                    commitSentenceText(e.currentTarget.value);
                  }}
                  className="w-full pl-12 pr-4 py-3 text-sm text-gray-800 leading-relaxed bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
                  rows={3}
                  placeholder="Enter your sentence text here..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Primary Actions Row */}
              <div className="flex flex-wrap gap-2">
                {/* Merge Buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isFirst}
                    onClick={onMergeUp}
                    variant="outline"
                    className="gap-2 h-8 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Merge this sentence into the previous one"
                  >
                    <ArrowUp className="h-4 w-4" />
                    <span className="text-xs font-semibold">Merge Up</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isLast}
                    onClick={onMergeDown}
                    variant="outline"
                    className="gap-2 h-8 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Merge this sentence into the next one"
                  >
                    <ArrowDown className="h-4 w-4" />
                    <span className="text-xs font-semibold">Merge Down</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canPickForcedCharacters}
                  onClick={() => {
                    setIsForcedCharactersOpen(true);
                  }}
                  className={
                    forcedCount > 0
                      ? 'gap-2 h-8 border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 transition-all'
                      : 'gap-2 h-8 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all'
                  }
                  title={
                    canPickForcedCharacters
                      ? 'Force character(s) for this sentence'
                      : 'No characters available (add characters first)'
                  }
                >
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-semibold">
                    Characters{forcedCount > 0 ? ` (${forcedCount})` : ''}
                  </span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canPickForcedEra}
                  onClick={() => {
                    setIsForcedEraOpen(true);
                  }}
                  className={
                    forcedEraKey
                      ? 'gap-2 h-8 border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 hover:border-violet-400 transition-all'
                      : 'gap-2 h-8 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all'
                  }
                  title={
                    canPickForcedEra
                      ? 'Force an era for this sentence'
                      : 'No eras available (add eras first)'
                  }
                >
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-semibold">
                    Era{forcedEraKey ? ' (1)' : ''}
                  </span>
                </Button>

                {/* Enhance Button with Dropdown */}
                <div className="relative">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 h-8 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-sm hover:shadow-md transition-all"
                    title="Enhance this sentence"
                    onClick={onToggleEnhanceMenu}
                    disabled={isEnhancing || isApplyingPrompt}
                    data-enhance-button
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs font-semibold">Enhancing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs font-semibold">Enhance</span>
                      </>
                    )}
                  </Button>

                  {/* Enhance Menu Dropdown */}
                  {isEnhanceMenuOpen && !isEnhancing && !isApplyingPrompt ? (
                    <div
                      className="absolute left-0 top-full mt-2 z-20 w-64 rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                      data-enhance-menu
                    >
                      <div className="p-2 space-y-1">
                        <button
                          type="button"
                          onClick={onAutoEnhance}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-linear-to-r hover:from-amber-50 hover:to-orange-50 transition-all group text-left"
                        >
                          <div className="p-2 bg-linear-to-br from-amber-100 to-orange-100 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                            <Sparkles className="h-4 w-4 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 group-hover:text-amber-700 transition-colors">
                              Auto Enhance
                            </p>
                            <p className="text-xs text-gray-500 leading-tight mt-0.5">Let AI improve your text</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={onCustomPrompt}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 transition-all group text-left"
                        >
                          <div className="p-2 bg-linear-to-br from-blue-100 to-indigo-100 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                              Custom Prompt
                            </p>
                            <p className="text-xs text-gray-500 leading-tight mt-0.5">Use your own instructions</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Delete Button */}
                <Button
                  type="button"
                  size="sm"
                  disabled={item.videoUrl === '/subscribe.mp4'}
                  onClick={onRequestDelete}
                  variant="outline"
                  className="gap-2 h-8 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={item.videoUrl === '/subscribe.mp4' ? 'This scene cannot be deleted' : 'Delete this sentence and its media'}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="text-xs font-semibold">Delete</span>
                </Button>
              </div>

              <ForcedCharactersModal
                isOpen={isForcedCharactersOpen}
                characters={scriptCharacters}
                selectedKeys={item.forcedCharacterKeys}
                onClose={() => setIsForcedCharactersOpen(false)}
                onClear={() => onForcedCharacterKeysChange([])}
                onSave={(next) => onForcedCharacterKeysChange(next)}
              />

              <ForcedEraModal
                isOpen={isForcedEraOpen}
                eras={scriptEras}
                selectedKey={item.forcedEraKey ?? null}
                onClose={() => setIsForcedEraOpen(false)}
                onClear={() => onForcedEraKeyChange('')}
                onSave={(next) => onForcedEraKeyChange(next)}
              />
            </div>

            {/* Sound Effects */}
            <div className="rounded-2xl border border-indigo-200/70 bg-linear-to-br from-white via-indigo-50/40 to-purple-50/30 shadow-sm overflow-hidden">
              <div className="px-4 py-4 border-b border-indigo-200/60 bg-linear-to-r from-indigo-50 via-purple-50/40 to-pink-50/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white/70 rounded-xl border border-indigo-200/60 shadow-sm">
                      <Music2 className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold bg-linear-to-r from-gray-900 via-purple-900 to-indigo-900 bg-clip-text text-transparent">Sound Effects</p>
                      <p className="text-xs text-gray-500">Start with this sentence (plus delay)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (mixStatus === 'playing' || mixStatus === 'loading') {
                          stopAllScheduledAudio();
                          return;
                        }
                        playMix();
                      }}
                      disabled={soundEffects.length === 0}
                      className="gap-2 h-8 border-gray-200 text-gray-700 hover:bg-gray-50"
                      title={mixStatus !== 'idle' ? 'Stop mix preview' : 'Preview all sound effects together'}
                    >
                      {mixStatus === 'loading' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs font-semibold">Loading...</span>
                        </>
                      ) : mixStatus === 'playing' ? (
                        <>
                          <Pause className="h-4 w-4" />
                          <span className="text-xs font-semibold">Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          <span className="text-xs font-semibold">Play all</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        void Promise.resolve(onSaveSoundEffectsMix());
                      }}
                      disabled={soundEffects.length < 2 || isSavingSoundEffectsMix}
                      className="gap-2 h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      title={
                        soundEffects.length < 2
                          ? 'Add at least 2 sound effects to save a mix'
                          : 'Save these sound effects as one merged file'
                      }
                    >
                      {isSavingSoundEffectsMix ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs font-semibold">Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span className="text-xs font-semibold">Save mix</span>
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-200/70 bg-white/70 text-indigo-700 hover:bg-white"
                      title={isSoundEffectsOpen ? 'Collapse sound effects' : 'Expand sound effects'}
                      aria-label={isSoundEffectsOpen ? 'Collapse sound effects' : 'Expand sound effects'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSoundEffectsOpen((prev) => {
                          const next = !prev;
                          if (!next) stopAllScheduledAudio();
                          return next;
                        });
                      }}
                    >
                      <ArrowDown
                        className={
                          isSoundEffectsOpen
                            ? 'h-4 w-4 transition-transform duration-200'
                            : 'h-4 w-4 rotate-180 transition-transform duration-200'
                        }
                      />
                    </button>
                  </div>
                </div>
              </div>

              {isSoundEffectsOpen ? (
                <div className="px-4 py-4 fade-in animate-in duration-500">
                  <SoundEffectEditModal
                    isOpen={
                      editingSoundEffectIndex !== null &&
                      Boolean(soundEffects[editingSoundEffectIndex])
                    }
                    title="Edit sound effect"
                    audioUrl={soundEffects[editingSoundEffectIndex ?? 0]?.url ?? null}
                    initialName={String(soundEffects[editingSoundEffectIndex ?? 0]?.title ?? '').trim()}
                    initialVolumePercent={
                      Number(soundEffects[editingSoundEffectIndex ?? 0]?.volumePercent ?? 100) || 100
                    }
                    isSaving={isSavingSoundEffectEdit}
                    onClose={() => setEditingSoundEffectIndex(null)}
                    onSave={async (values) => {
                      const idx = editingSoundEffectIndex;
                      if (idx === null) return;
                      const current = soundEffects[idx];
                      if (!current) return;

                      const nextTitle = String(values.name ?? '').trim() || String(current.title ?? '').trim();
                      const nextVolumePercent = Math.max(
                        0,
                        Math.min(300, Number(values.volumePercent) || 0),
                      );

                      // Optimistically update the sentence first.
                      onSoundEffectsChange(
                        soundEffects.map((it, i) =>
                          i === idx
                            ? {
                              ...it,
                              title: nextTitle,
                              volumePercent: nextVolumePercent,
                            }
                            : it,
                        ),
                      );

                      // Best-effort persist to the library so future inserts match.
                      setIsSavingSoundEffectEdit(true);
                      try {
                        await Promise.all([
                          api.patch(`/sound-effects/${encodeURIComponent(current.id)}`, {
                            name: nextTitle,
                          }),
                          api.patch(`/sound-effects/volume/${encodeURIComponent(current.id)}`, {
                            volumePercent: nextVolumePercent,
                          }),
                        ]);
                        setEditingSoundEffectIndex(null);
                      } catch (err) {
                        // eslint-disable-next-line no-console
                        console.error('Failed to update sound effect', err);
                        setEditingSoundEffectIndex(null);
                      } finally {
                        setIsSavingSoundEffectEdit(false);
                      }
                    }}
                  />

                  <div className="flex flex-wrap gap-2">
                    <input
                      type="file"
                      id={`sentence-sfx-${item.id}`}
                      accept="audio/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const list = Array.from(e.target.files ?? []);
                        if (list.length === 0) return;
                        void Promise.resolve(onUploadSoundEffect(list));
                        e.currentTarget.value = '';
                      }}
                    />

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => document.getElementById(`sentence-sfx-${item.id}`)?.click()}
                      disabled={isUploadingSoundEffect}
                      className="gap-2 h-9 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                      title="Upload a sound effect"
                    >
                      {isUploadingSoundEffect ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs font-bold">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span className="text-xs font-bold">Upload</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onOpenSoundEffectsLibrary}
                      className="gap-2 h-9 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold"
                      title="Choose from your sound effects library"
                    >
                      <Library className="h-4 w-4" />
                      <span className="text-xs font-bold">From Library</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        stopAllScheduledAudio();
                        onSoundEffectsChange([]);
                      }}
                      disabled={soundEffects.length === 0}
                      className="gap-2 h-9 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold"
                      title="Remove all sound effects from this sentence"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-xs font-bold">Remove all</span>
                    </Button>
                  </div>

                  {soundEffects.length === 0 ? (
                    <p className="mt-3 text-xs text-gray-500">
                      No sound effects yet. Upload one or pick from your library.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {soundEffects.map((sfx, sfxIndex) => (
                        <div
                          key={`${sfx.id}-${sfxIndex}`}
                          className="rounded-xl border border-gray-200 bg-gray-50/50 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p
                                className="text-sm font-bold text-gray-900 truncate"
                                title={String(sfx.title ?? '').trim()}
                              >
                                {truncateSoundEffectTitle(String(sfx.title ?? ''))}
                              </p>
                              <p className="text-xs text-gray-500 truncate" title={sfx.url}>
                                {sfx.url}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const status = singleStatusByIndex[sfxIndex] ?? 'idle';
                                  if (status === 'loading' || status === 'playing') {
                                    stopAllScheduledAudio();
                                    return;
                                  }
                                  playSingle(sfxIndex);
                                }}
                                className="h-8 gap-2 border-gray-200 text-gray-700 hover:bg-white"
                                title="Preview this sound effect"
                              >
                                {singleStatusByIndex[sfxIndex] === 'loading' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : singleStatusByIndex[sfxIndex] === 'playing' ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                                <span className="text-xs font-semibold">
                                  {singleStatusByIndex[sfxIndex] === 'loading'
                                    ? 'Loading...'
                                    : singleStatusByIndex[sfxIndex] === 'playing'
                                      ? 'Stop'
                                      : 'Play'}
                                </span>
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSoundEffectIndex(sfxIndex)}
                                className=" border-gray-200 text-gray-700 hover:bg-white"
                                title="Edit name & volume"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="text-xs font-semibold">Edit</span>
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const next = soundEffects.filter((_, i) => i !== sfxIndex);
                                  onSoundEffectsChange(next);
                                }}
                                className="h-8 gap-2 border-red-200 text-red-600 hover:bg-red-50"
                                title="Remove"
                              >
                                <X className="h-4 w-4" />
                                <span className="text-xs font-semibold">Remove</span>
                              </Button>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-xl border border-gray-200 bg-white/60 p-3">
                              <div className="flex items-start gap-2 h-9">
                                <div className="mt-0.5 p-2 bg-indigo-50 rounded-xl">
                                  <Timer className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-900">Start offset</p>
                                  <p className="text-[11px] text-gray-500 leading-tight">
                                    Seconds after sentence starts
                                  </p>
                                </div>
                              </div>

                              <div className="mt-2 relative">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  value={String(Number(sfx.delaySeconds ?? 0))}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const delaySeconds = Math.max(0, Number(raw) || 0);
                                    const next = soundEffects.map((it, i) =>
                                      i === sfxIndex ? { ...it, delaySeconds } : it,
                                    );
                                    onSoundEffectsChange(next);
                                  }}
                                  className="h-9 pr-10"
                                  placeholder="0.0"
                                  title="Start offset in seconds (relative to the sentence start)"
                                />
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                                  s
                                </div>
                              </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white/60 p-3">
                              <div className="flex items-start gap-2 h-9">
                                <div className="mt-0.5 p-2 bg-indigo-50 rounded-xl">
                                  <Volume2 className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-900">Volume</p>
                                  <p className="text-[11px] text-gray-500 leading-tight">
                                    Relative loudness
                                  </p>
                                </div>
                              </div>

                              <div className="mt-2 relative">
                                <Input
                                  type="number"
                                  min={0}
                                  max={300}
                                  step={1}
                                  value={String(Math.max(0, Math.min(300, Number(sfx.volumePercent ?? 100) || 0)))}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const volumePercent = Math.max(0, Math.min(300, Number(raw) || 0));
                                    const next = soundEffects.map((it, i) =>
                                      i === sfxIndex ? { ...it, volumePercent } : it,
                                    );
                                    onSoundEffectsChange(next);
                                  }}
                                  className="h-9 pr-10"
                                  placeholder="100"
                                  title="Volume percent (100 = original volume)"
                                />
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                                  %
                                </div>
                              </div>
                            </div>


                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Error Message */}
            {enhanceError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
                <div className="p-1 bg-red-100 rounded-lg shrink-0">
                  <X className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-xs text-red-700 font-medium flex-1">{enhanceError}</p>
              </div>
            )}
          </div>

          {/* Media Section */}
          <div className="space-y-4 lg:col-span-2 lg:pl-4">
            {/* Upload/Generate Area for Single Mode */}
            {mediaMode === 'single' && !(item.image || item.imageUrl || item.video || item.videoUrl) && (
              <div className="space-y-3">
                <div
                  className="relative bg-linear-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 border-2 border-dashed border-indigo-300 rounded-2xl p-4 text-center transition-all duration-300 cursor-pointer hover:border-indigo-400 hover:shadow-lg hover:scale-[1.01] group"
                  onClick={() => document.getElementById(`sentence-image-${item.id}`)?.click()}
                >
                  <div className="flex flex-col items-center gap-3 pointer-events-none">
                    <div className="relative">
                      <div className="absolute inset-0 bg-indigo-400 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity"></div>
                      <div className="relative p-3 bg-white rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                        <ImageIcon className="h-7 w-7 text-indigo-500" />
                      </div>
                    </div>
                    <input
                      type="file"
                      id={`sentence-image-${item.id}`}
                      accept="image/*,video/*"
                      onChange={onSentenceImageUpload}
                      className="hidden"
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-900 mb-1">Click to upload</p>
                      <p className="text-xs text-gray-600">Images or videos</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      void Promise.resolve(onGenerateSentenceImage());
                    }}
                    disabled={item.isGeneratingImage}
                    className="h-10 gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    {item.isGeneratingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm font-bold">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span className="text-sm font-bold">Generate with AI</span>
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFromLibrary('single');
                    }}
                    className="h-10 gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                  >
                    <Library className="h-4 w-4" />
                    <span className="text-sm">From Library</span>
                  </Button>
                </div>

              </div>
            )}

            {/* Video inputs */}
            {mediaMode === 'frames' && (
              <div className="space-y-4">
                {effectiveVideoGenerationMode === 'frames' ? (
                  !hasAnyVideo ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                        {/* Start Frame */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-linear-to-r from-indigo-600 to-purple-600 shadow-sm"></div>
                            <p className="text-sm font-bold text-gray-800">Start Frame</p>
                          </div>
                          {startPreviewUrl ? (
                            <div className="relative group/frame rounded-2xl overflow-hidden shadow-lg border-2 border-gray-200">
                              <VisualEffectPreview effect={item.visualEffect}>
                                <img
                                  src={startPreviewUrl}
                                  alt="Start frame"
                                  className="w-full h-48 object-cover cursor-zoom-in transition-transform duration-300 group-hover/frame:scale-110"
                                  onClick={() => onPreviewImage(startPreviewUrl, item.visualEffect ?? null)}
                                />
                              </VisualEffectPreview>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectFromLibrary('start');
                                }}
                                className="absolute top-2 left-2 p-2 bg-white/90 text-indigo-700 rounded-xl hover:bg-white shadow-lg transition-all hover:scale-110"
                                title="Choose start frame from library"
                              >
                                <Library className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveSentenceFrameImage('start')}
                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                                title="Remove start frame"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="bg-linear-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 border-2 border-dashed border-indigo-300 rounded-2xl p-5 text-center hover:border-indigo-400 hover:shadow-lg transition-all duration-300 cursor-pointer group/upload"
                              onClick={() => document.getElementById(`sentence-start-image-${item.id}`)?.click()}
                            >
                              <input
                                type="file"
                                id={`sentence-start-image-${item.id}`}
                                accept="image/*"
                                onChange={(e) => onSentenceFrameImageUpload('start', e)}
                                className="hidden"
                              />
                              <div className="flex flex-col items-center gap-3 pointer-events-none">
                                <div className="p-3 bg-white rounded-xl shadow-md group-hover/upload:scale-110 transition-transform duration-300">
                                  <ImageIcon className="h-6 w-6 text-indigo-500" />
                                </div>
                                <span className="text-sm font-semibold text-gray-800">Click to upload</span>
                              </div>

                              {onGenerateSentenceFrameImage && (
                                <div className="mt-4 pointer-events-auto">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void Promise.resolve(onGenerateSentenceFrameImage('start'));
                                    }}
                                    disabled={Boolean(item.isGeneratingStartImage)}
                                    className="h-9 w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
                                  >
                                    {item.isGeneratingStartImage ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-xs font-bold">Generating...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-4 w-4" />
                                        <span className="text-xs font-bold">Generate AI</span>
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}

                              <div className="mt-3 pointer-events-auto">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectFromLibrary('start');
                                  }}
                                  className="h-9 w-full gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                                >
                                  <Library className="h-4 w-4" />
                                  <span className="text-xs font-bold">From Library</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* End Frame */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-linear-to-r from-purple-600 to-pink-600 shadow-sm"></div>
                            <p className="text-sm font-bold text-gray-800">End Frame</p>
                          </div>
                          {endPreviewUrl ? (
                            <div className="relative group/frame rounded-2xl overflow-hidden shadow-lg border-2 border-gray-200">
                              <VisualEffectPreview effect={item.visualEffect}>
                                <img
                                  src={endPreviewUrl}
                                  alt="End frame"
                                  className="w-full h-58 object-cover cursor-zoom-in transition-transform duration-300 group-hover/frame:scale-110"
                                  onClick={() => onPreviewImage(endPreviewUrl, item.visualEffect ?? null)}
                                />
                              </VisualEffectPreview>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectFromLibrary('end');
                                }}
                                className="absolute top-2 left-2 p-2 bg-white/90 text-indigo-700 rounded-xl hover:bg-white shadow-lg transition-all hover:scale-110"
                                title="Choose end frame from library"
                              >
                                <Library className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveSentenceFrameImage('end')}
                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                                title="Remove end frame"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="bg-linear-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 border-2 border-dashed border-indigo-300 rounded-2xl p-5 text-center hover:border-indigo-400 hover:shadow-lg transition-all duration-300 cursor-pointer group/upload"
                              onClick={() => document.getElementById(`sentence-end-image-${item.id}`)?.click()}
                            >
                              <input
                                type="file"
                                id={`sentence-end-image-${item.id}`}
                                accept="image/*"
                                onChange={(e) => onSentenceFrameImageUpload('end', e)}
                                className="hidden"
                              />
                              <div className="flex flex-col items-center gap-3 pointer-events-none">
                                <div className="p-3 bg-white rounded-xl shadow-md group-hover/upload:scale-110 transition-transform duration-300">
                                  <ImageIcon className="h-6 w-6 text-indigo-500" />
                                </div>
                                <span className="text-sm font-semibold text-gray-800">Click to upload</span>
                              </div>

                              {onGenerateSentenceFrameImage && (
                                <div className="mt-4 pointer-events-auto">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void Promise.resolve(onGenerateSentenceFrameImage('end'));
                                    }}
                                    disabled={Boolean(item.isGeneratingEndImage)}
                                    className="h-9 w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
                                  >
                                    {item.isGeneratingEndImage ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-xs font-bold">Generating...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-4 w-4" />
                                        <span className="text-xs font-bold">Generate AI</span>
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}

                              <div className="mt-3 pointer-events-auto">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectFromLibrary('end');
                                  }}
                                  className="h-9 w-full gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                                >
                                  <Library className="h-4 w-4" />
                                  <span className="text-xs font-bold">From Library</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {!canGenerateVideo && (
                        <div className="rounded-2xl border-2 border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 px-5 py-4 flex items-start gap-3 shadow-sm">
                          <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <p className="text-sm text-amber-900 leading-relaxed font-medium">
                            Upload both <span className="font-bold">Start</span> and <span className="font-bold">End</span> frames to enable video generation.
                          </p>
                        </div>
                      )}
                    </>
                  ) : null
                ) : effectiveVideoGenerationMode === 'text' ? (
                  hasAnyVideo ? null : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-linear-to-r from-emerald-600 to-teal-600 shadow-sm"></div>
                        <p className="text-sm font-bold text-gray-800">Video Prompt</p>
                      </div>
                      <textarea
                        value={String(item.videoPrompt ?? '')}
                        onChange={(e) => onVideoPromptChange?.(e.target.value)}
                        className="w-full px-4 py-3 text-sm text-gray-800 leading-relaxed bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
                        rows={4}
                        placeholder="Describe the video you want (e.g. cinematic close-up, slow camera move, dramatic lighting...)"
                      />

                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void Promise.resolve(onGenerateVideoPrompt?.());
                        }}
                        disabled={!onGenerateVideoPrompt || isGeneratingVideoPrompt}
                        className="h-9 w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isGeneratingVideoPrompt ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs font-bold">Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            <span className="text-xs font-bold">Generate with AI</span>
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-gray-500">Hint: Generates video directly from text (no frames needed).</p>
                      {!canGenerateVideo ? (
                        <p className="text-xs font-semibold text-amber-700">Enter a prompt to enable generation.</p>
                      ) : null}
                    </div>
                  )
                ) : (
                  hasAnyVideo ? null : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-linear-to-r from-indigo-600 to-purple-600 shadow-sm"></div>
                        <p className="text-sm font-bold text-gray-800">Reference Image</p>
                      </div>

                      {referencePreviewUrl ? (
                        <div className="relative group/frame rounded-2xl overflow-hidden shadow-lg border-2 border-gray-200">
                          <img
                            src={referencePreviewUrl}
                            alt="Reference"
                            className="w-full h-48 object-cover cursor-zoom-in transition-transform duration-300 group-hover/frame:scale-110"
                            onClick={() => onPreviewImage(referencePreviewUrl, item.visualEffect ?? null)}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFromLibrary('reference');
                            }}
                            className="absolute top-2 left-2 p-2 bg-white/90 text-indigo-700 rounded-xl hover:bg-white shadow-lg transition-all hover:scale-110"
                            title="Choose reference image from library"
                          >
                            <Library className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveReferenceImage?.();
                            }}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                            title="Remove reference image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="bg-linear-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 border-2 border-dashed border-indigo-300 rounded-2xl p-5 text-center hover:border-indigo-400 hover:shadow-lg transition-all duration-300 cursor-pointer group/upload"
                          onClick={() => document.getElementById(`sentence-reference-image-${item.id}`)?.click()}
                        >
                          <input
                            type="file"
                            id={`sentence-reference-image-${item.id}`}
                            accept="image/*"
                            onChange={(e) => onSentenceReferenceImageUpload?.(e)}
                            className="hidden"
                          />
                          <div className="flex flex-col items-center gap-3 pointer-events-none">
                            <div className="p-3 bg-white rounded-xl shadow-md group-hover/upload:scale-110 transition-transform duration-300">
                              <ImageIcon className="h-6 w-6 text-indigo-500" />
                            </div>
                            <span className="text-sm font-semibold text-gray-800">Click to upload</span>
                          </div>

                          <div className="mt-3 pointer-events-auto">
                            <div className="flex flex-col gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void Promise.resolve(onGenerateSentenceReferenceImage?.());
                                }}
                                disabled={!onGenerateSentenceReferenceImage || item.isGeneratingReferenceImage}
                                className="h-9 w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {item.isGeneratingReferenceImage ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-xs font-bold">Generating...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4" />
                                    <span className="text-xs font-bold">Generate with AI</span>
                                  </>
                                )}
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectFromLibrary('reference');
                                }}
                                className="h-9 w-full gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                              >
                                <Library className="h-4 w-4" />
                                <span className="text-xs font-bold">From Library</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-linear-to-r from-emerald-600 to-teal-600 shadow-sm"></div>
                          <p className="text-sm font-bold text-gray-800">Video Prompt</p>
                        </div>
                        <textarea
                          value={String(item.videoPrompt ?? '')}
                          onChange={(e) => onVideoPromptChange?.(e.target.value)}
                          className="w-full px-4 py-3 text-sm text-gray-800 leading-relaxed bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
                          rows={4}
                          placeholder="Describe the video you want (e.g. cinematic close-up, slow camera move, dramatic lighting...)"
                        />

                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void Promise.resolve(onGenerateVideoPrompt?.());
                          }}
                          disabled={!onGenerateVideoPrompt || isGeneratingVideoPrompt}
                          className="h-9 w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isGeneratingVideoPrompt ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-xs font-bold">Generating...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              <span className="text-xs font-bold">Generate with AI</span>
                            </>
                          )}
                        </Button>
                      </div>

                      <p className="text-xs text-gray-500">Hint: Uses your prompt + the reference image to guide the generation.</p>
                      {!canGenerateVideo ? (
                        <p className="text-xs font-semibold text-amber-700">Add a reference image and a prompt to enable generation.</p>
                      ) : null}
                    </div>
                  )
                )}

                {/* Generated Video + (Re)Generate Button */}
                {item.video || item.videoUrl ? (
                  <div className="space-y-3">
                    <div className="relative w-full rounded-2xl overflow-hidden shadow-xl">
                      <VisualEffectPreview effect={item.visualEffect}>
                        <video
                          src={item.video ? URL.createObjectURL(item.video) : (item.videoUrl as string)}
                          controls
                          className={generatedVideoClassName}
                        />
                      </VisualEffectPreview>

                      {item.videoUrl && item.videoUrl !== '/subscribe.mp4' ? (
                        <button
                          type="button"
                          onClick={() => onRemoveGeneratedVideo?.()}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                          title="Remove generated video"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    {!isSubscribeClip ? (
                      <div className="space-y-2">
                        {onSelectVideoFromLibrary ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectVideoFromLibrary();
                            }}
                            className="h-9 w-full gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                          >
                            <VideoIcon className="h-4 w-4" />
                            <span className="text-xs font-bold">Video Library</span>
                          </Button>
                        ) : null}

                        <div className="flex items-center gap-2">
                          <div className="relative" ref={videoModeMenuRef}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isVideoModeMenuOpen) {
                                  closeVideoModeMenu();
                                  return;
                                }
                                openVideoModeMenu();
                              }}
                              className="h-10 w-10 rounded-xl bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                              title={`Video mode: ${videoModeLabel}`}
                            >
                              <Repeat2 className="h-4 w-4" />
                            </button>

                            {isVideoModeMenuMounted ? (
                              <div
                                className={
                                  isVideoModeMenuShown
                                    ? 'absolute right-0 bottom-full mb-2 z-30 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden origin-bottom-right transform-gpu opacity-100 scale-100 translate-y-0 pointer-events-auto transition duration-150 ease-out'
                                    : 'absolute right-0 bottom-full mb-2 z-30 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden origin-bottom-right transform-gpu opacity-0 scale-95 translate-y-2 pointer-events-none transition duration-150 ease-in'
                                }
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-2 space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onVideoGenerationModeChange?.('referenceImage');
                                      closeVideoModeMenu();
                                    }}
                                    className={
                                      effectiveVideoGenerationMode === 'referenceImage'
                                        ? 'w-full text-left rounded-xl px-3 py-2 bg-linear-to-r from-indigo-50 to-purple-50 border border-indigo-200'
                                        : 'w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50'
                                    }
                                  >
                                    <p className="text-sm font-bold text-gray-900">Reference image</p>
                                    <p className="text-xs text-gray-500">One image + sentence text</p>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onVideoGenerationModeChange?.('text');
                                      closeVideoModeMenu();
                                    }}
                                    className={
                                      effectiveVideoGenerationMode === 'text'
                                        ? 'w-full text-left rounded-xl px-3 py-2 bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200'
                                        : 'w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50'
                                    }
                                  >
                                    <p className="text-sm font-bold text-gray-900">Text to video</p>
                                    <p className="text-xs text-gray-500">Prompt only (no images)</p>
                                  </button>
                                  {videoModel !== 'grok' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onVideoGenerationModeChange?.('frames');
                                        closeVideoModeMenu();
                                      }}
                                      className={
                                        effectiveVideoGenerationMode === 'frames'
                                          ? 'w-full text-left rounded-xl px-3 py-2 bg-gray-50 border border-gray-200'
                                          : 'w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50'
                                      }
                                    >
                                      <p className="text-sm font-bold text-gray-900">Frames</p>
                                      <p className="text-xs text-gray-500">Start + end frames</p>
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void Promise.resolve(onGenerateVideo?.(canGenerateVideo))}
                            disabled={!onGenerateVideo || isGeneratingVideo}
                            className="h-10 flex-1 min-w-0 gap-2 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isGeneratingVideo ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm font-bold">Generating Video...</span>
                              </>
                            ) : (
                              <>
                                <VideoIcon className="h-4 w-4" />
                                <span className="text-sm font-bold">Regenerate Video</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {onSelectVideoFromLibrary ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVideoFromLibrary();
                        }}
                        className="h-9 w-full gap-2 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold shadow-sm hover:shadow-md transition-all"
                      >
                        <VideoIcon className="h-4 w-4" />
                        <span className="text-xs font-bold">Video Library</span>
                      </Button>
                    ) : null}

                    <div className="flex items-center gap-2">
                      <div className="relative" ref={videoModeMenuRef}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isVideoModeMenuOpen) {
                              closeVideoModeMenu();
                              return;
                            }
                            openVideoModeMenu();
                          }}
                          className="h-10 w-10 rounded-xl bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                          title={`Video mode: ${videoModeLabel}`}
                        >
                          <Repeat2 className="h-4 w-4" />
                        </button>

                        {isVideoModeMenuMounted ? (
                          <div
                            className={
                              isVideoModeMenuShown
                                ? 'absolute right-0 bottom-full mb-2 z-30 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden origin-bottom-right transform-gpu opacity-100 scale-100 translate-y-0 pointer-events-auto transition duration-150 ease-out'
                                : 'absolute right-0 bottom-full mb-2 z-30 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden origin-bottom-right transform-gpu opacity-0 scale-95 translate-y-2 pointer-events-none transition duration-150 ease-in'
                            }
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="p-2 space-y-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onVideoGenerationModeChange?.('referenceImage');
                                  closeVideoModeMenu();
                                }}
                                className={
                                  effectiveVideoGenerationMode === 'referenceImage'
                                    ? 'w-full text-left rounded-xl px-3 py-2 bg-linear-to-r from-indigo-50 to-purple-50 border border-indigo-200'
                                    : 'w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50'
                                }
                              >
                                <p className="text-sm font-bold text-gray-900">Reference image</p>
                                <p className="text-xs text-gray-500">One image + sentence text</p>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onVideoGenerationModeChange?.('text');
                                  closeVideoModeMenu();
                                }}
                                className={
                                  effectiveVideoGenerationMode === 'text'
                                    ? 'w-full text-left rounded-xl px-3 py-2 bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200'
                                    : 'w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50'
                                }
                              >
                                <p className="text-sm font-bold text-gray-900">Text to video</p>
                                <p className="text-xs text-gray-500">Prompt only (no images)</p>
                              </button>
                              {videoModel !== 'grok' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onVideoGenerationModeChange?.('frames');
                                    closeVideoModeMenu();
                                  }}
                                  className={
                                    effectiveVideoGenerationMode === 'frames'
                                      ? 'w-full text-left rounded-xl px-3 py-2 bg-gray-50 border border-gray-200'
                                      : 'w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50'
                                  }
                                >
                                  <p className="text-sm font-bold text-gray-900">Frames</p>
                                  <p className="text-xs text-gray-500">Start + end frames</p>
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void Promise.resolve(onGenerateVideo?.(canGenerateVideo))}
                        disabled={!onGenerateVideo || item.videoUrl === '/subscribe.mp4' || isGeneratingVideo}
                        className="h-10 flex-1 min-w-0 gap-2 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isGeneratingVideo ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm font-bold">Generating Video...</span>
                          </>
                        ) : (
                          <>
                            <VideoIcon className="h-4 w-4" />
                            <span className="text-sm font-bold">Generate Video</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Media Preview (image or video) */}
            {mediaMode === 'single' && (item.image || item.imageUrl || item.video || item.videoUrl) && (
              <div className="space-y-3">
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-lg group/preview">
                    {item.image || item.imageUrl ? (
                      <VisualEffectPreview effect={item.visualEffect}>
                        <img
                          src={item.image ? URL.createObjectURL(item.image) : (item.imageUrl as string)}
                          alt={`Scene ${index + 1}`}
                          className="w-full h-58 object-cover transition-transform duration-200 group-hover/preview:scale-105 cursor-zoom-in"
                          onClick={() =>
                            onPreviewImage(
                              item.image ? URL.createObjectURL(item.image) : (item.imageUrl as string),
                              item.visualEffect ?? null,
                            )
                          }
                        />
                      </VisualEffectPreview>
                    ) : (
                      <VisualEffectPreview effect={item.visualEffect}>
                        <video
                          src={item.video ? URL.createObjectURL(item.video) : (item.videoUrl as string)}
                          controls
                          className={`block w-full max-w-65 mx-auto ${videoAspectClass} object-cover`}
                        />
                      </VisualEffectPreview>
                    )}
                    <button
                      type="button"
                      onClick={onRemoveSentenceImage}
                      className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {item.imageUrl && !item.image && !item.video && !item.videoUrl && (
                      <div className="absolute bottom-3 left-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-xl shadow-lg">
                          <Sparkles className="h-2 w-2" />
                          AI Generated
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {item.imagePrompt && (
                  <div className="col-span-2 bg-gray-50 rounded-xl p-2 border border-gray-200">
                    <div className="flex items-start gap-2">
                      <div className="p-1 bg-indigo-100 rounded-lg shrink-0 mt-0.5">
                        <Sparkles className="h-3 w-3 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Prompt Used</p>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-1">{item.imagePrompt}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectFromLibrary('single')}
                    disabled={item.isSavingImage || item.isGeneratingImage || isApplyingImagePrompt}
                    className={`h-9 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-semibold ${hasAnyImage ? '' : 'col-span-2'
                      }`}
                  >
                    <Library className="h-4 w-4" />
                    <span className="text-xs">Change</span>
                  </Button>
                  {hasAnyImage && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void Promise.resolve(onGenerateSentenceImage())}
                        disabled={item.isGeneratingImage || isApplyingImagePrompt}
                        className="h-9 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-semibold"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs">Regenerate</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={onOpenEnhanceImagePromptModal}
                        disabled={item.isGeneratingImage || isApplyingImagePrompt}
                        className="col-span-2 h-9 gap-2 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isApplyingImagePrompt ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs font-bold">Regenerating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            <span className="text-xs font-bold">Enhance</span>
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {imagePromptError && (
                    <div className="col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2">
                      <div className="p-1 bg-red-100 rounded-lg shrink-0">
                        <X className="h-3 w-3 text-red-600" />
                      </div>
                      <p className="text-xs text-red-700 font-medium flex-1">{imagePromptError}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
