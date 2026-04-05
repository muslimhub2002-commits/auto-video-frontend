'use client';

import type { CSSProperties } from 'react';

import type { SentenceItem } from '../../_types/sentences';
import {
  getDefaultImageMotionSettings,
  getDefaultImageMotionSpeed,
} from './ImageEffectPreview';

export const TEXT_ANIMATION_EFFECT_VALUES = [
  'popInBounceHook',
  'slideCutFast',
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
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';
export type TextCaseMode = 'original' | 'uppercase';

const TEXT_HORIZONTAL_ALIGN_VALUES = ['left', 'center', 'right'] as const;
const TEXT_VERTICAL_ALIGN_VALUES = ['top', 'middle', 'bottom'] as const;
const TEXT_CASE_MODE_VALUES = ['original', 'uppercase'] as const;

export const TEXT_ANIMATION_SPEED_MIN = 0.4;
export const TEXT_ANIMATION_SPEED_MAX = 2.4;
export const TEXT_ANIMATION_SPEED_STEP = 0.1;
export const DEFAULT_TEXT_ANIMATION_SPEED = 1.1;
export const MAX_TEXT_ANIMATION_WORDS = 5;
export const TEXT_SCENE_FONT_MIN_PX = 19.2;
export const TEXT_SCENE_FONT_MAX_PX = 92.8;
export const TEXT_SCENE_DEFAULT_FONT_FAMILY = 'Oswald, system-ui, sans-serif';
export const TEXT_SCENE_ARABIC_FONT_FAMILY = 'Noto Kufi Arabic, sans-serif';
const BACKGROUND_PREVIEW_MOTION_DURATION_MS = 6200;

export type TextAnimationSettings = {
  presetKey?: TextAnimationEffect | 'custom';
  speed?: number;
  horizontalAlign?: TextHorizontalAlign;
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
  textCase?: TextCaseMode;
};

export type TextAnimationPresetDto = {
  id: string;
  title: string;
  settings?: Record<string, unknown> | null;
};

type TextAnimationPreviewProps = {
  sentenceText?: string | null;
  text?: string | null;
  effect?: SentenceItem['textAnimationEffect'] | null;
  settings?: Record<string, unknown> | TextAnimationSettings | null;
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
  const normalized = effect ?? 'popInBounceHook';

  if (normalized === 'slideCutFast') return 'Slide + cut';
  if (normalized === 'scalePunchZoom') return 'Scale punch';
  if (normalized === 'maskReveal') return 'Mask reveal';
  if (normalized === 'glitchFlashHook') return 'Glitch / flash hook';
  if (normalized === 'kineticTypography') return 'Kinetic typography';
  return 'Pop-in / bounce';
}

export function isTextAnimationEffectValue(value: string): value is TextAnimationEffect {
  return (TEXT_ANIMATION_EFFECT_VALUES as readonly string[]).includes(value);
}

export function getDefaultTextAnimationSettings(
  effect: SentenceItem['textAnimationEffect'] | null | undefined,
  isShortVideo = true,
): TextAnimationSettings {
  const baseFontSize = isShortVideo ? 13.2 : 8.6;
  const base: TextAnimationSettings = {
    speed: DEFAULT_TEXT_ANIMATION_SPEED,
    horizontalAlign: 'center',
    verticalAlign: 'middle',
    offsetX: 0,
    offsetY: 0,
    fontSizePercent: baseFontSize,
    maxWidthPercent: isShortVideo ? 76 : 58,
    fontWeight: 820,
    letterSpacingEm: 0.02,
    lineHeight: 0.92,
    textColor: '#ffffff',
    accentColor: '#facc15',
    strokeColor: '#0f172a',
    strokeWidthPx: 0,
    shadowOpacity: 0.34,
    shadowBlurPx: 18,
    backgroundMode: 'inheritImage',
    backgroundColor: '#0f172a',
    gradientFrom: '#0f172a',
    gradientTo: '#1d4ed8',
    gradientAngleDeg: 135,
    backgroundDim: 0.38,
    animationIntensity: 0.82,
    textCase: 'uppercase',
  };

  if (effect === 'slideCutFast') {
    return {
      ...base,
      presetKey: effect,
      horizontalAlign: 'left',
      verticalAlign: 'top',
      offsetX: -5,
      offsetY: -14,
      maxWidthPercent: isShortVideo ? 72 : 46,
      accentColor: '#22d3ee',
      backgroundDim: 0.44,
      animationIntensity: 0.92,
    };
  }
  if (effect === 'scalePunchZoom') {
    return {
      ...base,
      presetKey: effect,
      fontSizePercent: baseFontSize + 1.4,
      maxWidthPercent: isShortVideo ? 82 : 62,
      accentColor: '#fb7185',
      shadowOpacity: 0.44,
      shadowBlurPx: 22,
      animationIntensity: 1,
    };
  }
  if (effect === 'maskReveal') {
    return {
      ...base,
      presetKey: effect,
      verticalAlign: 'bottom',
      offsetY: 12,
      maxWidthPercent: isShortVideo ? 84 : 64,
      accentColor: '#f97316',
      backgroundDim: 0.48,
      animationIntensity: 0.76,
    };
  }
  if (effect === 'glitchFlashHook') {
    return {
      ...base,
      presetKey: effect,
      verticalAlign: 'top',
      offsetY: -9,
      fontSizePercent: baseFontSize + 1,
      accentColor: '#38bdf8',
      strokeColor: '#020617',
      strokeWidthPx: 1,
      backgroundDim: 0.58,
      animationIntensity: 1,
    };
  }
  if (effect === 'kineticTypography') {
    return {
      ...base,
      presetKey: effect,
      horizontalAlign: 'left',
      verticalAlign: 'middle',
      offsetX: -8,
      maxWidthPercent: isShortVideo ? 74 : 48,
      fontSizePercent: baseFontSize - 0.3,
      accentColor: '#a78bfa',
      letterSpacingEm: 0.05,
      lineHeight: 0.88,
      animationIntensity: 0.95,
    };
  }

  return {
    ...base,
    presetKey: effect ?? 'popInBounceHook',
  };
}

export function normalizeTextAnimationSettings(
  settings: Record<string, unknown> | TextAnimationSettings | null | undefined,
  fallbackEffect?: SentenceItem['textAnimationEffect'] | null,
  isShortVideo = true,
): TextAnimationSettings {
  const defaults = getDefaultTextAnimationSettings(fallbackEffect ?? 'popInBounceHook', isShortVideo);

  return {
    presetKey:
      typeof settings?.presetKey === 'string'
        ? (settings.presetKey as TextAnimationSettings['presetKey'])
        : defaults.presetKey,
    speed: getNumeric(settings?.speed, defaults.speed ?? DEFAULT_TEXT_ANIMATION_SPEED, TEXT_ANIMATION_SPEED_MIN, TEXT_ANIMATION_SPEED_MAX),
    horizontalAlign: getEnumValue(settings?.horizontalAlign, TEXT_HORIZONTAL_ALIGN_VALUES, defaults.horizontalAlign ?? 'center'),
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
    textCase: getEnumValue(settings?.textCase, TEXT_CASE_MODE_VALUES, defaults.textCase ?? 'uppercase'),
  };
}

export function resolveTextAnimationEffectFromSettings(
  settings: Record<string, unknown> | TextAnimationSettings | null | undefined,
  fallbackEffect?: SentenceItem['textAnimationEffect'] | null,
) {
  const presetKey = settings?.presetKey;
  if (isTextAnimationEffectValue(String(presetKey ?? ''))) {
    return presetKey as TextAnimationEffect;
  }
  return fallbackEffect ?? 'popInBounceHook';
}

function getPreviewAnimationName(effect: SentenceItem['textAnimationEffect'] | null | undefined) {
  const normalized = effect ?? 'popInBounceHook';
  if (normalized === 'slideCutFast') return 'av-text-slide-cut';
  if (normalized === 'scalePunchZoom') return 'av-text-scale-punch';
  if (normalized === 'maskReveal') return 'av-text-mask-reveal';
  if (normalized === 'glitchFlashHook') return 'av-text-glitch-flash';
  if (normalized === 'kineticTypography') return 'av-text-kinetic';
  return 'av-text-pop-bounce';
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

export function TextAnimationPreview({
  sentenceText,
  text,
  effect,
  settings,
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
    effect ?? 'popInBounceHook',
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
  const animationName = getPreviewAnimationName(resolvedEffect);
  const strokeWidthPx = resolvedSettings.strokeWidthPx ?? 0;
  const words = resolvedText.split(/\s+/u).filter(Boolean);
  const textStyle: CSSProperties = {
    color: resolvedSettings.textColor,
    fontWeight: resolvedSettings.fontWeight,
    fontSize: `clamp(1.2rem, ${(resolvedSettings.fontSizePercent ?? 12).toFixed(2)}cqw, 5.8rem)`,
    lineHeight: String(resolvedSettings.lineHeight ?? 0.92),
    letterSpacing: `${(resolvedSettings.letterSpacingEm ?? 0.02).toFixed(3)}em`,
    textAlign: resolvedSettings.horizontalAlign,
    maxWidth: `${(resolvedSettings.maxWidthPercent ?? 76).toFixed(1)}%`,
    fontFamily: resolvedFontFamily,
    textShadow: `0 ${(6 + (resolvedSettings.animationIntensity ?? 0.82) * 6).toFixed(1)}px ${(resolvedSettings.shadowBlurPx ?? 18).toFixed(1)}px rgba(2, 6, 23, ${(resolvedSettings.shadowOpacity ?? 0.34).toFixed(3)})`,
    WebkitTextStroke: strokeWidthPx > 0 ? `${strokeWidthPx.toFixed(2)}px ${resolvedSettings.strokeColor}` : undefined,
    filter: resolvedEffect === 'glitchFlashHook'
      ? `drop-shadow(-2px 0 0 rgba(244, 63, 94, 0.55)) drop-shadow(2px 0 0 rgba(56, 189, 248, 0.55))`
      : resolvedEffect === 'scalePunchZoom'
        ? `drop-shadow(0 0 ${(10 + (resolvedSettings.animationIntensity ?? 0.82) * 20).toFixed(0)}px ${resolvedSettings.accentColor}66)`
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
          @keyframes av-text-pop-bounce {
            0% { opacity: 0; transform: translate3d(0, 22%, 0) scale(0.68); }
            38% { opacity: 1; transform: translate3d(0, -5%, 0) scale(1.08); }
            68% { transform: translate3d(0, 1.5%, 0) scale(0.98); }
            100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          }
          @keyframes av-text-slide-cut {
            0% { opacity: 0; clip-path: inset(0 100% 0 0); transform: translate3d(-18%, 0, 0); }
            40% { opacity: 1; clip-path: inset(0 16% 0 0); transform: translate3d(0, 0, 0); }
            100% { opacity: 1; clip-path: inset(0 0 0 0); transform: translate3d(0, 0, 0); }
          }
          @keyframes av-text-scale-punch {
            0% { opacity: 0; transform: scale(0.55) rotate(-4deg); }
            30% { opacity: 1; transform: scale(1.18) rotate(2deg); }
            58% { transform: scale(0.95) rotate(-1deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
          }
          @keyframes av-text-mask-reveal {
            0% { opacity: 0; clip-path: inset(0 0 100% 0); transform: translate3d(0, 16%, 0); }
            50% { opacity: 1; clip-path: inset(0 0 18% 0); }
            100% { opacity: 1; clip-path: inset(0 0 0 0); transform: translate3d(0, 0, 0); }
          }
          @keyframes av-text-glitch-flash {
            0% { opacity: 0; transform: translate3d(0, 0, 0); }
            10% { opacity: 1; transform: translate3d(-2%, 0, 0); }
            22% { transform: translate3d(2%, 0, 0); }
            30% { transform: translate3d(-1%, 0, 0); }
            42% { opacity: 1; filter: brightness(1.4); }
            100% { opacity: 1; transform: translate3d(0, 0, 0); filter: brightness(1); }
          }
          @keyframes av-text-kinetic {
            0% { opacity: 0; letter-spacing: 0.22em; transform: translate3d(-6%, 0, 0) skewX(-10deg); }
            45% { opacity: 1; letter-spacing: 0.06em; transform: translate3d(1%, 0, 0) skewX(0deg); }
            100% { opacity: 1; letter-spacing: inherit; transform: translate3d(0, 0, 0); }
          }
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

      {hasBackgroundVideo ? (
        <video
          src={resolvedBackgroundVideoUrl}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : null}

      {hasBackgroundImage ? (
        <img
          src={resolvedBackgroundImageUrl}
          alt="Text scene background"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            transformOrigin: `${(defaultBackgroundMotion.originX ?? 50).toFixed(1)}% ${(defaultBackgroundMotion.originY ?? 50).toFixed(1)}%`,
            animation: enableMotion
              ? `av-text-preview-default-scale ${backgroundMotionDurationMs}ms ease-in-out infinite`
              : undefined,
            willChange: enableMotion ? 'transform' : undefined,
          }}
        />
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
            animationName: enableMotion ? animationName : undefined,
            animationDuration: enableMotion ? `${animationDurationMs}ms` : undefined,
            animationTimingFunction: enableMotion
              ? 'cubic-bezier(0.22, 1, 0.36, 1)'
              : undefined,
            animationFillMode: enableMotion ? 'both' : undefined,
            animationIterationCount: enableMotion
              ? repeatMotion
                ? 'infinite'
                : 1
              : undefined,
          }}
        >
          <span style={{ color: resolvedSettings.accentColor }}>
            {words.slice(0, 1).join(' ')}
          </span>
          {words.length > 1 ? ` ${words.slice(1).join(' ')}` : ''}
        </div>
      </div>
    </div>
  );
}