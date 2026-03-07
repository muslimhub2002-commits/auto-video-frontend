import type { SentenceItem } from '../_types/sentences';

export type SentenceSoundEffectItem = NonNullable<SentenceItem['soundEffects']>[number];

export type ComputedSentenceSoundEffectItem = SentenceSoundEffectItem & {
  absoluteDelaySeconds: number;
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
): ComputedSentenceSoundEffectItem[] => {
  const items = Array.isArray(input) ? input : [];
  let currentGroupStart = 0;
  let currentGroupEnd = 0;

  return items.map((item, index) => {
    const delaySeconds = clampDelay(item?.delaySeconds);
    const durationSeconds = clampDuration(item?.durationSeconds);

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
      timingMode: normalizeTimingMode(item?.timingMode),
      absoluteDelaySeconds,
    };
  });
};