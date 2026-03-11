import type { SentenceItem } from '../_types/sentences';
import {
  getSoundEffectPlaybackDurationSeconds,
  resolveSoundEffectTrimWindow,
} from '../_types/sound-effect-audio';

export type SentenceSoundEffectItem = NonNullable<SentenceItem['soundEffects']>[number];

export type ComputedSentenceSoundEffectItem = SentenceSoundEffectItem & {
  absoluteDelaySeconds: number;
  trimStartSeconds: number;
};

type ComputeSentenceSoundEffectTimingOptions = {
  ignoreOffsets?: boolean;
};

const normalizeTimingMode = (value: unknown) => {
  return value === 'afterPreviousEnds' ? 'afterPreviousEnds' : 'withPrevious';
};

const clampDelay = (value: unknown) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
};

const clampDuration = (value: unknown) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
};

export const computeSentenceSoundEffectTiming = (
  input: NonNullable<SentenceItem['soundEffects']>,
  options?: ComputeSentenceSoundEffectTimingOptions,
): ComputedSentenceSoundEffectItem[] => {
  const items = Array.isArray(input) ? input : [];
  let currentGroupStart = 0;
  let currentGroupEnd = 0;
  const ignoreOffsets = options?.ignoreOffsets === true;

  return items.map((item, index) => {
    const delaySeconds = ignoreOffsets ? 0 : clampDelay(item?.delaySeconds);
    const sourceDurationSeconds = clampDuration(item?.durationSeconds);
    const trimWindow = resolveSoundEffectTrimWindow(
      item?.audioSettings,
      sourceDurationSeconds > 0 ? sourceDurationSeconds : null,
    );
    const durationSeconds = clampDuration(
      trimWindow.effectiveDurationSeconds ??
        getSoundEffectPlaybackDurationSeconds({
          durationSeconds: item?.durationSeconds,
          audioSettings: item?.audioSettings,
        }),
    );

    if (index > 0 && normalizeTimingMode(item?.timingMode) === 'afterPreviousEnds') {
      currentGroupStart = currentGroupEnd;
    }

    const absoluteDelaySeconds = currentGroupStart + delaySeconds;
    currentGroupEnd = Math.max(
      currentGroupEnd,
      absoluteDelaySeconds + durationSeconds,
    );

    return {
      ...item,
      delaySeconds,
      durationSeconds,
      trimStartSeconds: trimWindow.startSeconds,
      timingMode: normalizeTimingMode(item?.timingMode),
      absoluteDelaySeconds,
    };
  });
};

export const getSentenceSoundEffectsStackDuration = (
  input: NonNullable<SentenceItem['soundEffects']>,
  options?: ComputeSentenceSoundEffectTimingOptions,
): number | null => {
  const timedItems = computeSentenceSoundEffectTiming(input, options);
  if (timedItems.length === 0) return 0;
  if (
    timedItems.some(
      (item) =>
        typeof item.durationSeconds !== 'number' ||
        !Number.isFinite(item.durationSeconds) ||
        item.durationSeconds <= 0,
    )
  ) {
    return null;
  }

  return timedItems.reduce(
    (max, item) =>
      Math.max(
        max,
        item.absoluteDelaySeconds + Math.max(0, Number(item.durationSeconds ?? 0)),
      ),
    0,
  );
};