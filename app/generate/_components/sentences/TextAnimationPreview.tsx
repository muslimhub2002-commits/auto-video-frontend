'use client';

import { useEffect, useState, type CSSProperties } from 'react';

import type { SentenceItem } from '../../_types/sentences';
import type { SentenceSoundEffectItem } from '../../_types/sentences';
import {
  getDefaultImageMotionSettings,
  getDefaultImageMotionSpeed,
  normalizeImageFilterSettings,
  resolveVisualEffectFromSettings,
} from './ImageEffectPreview';

export const TEXT_ANIMATION_EFFECT_VALUES = [
  'slideCutFast',
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
export const TEXT_SCENE_FONT_MIN_PX = 19.2;
export const TEXT_SCENE_FONT_MAX_PX = 92.8;
export const TEXT_SCENE_DEFAULT_FONT_FAMILY = 'Oswald, system-ui, sans-serif';
export const TEXT_SCENE_ARABIC_FONT_FAMILY = 'Noto Kufi Arabic, sans-serif';
const BACKGROUND_PREVIEW_MOTION_DURATION_MS = 6200;
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
  animatePerWord?: boolean;
  wordDelaySeconds?: number;
  textCase?: TextCaseMode;
};

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
  const words = getWords(String(sentenceText ?? ''));
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
  const raw = String(value ?? '').trim();
  const words = getWords(raw);
  if (words.length > 0) {
    return raw;
  }
  return getDefaultTextAnimationText(sentenceText);
}

export function resolveTextAnimationText(value: string | null | undefined, sentenceText?: string | null) {
  const normalized = normalizeTextAnimationText(value, sentenceText);
  return normalized || getDefaultTextAnimationText(sentenceText);
}

export function getTextAnimationEffectLabel(effect: SentenceItem['textAnimationEffect'] | null | undefined) {
  return resolveLegacyTextAnimationEffect(effect) === 'slideCutFast'
    ? 'Slide + cut'
    : 'Slide + cut';
}

export function isTextAnimationEffectValue(value: string): value is TextAnimationEffect {
  return (TEXT_ANIMATION_EFFECT_VALUES as readonly string[]).includes(value);
}

