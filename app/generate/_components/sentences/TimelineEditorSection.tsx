'use client';

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  Clapperboard,
  Clock3,
  Images,
  LayoutGrid,
  Link2,
  MoreHorizontal,
  Mic,
  Music2,
  PencilLine,
  RotateCcw,
  Sparkles,
  Trash2,
  Unlink2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { SentenceItem } from '../../_types/sentences';
import type {
  TimelineDraftClip,
  TimelineDraftClipOverride,
  TimelineDraftLaneId,
} from '../../_types/timeline-editor';

type TimelineEditorSectionProps = {
  clips: TimelineDraftClip[];
  sentences?: SentenceItem[];
  selectedClipId: string | null;
  hasDraftOverrides?: boolean;
  draftOverrideCount?: number;
  isShortVideo: boolean;
  onOpenSceneEditor?: () => void;
  onSelectClip?: (clipId: string | null) => void;
  onPatchClip?: (clipId: string, patch: TimelineDraftClipOverride) => void;
  onOpenClipEditor?: (clip: TimelineDraftClip) => void;
  onDeleteClip?: (clip: TimelineDraftClip) => void;
  onChangeTransitionType?: (
    sentenceId: string,
    value: SentenceItem['transitionToNext'] | null,
  ) => void;
  onToggleClipLinked?: (clipId: string) => void;
  onResetClip?: (clipId: string) => void;
  onResetAllClips?: () => void;
};

type TimelineLaneConfig = {
  id: TimelineDraftLaneId;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  emptyLabel: string;
};

type RenderedTimelineClip = TimelineDraftClip & {
  startPx: number;
  widthPx: number;
};

type TimelineLane = TimelineLaneConfig & {
  clips: RenderedTimelineClip[];
};

type DragMode = 'move' | 'resize-start' | 'resize-end';

type DragState = {
  clipId: string;
  mode: DragMode;
  startClientX: number;
  originStartSeconds: number;
  originDurationSeconds: number;
  minDurationSeconds: number;
};

type ClipMenuState = {
  clipId: string;
  clientX: number;
  clientY: number;
};

type TimelineVisualPreview = {
  kind: 'image' | 'video' | 'none';
  src: string | null;
  label: string;
};

const SHORT_PIXELS_PER_SECOND = 72;
const WIDE_PIXELS_PER_SECOND = 56;
const MIN_TIMELINE_WIDTH = 960;
const TIMELINE_PADDING_PX = 24;
const TIMELINE_ROUNDING_FACTOR = 20;
const CLIP_MENU_WIDTH_PX = 192;
const CLIP_MENU_HEIGHT_PX = 112;
const CLIP_MENU_VIEWPORT_PADDING_PX = 12;

const laneConfigs: TimelineLaneConfig[] = [
  {
    id: 'visual',
    label: 'Main Visual Lane',
    description: 'Primary image/video timing with transition chips between scenes.',
    icon: Images,
    emptyLabel: 'Add scenes to begin arranging the main visual storyline.',
  },
  {
    id: 'text',
    label: 'Text Lane',
    description: 'Text clips follow their sentence visuals until you move or trim them.',
    icon: Sparkles,
    emptyLabel: 'No text animation clips are active yet.',
  },
  {
    id: 'overlay',
    label: 'Overlay Lane',
    description: 'Overlay clips stay in a dedicated lane below text.',
    icon: Sparkles,
    emptyLabel: 'No overlay clips are active yet.',
  },
  {
    id: 'voice',
    label: 'Voice-Over Lane',
    description: 'The merged voice-over track opens the existing trim editor.',
    icon: Mic,
    emptyLabel: 'Generate a voice-over to populate this lane.',
  },
  {
    id: 'soundtrack',
    label: 'Background Soundtrack Lane',
    description: 'The active soundtrack spans the draft runtime and opens the real editor.',
    icon: Music2,
    emptyLabel: 'Enable a background soundtrack to populate this lane.',
  },
  {
    id: 'sfx',
    label: 'SFX Lane',
    description: 'Sentence-level sound effects grouped into one timeline lane.',
    icon: Music2,
    emptyLabel: 'No scene sound effects are attached yet.',
  },
];

