'use client';

import type { SentenceItem } from '../_types/sentences';
import {
  getDefaultImageFilterSettings,
  getDefaultImageMotionSettings,
  getDefaultImageMotionSpeed,
  normalizeImageFilterSettings,
  normalizeImageMotionSettings,
  resolveImageMotionSpeed,
  resolveMotionEffectFromSettings,
  resolveVisualEffectFromSettings,
  type ImageFilterPresetDto,
  type ImageFilterSettings,
  type ImageMotionSettings,
  type MotionEffectPresetDto,
} from '../_components/sentences/ImageEffectPreview';

export const TEMPORARY_CUSTOM_PRESET_ID = '__temporary__';

export const VISUAL_EFFECT_SELECT_VALUES = [
  'colorGrading',
  'animatedLighting',
  'glassSubtle',
  'glassReflections',
  'glassStrong',
] as const;

type TemporaryLookSelection = {
  visualEffect: SentenceItem['visualEffect'] | null;
  imageFilterSettings: ImageFilterSettings;
};

type TemporaryMotionSelection = {
  imageMotionEffect: NonNullable<SentenceItem['imageMotionEffect']>;
  imageMotionSettings: ImageMotionSettings;
  imageMotionSpeed: number;
};

function hasCustomPresetKey(value: Record<string, unknown> | null | undefined) {
  return Boolean(value && typeof value === 'object' && value.presetKey === 'custom');
}

export function isVisualEffectSelectValue(
  value: string,
): value is (typeof VISUAL_EFFECT_SELECT_VALUES)[number] {
  return (VISUAL_EFFECT_SELECT_VALUES as readonly string[]).includes(value);
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

export function buildLookPresetSelectionPatch(params: {
  value: string;
  sentence: Pick<SentenceItem, 'visualEffect' | 'imageFilterSettings'>;
  imageFilterPresets: ImageFilterPresetDto[];
  temporarySelection?: TemporaryLookSelection | null;
}): Partial<SentenceItem> | null {
  const { imageFilterPresets, sentence, temporarySelection, value } = params;

  if (value.startsWith('custom:')) {
    const presetId = value.slice('custom:'.length);
    if (presetId === TEMPORARY_CUSTOM_PRESET_ID) {
      if (!temporarySelection) return null;

      return {
        visualEffect: temporarySelection.visualEffect,
        customImageFilterId: null,
        imageFilterSettings: {
          ...temporarySelection.imageFilterSettings,
          presetKey: 'custom',
        },
      };
    }

    const preset = imageFilterPresets.find((item) => item.id === presetId);
    if (!preset) return null;

    const nextSettings = normalizeImageFilterSettings(
      preset.settings,
      sentence.visualEffect ?? null,
    );

    return {
      visualEffect: resolveVisualEffectFromSettings(nextSettings, sentence.visualEffect ?? null),
      customImageFilterId: preset.id,
      imageFilterSettings: { ...nextSettings, presetKey: 'custom' },
    };
  }

  const effect = value.slice('builtin:'.length) as SentenceItem['visualEffect'];
  const normalizedEffect = effect === 'none' ? null : effect;
  return {
    visualEffect: normalizedEffect,
    customImageFilterId: null,
    imageFilterSettings: getDefaultImageFilterSettings(normalizedEffect),
  };
}

export function buildMotionPresetSelectionPatch(params: {
  value: string;
  sentence: Pick<SentenceItem, 'imageMotionEffect' | 'imageMotionSettings' | 'imageMotionSpeed'>;
  motionEffectPresets: MotionEffectPresetDto[];
  isShortVideo: boolean;
  temporarySelection?: TemporaryMotionSelection | null;
}): Partial<SentenceItem> | null {
  const { isShortVideo, motionEffectPresets, sentence, temporarySelection, value } = params;

  if (value.startsWith('custom:')) {
    const presetId = value.slice('custom:'.length);
    if (presetId === TEMPORARY_CUSTOM_PRESET_ID) {
      if (!temporarySelection) return null;

      return {
        imageMotionEffect: temporarySelection.imageMotionEffect,
        customMotionEffectId: null,
        imageMotionSettings: {
          ...temporarySelection.imageMotionSettings,
          presetKey: 'custom',
        },
        imageMotionSpeed: temporarySelection.imageMotionSpeed,
      };
    }

    const preset = motionEffectPresets.find((item) => item.id === presetId);
    if (!preset) return null;

    const nextSettings = normalizeImageMotionSettings(
      preset.settings,
      sentence.imageMotionEffect ?? 'default',
      resolveImageMotionSpeed(
        sentence.imageMotionSpeed,
        sentence.imageMotionSettings,
        isShortVideo,
      ),
      isShortVideo,
    );

    return {
      imageMotionEffect: resolveMotionEffectFromSettings(
        nextSettings,
        sentence.imageMotionEffect ?? 'default',
      ),
      customMotionEffectId: preset.id,
      imageMotionSettings: { ...nextSettings, presetKey: 'custom' },
      imageMotionSpeed: nextSettings.speed ?? getDefaultImageMotionSpeed(isShortVideo),
    };
  }

  const effect = value.slice('builtin:'.length) as NonNullable<SentenceItem['imageMotionEffect']>;
  const nextSettings = getDefaultImageMotionSettings(
    effect,
    resolveImageMotionSpeed(
      sentence.imageMotionSpeed,
      sentence.imageMotionSettings,
      isShortVideo,
    ),
    isShortVideo,
  );

  return {
    imageMotionEffect: effect,
    customMotionEffectId: null,
    imageMotionSettings: nextSettings,
    imageMotionSpeed: nextSettings.speed ?? getDefaultImageMotionSpeed(isShortVideo),
  };
}
