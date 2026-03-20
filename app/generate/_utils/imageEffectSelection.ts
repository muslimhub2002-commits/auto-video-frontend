'use client';

import type { SentenceItem } from '../_types/sentences';

export const TEMPORARY_CUSTOM_PRESET_ID = '__temporary__';

function hasCustomPresetKey(value: Record<string, unknown> | null | undefined) {
  return Boolean(value && typeof value === 'object' && value.presetKey === 'custom');
}

export function hasCustomLookSelection(sentence: SentenceItem) {
  return (
    String(sentence.customImageFilterId ?? '').trim().length > 0 ||
    hasCustomPresetKey(sentence.imageFilterSettings)
  );
}

export function hasCustomMotionSelection(sentence: SentenceItem) {
  return (
    String(sentence.customMotionEffectId ?? '').trim().length > 0 ||
    hasCustomPresetKey(sentence.imageMotionSettings)
  );
}