const TIMELINE_TRANSITION_OPTIONS: Array<{
  value: '__auto__' | NonNullable<SentenceItem['transitionToNext']>;
  label: string;
}> = [
  { value: '__auto__', label: 'Transition (Random)' },
  { value: 'none', label: 'None' },
  { value: 'glitch', label: 'Glitch' },
  { value: 'whip', label: 'Whip' },
  { value: 'flash', label: 'Flash' },
  { value: 'fade', label: 'Fade' },
  { value: 'chromaLeak', label: 'Chroma leak' },
  { value: 'impactZoom', label: 'Impact zoom' },
  { value: 'slicePush', label: 'Slice push' },
  { value: 'irisReveal', label: 'Iris reveal' },
  { value: 'echoStutter', label: 'Echo stutter' },
  { value: 'tiltSnap', label: 'Tilt snap' },
];

function roundTimelineSeconds(value: number) {
  return Math.round(value * TIMELINE_ROUNDING_FACTOR) / TIMELINE_ROUNDING_FACTOR;
}

function formatSeconds(value: number) {
  return `${value.toFixed(2)}s`;
}

function sortClipsByStart(left: TimelineDraftClip, right: TimelineDraftClip) {
  if (left.startSeconds !== right.startSeconds) {
    return left.startSeconds - right.startSeconds;
  }

  return left.sentenceIndex - right.sentenceIndex;
}

function canDeleteTimelineClip(clip: TimelineDraftClip) {
  return (
    clip.kind === 'visual' ||
    clip.kind === 'text' ||
    clip.kind === 'overlay' ||
    clip.kind === 'sfx'
  );
}

function resolveSentenceSceneTab(
  sentence: Pick<SentenceItem, 'sceneTab' | 'mediaMode'>,
) {
  if (
    sentence.sceneTab === 'image' ||
    sentence.sceneTab === 'video' ||
    sentence.sceneTab === 'text' ||
    sentence.sceneTab === 'overlay'
  ) {
    return sentence.sceneTab;
  }

  return sentence.mediaMode === 'frames' ? 'video' : 'image';
}

