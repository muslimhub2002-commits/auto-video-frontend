'use client';

import { useEffect, useState, type CSSProperties } from 'react';

import type { SentenceItem } from '../../_types/sentences';
import type { SentenceSoundEffectItem } from '../../_types/sentences';
import {
  normalizeImageFilterSettings,
  resolveVisualEffectFromSettings,
} from './ImageEffectPreview';
import { buildPreviewImageMotionStyle } from '../../_utils/imageMotionPreview';

export const TEXT_ANIMATION_EFFECT_VALUES = [
  'popInBounceHook',
  'slideCutFast',
  'typewriter',
  'scalePunchZoom',
  'maskReveal',
  'glitchFlashHook',
  'kineticTypography',
  'softRiseFade',
  'centerWipeReveal',
  'trackingSnapHook',
] as const;

const LEGACY_TEXT_ANIMATION_EFFECT_VALUES = [
  'popInBounceHook',
  'scalePunchZoom',
  'maskReveal',
  'glitchFlashHook',
  'kineticTypography',
] as const;

export const TEXT_BACKGROUND_MODE_VALUES = [
  'inheritImage',
  'image',
  'inheritVideo',
  'video',
  'solid',
  'gradient',
] as const;

export type TextAnimationEffect = (typeof TEXT_ANIMATION_EFFECT_VALUES)[number];

export type TextBackgroundMode = (typeof TEXT_BACKGROUND_MODE_VALUES)[number];
export type TextHorizontalAlign = 'left' | 'center' | 'right';
export type TextContentAlign = 'left' | 'center' | 'right';
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';
export type TextCaseMode = 'original' | 'uppercase';

const TEXT_HORIZONTAL_ALIGN_VALUES = ['left', 'center', 'right'] as const;
const TEXT_CONTENT_ALIGN_VALUES = ['left', 'center', 'right'] as const;
const TEXT_VERTICAL_ALIGN_VALUES = ['top', 'middle', 'bottom'] as const;
const TEXT_CASE_MODE_VALUES = ['original', 'uppercase'] as const;

export const TEXT_ANIMATION_SPEED_MIN = 0.4;
export const TEXT_ANIMATION_SPEED_MAX = 2.4;
export const TEXT_ANIMATION_SPEED_STEP = 0.1;
export const DEFAULT_TEXT_ANIMATION_SPEED = 1.1;
export const MAX_TEXT_ANIMATION_WORDS = 5;
export const TEXT_ANIMATION_WORD_DELAY_MIN = 0.03;
export const TEXT_ANIMATION_WORD_DELAY_MAX = 0.4;
export const TEXT_ANIMATION_WORD_DELAY_STEP = 0.01;
export const DEFAULT_TEXT_ANIMATION_WORD_DELAY = 0.08;
export const TEXT_ANIMATION_START_DELAY_MIN = 0;
export const TEXT_ANIMATION_START_DELAY_MAX = 10;
export const TEXT_ANIMATION_START_DELAY_STEP = 0.1;
export const DEFAULT_TEXT_ANIMATION_START_DELAY = 0;
export const TEXT_SCENE_FONT_MIN_PX = 19.2;
export const TEXT_SCENE_FONT_MAX_PX = 92.8;
export const TEXT_SCENE_DEFAULT_FONT_FAMILY = 'Oswald, system-ui, sans-serif';
export const TEXT_SCENE_ARABIC_FONT_FAMILY = 'Noto Kufi Arabic, sans-serif';
const SLIDE_CUT_EASING = [0.12, 0.88, 0.24, 1] as const;
const NEWTON_ITERATIONS = 4;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_PRECISION = 0.0000001;
const SUBDIVISION_MAX_ITERATIONS = 10;

export type TextAnimationSettings = {
  presetKey?: TextAnimationEffect | 'custom';
  speed?: number;
  horizontalAlign?: TextHorizontalAlign;
  contentAlign?: TextContentAlign;
  verticalAlign?: TextVerticalAlign;
  offsetX?: number;
  offsetY?: number;
  fontSizePercent?: number;
  maxWidthPercent?: number;
  fontWeight?: number;
  letterSpacingEm?: number;
  lineHeight?: number;
  textColor?: string;
  accentColor?: string;
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeWidthPx?: number;
  shadowOpacity?: number;
  shadowBlurPx?: number;
  backgroundMode?: TextBackgroundMode;
  backgroundColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngleDeg?: number;
  backgroundDim?: number;
  animationIntensity?: number;
  startDelaySeconds?: number;
  animatePerWord?: boolean;
  wordDelaySeconds?: number;
  textCase?: TextCaseMode;
  textBoxEnabled?: boolean;
  textBoxPaddingPx?: number;
  textBoxRadiusPx?: number;
  textBoxColor?: string;
};

export function getTextAnimationSettingsForEffectChange(
  effect: SentenceItem['textAnimationEffect'] | null | undefined,
  currentSettings: Record<string, unknown> | TextAnimationSettings | null | undefined,
  isShortVideo = true,
): TextAnimationSettings {
  const nextEffect = resolveLegacyTextAnimationEffect(effect) ?? 'slideCutFast';
  const defaults = getDefaultTextAnimationSettings(nextEffect, isShortVideo);
  const current = normalizeTextAnimationSettings(currentSettings, nextEffect, isShortVideo);

  return normalizeTextAnimationSettings(
    {
      ...defaults,
      ...current,
      presetKey: nextEffect,
    },
    nextEffect,
    isShortVideo,
  );
}

export type TextAnimationPresetDto = {
  id: string;
  title: string;
  settings?: Record<string, unknown> | null;
  soundEffects?: SentenceSoundEffectItem[] | null;
};

type TextAnimationPreviewProps = {
  sentenceText?: string | null;
  text?: string | null;
  effect?: SentenceItem['textAnimationEffect'] | null;
  settings?: Record<string, unknown> | TextAnimationSettings | null;
  visualEffect?: SentenceItem['visualEffect'] | null;
  imageFilterSettings?: Record<string, unknown> | null;
  imageMotionEffect?: SentenceItem['imageMotionEffect'] | null;
  imageMotionSettings?: Record<string, unknown> | null;
  imageMotionSpeed?: number | null;
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  isShortVideo?: boolean;
  className?: string;
  contentClassName?: string;
  fontFamily?: string;
  enableMotion?: boolean;
  repeatMotion?: boolean;
  motionResetKey?: string | number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getNumeric(value: unknown, fallback: number, min?: number, max?: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (typeof min === 'number' && typeof max === 'number') {
    return clamp(numeric, min, max);
  }
  if (typeof min === 'number') return Math.max(min, numeric);
  if (typeof max === 'number') return Math.min(max, numeric);
  return numeric;
}

function getColor(value: unknown, fallback: string) {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  return text;
}

function getEnumValue<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  fallback: TValue,
) {
  return allowed.includes(value as TValue) ? (value as TValue) : fallback;
}

