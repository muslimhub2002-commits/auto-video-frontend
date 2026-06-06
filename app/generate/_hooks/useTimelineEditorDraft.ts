'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SentenceItem } from '../_types/sentences';
import type {
  TimelineDraftClip,
  TimelineDraftClipOverride,
  TimelineDraftSceneTab,
} from '../_types/timeline-editor';

type UseTimelineEditorDraftOptions = {
  sentences: SentenceItem[];
  sceneDurationSecondsByIndex: Array<number | null>;
};

const MIN_SCENE_SECONDS = 1.6;
const MIN_VISUAL_DURATION_SECONDS = 0.75;
const MIN_TEXT_DURATION_SECONDS = 0.5;
const MIN_OVERLAY_DURATION_SECONDS = 0.5;
const MIN_AUDIO_DURATION_SECONDS = 0.35;
const TRANSITION_CHIP_DURATION_SECONDS = 0.8;
const TIMELINE_ROUNDING_FACTOR = 20;
const TIMELINE_EPSILON = 0.001;

function roundTimelineSeconds(value: number) {
  return Math.round(value * TIMELINE_ROUNDING_FACTOR) / TIMELINE_ROUNDING_FACTOR;
}

function nearlyEqual(left: number, right: number) {
  return Math.abs(left - right) <= TIMELINE_EPSILON;
}