function getFirstNonEmptyUrl(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    const normalized = String(candidate ?? '').trim();
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function resolveVisualPreview(sentence: SentenceItem | null | undefined): TimelineVisualPreview {
  if (!sentence) {
    return { kind: 'none', src: null, label: 'No media attached' };
  }

  const sceneTab = resolveSentenceSceneTab(sentence);

  if (sceneTab === 'video') {
    const src = getFirstNonEmptyUrl(
      sentence.videoUrl,
      sentence.framesVideoUrl,
      sentence.textVideoUrl,
      sentence.referenceVideoUrl,
    );

    return {
      kind: 'video',
      src,
      label: src ? 'Video preview' : sentence.video ? 'Local video attached' : 'No video yet',
    };
  }

  const src = getFirstNonEmptyUrl(
    sentence.imageUrl,
    sentence.secondaryImageUrl,
    sentence.startImageUrl,
    sentence.referenceImageUrl,
    sentence.endImageUrl,
  );

  return {
    kind: 'image',
    src,
    label: src ? 'Image preview' : sentence.image ? 'Local image attached' : 'No image yet',
  };
}

function clampMenuPosition(clientX: number, clientY: number) {
  if (typeof window === 'undefined') {
    return { clientX, clientY };
  }

  return {
    clientX: Math.max(
      CLIP_MENU_VIEWPORT_PADDING_PX,
      Math.min(
        clientX,
        window.innerWidth - CLIP_MENU_WIDTH_PX - CLIP_MENU_VIEWPORT_PADDING_PX,
      ),
    ),
    clientY: Math.max(
      CLIP_MENU_VIEWPORT_PADDING_PX,
      Math.min(
        clientY,
        window.innerHeight - CLIP_MENU_HEIGHT_PX - CLIP_MENU_VIEWPORT_PADDING_PX,
      ),
    ),
  };
}

function TimelineLaneRow({
  lane,
  totalWidth,
  pixelsPerSecond,
  selectedClipId,
  onSelectClip,
  onStartInteraction,
  onOpenClipEditor,
  onOpenClipMenu,
  sentenceLookup,
}: {
  lane: TimelineLane;
  totalWidth: number;
  pixelsPerSecond: number;
  selectedClipId: string | null;
  onSelectClip?: (clipId: string | null) => void;
  onStartInteraction: (
    clip: TimelineDraftClip,
    mode: DragMode,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onOpenClipEditor?: (clip: TimelineDraftClip) => void;
  onOpenClipMenu?: (
    clip: TimelineDraftClip,
    clientX: number,
    clientY: number,
  ) => void;
  sentenceLookup: Map<string, SentenceItem>;
}) {
  const Icon = lane.icon;
  const isVisualLane = lane.id === 'visual';
  const isExpandedLayerLane = lane.id === 'text' || lane.id === 'overlay';
  const trackHeightClass = isVisualLane
    ? 'h-36'
    : isExpandedLayerLane
      ? 'h-24'
      : 'h-16';

  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h5 className="text-sm font-semibold text-slate-900">{lane.label}</h5>
            <p className="text-xs text-slate-500">{lane.description}</p>
          </div>
        </div>
        <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {lane.clips.length} clip{lane.clips.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div
          className={`relative overflow-hidden rounded-xl border border-dashed border-slate-200 bg-white/90 ${trackHeightClass}`}
          style={{ width: totalWidth }}
          onPointerDown={() => onSelectClip?.(null)}
        >
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,0.16) 1px, transparent 1px)',
              backgroundSize: `${pixelsPerSecond}px 100%`,
            }}
          />

          {lane.clips.length > 0 ? (
            lane.clips.map((clip) => {
              const isSelected = clip.id === selectedClipId;
              const isTransitionClip = clip.kind === 'transition';
              const hasClipActions = Boolean(
                clip.editorLabel || canDeleteTimelineClip(clip),
              );
              const sentence = sentenceLookup.get(clip.sentenceId);
              const visualPreview = isVisualLane && !isTransitionClip
                ? resolveVisualPreview(sentence)
                : null;
              const isMediaCard = (isVisualLane && !isTransitionClip) || isExpandedLayerLane;
              const clipHeightClass = isTransitionClip
                ? 'top-1/2 h-12 -translate-y-1/2'
                : isVisualLane
                ? 'top-2 h-32'
                : isExpandedLayerLane
                  ? 'top-2 h-20'
                  : 'top-1/2 h-11 -translate-y-1/2';
              const minimumWidthPx = isTransitionClip
                ? 96
                : isVisualLane
                ? 180
                : isExpandedLayerLane
                  ? 132
                  : clip.allowsResizeStart || clip.allowsResizeEnd
                    ? 92
                    : 70;
              const widthPx = Math.max(clip.widthPx, minimumWidthPx);
              const clipLeftPx = isTransitionClip
                ? clip.startPx - Math.max(0, (widthPx - clip.widthPx) / 2)
                : clip.startPx;

              return (
                <div
                  key={clip.id}
                  className={[
                    'absolute flex items-center overflow-hidden rounded-xl border text-white shadow-sm transition-transform',
                    clipHeightClass,
                    clip.toneClassName,
                    isTransitionClip ? 'z-30 rounded-full border-white/50 shadow-lg shadow-cyan-500/20' : '',
                    isSelected
                      ? 'z-20 scale-[1.01] ring-2 ring-white/90 shadow-lg shadow-fuchsia-500/20'
                      : isMediaCard
                        ? 'hover:-translate-y-[2px]'
                        : 'hover:-translate-y-[52%]',
                  ].join(' ')}
                  style={{
                    left: clipLeftPx,
                    width: widthPx,
                  }}
                  onPointerDown={(event) => onStartInteraction(clip, 'move', event)}
                  onContextMenu={(event) => {
                    if (!hasClipActions) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    onSelectClip?.(clip.id);
                    onOpenClipMenu?.(clip, event.clientX, event.clientY);
                  }}
                  onDoubleClick={() => {
                    if (clip.editorLabel && onOpenClipEditor) {
                      onOpenClipEditor(clip);
                    }
                  }}
                >
                  {isVisualLane ? (
                    <div className="pointer-events-none absolute inset-0">
                      {visualPreview?.kind === 'image' && visualPreview.src ? (
                        <img
                          src={visualPreview.src}
                          alt={clip.label}
                          className="h-full w-full object-cover opacity-75"
                          loading="lazy"
                          draggable={false}
                        />
                      ) : visualPreview?.kind === 'video' && visualPreview.src ? (
                        <video
                          src={visualPreview.src}
                          className="h-full w-full object-cover opacity-70"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-900/70 to-slate-800/80 text-[11px] font-semibold text-white/70">
                          {visualPreview?.label ?? 'No media attached'}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/45 to-slate-900/10" />
                    </div>
                  ) : null}

                  {hasClipActions && !isTransitionClip ? (
                    <button
                      type="button"
                      aria-label={`Open actions for ${clip.label}`}
                      className="absolute right-1.5 top-1.5 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-white/90 transition-colors hover:bg-black/35"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onSelectClip?.(clip.id);
                        const rect = event.currentTarget.getBoundingClientRect();
                        onOpenClipMenu?.(clip, rect.right - CLIP_MENU_WIDTH_PX + 8, rect.bottom + 8);
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  ) : null}

                  {clip.allowsResizeStart ? (
                    <button
                      type="button"
                      aria-label={`Resize start of ${clip.label}`}
                      className="z-20 h-full w-2 shrink-0 cursor-ew-resize bg-black/20 transition-colors hover:bg-black/30"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        onStartInteraction(clip, 'resize-start', event);
                      }}
                    />
                  ) : null}

                  <div className="relative z-10 min-w-0 flex-1 px-3 py-2 text-left">
                    {isTransitionClip ? (
                      <div className="flex h-full items-center justify-center gap-2 text-center">
                        <Clapperboard className="h-4 w-4 shrink-0 text-white/90" />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-white">
                            {clip.label}
                          </div>
                          <p className="truncate text-[10px] font-medium text-white/80">
                            {clip.subtitle}
                          </p>
                        </div>
                      </div>
                    ) : isVisualLane ? (
                      <div className="flex h-full flex-col justify-end">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold">{clip.label}</span>
                          {clip.parentClipId ? (
                            <span className="rounded-full bg-white/16 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
                              {clip.linkedToSentence ? 'Linked' : 'Free'}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-[11px] font-medium text-white/85">
                          {visualPreview?.label ?? clip.subtitle}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] font-medium text-white/70">
                          {clip.textPreview}
                        </p>
                      </div>
                    ) : isExpandedLayerLane ? (
                      <div className="flex h-full flex-col justify-end">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold">{clip.label}</span>
                          {clip.parentClipId ? (
                            <span className="rounded-full bg-white/16 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
                              {clip.linkedToSentence ? 'Linked' : 'Free'}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-[11px] font-medium text-white/85">
                          {clip.subtitle}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] font-medium text-white/70">
                          {clip.textPreview}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold">{clip.label}</span>
                          {clip.parentClipId ? (
                            <span className="rounded-full bg-white/16 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
                              {clip.linkedToSentence ? 'Linked' : 'Free'}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[10px] font-medium text-white/80">
                          {clip.subtitle}
                        </p>
                      </>
                    )}
                  </div>

                  {clip.allowsResizeEnd ? (
                    <button
                      type="button"
                      aria-label={`Resize end of ${clip.label}`}
                      className="z-20 h-full w-2 shrink-0 cursor-ew-resize bg-black/20 transition-colors hover:bg-black/30"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        onStartInteraction(clip, 'resize-end', event);
                      }}
                    />
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-400">
              {lane.emptyLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TimelineEditorSection({
  clips,
  sentences = [],
  selectedClipId,
  hasDraftOverrides = false,
  draftOverrideCount = 0,
  isShortVideo,
  onOpenSceneEditor,
  onSelectClip,
  onPatchClip,
  onOpenClipEditor,
  onDeleteClip,
  onChangeTransitionType,
  onToggleClipLinked,
  onResetClip,
  onResetAllClips,
}: TimelineEditorSectionProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [clipMenuState, setClipMenuState] = useState<ClipMenuState | null>(null);
  const pixelsPerSecond = isShortVideo
    ? SHORT_PIXELS_PER_SECOND
    : WIDE_PIXELS_PER_SECOND;

  const clipLookup = useMemo(
    () => new Map(clips.map((clip) => [clip.id, clip])),
    [clips],
  );
  const sentenceLookup = useMemo(
    () => new Map(sentences.map((sentence) => [sentence.id, sentence])),
    [sentences],
  );

  const selectedClip = selectedClipId ? clipLookup.get(selectedClipId) ?? null : null;
  const selectedClipSentence = selectedClip
    ? sentenceLookup.get(selectedClip.sentenceId) ?? null
    : null;
  const selectedTransitionValue =
    selectedClip?.kind === 'transition'
      ? selectedClipSentence?.transitionToNext ?? null
      : null;
  const canResetSelectedClip = Boolean(
    selectedClip &&
      (selectedClip.allowsMove ||
        selectedClip.allowsResizeStart ||
        selectedClip.allowsResizeEnd ||
        selectedClip.parentClipId),
  );
  const canOpenSelectedClipEditor = Boolean(
    selectedClip?.editorLabel && onOpenClipEditor,
  );
  const canDeleteSelectedClip = Boolean(
    selectedClip && onDeleteClip && canDeleteTimelineClip(selectedClip),
  );
  const activeMenuClip = clipMenuState
    ? clipLookup.get(clipMenuState.clipId) ?? null
    : null;

  const totalDurationSeconds = useMemo(
    () =>
      clips.reduce((longest, clip) => Math.max(longest, clip.endSeconds), 0),
    [clips],
  );

  const sceneCount = useMemo(
    () => clips.filter((clip) => clip.kind === 'visual').length,
    [clips],
  );

  const activeLaneCount = useMemo(
    () =>
      laneConfigs.reduce(
        (count, lane) => count + (clips.some((clip) => clip.laneId === lane.id) ? 1 : 0),
        0,
      ),
    [clips],
  );

  const timelineWidth = Math.max(
    MIN_TIMELINE_WIDTH,
    Math.ceil(totalDurationSeconds * pixelsPerSecond) + 80,
  );
  const contentWidth = Math.max(MIN_TIMELINE_WIDTH - TIMELINE_PADDING_PX, timelineWidth - TIMELINE_PADDING_PX);
  const rulerMarks = Math.max(2, Math.ceil(totalDurationSeconds) + 1);

  const lanes = useMemo<TimelineLane[]>(() => {
    return laneConfigs.map((lane) => ({
      ...lane,
      clips: clips
        .filter((clip) => clip.laneId === lane.id)
        .sort(sortClipsByStart)
        .map((clip) => ({
          ...clip,
          startPx: clip.startSeconds * pixelsPerSecond,
          widthPx: Math.max(
            clip.durationSeconds * pixelsPerSecond,
            clip.allowsResizeStart || clip.allowsResizeEnd ? 92 : 70,
          ),
        })),
    }));
  }, [clips, pixelsPerSecond]);

  useEffect(() => {
    if (!dragState || !onPatchClip) {
      return;
    }

    setClipMenuState(null);

    const handlePointerMove = (event: PointerEvent) => {
      const deltaSeconds = (event.clientX - dragState.startClientX) / pixelsPerSecond;

      if (dragState.mode === 'move') {
        onPatchClip(dragState.clipId, {
          startSeconds: roundTimelineSeconds(
            Math.max(0, dragState.originStartSeconds + deltaSeconds),
          ),
        });
        return;
      }

      if (dragState.mode === 'resize-start') {
        const originEndSeconds =
          dragState.originStartSeconds + dragState.originDurationSeconds;
        const nextStartSeconds = Math.min(
          originEndSeconds - dragState.minDurationSeconds,
          Math.max(0, dragState.originStartSeconds + deltaSeconds),
        );

        onPatchClip(dragState.clipId, {
          startSeconds: roundTimelineSeconds(nextStartSeconds),
          durationSeconds: roundTimelineSeconds(originEndSeconds - nextStartSeconds),
        });
        return;
      }

      onPatchClip(dragState.clipId, {
        durationSeconds: roundTimelineSeconds(
          Math.max(
            dragState.minDurationSeconds,
            dragState.originDurationSeconds + deltaSeconds,
          ),
        ),
      });
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, onPatchClip, pixelsPerSecond]);

  useEffect(() => {
    if (!clipMenuState) {
      return;
    }

    const handlePointerDown = () => {
      setClipMenuState(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setClipMenuState(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [clipMenuState]);

  const handleStartInteraction = (
    clip: TimelineDraftClip,
    mode: DragMode,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectClip?.(clip.id);

    if (
      (mode === 'move' && !clip.allowsMove) ||
      (mode === 'resize-start' && !clip.allowsResizeStart) ||
      (mode === 'resize-end' && !clip.allowsResizeEnd)
    ) {
      return;
    }

    if (!onPatchClip) {
      return;
    }

    setDragState({
      clipId: clip.id,
      mode,
      startClientX: event.clientX,
      originStartSeconds: clip.startSeconds,
      originDurationSeconds: clip.durationSeconds,
      minDurationSeconds: clip.minDurationSeconds,
    });
  };

  const handleOpenClipMenu = (
    clip: TimelineDraftClip,
    clientX: number,
    clientY: number,
  ) => {
    const nextPosition = clampMenuPosition(clientX, clientY);
    setClipMenuState({ clipId: clip.id, ...nextPosition });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-fuchsia-100/80 bg-linear-to-br from-slate-950 via-slate-900 to-fuchsia-950 px-6 py-6 text-white shadow-xl shadow-fuchsia-950/15">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white/10 p-3 shadow-lg ring-1 ring-white/15">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold">Timeline Editor</h4>
                <p className="text-sm text-fuchsia-100/80">
                  Drag clips horizontally, trim visual layers from either edge, and unlink
                  text or overlay timing when a sentence needs independent pacing. Double-click
                  audio clips to open the real editors. Right-click any actionable clip for the
                  same menu as the three-dots button.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-200/80">
                  Scenes
                </p>
                <p className="mt-1 text-2xl font-bold">{sceneCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-200/80">
                  Draft Runtime
                </p>
                <p className="mt-1 text-2xl font-bold">{totalDurationSeconds.toFixed(1)}s</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-200/80">
                  Active Lanes
                </p>
                <p className="mt-1 text-2xl font-bold">{activeLaneCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fuchsia-200/80">
                  Draft Changes
                </p>
                <p className="mt-1 text-2xl font-bold">{draftOverrideCount}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onOpenSceneEditor}
                disabled={!onOpenSceneEditor}
                className="gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white shadow-sm transition-all hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Images className="h-4 w-4" />
                <span className="text-sm font-semibold">Back To Scene Editor</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onResetAllClips}
                disabled={!onResetAllClips || !hasDraftOverrides}
                className="gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white shadow-sm transition-all hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm font-semibold">Reset Timeline Draft</span>
              </Button>
            </div>

            <p className="text-xs leading-5 text-fuchsia-100/75">
              Audio clips move independently in this slice, while visual, text, and overlay
              clips can also be shortened or extended. Linked child clips follow sentence
              visuals until you drag or trim them.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 shadow-inner shadow-black/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/80">
                  Selected Clip
                </p>
                {selectedClip ? (
                  <>
                    <h5 className="mt-2 text-base font-semibold text-white">
                      {selectedClip.label}
                    </h5>
                    <p className="mt-1 text-xs leading-5 text-fuchsia-100/75">
                      {selectedClip.subtitle}. {selectedClip.textPreview}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-fuchsia-100/75">
                    Select a clip to nudge it, relink it, or open the connected editor.
                  </p>
                )}
              </div>

              {selectedClip && onResetClip && canResetSelectedClip ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onResetClip(selectedClip.id)}
                  className="gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white shadow-sm transition-all hover:bg-white/18"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="text-xs font-semibold">Reset</span>
                </Button>
              ) : null}
            </div>

            {selectedClip ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-200/80">
                      <Clock3 className="h-3.5 w-3.5" />
                      Start
                    </div>
                    <p className="mt-2 text-lg font-semibold">{formatSeconds(selectedClip.startSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-200/80">
                      Duration
                    </p>
                    <p className="mt-2 text-lg font-semibold">{formatSeconds(selectedClip.durationSeconds)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-200/80">
                      End
                    </p>
                    <p className="mt-2 text-lg font-semibold">{formatSeconds(selectedClip.endSeconds)}</p>
                  </div>
                </div>

                {selectedClip.kind === 'transition' ? (
                  <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-200/80">
                      Transition Type
                    </p>
                    <div className="mt-3">
                      <Select
                        value={selectedTransitionValue ?? '__auto__'}
                        onValueChange={(nextValue) => {
                          onChangeTransitionType?.(
                            selectedClip.sentenceId,
                            nextValue === '__auto__'
                              ? null
                              : (nextValue as NonNullable<SentenceItem['transitionToNext']>),
                          );
                        }}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/10 text-white">
                          <SelectValue placeholder="Transition (Random)" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMELINE_TRANSITION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-fuchsia-100/75">
                      This chip controls the cut between scene {selectedClip.sentenceIndex + 1} and scene{' '}
                      {selectedClip.sentenceIndex + 2} in the main visual lane.
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {selectedClip.editorLabel ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenClipEditor?.(selectedClip)}
                      disabled={!canOpenSelectedClipEditor}
                      className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white shadow-sm transition-all hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {selectedClip.editorLabel}
                    </Button>
                  ) : null}

                  {canDeleteSelectedClip ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onDeleteClip?.(selectedClip)}
                      className="rounded-xl border border-rose-300/20 bg-rose-500/15 px-3 py-2 text-white shadow-sm transition-all hover:bg-rose-500/25"
                    >
                      Delete Layer
                    </Button>
                  ) : null}

                  {selectedClip.allowsMove ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onPatchClip?.(selectedClip.id, {
                            startSeconds: roundTimelineSeconds(selectedClip.startSeconds - 0.25),
                          })
                        }
                        disabled={!onPatchClip}
                        className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white shadow-sm transition-all hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Nudge -0.25s
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onPatchClip?.(selectedClip.id, {
                            startSeconds: roundTimelineSeconds(selectedClip.startSeconds + 0.25),
                          })
                        }
                        disabled={!onPatchClip}
                        className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white shadow-sm transition-all hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Nudge +0.25s
                      </Button>
                    </>
                  ) : null}

                  {selectedClip.allowsResizeStart || selectedClip.allowsResizeEnd ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onPatchClip?.(selectedClip.id, {
                            durationSeconds: roundTimelineSeconds(
                              selectedClip.durationSeconds - 0.25,
                            ),
                          })
                        }
                        disabled={!onPatchClip}
                        className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white shadow-sm transition-all hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Shorten
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onPatchClip?.(selectedClip.id, {
                            durationSeconds: roundTimelineSeconds(
                              selectedClip.durationSeconds + 0.25,
                            ),
                          })
                        }
                        disabled={!onPatchClip}
                        className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white shadow-sm transition-all hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Extend
                      </Button>
                    </>
                  ) : null}

                  {selectedClip.parentClipId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onToggleClipLinked?.(selectedClip.id)}
                      disabled={!onToggleClipLinked}
                      className="gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white shadow-sm transition-all hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {selectedClip.linkedToSentence ? (
                        <Unlink2 className="h-4 w-4" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      <span>
                        {selectedClip.linkedToSentence ? 'Unlink Timing' : 'Relink Timing'}
                      </span>
                    </Button>
                  ) : null}
                </div>

                <p className="text-xs leading-5 text-fuchsia-100/75">
                  {selectedClip.kind === 'soundtrack'
                    ? 'The soundtrack clip reflects the active background track and stays pinned to the full draft runtime.'
                    : selectedClip.isAudio
                    ? 'Audio clips move independently in this slice, keep their existing duration, and can open the connected editor.'
                    : 'Drag the clip body to move it or drag either edge to trim and extend timing.'}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="overflow-x-auto pb-2">
          <div className="min-w-full" style={{ width: timelineWidth }}>
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="relative h-8" style={{ width: contentWidth }}>
                {Array.from({ length: rulerMarks }, (_, index) => {
                  const left = index * pixelsPerSecond;

                  return (
                    <div
                      key={`mark:${index}`}
                      className="absolute top-0 h-full"
                      style={{ left }}
                    >
                      <div className="h-3 w-px bg-slate-300" />
                      <span className="mt-1 block -translate-x-1/2 text-[11px] font-medium text-slate-500">
                        {index}s
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {lanes.map((lane) => (
                <TimelineLaneRow
                  key={lane.id}
                  lane={lane}
                  totalWidth={contentWidth}
                  pixelsPerSecond={pixelsPerSecond}
                  selectedClipId={selectedClipId}
                  onSelectClip={onSelectClip}
                  onStartInteraction={handleStartInteraction}
                  onOpenClipEditor={onOpenClipEditor}
                  onOpenClipMenu={handleOpenClipMenu}
                  sentenceLookup={sentenceLookup}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {activeMenuClip && clipMenuState ? (
        <div
          className="fixed z-[80] w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15"
          style={{
            left: clipMenuState.clientX,
            top: clipMenuState.clientY,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {activeMenuClip.editorLabel && onOpenClipEditor ? (
            <button
              type="button"
              onClick={() => {
                onOpenClipEditor(activeMenuClip);
                setClipMenuState(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              <PencilLine className="h-4 w-4 text-slate-500" />
              <span>{activeMenuClip.editorLabel}</span>
            </button>
          ) : null}

          {canDeleteTimelineClip(activeMenuClip) && onDeleteClip ? (
            <button
              type="button"
              onClick={() => {
                onDeleteClip(activeMenuClip);
                setClipMenuState(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete layer</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}