function getWords(value: string) {
  return String(value ?? '')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function getGraphemes(value: string) {
  const text = String(value ?? '');
  if (!text) {
    return [] as string[];
  }

  const IntlWithSegmenter = Intl as typeof Intl & {
    Segmenter?: new (
      locales?: string | string[],
      options?: { granularity?: 'grapheme' | 'word' | 'sentence' },
    ) => {
      segment(input: string): Iterable<{ segment: string }>;
    };
  };

  if (typeof IntlWithSegmenter.Segmenter === 'function') {
    const segmenter = new IntlWithSegmenter.Segmenter(undefined, {
      granularity: 'grapheme',
    });
    return Array.from(segmenter.segment(text), (item) => item.segment);
  }

  return Array.from(text);
}

function stripBracketedText(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/\[[\s\S]*?\]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function containsArabicScript(value: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/u.test(value);
}

function resolveLegacyTextAnimationEffect(value: unknown): TextAnimationEffect | null {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if ((TEXT_ANIMATION_EFFECT_VALUES as readonly string[]).includes(normalized)) {
    return normalized as TextAnimationEffect;
  }
  if ((LEGACY_TEXT_ANIMATION_EFFECT_VALUES as readonly string[]).includes(normalized)) {
    return 'slideCutFast';
  }
  return null;
}

export function getDefaultTextAnimationText(sentenceText?: string | null, maxWords = MAX_TEXT_ANIMATION_WORDS) {
  const words = getWords(stripBracketedText(sentenceText));
  return words.slice(0, maxWords).join(' ').trim();
}

export function resolveTextAnimationFontFamily(text: string) {
  return containsArabicScript(text)
    ? TEXT_SCENE_ARABIC_FONT_FAMILY
    : TEXT_SCENE_DEFAULT_FONT_FAMILY;
}

export function getTextAnimationIntroDurationMs(speed: number) {
  return Math.max(1200, 3600 / clamp(speed, TEXT_ANIMATION_SPEED_MIN, TEXT_ANIMATION_SPEED_MAX));
}

export function getTextAnimationFontSizePx(containerWidth: number, fontSizePercent: number) {
  return clamp(
    (containerWidth * fontSizePercent) / 100,
    TEXT_SCENE_FONT_MIN_PX,
    TEXT_SCENE_FONT_MAX_PX,
  );
}

export function normalizeTextAnimationText(value: string | null | undefined, sentenceText?: string | null) {
  const raw = String(value ?? '');
  if (raw.trim().length > 0) {
    return raw;
  }
  return getDefaultTextAnimationText(sentenceText);
}

export function resolveTextAnimationText(value: string | null | undefined, sentenceText?: string | null) {
  const normalized = normalizeTextAnimationText(value, sentenceText);
  return normalized || getDefaultTextAnimationText(sentenceText);
}

export function getTextAnimationEffectLabel(effect: SentenceItem['textAnimationEffect'] | null | undefined) {
  const resolvedEffect = resolveLegacyTextAnimationEffect(effect);

  if (resolvedEffect === 'popInBounceHook') return 'Pop in bounce';
  if (resolvedEffect === 'typewriter') return 'Typewriter';
  if (resolvedEffect === 'scalePunchZoom') return 'Scale punch zoom';
  if (resolvedEffect === 'maskReveal') return 'Mask reveal';
  if (resolvedEffect === 'glitchFlashHook') return 'Glitch flash hook';
  if (resolvedEffect === 'kineticTypography') return 'Kinetic typography';
  if (resolvedEffect === 'softRiseFade') return 'Soft rise fade';
  if (resolvedEffect === 'centerWipeReveal') return 'Center wipe reveal';
  if (resolvedEffect === 'trackingSnapHook') return 'Tracking snap hook';
  return 'Slide + cut';
}

export function isTextAnimationEffectValue(value: string): value is TextAnimationEffect {
  return (TEXT_ANIMATION_EFFECT_VALUES as readonly string[]).includes(value);
}

export function getDefaultTextAnimationSettings(
  effect: SentenceItem['textAnimationEffect'] | null | undefined,
  isShortVideo = true,
): TextAnimationSettings {
  const normalizedEffect = resolveLegacyTextAnimationEffect(effect) ?? 'slideCutFast';
  const baseFontSize = 12;
  const defaults: TextAnimationSettings = {
    presetKey: normalizedEffect,
    speed: DEFAULT_TEXT_ANIMATION_SPEED,
    horizontalAlign: 'center',
    contentAlign: 'center',
    verticalAlign: 'middle',
    offsetX: 0,
    offsetY: 0,
    fontSizePercent: baseFontSize,
    maxWidthPercent: isShortVideo ? 72 : 46,
    fontWeight: 820,
    letterSpacingEm: 0.02,
    lineHeight: 0.92,
    textColor: '#ffffff',
    accentColor: '#ffd60a',
    strokeEnabled: false,
    strokeColor: '#0f172a',
    strokeWidthPx: 0,
    shadowOpacity: 0.34,
    shadowBlurPx: 18,
    backgroundMode: 'inheritImage',
    backgroundColor: '#0f172a',
    gradientFrom: '#0f172a',
    gradientTo: '#1d4ed8',
    gradientAngleDeg: 135,
    backgroundDim: 0.44,
    animationIntensity: 0.92,
    startDelaySeconds: DEFAULT_TEXT_ANIMATION_START_DELAY,
    animatePerWord: false,
    wordDelaySeconds: DEFAULT_TEXT_ANIMATION_WORD_DELAY,
    textCase: 'uppercase',
    textBoxEnabled: false,
    textBoxPaddingPx: isShortVideo ? 12 : 10,
    textBoxRadiusPx: isShortVideo ? 12 : 10,
    textBoxColor: '#0f172a',
  };

  if (normalizedEffect === 'popInBounceHook') {
    return {
      ...defaults,
      speed: 1,
      offsetY: -10,
      animationIntensity: 1.02,
      shadowOpacity: 0.4,
    };
  }

  if (normalizedEffect === 'typewriter') {
    return {
      ...defaults,
      speed: 0.95,
      fontWeight: 780,
      letterSpacingEm: 0.01,
      animationIntensity: 0.76,
      maxWidthPercent: isShortVideo ? 74 : 48,
    };
  }

  if (normalizedEffect === 'scalePunchZoom') {
    return {
      ...defaults,
      speed: 1.2,
      fontWeight: 860,
      letterSpacingEm: 0.01,
      animationIntensity: 1.08,
      shadowOpacity: 0.42,
    };
  }

  if (normalizedEffect === 'maskReveal') {
    return {
      ...defaults,
      speed: 0.95,
      offsetY: -12,
      animationIntensity: 0.82,
      maxWidthPercent: isShortVideo ? 74 : 48,
    };
  }

  if (normalizedEffect === 'glitchFlashHook') {
    return {
      ...defaults,
      speed: 1.35,
      animationIntensity: 1.12,
      shadowOpacity: 0.46,
      shadowBlurPx: 22,
    };
  }

  if (normalizedEffect === 'kineticTypography') {
    return {
      ...defaults,
      speed: 1.22,
      fontWeight: 840,
      letterSpacingEm: 0.05,
      animationIntensity: 0.98,
      maxWidthPercent: isShortVideo ? 76 : 50,
    };
  }

  if (normalizedEffect === 'softRiseFade') {
    return {
      ...defaults,
      speed: 0.9,
      animationIntensity: 0.72,
      shadowOpacity: 0.26,
      shadowBlurPx: 24,
    };
  }

  if (normalizedEffect === 'centerWipeReveal') {
    return {
      ...defaults,
      speed: 1,
      horizontalAlign: 'center',
      contentAlign: 'center',
      offsetX: 0,
      animationIntensity: 0.86,
    };
  }

  if (normalizedEffect === 'trackingSnapHook') {
    return {
      ...defaults,
      speed: 1.18,
      fontWeight: 860,
      letterSpacingEm: 0.08,
      animationIntensity: 0.94,
      maxWidthPercent: isShortVideo ? 78 : 52,
    };
  }

  return defaults;
}

export function normalizeTextAnimationSettings(
  settings: Record<string, unknown> | TextAnimationSettings | null | undefined,
  fallbackEffect?: SentenceItem['textAnimationEffect'] | null,
  isShortVideo = true,
): TextAnimationSettings {
  const defaults = getDefaultTextAnimationSettings(
    resolveLegacyTextAnimationEffect(fallbackEffect) ?? 'slideCutFast',
    isShortVideo,
  );
  const resolvedPresetKey =
    resolveLegacyTextAnimationEffect(settings?.presetKey) ?? defaults.presetKey;
  const animatePerWord =
    resolvedPresetKey !== 'typewriter' && settings?.animatePerWord === true;
  const textBoxEnabled =
    resolvedPresetKey !== 'typewriter' && settings?.textBoxEnabled === true;
  const strokeWidthPx = getNumeric(settings?.strokeWidthPx, defaults.strokeWidthPx ?? 0, 0, 4);
  const strokeEnabled =
    settings?.strokeEnabled === true ||
    (settings?.strokeEnabled == null && strokeWidthPx > 0);

  return {
    presetKey: resolvedPresetKey,
    speed: getNumeric(settings?.speed, defaults.speed ?? DEFAULT_TEXT_ANIMATION_SPEED, TEXT_ANIMATION_SPEED_MIN, TEXT_ANIMATION_SPEED_MAX),
    horizontalAlign: getEnumValue(settings?.horizontalAlign, TEXT_HORIZONTAL_ALIGN_VALUES, defaults.horizontalAlign ?? 'center'),
    contentAlign: getEnumValue(settings?.contentAlign, TEXT_CONTENT_ALIGN_VALUES, defaults.contentAlign ?? defaults.horizontalAlign ?? 'left'),
    verticalAlign: getEnumValue(settings?.verticalAlign, TEXT_VERTICAL_ALIGN_VALUES, defaults.verticalAlign ?? 'middle'),
    offsetX: getNumeric(settings?.offsetX, defaults.offsetX ?? 0, -35, 35),
    offsetY: getNumeric(settings?.offsetY, defaults.offsetY ?? 0, -35, 35),
    fontSizePercent: getNumeric(settings?.fontSizePercent, defaults.fontSizePercent ?? 12, 5, 24),
    maxWidthPercent: getNumeric(settings?.maxWidthPercent, defaults.maxWidthPercent ?? 76, 30, 100),
    fontWeight: getNumeric(settings?.fontWeight, defaults.fontWeight ?? 800, 300, 900),
    letterSpacingEm: getNumeric(settings?.letterSpacingEm, defaults.letterSpacingEm ?? 0.02, -0.08, 0.24),
    lineHeight: getNumeric(settings?.lineHeight, defaults.lineHeight ?? 0.92, 0.75, 1.5),
    textColor: getColor(settings?.textColor, defaults.textColor ?? '#ffffff'),
    accentColor: getColor(settings?.accentColor, defaults.accentColor ?? '#facc15'),
    strokeEnabled,
    strokeColor: getColor(settings?.strokeColor, defaults.strokeColor ?? '#0f172a'),
    strokeWidthPx,
    shadowOpacity: getNumeric(settings?.shadowOpacity, defaults.shadowOpacity ?? 0.34, 0, 1),
    shadowBlurPx: getNumeric(settings?.shadowBlurPx, defaults.shadowBlurPx ?? 18, 0, 48),
    backgroundMode: getEnumValue(settings?.backgroundMode, TEXT_BACKGROUND_MODE_VALUES, defaults.backgroundMode ?? 'inheritImage'),
    backgroundColor: getColor(settings?.backgroundColor, defaults.backgroundColor ?? '#0f172a'),
    gradientFrom: getColor(settings?.gradientFrom, defaults.gradientFrom ?? '#0f172a'),
    gradientTo: getColor(settings?.gradientTo, defaults.gradientTo ?? '#1d4ed8'),
    gradientAngleDeg: getNumeric(settings?.gradientAngleDeg, defaults.gradientAngleDeg ?? 135, 0, 360),
    backgroundDim: getNumeric(settings?.backgroundDim, defaults.backgroundDim ?? 0.38, 0, 0.92),
    animationIntensity: getNumeric(settings?.animationIntensity, defaults.animationIntensity ?? 0.82, 0, 1.2),
    startDelaySeconds: getNumeric(
      settings?.startDelaySeconds,
      defaults.startDelaySeconds ?? DEFAULT_TEXT_ANIMATION_START_DELAY,
      TEXT_ANIMATION_START_DELAY_MIN,
      TEXT_ANIMATION_START_DELAY_MAX,
    ),
    animatePerWord,
    wordDelaySeconds: getNumeric(
      settings?.wordDelaySeconds,
      defaults.wordDelaySeconds ?? DEFAULT_TEXT_ANIMATION_WORD_DELAY,
      TEXT_ANIMATION_WORD_DELAY_MIN,
      TEXT_ANIMATION_WORD_DELAY_MAX,
    ),
    textCase: getEnumValue(settings?.textCase, TEXT_CASE_MODE_VALUES, defaults.textCase ?? 'uppercase'),
    textBoxEnabled,
    textBoxPaddingPx: getNumeric(settings?.textBoxPaddingPx, defaults.textBoxPaddingPx ?? 12, 0, 48),
    textBoxRadiusPx: getNumeric(settings?.textBoxRadiusPx, defaults.textBoxRadiusPx ?? 12, 0, 48),
    textBoxColor: getColor(settings?.textBoxColor, defaults.textBoxColor ?? '#0f172a'),
  };
}

export function resolveTextAnimationEffectFromSettings(
  settings: Record<string, unknown> | TextAnimationSettings | null | undefined,
  fallbackEffect?: SentenceItem['textAnimationEffect'] | null,
) {
  return (
    resolveLegacyTextAnimationEffect(settings?.presetKey) ??
    resolveLegacyTextAnimationEffect(fallbackEffect) ??
    'slideCutFast'
  );
}

function resolveJustifyContent(alignment: TextHorizontalAlign) {
  if (alignment === 'left') return 'flex-start';
  if (alignment === 'right') return 'flex-end';
  return 'center';
}

function resolveAlignItems(alignment: TextVerticalAlign) {
  if (alignment === 'top') return 'flex-start';
  if (alignment === 'bottom') return 'flex-end';
  return 'center';
}

function buildBackgroundStyle(
  settings: TextAnimationSettings,
  hasImage: boolean,
  hasVideo: boolean,
): CSSProperties {
  if (
    ((settings.backgroundMode === 'image' || settings.backgroundMode === 'inheritImage') && hasImage) ||
    ((settings.backgroundMode === 'video' || settings.backgroundMode === 'inheritVideo') && hasVideo)
  ) {
    return { backgroundColor: '#020617' };
  }
  if (settings.backgroundMode === 'gradient') {
    return {
      backgroundImage: `linear-gradient(${(settings.gradientAngleDeg ?? 135).toFixed(0)}deg, ${settings.gradientFrom}, ${settings.gradientTo})`,
      backgroundColor: settings.gradientFrom,
    };
  }
  return {
    backgroundColor: settings.backgroundColor,
  };
}

function formatDisplayText(value: string, textCase: TextCaseMode) {
  return textCase === 'uppercase' ? value.toUpperCase() : value;
}

function resolveContentTextAlign(settings: TextAnimationSettings) {
  return settings.contentAlign ?? settings.horizontalAlign ?? 'left';
}

function getWordDelayMs(settings: TextAnimationSettings) {
  return Math.round(
    1000 *
      getNumeric(
        settings.wordDelaySeconds,
        DEFAULT_TEXT_ANIMATION_WORD_DELAY,
        TEXT_ANIMATION_WORD_DELAY_MIN,
        TEXT_ANIMATION_WORD_DELAY_MAX,
      ),
  );
}

function getStartDelayMs(settings: TextAnimationSettings) {
  return Math.round(
    1000 *
      getNumeric(
        settings.startDelaySeconds,
        DEFAULT_TEXT_ANIMATION_START_DELAY,
        TEXT_ANIMATION_START_DELAY_MIN,
        TEXT_ANIMATION_START_DELAY_MAX,
      ),
  );
}

function interpolateNumber(
  value: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
) {
  if (inputRange.length !== outputRange.length) {
    throw new Error('Input and output ranges must be the same length');
  }

  if (inputRange.length === 0) return 0;
  if (value <= inputRange[0]) return outputRange[0];

  for (let index = 1; index < inputRange.length; index += 1) {
    if (value <= inputRange[index]) {
      const startInput = inputRange[index - 1];
      const endInput = inputRange[index];
      const startOutput = outputRange[index - 1];
      const endOutput = outputRange[index];
      const segmentProgress = (value - startInput) / (endInput - startInput || 1);
      return startOutput + (endOutput - startOutput) * segmentProgress;
    }
  }

  return outputRange[outputRange.length - 1];
}

function calcBezierCoefficientA(a1: number, a2: number) {
  return 1 - 3 * a2 + 3 * a1;
}

function calcBezierCoefficientB(a1: number, a2: number) {
  return 3 * a2 - 6 * a1;
}

function calcBezierCoefficientC(a1: number) {
  return 3 * a1;
}

function calcBezierValue(t: number, a1: number, a2: number) {
  return (
    ((calcBezierCoefficientA(a1, a2) * t + calcBezierCoefficientB(a1, a2)) * t +
      calcBezierCoefficientC(a1)) *
    t
  );
}

function getBezierSlope(t: number, a1: number, a2: number) {
  return (
    3 * calcBezierCoefficientA(a1, a2) * t * t +
    2 * calcBezierCoefficientB(a1, a2) * t +
    calcBezierCoefficientC(a1)
  );
}

function binarySubdivide(x: number, lowerBound: number, upperBound: number, x1: number, x2: number) {
  let currentX = 0;
  let currentT = 0;
  let start = lowerBound;
  let end = upperBound;

  for (let index = 0; index < SUBDIVISION_MAX_ITERATIONS; index += 1) {
    currentT = start + (end - start) / 2;
    currentX = calcBezierValue(currentT, x1, x2) - x;
    if (Math.abs(currentX) <= SUBDIVISION_PRECISION) {
      return currentT;
    }
    if (currentX > 0) {
      end = currentT;
    } else {
      start = currentT;
    }
  }

  return currentT;
}

function newtonRaphsonIterate(x: number, guessT: number, x1: number, x2: number) {
  let currentGuess = guessT;

  for (let index = 0; index < NEWTON_ITERATIONS; index += 1) {
    const currentSlope = getBezierSlope(currentGuess, x1, x2);
    if (currentSlope === 0) {
      return currentGuess;
    }
    const currentX = calcBezierValue(currentGuess, x1, x2) - x;
    currentGuess -= currentX / currentSlope;
  }

  return currentGuess;
}

function getBezierProgress(x: number, x1: number, y1: number, x2: number, y2: number) {
  if (x1 === y1 && x2 === y2) {
    return x;
  }

  const initialSlope = getBezierSlope(x, x1, x2);
  const solvedT =
    initialSlope >= NEWTON_MIN_SLOPE
      ? newtonRaphsonIterate(x, x, x1, x2)
      : initialSlope === 0
        ? x
        : binarySubdivide(x, 0, 1, x1, x2);

  return calcBezierValue(solvedT, y1, y2);
}

function buildImageLookFilter(settings: ReturnType<typeof normalizeImageFilterSettings>) {
  return [
    `saturate(${(settings.saturation ?? 1).toFixed(3)})`,
    `contrast(${(settings.contrast ?? 1).toFixed(3)})`,
    `brightness(${(settings.brightness ?? 1).toFixed(3)})`,
    (settings.blurPx ?? 0) > 0.001 ? `blur(${(settings.blurPx ?? 0).toFixed(2)}px)` : null,
    (settings.sepia ?? 0) > 0.001 ? `sepia(${(settings.sepia ?? 0).toFixed(3)})` : null,
    (settings.grayscale ?? 0) > 0.001
      ? `grayscale(${(settings.grayscale ?? 0).toFixed(3)})`
      : null,
    Math.abs(settings.hueRotateDeg ?? 0) > 0.001
      ? `hue-rotate(${(settings.hueRotateDeg ?? 0).toFixed(2)}deg)`
      : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;
}

function getStablePreviewSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function buildAnimatedTextFilter(params: {
  blurPx?: number;
  brightness?: number;
  contrast?: number;
}) {
  const parts = [
    (params.blurPx ?? 0) > 0.001
      ? `blur(${(params.blurPx ?? 0).toFixed(2)}px)`
      : null,
    Math.abs((params.brightness ?? 1) - 1) > 0.001
      ? `brightness(${(params.brightness ?? 1).toFixed(3)})`
      : null,
    Math.abs((params.contrast ?? 1) - 1) > 0.001
      ? `contrast(${(params.contrast ?? 1).toFixed(3)})`
      : null,
  ].filter(Boolean);

  return parts.join(' ') || undefined;
}

function getTypewriterVisibleGraphemeCount(
  elapsedMs: number,
  durationMs: number,
  totalGraphemes: number,
) {
  if (totalGraphemes <= 0) {
    return 0;
  }

  const progress = clamp(elapsedMs / Math.max(durationMs, 1), 0, 1);
  if (progress <= 0) {
    return 0;
  }
  if (progress >= 1) {
    return totalGraphemes;
  }

  return Math.min(totalGraphemes, Math.max(1, Math.ceil(progress * totalGraphemes)));
}

function buildTextBoxStyle(settings: TextAnimationSettings): CSSProperties | null {
  if (settings.textBoxEnabled !== true) {
    return null;
  }

  return {
    backgroundColor: settings.textBoxColor,
    padding: `${(settings.textBoxPaddingPx ?? 12).toFixed(1)}px`,
    borderRadius: `${(settings.textBoxRadiusPx ?? 12).toFixed(1)}px`,
  };
}

function renderAccentText(
  displayText: string,
  accentBoundary: number,
  accentColor?: string,
  baseColor?: string,
  textPaintStyle?: CSSProperties,
) {
  const safeBoundary = clamp(accentBoundary, 0, displayText.length);
  const accentText = displayText.slice(0, safeBoundary);
  const baseText = displayText.slice(safeBoundary);

  return (
    <>
      {accentText ? (
        <span style={{ ...(textPaintStyle ?? null), color: accentColor }}>
          {accentText}
        </span>
      ) : null}
      {baseText ? (
        <span style={{ ...(textPaintStyle ?? null), color: baseColor }}>
          {baseText}
        </span>
      ) : null}
    </>
  );
}

function buildStrokeShadowLayers(strokeWidthPx: number, strokeColor?: string) {
  const radius = clamp(strokeWidthPx, 0, 4);
  const color = String(strokeColor ?? '').trim();

  if (!color || radius <= 0.001) {
    return [] as string[];
  }

  const directions = [
    [1, 0],
    [0.9239, 0.3827],
    [0.7071, 0.7071],
    [0.3827, 0.9239],
    [0, 1],
    [-0.3827, 0.9239],
    [-0.7071, 0.7071],
    [-0.9239, 0.3827],
    [-1, 0],
    [-0.9239, -0.3827],
    [-0.7071, -0.7071],
    [-0.3827, -0.9239],
    [0, -1],
    [0.3827, -0.9239],
    [0.7071, -0.7071],
    [0.9239, -0.3827],
  ] as const;
  const radii =
    radius >= 1.5
      ? [radius, radius * 0.72, radius * 0.42]
      : radius >= 0.75
        ? [radius, radius * 0.5]
        : [radius];

  return radii.flatMap((ringRadius) =>
    directions.map(
      ([x, y]) =>
        `${(x * ringRadius).toFixed(2)}px ${(y * ringRadius).toFixed(2)}px 0 ${color}`,
    ),
  );
}

function getAnimatedTextStyle(
  effect: TextAnimationEffect,
  elapsedMs: number,
  durationMs: number,
  animationIntensity: number,
): CSSProperties {
  const progress = clamp(elapsedMs / Math.max(durationMs, 1), 0, 1);
  const easedProgress = getBezierProgress(
    progress,
    SLIDE_CUT_EASING[0],
    SLIDE_CUT_EASING[1],
    SLIDE_CUT_EASING[2],
    SLIDE_CUT_EASING[3],
  );
  const normalizedIntensity = clamp(animationIntensity, 0, 1.2);

  if (effect === 'typewriter') {
    return {
      opacity: progress <= 0 ? 0 : 1,
    };
  }

  if (effect === 'popInBounceHook') {
    const startScale = 0.58 - normalizedIntensity * 0.06;
    const overshootScale = 1.08 + normalizedIntensity * 0.08;
    const settleDip = 0.97 - normalizedIntensity * 0.015;
    const translateYPercent = interpolateNumber(
      easedProgress,
      [0, 0.58, 0.82, 1],
      [18 + normalizedIntensity * 8, -6 - normalizedIntensity * 2, 1.5, 0],
    );
    const scale = interpolateNumber(
      easedProgress,
      [0, 0.58, 0.82, 1],
      [startScale, overshootScale, settleDip, 1],
    );
    const blurPx = interpolateNumber(
      easedProgress,
      [0, 0.38, 1],
      [12 + normalizedIntensity * 8, 1.2, 0],
    );

    return {
      opacity: interpolateNumber(easedProgress, [0, 0.16, 1], [0, 1, 1]),
      transform: `translate3d(0, ${translateYPercent.toFixed(2)}%, 0) scale(${scale.toFixed(4)})`,
      filter: buildAnimatedTextFilter({ blurPx }),
    };
  }

  if (effect === 'scalePunchZoom') {
    const scale = interpolateNumber(
      easedProgress,
      [0, 0.48, 0.78, 1],
      [0.82 - normalizedIntensity * 0.05, 1.14 + normalizedIntensity * 0.06, 0.985, 1],
    );
    const rotateDeg = interpolateNumber(
      easedProgress,
      [0, 0.52, 1],
      [3.6 + normalizedIntensity * 2.2, -1.4, 0],
    );
    const blurPx = interpolateNumber(
      easedProgress,
      [0, 0.34, 1],
      [10 + normalizedIntensity * 6, 1, 0],
    );

    return {
      opacity: interpolateNumber(easedProgress, [0, 0.14, 1], [0, 1, 1]),
      transform: `scale(${scale.toFixed(4)}) rotate(${rotateDeg.toFixed(2)}deg)`,
      filter: buildAnimatedTextFilter({ blurPx, contrast: 1 + normalizedIntensity * 0.06 }),
    };
  }

  if (effect === 'maskReveal') {
    const translateYPercent = interpolateNumber(
      easedProgress,
      [0, 1],
      [14 + normalizedIntensity * 6, 0],
    );
    const clipTop = interpolateNumber(easedProgress, [0, 1], [100, 0]);
    const blurPx = interpolateNumber(easedProgress, [0, 0.42, 1], [8 + normalizedIntensity * 6, 0.8, 0]);

    return {
      opacity: interpolateNumber(easedProgress, [0, 0.18, 1], [0, 1, 1]),
      transform: `translate3d(0, ${translateYPercent.toFixed(2)}%, 0)`,
      clipPath: `inset(${clipTop.toFixed(2)}% 0 0 0)`,
      filter: buildAnimatedTextFilter({ blurPx }),
    };
  }

  if (effect === 'glitchFlashHook') {
    const decay = Math.pow(1 - easedProgress, 1.1);
    const jitterX = Math.sin(progress * 42 * Math.PI) * (8 + normalizedIntensity * 10) * decay;
    const jitterY = Math.cos(progress * 33 * Math.PI) * (2.4 + normalizedIntensity * 4) * decay;
    const skewDeg = Math.sin(progress * 19 * Math.PI) * (5 + normalizedIntensity * 4) * decay;
    const flash = Math.max(0, Math.sin(progress * 7 * Math.PI)) * decay;
    const blurPx = interpolateNumber(easedProgress, [0, 0.32, 1], [6 + normalizedIntensity * 4, 1.4, 0]);

    return {
      opacity: interpolateNumber(easedProgress, [0, 0.1, 1], [0, 1, 1]),
      transform: `translate3d(${jitterX.toFixed(2)}%, ${jitterY.toFixed(2)}%, 0) skewX(${skewDeg.toFixed(2)}deg)`,
      filter: buildAnimatedTextFilter({
        blurPx,
        brightness: 1 + flash * (0.45 + normalizedIntensity * 0.2),
        contrast: 1 + flash * 0.18,
      }),
    };
  }

  if (effect === 'kineticTypography') {
    const translateXPercent = interpolateNumber(
      easedProgress,
      [0, 1],
      [-12 - normalizedIntensity * 8, 0],
    );
    const skewDeg = interpolateNumber(
      easedProgress,
      [0, 0.72, 1],
      [-12 - normalizedIntensity * 6, 2.2, 0],
    );
    const scaleX = interpolateNumber(
      easedProgress,
      [0, 0.64, 1],
      [1.2 + normalizedIntensity * 0.08, 0.98, 1],
    );
    const letterSpacingEm = interpolateNumber(
      easedProgress,
      [0, 0.68, 1],
      [0.16 + normalizedIntensity * 0.08, 0.01, 0],
    );
    const blurPx = interpolateNumber(easedProgress, [0, 0.34, 1], [7 + normalizedIntensity * 5, 0.8, 0]);

    return {
      opacity: interpolateNumber(easedProgress, [0, 0.14, 1], [0, 1, 1]),
      transform: `translate3d(${translateXPercent.toFixed(2)}%, 0, 0) skewX(${skewDeg.toFixed(2)}deg) scale(${scaleX.toFixed(4)}, 1)`,
      letterSpacing: `${letterSpacingEm.toFixed(3)}em`,
      filter: buildAnimatedTextFilter({ blurPx }),
    };
  }

  if (effect === 'softRiseFade') {
    const translateYPercent = interpolateNumber(
      easedProgress,
      [0, 1],
      [10 + normalizedIntensity * 6, 0],
    );
    const scale = interpolateNumber(easedProgress, [0, 1], [0.97, 1]);
    const blurPx = interpolateNumber(easedProgress, [0, 0.5, 1], [14 + normalizedIntensity * 6, 1, 0]);

    return {
      opacity: interpolateNumber(easedProgress, [0, 0.26, 1], [0, 1, 1]),
      transform: `translate3d(0, ${translateYPercent.toFixed(2)}%, 0) scale(${scale.toFixed(4)})`,
      filter: buildAnimatedTextFilter({ blurPx }),
    };
  }

  if (effect === 'centerWipeReveal') {
    const clipSide = interpolateNumber(easedProgress, [0, 1], [50, 0]);
    const scale = interpolateNumber(easedProgress, [0, 1], [0.92 - normalizedIntensity * 0.02, 1]);
    const blurPx = interpolateNumber(easedProgress, [0, 0.42, 1], [9 + normalizedIntensity * 4, 0.7, 0]);

    return {
      opacity: interpolateNumber(easedProgress, [0, 0.18, 1], [0, 1, 1]),
      transform: `scale(${scale.toFixed(4)})`,
      clipPath: `inset(0 ${clipSide.toFixed(2)}% 0 ${clipSide.toFixed(2)}%)`,
      filter: buildAnimatedTextFilter({ blurPx }),
    };
  }

  if (effect === 'trackingSnapHook') {
    const scaleX = interpolateNumber(
      easedProgress,
      [0, 0.74, 1],
      [0.82 - normalizedIntensity * 0.06, 1.03, 1],
    );
    const translateYPercent = interpolateNumber(easedProgress, [0, 1], [4 + normalizedIntensity * 3, 0]);
    const letterSpacingEm = interpolateNumber(
      easedProgress,
      [0, 0.72, 1],
      [0.24 + normalizedIntensity * 0.08, 0.02, 0],
    );
    const blurPx = interpolateNumber(easedProgress, [0, 0.36, 1], [10 + normalizedIntensity * 4, 0.8, 0]);

    return {
      opacity: interpolateNumber(easedProgress, [0, 0.14, 1], [0, 1, 1]),
      transform: `translate3d(0, ${translateYPercent.toFixed(2)}%, 0) scale(${scaleX.toFixed(4)}, 1)`,
      letterSpacing: `${letterSpacingEm.toFixed(3)}em`,
      filter: buildAnimatedTextFilter({ blurPx, contrast: 1 + normalizedIntensity * 0.04 }),
    };
  }

  const leadDistance = 20 + normalizedIntensity * 8;
  const skewStart = -7 - normalizedIntensity * 4;
  const blurStart = 8 + normalizedIntensity * 8;
  const translateXPercent = interpolateNumber(easedProgress, [0, 1], [-leadDistance, 0]);
  const clipRight = interpolateNumber(easedProgress, [0, 1], [100, 0]);
  const skew = interpolateNumber(easedProgress, [0, 1], [skewStart, 0]);
  const blurPx = interpolateNumber(easedProgress, [0, 0.4, 1], [blurStart, 0.6, 0]);

  return {
    opacity: interpolateNumber(easedProgress, [0, 0.18, 1], [0, 1, 1]),
    transform: `translate3d(${translateXPercent.toFixed(2)}%, 0, 0) skewX(${skew.toFixed(2)}deg)`,
    clipPath: `inset(0 ${clipRight.toFixed(2)}% 0 0)`,
    filter: buildAnimatedTextFilter({ blurPx }),
  };
}

export function TextAnimationPreview({
  sentenceText,
  text,
  effect,
  settings,
  visualEffect,
  imageFilterSettings,
  imageMotionEffect,
  imageMotionSettings,
  imageMotionSpeed,
  backgroundImageUrl,
  backgroundVideoUrl,
  isShortVideo = true,
  className,
  contentClassName,
  fontFamily,
  enableMotion = true,
  repeatMotion = false,
  motionResetKey,
}: TextAnimationPreviewProps) {
  const resolvedEffect = resolveTextAnimationEffectFromSettings(
    settings,
    effect ?? 'slideCutFast',
  );
  const resolvedSettings = normalizeTextAnimationSettings(
    settings,
    resolvedEffect,
    isShortVideo,
  );
  const resolvedText = formatDisplayText(
    resolveTextAnimationText(text, sentenceText),
    resolvedSettings.textCase ?? 'uppercase',
  );
  const resolvedFontFamily = String(fontFamily ?? '').trim() || resolveTextAnimationFontFamily(resolvedText);
  const resolvedBackgroundImageUrl = String(backgroundImageUrl ?? '').trim() || undefined;
  const resolvedBackgroundVideoUrl = String(backgroundVideoUrl ?? '').trim() || undefined;
  const hasBackgroundImage = Boolean(resolvedBackgroundImageUrl);
  const hasBackgroundVideo = Boolean(resolvedBackgroundVideoUrl);
  const backgroundStyle = buildBackgroundStyle(
    resolvedSettings,
    hasBackgroundImage,
    hasBackgroundVideo,
  );
  const animationDurationMs = getTextAnimationIntroDurationMs(
    resolvedSettings.speed ?? DEFAULT_TEXT_ANIMATION_SPEED,
  );
  const strokeWidthPx = resolvedSettings.strokeWidthPx ?? 0;
  const strokeEnabled = resolvedSettings.strokeEnabled === true && strokeWidthPx > 0;
  const words = resolvedText.split(/\s+/u).filter(Boolean);
  const animatePerWord =
    resolvedEffect !== 'typewriter' &&
    resolvedSettings.animatePerWord === true &&
    words.length > 1;
  const startDelayMs = getStartDelayMs(resolvedSettings);
  const wordDelayMs = getWordDelayMs(resolvedSettings);
  const totalAnimationWindowMs =
    startDelayMs +
    animationDurationMs +
    (animatePerWord ? wordDelayMs * Math.max(0, words.length - 1) : 0);
  const [animationElapsedMs, setAnimationElapsedMs] = useState(0);
  const contentAlign = resolveContentTextAlign(resolvedSettings);
  const resolvedBackgroundLook = normalizeImageFilterSettings(
    imageFilterSettings,
    visualEffect ?? null,
  );
  const normalizedVisualEffect = resolveVisualEffectFromSettings(
    resolvedBackgroundLook,
    visualEffect ?? null,
  );
  const backgroundMediaFilter = buildImageLookFilter(resolvedBackgroundLook);
  const shouldShowGlassOverlay =
    normalizedVisualEffect === 'glassReflections' ||
    normalizedVisualEffect === 'glassStrong' ||
    (resolvedBackgroundLook.glassOverlayOpacity ?? 0) > 0.001;
  const accentBoundary = words[0]?.length ?? resolvedText.length;
  const previewSeed = getStablePreviewSeed(
    `${resolvedText}|${resolvedBackgroundImageUrl ?? ''}|${resolvedBackgroundVideoUrl ?? ''}|${String(motionResetKey ?? '')}`,
  );
  const backgroundMotionStyle = buildPreviewImageMotionStyle({
    imageMotionEffect,
    imageMotionSettings,
    imageMotionSpeed,
    isShortVideo,
    elapsedMs: animationElapsedMs,
  });
  const typewriterGraphemes =
    resolvedEffect === 'typewriter' ? getGraphemes(resolvedText) : [];
  const textBoxStyle = buildTextBoxStyle(resolvedSettings);
  const lightingX = ((previewSeed * 320) % 100 + 100) % 100;
  const lightingY = (35 + 25 * Math.sin(previewSeed * 8) + 100) % 100;
  const lightingAlpha =
    (0.22 + 0.1 * Math.sin(previewSeed * 12)) *
    (resolvedBackgroundLook.animatedLightingIntensity ?? 0);

  useEffect(() => {
    if (!enableMotion) {
      return undefined;
    }

    let animationFrameId = 0;
    const startedAt = performance.now();
    const cycleDurationMs = Math.max(totalAnimationWindowMs, 1);

    const updateFrame = (now: number) => {
      const elapsed = now - startedAt;
      const nextElapsed = repeatMotion
        ? elapsed % cycleDurationMs
        : Math.min(elapsed, cycleDurationMs);

      setAnimationElapsedMs(nextElapsed);

      if (repeatMotion || elapsed < cycleDurationMs) {
        animationFrameId = window.requestAnimationFrame(updateFrame);
      }
    };

    animationFrameId = window.requestAnimationFrame(updateFrame);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [enableMotion, motionResetKey, repeatMotion, totalAnimationWindowMs]);

  const delayedAnimationElapsedMs = Math.max(0, animationElapsedMs - startDelayMs);
  const typewriterVisibleText =
    resolvedEffect === 'typewriter'
      ? typewriterGraphemes
          .slice(
            0,
            getTypewriterVisibleGraphemeCount(
              delayedAnimationElapsedMs,
              animationDurationMs,
              typewriterGraphemes.length,
            ),
          )
          .join('')
      : '';
  const textPaintStyle: CSSProperties = {
    WebkitTextStroke: strokeEnabled ? `${strokeWidthPx.toFixed(2)}px ${resolvedSettings.strokeColor}` : undefined,
    paintOrder: 'stroke fill',
  };
  const baseDropShadow = `0 ${(6 + (resolvedSettings.animationIntensity ?? 0.82) * 6).toFixed(1)}px ${(resolvedSettings.shadowBlurPx ?? 18).toFixed(1)}px rgba(2, 6, 23, ${(resolvedSettings.shadowOpacity ?? 0.34).toFixed(3)})`;
  const strokeShadowLayers = strokeEnabled
    ? buildStrokeShadowLayers(strokeWidthPx, resolvedSettings.strokeColor)
    : [];

  const blockAnimatedStyle = enableMotion
    ? getAnimatedTextStyle(
      resolvedEffect,
        delayedAnimationElapsedMs,
        animationDurationMs,
        resolvedSettings.animationIntensity ?? 0.82,
      )
    : null;
  const textStyle: CSSProperties = {
    display: 'inline-block',
    color: resolvedSettings.textColor,
    fontWeight: resolvedSettings.fontWeight,
    fontSize: `clamp(1.2rem, ${(resolvedSettings.fontSizePercent ?? 12).toFixed(2)}cqw, 5.8rem)`,
    lineHeight: String(resolvedSettings.lineHeight ?? 0.92),
    letterSpacing: `${(resolvedSettings.letterSpacingEm ?? 0.02).toFixed(3)}em`,
    textAlign: contentAlign,
    maxWidth: '100%',
    fontFamily: resolvedFontFamily,
    textShadow: [...strokeShadowLayers, baseDropShadow].join(', '),
    ...textPaintStyle,
    whiteSpace: 'pre-wrap',
  };
  const blockWrapperStyle: CSSProperties = {
    display: 'inline-block',
    maxWidth: `${(resolvedSettings.maxWidthPercent ?? 76).toFixed(1)}%`,
    boxSizing: 'content-box',
    position: resolvedEffect === 'typewriter' ? 'relative' : undefined,
    ...(textBoxStyle ?? null),
    ...(animatePerWord ? null : blockAnimatedStyle),
    willChange: enableMotion && !animatePerWord
      ? 'transform, opacity, clip-path, filter'
      : undefined,
  };

  return (
    <div
      className={className ? `relative overflow-hidden ${className}` : 'relative overflow-hidden'}
      style={{
        ...backgroundStyle,
        containerType: 'inline-size',
      }}
    >
      <style>
        {`
          @keyframes av-text-preview-dim {
            0% { opacity: 0.35; }
            100% { opacity: 1; }
          }
        `}
      </style>

      {hasBackgroundImage || hasBackgroundVideo ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ filter: backgroundMediaFilter }}
        >
          {hasBackgroundVideo ? (
            <video
              src={resolvedBackgroundVideoUrl}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              style={undefined}
            />
          ) : null}

          {hasBackgroundImage ? (
            <img
              src={resolvedBackgroundImageUrl}
              alt="Text scene background"
              className="absolute inset-0 h-full w-full object-cover"
              style={enableMotion ? backgroundMotionStyle : undefined}
            />
          ) : null}

          {(resolvedBackgroundLook.animatedLightingIntensity ?? 0) > 0.001 ? (
            <div
              className="absolute inset-0"
              style={{
                opacity: Math.max(0, Math.min(0.42, lightingAlpha)),
                mixBlendMode: 'screen',
                background: `radial-gradient(circle at ${lightingX.toFixed(2)}% ${lightingY.toFixed(2)}%, rgba(255, 80, 200, 0.55) 0%, rgba(80, 160, 255, 0.30) 38%, rgba(0,0,0,0) 70%)`,
              }}
            />
          ) : null}

          {shouldShowGlassOverlay ? (
            <div
              className="absolute inset-0"
              style={{
                opacity: resolvedBackgroundLook.glassOverlayOpacity ?? 0,
                mixBlendMode: 'screen',
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0.00) 45%, rgba(255,255,255,0.10) 62%, rgba(255,255,255,0.00) 100%)',
              }}
            />
          ) : null}
        </div>
      ) : null}

      {hasBackgroundImage || hasBackgroundVideo ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(2, 6, 23, ${((resolvedSettings.backgroundDim ?? 0.38) * 0.85).toFixed(3)}) 0%, rgba(2, 6, 23, ${(resolvedSettings.backgroundDim ?? 0.38).toFixed(3)}) 100%)`,
            animation: 'av-text-preview-dim 320ms ease-out both',
          }}
        />
      ) : null}

      <div
        key={motionResetKey == null ? undefined : String(motionResetKey)}
        className={contentClassName ? `absolute inset-0 flex p-[7%] ${contentClassName}` : 'absolute inset-0 flex p-[7%]'}
        style={{
          justifyContent: resolveJustifyContent(resolvedSettings.horizontalAlign ?? 'center'),
          alignItems: resolveAlignItems(resolvedSettings.verticalAlign ?? 'middle'),
          transform: `translate(${(resolvedSettings.offsetX ?? 0).toFixed(1)}%, ${(resolvedSettings.offsetY ?? 0).toFixed(1)}%)`,
        }}
      >
        <div
          style={blockWrapperStyle}
        >
          {animatePerWord
            ? (
              <div style={textStyle}>
                {words.map((word, index) => {
                  const animatedWordStyle = enableMotion
                    ? getAnimatedTextStyle(
                        resolvedEffect,
                        Math.max(0, delayedAnimationElapsedMs - index * wordDelayMs),
                        animationDurationMs,
                        resolvedSettings.animationIntensity ?? 0.82,
                      )
                    : null;
                  const isAccentWord = index === 0;
                  return (
                    <span key={`${word}-${index}`}>
                      <span
                        style={{
                          display: 'inline-block',
                          color: isAccentWord ? resolvedSettings.accentColor : resolvedSettings.textColor,
                          ...(textPaintStyle ?? null),
                          ...(animatedWordStyle ?? null),
                          willChange: enableMotion ? 'transform, opacity, clip-path, filter' : undefined,
                        }}
                      >
                        {word}
                      </span>
                      {index < words.length - 1 ? ' ' : null}
                    </span>
                  );
                })}
              </div>
            )
            : resolvedEffect === 'typewriter'
              ? (
                <>
                  <div style={{ ...textStyle, opacity: 0 }}>
                    {renderAccentText(
                      resolvedText,
                      accentBoundary,
                      resolvedSettings.accentColor,
                      resolvedSettings.textColor,
                      textPaintStyle,
                    )}
                  </div>
                  <div
                    style={{
                      ...textStyle,
                      position: 'absolute',
                      inset: 0,
                    }}
                  >
                    {renderAccentText(
                      typewriterVisibleText,
                      accentBoundary,
                      resolvedSettings.accentColor,
                      resolvedSettings.textColor,
                      textPaintStyle,
                    )}
                  </div>
                </>
              )
              : (
              <>
                <div style={textStyle}>
                  {renderAccentText(
                    resolvedText,
                    accentBoundary,
                    resolvedSettings.accentColor,
                    resolvedSettings.textColor,
                    textPaintStyle,
                  )}
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  );
}