function resolveSentenceSceneTab(
  sentence: Pick<SentenceItem, 'sceneTab' | 'mediaMode'>,
): TimelineDraftSceneTab {
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

function summarizeSentenceText(text: string | null | undefined) {
  const normalized = String(text ?? '').trim().replace(/\s+/gu, ' ');
  if (!normalized) {
    return 'Untitled sentence';
  }

  return normalized.length > 60
    ? `${normalized.slice(0, 57).trimEnd()}...`
    : normalized;
}

function estimateSentenceDurationSeconds(
  sentence: SentenceItem,
  durationSeconds: number | null | undefined,
) {
  if (
    typeof durationSeconds === 'number' &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0
  ) {
    return Math.max(durationSeconds, MIN_SCENE_SECONDS);
  }

  const wordCount = String(sentence.text ?? '')
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;

  if (wordCount <= 0) {
    return MIN_SCENE_SECONDS;
  }

  return Math.max(MIN_SCENE_SECONDS, wordCount / 2.5);
}

function hasTextLaneContent(sentence: SentenceItem) {
  const effect =
    typeof sentence.textAnimationEffect === 'string'
      ? sentence.textAnimationEffect.trim()
      : '';

  return (
    resolveSentenceSceneTab(sentence) === 'text' ||
    Boolean(String(sentence.textAnimationText ?? '').trim()) ||
    (effect.length > 0 && effect !== 'none')
  );
}

function hasOverlayLaneContent(sentence: SentenceItem) {
  return (
    resolveSentenceSceneTab(sentence) === 'overlay' ||
    Boolean(sentence.overlayFile || sentence.overlayUrl) ||
    Boolean(sentence.overlaySettings)
  );
}

function buildClipLabel(prefix: string, sentence: SentenceItem, index: number) {
  const preview = summarizeSentenceText(sentence.text);
  return preview === 'Untitled sentence'
    ? `${prefix} ${index + 1}`
    : `${prefix} ${index + 1}: ${preview}`;
}

function resolveVoiceDurationSeconds(
  sentence: SentenceItem,
  fallbackDurationSeconds: number,
) {
  if (
    typeof sentence.voiceOverDurationSeconds === 'number' &&
    Number.isFinite(sentence.voiceOverDurationSeconds) &&
    sentence.voiceOverDurationSeconds > 0
  ) {
    return Math.max(MIN_AUDIO_DURATION_SECONDS, sentence.voiceOverDurationSeconds);
  }

  return Math.max(MIN_AUDIO_DURATION_SECONDS, Math.min(fallbackDurationSeconds, 3.5));
}

function resolveGroupedSoundEffectsDurationSeconds(durationSeconds: number) {
  return Math.max(
    MIN_AUDIO_DURATION_SECONDS,
    Math.min(durationSeconds, Math.max(durationSeconds * 0.7, 0.9)),
  );
}

function buildVisualTone(sceneTab: TimelineDraftSceneTab) {
  if (sceneTab === 'video') {
    return 'border-sky-300 bg-linear-to-r from-sky-500 to-cyan-500';
  }
  if (sceneTab === 'text') {
    return 'border-amber-300 bg-linear-to-r from-amber-500 to-orange-500';
  }
  if (sceneTab === 'overlay') {
    return 'border-violet-300 bg-linear-to-r from-violet-500 to-fuchsia-500';
  }

  return 'border-indigo-300 bg-linear-to-r from-indigo-500 to-purple-500';
}

function formatTransitionTypeLabel(
  transitionType: SentenceItem['transitionToNext'] | null | undefined,
) {
  switch (transitionType) {
    case 'none':
      return 'None';
    case 'glitch':
      return 'Glitch';
    case 'whip':
      return 'Whip';
    case 'flash':
      return 'Flash';
    case 'fade':
      return 'Fade';
    case 'chromaLeak':
      return 'Chroma leak';
    case 'impactZoom':
      return 'Impact zoom';
    case 'slicePush':
      return 'Slice push';
    case 'irisReveal':
      return 'Iris reveal';
    case 'echoStutter':
      return 'Echo stutter';
    case 'tiltSnap':
      return 'Tilt snap';
    default:
      return 'Auto';
  }
}

function buildBaseClips(
  sentences: SentenceItem[],
  sceneDurationSecondsByIndex: Array<number | null>,
): TimelineDraftClip[] {
  let cursorSeconds = 0;

  return sentences.flatMap((sentence, index) => {
    const sceneTab = resolveSentenceSceneTab(sentence);
    const startSeconds = roundTimelineSeconds(cursorSeconds);
    const durationSeconds = roundTimelineSeconds(
      estimateSentenceDurationSeconds(
        sentence,
        sceneDurationSecondsByIndex[index] ?? null,
      ),
    );
    const textPreview = summarizeSentenceText(sentence.text);
    const visualClipId = `visual:${sentence.id}`;
    const visualClip: TimelineDraftClip = {
      id: visualClipId,
      sentenceId: sentence.id,
      sentenceIndex: index,
      kind: 'visual',
      laneId: 'visual',
      sceneTab,
      label:
        sceneTab === 'video'
          ? `Video Scene ${index + 1}`
          : sceneTab === 'text'
            ? `Text Scene ${index + 1}`
            : sceneTab === 'overlay'
              ? `Overlay Scene ${index + 1}`
              : `Image Scene ${index + 1}`,
      subtitle: 'Primary scene timing',
      textPreview,
      startSeconds,
      durationSeconds,
      endSeconds: roundTimelineSeconds(startSeconds + durationSeconds),
      minDurationSeconds: MIN_VISUAL_DURATION_SECONDS,
      linkedToSentence: false,
      parentClipId: null,
      linkedAnchor: 'start',
      syncDurationWithParent: false,
      allowsMove: true,
      allowsResizeStart: true,
      allowsResizeEnd: true,
      isAudio: false,
      toneClassName: buildVisualTone(sceneTab),
    };

    const clips: TimelineDraftClip[] = [visualClip];

    if (hasTextLaneContent(sentence)) {
      clips.push({
        id: `text:${sentence.id}`,
        sentenceId: sentence.id,
        sentenceIndex: index,
        kind: 'text',
        laneId: 'text',
        sceneTab,
        label: buildClipLabel('Text', sentence, index),
        subtitle: 'Text animation timing',
        textPreview,
        startSeconds,
        durationSeconds,
        endSeconds: roundTimelineSeconds(startSeconds + durationSeconds),
        minDurationSeconds: MIN_TEXT_DURATION_SECONDS,
        linkedToSentence: true,
        parentClipId: visualClipId,
        linkedAnchor: 'start',
        syncDurationWithParent: true,
        allowsMove: true,
        allowsResizeStart: true,
        allowsResizeEnd: true,
        isAudio: false,
        toneClassName: 'border-amber-300 bg-linear-to-r from-amber-500 to-orange-500',
      });
    }

    if (hasOverlayLaneContent(sentence)) {
      clips.push({
        id: `overlay:${sentence.id}`,
        sentenceId: sentence.id,
        sentenceIndex: index,
        kind: 'overlay',
        laneId: 'overlay',
        sceneTab,
        label: buildClipLabel('Overlay', sentence, index),
        subtitle: 'Overlay timing',
        textPreview,
        startSeconds,
        durationSeconds,
        endSeconds: roundTimelineSeconds(startSeconds + durationSeconds),
        minDurationSeconds: MIN_OVERLAY_DURATION_SECONDS,
        linkedToSentence: true,
        parentClipId: visualClipId,
        linkedAnchor: 'start',
        syncDurationWithParent: true,
        allowsMove: true,
        allowsResizeStart: true,
        allowsResizeEnd: true,
        isAudio: false,
        toneClassName: 'border-violet-300 bg-linear-to-r from-violet-500 to-fuchsia-500',
      });
    }

    if (
      sentence.voiceOverFile ||
      sentence.voiceOverUrl ||
      typeof sentence.voiceOverDurationSeconds === 'number'
    ) {
      const voiceDurationSeconds = roundTimelineSeconds(
        resolveVoiceDurationSeconds(sentence, durationSeconds),
      );

      clips.push({
        id: `voice:${sentence.id}`,
        sentenceId: sentence.id,
        sentenceIndex: index,
        kind: 'voice',
        laneId: 'voice',
        sceneTab,
        label: buildClipLabel('Voice', sentence, index),
        subtitle: 'Voice-over timing',
        textPreview,
        startSeconds,
        durationSeconds: voiceDurationSeconds,
        endSeconds: roundTimelineSeconds(startSeconds + voiceDurationSeconds),
        minDurationSeconds: MIN_AUDIO_DURATION_SECONDS,
        linkedToSentence: true,
        parentClipId: visualClipId,
        linkedAnchor: 'start',
        syncDurationWithParent: false,
        allowsMove: true,
        allowsResizeStart: false,
        allowsResizeEnd: false,
        isAudio: true,
        toneClassName: 'border-emerald-300 bg-linear-to-r from-emerald-500 to-teal-500',
        editorLabel: 'Edit voice',
      });
    }

    if (Array.isArray(sentence.soundEffects) && sentence.soundEffects.length > 0) {
      const sfxDurationSeconds = roundTimelineSeconds(
        resolveGroupedSoundEffectsDurationSeconds(durationSeconds),
      );

      clips.push({
        id: `sfx:${sentence.id}`,
        sentenceId: sentence.id,
        sentenceIndex: index,
        kind: 'sfx',
        laneId: 'sfx',
        sceneTab,
        label: `${sentence.soundEffects.length} SFX`,
        subtitle: 'Grouped scene sound effects',
        textPreview,
        startSeconds,
        durationSeconds: sfxDurationSeconds,
        endSeconds: roundTimelineSeconds(startSeconds + sfxDurationSeconds),
        minDurationSeconds: MIN_AUDIO_DURATION_SECONDS,
        linkedToSentence: true,
        parentClipId: visualClipId,
        linkedAnchor: 'start',
        syncDurationWithParent: false,
        allowsMove: true,
        allowsResizeStart: false,
        allowsResizeEnd: false,
        isAudio: true,
        toneClassName: 'border-rose-300 bg-linear-to-r from-rose-500 to-pink-500',
        editorLabel: 'Open SFX library',
      });
    }

    if (
      index < sentences.length - 1
    ) {
      const nextSentence = sentences[index + 1];
      const transitionTypeLabel = formatTransitionTypeLabel(sentence.transitionToNext);
      const transitionSoundCount = Array.isArray(sentence.transitionSoundEffects)
        ? sentence.transitionSoundEffects.length
        : 0;
      const transitionStartSeconds = roundTimelineSeconds(
        startSeconds + Math.max(durationSeconds - TRANSITION_CHIP_DURATION_SECONDS / 2, 0),
      );

      clips.push({
        id: `transition:${sentence.id}`,
        sentenceId: sentence.id,
        sentenceIndex: index,
        kind: 'transition',
        laneId: 'visual',
        sceneTab,
        label: transitionTypeLabel,
        subtitle: `Scene ${index + 1} to Scene ${index + 2}`,
        textPreview: nextSentence
          ? `Next: ${summarizeSentenceText(nextSentence.text)}`
          : 'No next scene',
        startSeconds: transitionStartSeconds,
        durationSeconds: TRANSITION_CHIP_DURATION_SECONDS,
        endSeconds: roundTimelineSeconds(
          transitionStartSeconds + TRANSITION_CHIP_DURATION_SECONDS,
        ),
        minDurationSeconds: TRANSITION_CHIP_DURATION_SECONDS,
        linkedToSentence: true,
        parentClipId: visualClipId,
        linkedAnchor: 'end',
        syncDurationWithParent: false,
        allowsMove: false,
        allowsResizeStart: false,
        allowsResizeEnd: false,
        isAudio: false,
        toneClassName: 'border-cyan-300 bg-linear-to-r from-cyan-500 to-sky-500',
        editorLabel:
          transitionSoundCount > 0 ? 'Edit transition audio' : 'Add transition audio',
      });
    }

    cursorSeconds += durationSeconds;
    return clips;
  });
}

function normalizeOverride(
  baseClip: TimelineDraftClip,
  override: TimelineDraftClipOverride,
): TimelineDraftClipOverride | null {
  const next: TimelineDraftClipOverride = {};

  if (
    typeof override.linkedToSentence === 'boolean' &&
    override.linkedToSentence !== baseClip.linkedToSentence
  ) {
    next.linkedToSentence = override.linkedToSentence;
  }

  if (
    typeof override.startSeconds === 'number' &&
    Number.isFinite(override.startSeconds)
  ) {
    const roundedStart = roundTimelineSeconds(Math.max(0, override.startSeconds));

    if (!nearlyEqual(roundedStart, baseClip.startSeconds)) {
      next.startSeconds = roundedStart;
    }
  }

  if (
    (baseClip.allowsResizeStart || baseClip.allowsResizeEnd) &&
    typeof override.durationSeconds === 'number' &&
    Number.isFinite(override.durationSeconds)
  ) {
    const roundedDuration = roundTimelineSeconds(
      Math.max(baseClip.minDurationSeconds, override.durationSeconds),
    );

    if (!nearlyEqual(roundedDuration, baseClip.durationSeconds)) {
      next.durationSeconds = roundedDuration;
    }
  }

  return Object.keys(next).length > 0 ? next : null;
}

function applyOverrides(
  baseClips: TimelineDraftClip[],
  overridesByClipId: Record<string, TimelineDraftClipOverride>,
) {
  const resolvedById = new Map<string, TimelineDraftClip>();

  return baseClips.map((baseClip) => {
    const override = overridesByClipId[baseClip.id];
    const linkedToSentence = override?.linkedToSentence ?? baseClip.linkedToSentence;
    let durationSeconds = baseClip.durationSeconds;

    if (baseClip.allowsResizeStart || baseClip.allowsResizeEnd) {
      durationSeconds = Math.max(
        baseClip.minDurationSeconds,
        override?.durationSeconds ?? baseClip.durationSeconds,
      );
    }

    let startSeconds = override?.startSeconds ?? baseClip.startSeconds;

    if (linkedToSentence && baseClip.parentClipId) {
      const parentClip = resolvedById.get(baseClip.parentClipId);

      if (parentClip) {
        if (baseClip.syncDurationWithParent) {
          durationSeconds = Math.max(baseClip.minDurationSeconds, parentClip.durationSeconds);
        }

        startSeconds =
          baseClip.kind === 'transition'
            ? parentClip.startSeconds + parentClip.durationSeconds - durationSeconds / 2
            : baseClip.linkedAnchor === 'end'
              ? parentClip.startSeconds + Math.max(parentClip.durationSeconds - durationSeconds, 0)
              : parentClip.startSeconds;
      }
    }

    const roundedStart = roundTimelineSeconds(Math.max(0, startSeconds));
    const roundedDuration = roundTimelineSeconds(
      Math.max(baseClip.minDurationSeconds, durationSeconds),
    );

    const resolvedClip: TimelineDraftClip = {
      ...baseClip,
      linkedToSentence,
      startSeconds: roundedStart,
      durationSeconds: roundedDuration,
      endSeconds: roundTimelineSeconds(roundedStart + roundedDuration),
    };

    resolvedById.set(resolvedClip.id, resolvedClip);
    return resolvedClip;
  });
}

function updateOverrideMap(
  previous: Record<string, TimelineDraftClipOverride>,
  clipId: string,
  nextOverride: TimelineDraftClipOverride | null,
) {
  if (!nextOverride) {
    if (!(clipId in previous)) {
      return previous;
    }

    const next = { ...previous };
    delete next[clipId];
    return next;
  }

  const current = previous[clipId];
  if (
    current &&
    current.durationSeconds === nextOverride.durationSeconds &&
    current.linkedToSentence === nextOverride.linkedToSentence &&
    current.startSeconds === nextOverride.startSeconds
  ) {
    return previous;
  }

  return {
    ...previous,
    [clipId]: nextOverride,
  };
}

export function useTimelineEditorDraft({
  sentences,
  sceneDurationSecondsByIndex,
}: UseTimelineEditorDraftOptions) {
  const [overridesByClipId, setOverridesByClipId] = useState<
    Record<string, TimelineDraftClipOverride>
  >({});
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const baseClips = useMemo(
    () => buildBaseClips(sentences, sceneDurationSecondsByIndex),
    [sceneDurationSecondsByIndex, sentences],
  );

  const baseClipLookup = useMemo(
    () => new Map(baseClips.map((clip) => [clip.id, clip])),
    [baseClips],
  );

  const clips = useMemo(
    () => applyOverrides(baseClips, overridesByClipId),
    [baseClips, overridesByClipId],
  );

  const clipLookup = useMemo(
    () => new Map(clips.map((clip) => [clip.id, clip])),
    [clips],
  );

  useEffect(() => {
    setOverridesByClipId((previous) => {
      let didChange = false;
      const next: Record<string, TimelineDraftClipOverride> = {};

      for (const [clipId, override] of Object.entries(previous)) {
        if (baseClipLookup.has(clipId)) {
          next[clipId] = override;
        } else {
          didChange = true;
        }
      }

      return didChange ? next : previous;
    });

    setSelectedClipId((previous) =>
      previous && baseClipLookup.has(previous) ? previous : null,
    );
  }, [baseClipLookup]);

  const patchClip = useCallback(
    (clipId: string, patch: TimelineDraftClipOverride) => {
      const baseClip = baseClipLookup.get(clipId);
      const currentClip = clipLookup.get(clipId);

      if (!baseClip || !currentClip) {
        return;
      }

      setOverridesByClipId((previous) => {
        const existing = previous[clipId] ?? {};
        const nextOverride: TimelineDraftClipOverride = {
          ...existing,
          ...patch,
        };

        const isTimingPatch =
          typeof patch.startSeconds === 'number' ||
          typeof patch.durationSeconds === 'number';

        if (
          isTimingPatch &&
          baseClip.parentClipId &&
          currentClip.linkedToSentence &&
          patch.linkedToSentence === undefined
        ) {
          nextOverride.linkedToSentence = false;
        }

        const normalized = normalizeOverride(baseClip, nextOverride);
        return updateOverrideMap(previous, clipId, normalized);
      });
    },
    [baseClipLookup, clipLookup],
  );

  const toggleClipLinked = useCallback(
    (clipId: string) => {
      const baseClip = baseClipLookup.get(clipId);
      const currentClip = clipLookup.get(clipId);

      if (!baseClip || !currentClip || !baseClip.parentClipId) {
        return;
      }

      setOverridesByClipId((previous) => {
        const existing = previous[clipId] ?? {};
        const nextOverride: TimelineDraftClipOverride = currentClip.linkedToSentence
          ? {
              ...existing,
              linkedToSentence: false,
              startSeconds: currentClip.startSeconds,
              durationSeconds: currentClip.durationSeconds,
            }
          : {
              ...existing,
              linkedToSentence: true,
            };

        if (!currentClip.linkedToSentence) {
          delete nextOverride.startSeconds;
          delete nextOverride.durationSeconds;
        }

        const normalized = normalizeOverride(baseClip, nextOverride);
        return updateOverrideMap(previous, clipId, normalized);
      });
    },
    [baseClipLookup, clipLookup],
  );

  const resetClip = useCallback((clipId: string) => {
    setOverridesByClipId((previous) => {
      if (!(clipId in previous)) {
        return previous;
      }

      const next = { ...previous };
      delete next[clipId];
      return next;
    });
  }, []);

  const resetAllClips = useCallback(() => {
    setOverridesByClipId({});
  }, []);

  const selectedClip = selectedClipId ? clipLookup.get(selectedClipId) ?? null : null;
  const overrideCount = Object.keys(overridesByClipId).length;

  return {
    clips,
    selectedClip,
    selectedClipId,
    hasOverrides: overrideCount > 0,
    overrideCount,
    selectClip: setSelectedClipId,
    patchClip,
    toggleClipLinked,
    resetClip,
    resetAllClips,
  };
}