export function getDefaultTextAnimationSettings(
  effect: SentenceItem['textAnimationEffect'] | null | undefined,
  isShortVideo = true,
): TextAnimationSettings {
  const normalizedEffect = resolveLegacyTextAnimationEffect(effect) ?? 'slideCutFast';
  const baseFontSize = isShortVideo ? 13.2 : 8.6;
  return {
    presetKey: normalizedEffect,
    speed: DEFAULT_TEXT_ANIMATION_SPEED,
    horizontalAlign: 'left',
    contentAlign: 'left',
    verticalAlign: 'top',
    offsetX: -5,
    offsetY: -14,
    fontSizePercent: baseFontSize,
    maxWidthPercent: isShortVideo ? 72 : 46,
    fontWeight: 820,
    letterSpacingEm: 0.02,
    lineHeight: 0.92,
    textColor: '#ffffff',
    accentColor: '#22d3ee',
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
    animatePerWord: false,
    wordDelaySeconds: DEFAULT_TEXT_ANIMATION_WORD_DELAY,
    textCase: 'uppercase',
  };
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
    strokeColor: getColor(settings?.strokeColor, defaults.strokeColor ?? '#0f172a'),
    strokeWidthPx: getNumeric(settings?.strokeWidthPx, defaults.strokeWidthPx ?? 0, 0, 8),
    shadowOpacity: getNumeric(settings?.shadowOpacity, defaults.shadowOpacity ?? 0.34, 0, 1),
    shadowBlurPx: getNumeric(settings?.shadowBlurPx, defaults.shadowBlurPx ?? 18, 0, 48),
    backgroundMode: getEnumValue(settings?.backgroundMode, TEXT_BACKGROUND_MODE_VALUES, defaults.backgroundMode ?? 'inheritImage'),
    backgroundColor: getColor(settings?.backgroundColor, defaults.backgroundColor ?? '#0f172a'),
    gradientFrom: getColor(settings?.gradientFrom, defaults.gradientFrom ?? '#0f172a'),
    gradientTo: getColor(settings?.gradientTo, defaults.gradientTo ?? '#1d4ed8'),
    gradientAngleDeg: getNumeric(settings?.gradientAngleDeg, defaults.gradientAngleDeg ?? 135, 0, 360),
    backgroundDim: getNumeric(settings?.backgroundDim, defaults.backgroundDim ?? 0.38, 0, 0.92),
    animationIntensity: getNumeric(settings?.animationIntensity, defaults.animationIntensity ?? 0.82, 0, 1.2),
    animatePerWord: settings?.animatePerWord === true,
    wordDelaySeconds: getNumeric(
      settings?.wordDelaySeconds,
      defaults.wordDelaySeconds ?? DEFAULT_TEXT_ANIMATION_WORD_DELAY,
      TEXT_ANIMATION_WORD_DELAY_MIN,
      TEXT_ANIMATION_WORD_DELAY_MAX,
    ),
    textCase: getEnumValue(settings?.textCase, TEXT_CASE_MODE_VALUES, defaults.textCase ?? 'uppercase'),
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

function getSlideCutAnimatedStyle(
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
  const leadDistance = 20 + animationIntensity * 8;
  const skewStart = -7 - animationIntensity * 4;
  const blurStart = 8 + animationIntensity * 8;
  const translateXPercent = interpolateNumber(easedProgress, [0, 1], [-leadDistance, 0]);
  const clipRight = interpolateNumber(easedProgress, [0, 1], [100, 0]);
  const skew = interpolateNumber(easedProgress, [0, 1], [skewStart, 0]);
  const blurPx = interpolateNumber(easedProgress, [0, 0.4, 1], [blurStart, 0.6, 0]);

  return {
    opacity: interpolateNumber(easedProgress, [0, 0.18, 1], [0, 1, 1]),
    transform: `translate3d(${translateXPercent.toFixed(2)}%, 0, 0) skewX(${skew.toFixed(2)}deg)`,
    clipPath: `inset(0 ${clipRight.toFixed(2)}% 0 0)`,
    filter: `blur(${blurPx.toFixed(2)}px)`,
  };
}

export function TextAnimationPreview({
  sentenceText,
  text,
  effect,
  settings,
  visualEffect,
  imageFilterSettings,
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
  const defaultBackgroundMotion = getDefaultImageMotionSettings(
    'default',
    getDefaultImageMotionSpeed(isShortVideo),
    isShortVideo,
  );
  const backgroundMotionDurationMs = Math.max(
    1800,
    BACKGROUND_PREVIEW_MOTION_DURATION_MS / getDefaultImageMotionSpeed(isShortVideo),
  );
  const strokeWidthPx = resolvedSettings.strokeWidthPx ?? 0;
  const words = resolvedText.split(/\s+/u).filter(Boolean);
  const animatePerWord = resolvedSettings.animatePerWord === true && words.length > 1;
  const wordDelayMs = getWordDelayMs(resolvedSettings);
  const totalAnimationWindowMs = animationDurationMs + (animatePerWord ? wordDelayMs * Math.max(0, words.length - 1) : 0);
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
  const previewSeed = getStablePreviewSeed(
    `${resolvedText}|${resolvedBackgroundImageUrl ?? ''}|${resolvedBackgroundVideoUrl ?? ''}|${String(motionResetKey ?? '')}`,
  );
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

  const blockAnimatedStyle = enableMotion
    ? getSlideCutAnimatedStyle(
        animationElapsedMs,
        animationDurationMs,
        resolvedSettings.animationIntensity ?? 0.82,
      )
    : null;
  const textStyle: CSSProperties = {
    color: resolvedSettings.textColor,
    fontWeight: resolvedSettings.fontWeight,
    fontSize: `clamp(1.2rem, ${(resolvedSettings.fontSizePercent ?? 12).toFixed(2)}cqw, 5.8rem)`,
    lineHeight: String(resolvedSettings.lineHeight ?? 0.92),
    letterSpacing: `${(resolvedSettings.letterSpacingEm ?? 0.02).toFixed(3)}em`,
    textAlign: contentAlign,
    maxWidth: `${(resolvedSettings.maxWidthPercent ?? 76).toFixed(1)}%`,
    fontFamily: resolvedFontFamily,
    textShadow: `0 ${(6 + (resolvedSettings.animationIntensity ?? 0.82) * 6).toFixed(1)}px ${(resolvedSettings.shadowBlurPx ?? 18).toFixed(1)}px rgba(2, 6, 23, ${(resolvedSettings.shadowOpacity ?? 0.34).toFixed(3)})`,
    WebkitTextStroke: strokeWidthPx > 0 ? `${strokeWidthPx.toFixed(2)}px ${resolvedSettings.strokeColor}` : undefined,
    whiteSpace: 'pre-wrap',
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
          @keyframes av-text-preview-default-scale {
            0% { transform: scale(${(defaultBackgroundMotion.startScale ?? 1).toFixed(6)}); }
            100% { transform: scale(${(defaultBackgroundMotion.endScale ?? 1.055).toFixed(6)}); }
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
              style={{
                transformOrigin: `${(defaultBackgroundMotion.originX ?? 50).toFixed(1)}% ${(defaultBackgroundMotion.originY ?? 50).toFixed(1)}%`,
                animation: enableMotion
                  ? `av-text-preview-default-scale ${backgroundMotionDurationMs}ms ease-in-out infinite`
                  : undefined,
                willChange: enableMotion ? 'transform' : undefined,
              }}
            />
          ) : null}

          {hasBackgroundImage ? (
            <img
              src={resolvedBackgroundImageUrl}
              alt="Text scene background"
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                transformOrigin: `${(defaultBackgroundMotion.originX ?? 50).toFixed(1)}% ${(defaultBackgroundMotion.originY ?? 50).toFixed(1)}%`,
                animation: enableMotion
                  ? `av-text-preview-default-scale ${backgroundMotionDurationMs}ms ease-in-out infinite`
                  : undefined,
                willChange: enableMotion ? 'transform' : undefined,
              }}
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
          style={{
            ...textStyle,
            ...(animatePerWord ? null : blockAnimatedStyle),
            willChange: enableMotion && !animatePerWord
              ? 'transform, opacity, clip-path, filter'
              : undefined,
          }}
        >
          {animatePerWord
            ? words.map((word, index) => {
                const animatedWordStyle = enableMotion
                  ? getSlideCutAnimatedStyle(
                      Math.max(0, animationElapsedMs - index * wordDelayMs),
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
                        ...(animatedWordStyle ?? null),
                        willChange: enableMotion ? 'transform, opacity, clip-path, filter' : undefined,
                      }}
                    >
                      {word}
                    </span>
                    {index < words.length - 1 ? ' ' : null}
                  </span>
                );
              })
            : (
              <>
                <span style={{ color: resolvedSettings.accentColor }}>
                  {words.slice(0, 1).join(' ')}
                </span>
                {words.length > 1 ? ` ${words.slice(1).join(' ')}` : ''}
              </>
            )}
        </div>
      </div>
    </div>
  );
}