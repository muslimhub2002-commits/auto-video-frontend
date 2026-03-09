'use client';

import type { CSSProperties, ReactNode } from 'react';

import type { SentenceItem } from '../../_types/sentences';

const PREVIEW_MOTION_DURATION_MS = 6200;
export const IMAGE_MOTION_SPEED_MIN = 0.5;
export const IMAGE_MOTION_SPEED_MAX = 2.5;
export const IMAGE_MOTION_SPEED_STEP = 0.1;
export const DEFAULT_IMAGE_MOTION_SPEED = 1;

export type ImageFilterSettings = {
  presetKey?: Exclude<SentenceItem['visualEffect'], null | undefined> | 'custom';
  saturation?: number;
  contrast?: number;
  brightness?: number;
  blurPx?: number;
  sepia?: number;
  grayscale?: number;
  hueRotateDeg?: number;
  animatedLightingIntensity?: number;
  glassOverlayOpacity?: number;
};

export type ImageMotionSettings = {
  presetKey?: Exclude<SentenceItem['imageMotionEffect'], null | undefined> | 'custom';
  speed?: number;
  startScale?: number;
  endScale?: number;
  translateXStart?: number;
  translateXEnd?: number;
  translateYStart?: number;
  translateYEnd?: number;
  rotateStart?: number;
  rotateEnd?: number;
  originX?: number;
  originY?: number;
};

export type ImageFilterPresetDto = {
  id: string;
  title: string;
  settings?: Record<string, unknown> | null;
};

export type MotionEffectPresetDto = {
  id: string;
  title: string;
  settings?: Record<string, unknown> | null;
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

export function normalizeImageMotionSpeed(value: number | null | undefined) {
  const numeric = Number(value ?? DEFAULT_IMAGE_MOTION_SPEED);
  if (!Number.isFinite(numeric)) return DEFAULT_IMAGE_MOTION_SPEED;
  return Math.min(IMAGE_MOTION_SPEED_MAX, Math.max(IMAGE_MOTION_SPEED_MIN, numeric));
}

export const IMAGE_MOTION_EFFECT_SELECT_VALUES = [
  'default',
  'slowZoomIn',
  'slowZoomOut',
  'diagonalDrift',
  'cinematicPan',
  'focusShift',
  'parallaxMotion',
  'shakeMicroMotion',
  'splitMotion',
  'rotationDrift',
] as const;

type ImageMotionEffectSelectValue = (typeof IMAGE_MOTION_EFFECT_SELECT_VALUES)[number];

export function isImageMotionEffectSelectValue(
  value: string,
): value is ImageMotionEffectSelectValue {
  return (IMAGE_MOTION_EFFECT_SELECT_VALUES as readonly string[]).includes(value);
}

export function getImageMotionEffectLabel(
  effect: SentenceItem['imageMotionEffect'] | null | undefined,
) {
  const normalized = effect ?? 'default';

  if (normalized === 'slowZoomIn') return 'Slow zoom in';
  if (normalized === 'slowZoomOut') return 'Slow zoom out';
  if (normalized === 'diagonalDrift') return 'Diagonal drift';
  if (normalized === 'cinematicPan') return 'Cinematic pan';
  if (normalized === 'focusShift') return 'Focus shift';
  if (normalized === 'parallaxMotion') return 'Parallax motion';
  if (normalized === 'shakeMicroMotion') return 'Shake micro motion';
  if (normalized === 'splitMotion') return 'Split motion';
  if (normalized === 'rotationDrift') return 'Rotation drift';
  return 'Default scale';
}

function getMotionAnimationName(effect: SentenceItem['imageMotionEffect'] | null | undefined) {
  const normalized = effect ?? 'default';

  if (normalized === 'slowZoomIn') return 'av-motion-slow-zoom-in';
  if (normalized === 'slowZoomOut') return 'av-motion-slow-zoom-out';
  if (normalized === 'diagonalDrift') return 'av-motion-diagonal-drift';
  if (normalized === 'cinematicPan') return 'av-motion-cinematic-pan';
  if (normalized === 'focusShift') return 'av-motion-focus-shift';
  if (normalized === 'parallaxMotion') return 'av-motion-parallax';
  if (normalized === 'shakeMicroMotion') return 'av-motion-shake-micro';
  if (normalized === 'splitMotion') return 'av-motion-split';
  if (normalized === 'rotationDrift') return 'av-motion-rotation-drift';
  return 'av-motion-default';
}

function getMotionTransformOrigin(effect: SentenceItem['imageMotionEffect'] | null | undefined) {
  const normalized = effect ?? 'default';

  if (normalized === 'focusShift') return '38% 34%';
  if (normalized === 'cinematicPan') return 'center center';
  if (normalized === 'parallaxMotion') return '50% 42%';
  if (normalized === 'rotationDrift') return '52% 46%';
  return 'center center';
}

export function getVisualEffectLabel(effect: SentenceItem['visualEffect'] | null | undefined) {
  const normalized = effect ?? null;

  if (normalized === 'colorGrading') return 'Color grading';
  if (normalized === 'animatedLighting') return 'Animated lighting';
  if (normalized === 'glassSubtle') return 'Glass (subtle)';
  if (normalized === 'glassReflections') return 'Glass (reflections)';
  if (normalized === 'glassStrong') return 'Glass (strong)';
  return 'None';
}

export function getDefaultImageFilterSettings(
  effect: SentenceItem['visualEffect'] | null | undefined,
): ImageFilterSettings {
  if (effect === 'colorGrading') {
    return {
      presetKey: effect,
      saturation: 1.16,
      contrast: 1.12,
      brightness: 0.98,
      blurPx: 0,
      sepia: 0,
      grayscale: 0,
      hueRotateDeg: 0,
      animatedLightingIntensity: 0,
      glassOverlayOpacity: 0,
    };
  }
  if (effect === 'animatedLighting') {
    return {
      presetKey: effect,
      saturation: 1,
      contrast: 1,
      brightness: 1,
      blurPx: 0,
      sepia: 0,
      grayscale: 0,
      hueRotateDeg: 0,
      animatedLightingIntensity: 0.34,
      glassOverlayOpacity: 0,
    };
  }
  if (effect === 'glassSubtle') {
    return {
      presetKey: effect,
      saturation: 1.08,
      contrast: 1.06,
      brightness: 1.02,
      blurPx: 0,
      sepia: 0,
      grayscale: 0,
      hueRotateDeg: 0,
      animatedLightingIntensity: 0,
      glassOverlayOpacity: 0,
    };
  }
  if (effect === 'glassReflections') {
    return {
      presetKey: effect,
      saturation: 1.1,
      contrast: 1.07,
      brightness: 1.02,
      blurPx: 0,
      sepia: 0,
      grayscale: 0,
      hueRotateDeg: 0,
      animatedLightingIntensity: 0,
      glassOverlayOpacity: 0.16,
    };
  }
  if (effect === 'glassStrong') {
    return {
      presetKey: effect,
      saturation: 1.12,
      contrast: 1.1,
      brightness: 1.03,
      blurPx: 0,
      sepia: 0,
      grayscale: 0,
      hueRotateDeg: 0,
      animatedLightingIntensity: 0,
      glassOverlayOpacity: 0.22,
    };
  }
  return {
    presetKey: effect ?? 'none',
    saturation: 1,
    contrast: 1,
    brightness: 1,
    blurPx: 0,
    sepia: 0,
    grayscale: 0,
    hueRotateDeg: 0,
    animatedLightingIntensity: 0,
    glassOverlayOpacity: 0,
  };
}

export function normalizeImageFilterSettings(
  settings: Record<string, unknown> | ImageFilterSettings | null | undefined,
  fallbackEffect?: SentenceItem['visualEffect'] | null,
): ImageFilterSettings {
  const defaults = getDefaultImageFilterSettings(fallbackEffect ?? null);
  return {
    presetKey:
      typeof settings?.presetKey === 'string'
        ? (settings.presetKey as ImageFilterSettings['presetKey'])
        : defaults.presetKey,
    saturation: getNumeric(settings?.saturation, defaults.saturation ?? 1, 0, 2.5),
    contrast: getNumeric(settings?.contrast, defaults.contrast ?? 1, 0, 2.5),
    brightness: getNumeric(settings?.brightness, defaults.brightness ?? 1, 0, 2.5),
    blurPx: getNumeric(settings?.blurPx, defaults.blurPx ?? 0, 0, 20),
    sepia: getNumeric(settings?.sepia, defaults.sepia ?? 0, 0, 1),
    grayscale: getNumeric(settings?.grayscale, defaults.grayscale ?? 0, 0, 1),
    hueRotateDeg: getNumeric(settings?.hueRotateDeg, defaults.hueRotateDeg ?? 0, -180, 180),
    animatedLightingIntensity: getNumeric(
      settings?.animatedLightingIntensity,
      defaults.animatedLightingIntensity ?? 0,
      0,
      1,
    ),
    glassOverlayOpacity: getNumeric(
      settings?.glassOverlayOpacity,
      defaults.glassOverlayOpacity ?? 0,
      0,
      0.4,
    ),
  };
}

export function resolveVisualEffectFromSettings(
  settings: Record<string, unknown> | ImageFilterSettings | null | undefined,
  fallbackEffect?: SentenceItem['visualEffect'] | null,
) {
  const presetKey = settings?.presetKey;
  if (
    presetKey === 'colorGrading' ||
    presetKey === 'animatedLighting' ||
    presetKey === 'glassSubtle' ||
    presetKey === 'glassReflections' ||
    presetKey === 'glassStrong' ||
    presetKey === 'none'
  ) {
    return presetKey;
  }
  return fallbackEffect ?? 'none';
}

export function getDefaultImageMotionSettings(
  effect: SentenceItem['imageMotionEffect'] | null | undefined,
  speed?: number | null,
): ImageMotionSettings {
  const normalizedSpeed = normalizeImageMotionSpeed(speed);
  const base = {
    speed: normalizedSpeed,
    originX: 50,
    originY: 50,
  };

  if (effect === 'slowZoomIn') {
    return { presetKey: effect, ...base, startScale: 1.01, endScale: 1.085, translateXStart: 0, translateXEnd: 0, translateYStart: 0, translateYEnd: 0, rotateStart: 0, rotateEnd: 0 };
  }
  if (effect === 'slowZoomOut') {
    return { presetKey: effect, ...base, startScale: 1.095, endScale: 1.01, translateXStart: 0, translateXEnd: 0, translateYStart: 0, translateYEnd: 0, rotateStart: 0, rotateEnd: 0 };
  }
  if (effect === 'diagonalDrift') {
    return { presetKey: effect, ...base, startScale: 1.04, endScale: 1.09, translateXStart: -3.5, translateXEnd: 3.5, translateYStart: -2.5, translateYEnd: 2.5, rotateStart: 0, rotateEnd: 0 };
  }
  if (effect === 'cinematicPan') {
    return { presetKey: effect, ...base, startScale: 1.08, endScale: 1.08, translateXStart: -4.5, translateXEnd: 4.5, translateYStart: 0, translateYEnd: 0, rotateStart: 0, rotateEnd: 0 };
  }
  if (effect === 'focusShift') {
    return { presetKey: effect, ...base, originX: 38, originY: 34, startScale: 1.03, endScale: 1.1, translateXStart: 2, translateXEnd: 1, translateYStart: 1.5, translateYEnd: -2, rotateStart: 0, rotateEnd: 0 };
  }
  if (effect === 'parallaxMotion') {
    return { presetKey: effect, ...base, originX: 50, originY: 42, startScale: 1.09, endScale: 1.11, translateXStart: -2, translateXEnd: 2.5, translateYStart: -1, translateYEnd: 1.5, rotateStart: -0.8, rotateEnd: 1 };
  }
  if (effect === 'shakeMicroMotion') {
    return { presetKey: effect, ...base, startScale: 1.045, endScale: 1.058, translateXStart: -0.45, translateXEnd: 0.42, translateYStart: 0.2, translateYEnd: -0.24, rotateStart: -0.35, rotateEnd: 0.28 };
  }
  if (effect === 'splitMotion') {
    return { presetKey: effect, ...base, startScale: 1.09, endScale: 1.11, translateXStart: -2.8, translateXEnd: -1.4, translateYStart: -1.2, translateYEnd: 2.4, rotateStart: -0.55, rotateEnd: -0.25 };
  }
  if (effect === 'rotationDrift') {
    return { presetKey: effect, ...base, originX: 52, originY: 46, startScale: 1.055, endScale: 1.1, translateXStart: -1.2, translateXEnd: 0.8, translateYStart: 0.6, translateYEnd: 1.2, rotateStart: -1.2, rotateEnd: 1.35 };
  }
  return { presetKey: effect ?? 'default', ...base, startScale: 1, endScale: 1.055, translateXStart: 0, translateXEnd: 0, translateYStart: 0, translateYEnd: 0, rotateStart: 0, rotateEnd: 0 };
}

export function normalizeImageMotionSettings(
  settings: Record<string, unknown> | ImageMotionSettings | null | undefined,
  fallbackEffect?: SentenceItem['imageMotionEffect'] | null,
  fallbackSpeed?: number | null,
): ImageMotionSettings {
  const defaults = getDefaultImageMotionSettings(fallbackEffect ?? 'default', fallbackSpeed);
  return {
    presetKey:
      typeof settings?.presetKey === 'string'
        ? (settings.presetKey as ImageMotionSettings['presetKey'])
        : defaults.presetKey,
    speed: normalizeImageMotionSpeed(
      (settings?.speed as number | null | undefined) ?? defaults.speed,
    ),
    startScale: getNumeric(settings?.startScale, defaults.startScale ?? 1, 0.5, 2),
    endScale: getNumeric(settings?.endScale, defaults.endScale ?? 1.055, 0.5, 2),
    translateXStart: getNumeric(settings?.translateXStart, defaults.translateXStart ?? 0, -20, 20),
    translateXEnd: getNumeric(settings?.translateXEnd, defaults.translateXEnd ?? 0, -20, 20),
    translateYStart: getNumeric(settings?.translateYStart, defaults.translateYStart ?? 0, -20, 20),
    translateYEnd: getNumeric(settings?.translateYEnd, defaults.translateYEnd ?? 0, -20, 20),
    rotateStart: getNumeric(settings?.rotateStart, defaults.rotateStart ?? 0, -10, 10),
    rotateEnd: getNumeric(settings?.rotateEnd, defaults.rotateEnd ?? 0, -10, 10),
    originX: getNumeric(settings?.originX, defaults.originX ?? 50, 0, 100),
    originY: getNumeric(settings?.originY, defaults.originY ?? 50, 0, 100),
  };
}

export function resolveMotionEffectFromSettings(
  settings: Record<string, unknown> | ImageMotionSettings | null | undefined,
  fallbackEffect?: SentenceItem['imageMotionEffect'] | null,
) {
  const presetKey = settings?.presetKey;
  if (
    presetKey === 'default' ||
    presetKey === 'slowZoomIn' ||
    presetKey === 'slowZoomOut' ||
    presetKey === 'diagonalDrift' ||
    presetKey === 'cinematicPan' ||
    presetKey === 'focusShift' ||
    presetKey === 'parallaxMotion' ||
    presetKey === 'shakeMicroMotion' ||
    presetKey === 'splitMotion' ||
    presetKey === 'rotationDrift'
  ) {
    return presetKey;
  }
  return fallbackEffect ?? 'default';
}

type ImageEffectPreviewProps = {
  visualEffect: SentenceItem['visualEffect'] | null | undefined;
  imageMotionEffect: SentenceItem['imageMotionEffect'] | null | undefined;
  imageMotionSpeed?: number | null | undefined;
  imageFilterSettings?: Record<string, unknown> | ImageFilterSettings | null | undefined;
  imageMotionSettings?: Record<string, unknown> | ImageMotionSettings | null | undefined;
  children: ReactNode;
  enableMotion?: boolean;
  className?: string;
  motionClassName?: string;
  motionStyle?: CSSProperties;
};

export function ImageEffectPreview({
  visualEffect,
  imageMotionEffect,
  imageMotionSpeed,
  imageFilterSettings,
  imageMotionSettings,
  children,
  enableMotion = true,
  className,
  motionClassName,
  motionStyle,
}: ImageEffectPreviewProps) {
  const resolvedFilterSettings = normalizeImageFilterSettings(
    imageFilterSettings,
    visualEffect ?? null,
  );
  const normalizedVisualEffect = resolveVisualEffectFromSettings(
    resolvedFilterSettings,
    visualEffect ?? null,
  );

  const isGlassReflections = normalizedVisualEffect === 'glassReflections';
  const isGlassStrong = normalizedVisualEffect === 'glassStrong';

  const shouldShowGlassOverlay =
    isGlassReflections ||
    isGlassStrong ||
    (resolvedFilterSettings.glassOverlayOpacity ?? 0) > 0.001;

  const mediaFilter = [
    `contrast(${(resolvedFilterSettings.contrast ?? 1).toFixed(3)})`,
    `saturate(${(resolvedFilterSettings.saturation ?? 1).toFixed(3)})`,
    `brightness(${(resolvedFilterSettings.brightness ?? 1).toFixed(3)})`,
    (resolvedFilterSettings.blurPx ?? 0) > 0
      ? `blur(${(resolvedFilterSettings.blurPx ?? 0).toFixed(2)}px)`
      : null,
    (resolvedFilterSettings.sepia ?? 0) > 0
      ? `sepia(${(resolvedFilterSettings.sepia ?? 0).toFixed(3)})`
      : null,
    (resolvedFilterSettings.grayscale ?? 0) > 0
      ? `grayscale(${(resolvedFilterSettings.grayscale ?? 0).toFixed(3)})`
      : null,
    (resolvedFilterSettings.hueRotateDeg ?? 0) !== 0
      ? `hue-rotate(${(resolvedFilterSettings.hueRotateDeg ?? 0).toFixed(1)}deg)`
      : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  const resolvedMotionSettings = normalizeImageMotionSettings(
    imageMotionSettings,
    imageMotionEffect ?? 'default',
    imageMotionSpeed,
  );
  const normalizedMotionSpeed = normalizeImageMotionSpeed(
    resolvedMotionSettings.speed ?? imageMotionSpeed,
  );
  const motionDurationMs = Math.max(1800, PREVIEW_MOTION_DURATION_MS / normalizedMotionSpeed);
  const hasCustomMotionSettings = Boolean(imageMotionSettings);
  const motionAnimation = enableMotion
    ? hasCustomMotionSettings
      ? `av-motion-detailed ${motionDurationMs}ms ease-in-out infinite alternate`
      : `${getMotionAnimationName(imageMotionEffect)} ${motionDurationMs}ms ease-in-out infinite alternate`
    : undefined;
  const transformOrigin = hasCustomMotionSettings
    ? `${(resolvedMotionSettings.originX ?? 50).toFixed(1)}% ${(resolvedMotionSettings.originY ?? 50).toFixed(1)}%`
    : getMotionTransformOrigin(imageMotionEffect);
  const detailedMotionStyle = hasCustomMotionSettings
    ? ({
        '--av-motion-start-x': `${(resolvedMotionSettings.translateXStart ?? 0).toFixed(2)}%`,
        '--av-motion-end-x': `${(resolvedMotionSettings.translateXEnd ?? 0).toFixed(2)}%`,
        '--av-motion-start-y': `${(resolvedMotionSettings.translateYStart ?? 0).toFixed(2)}%`,
        '--av-motion-end-y': `${(resolvedMotionSettings.translateYEnd ?? 0).toFixed(2)}%`,
        '--av-motion-start-rotate': `${(resolvedMotionSettings.rotateStart ?? 0).toFixed(2)}deg`,
        '--av-motion-end-rotate': `${(resolvedMotionSettings.rotateEnd ?? 0).toFixed(2)}deg`,
        '--av-motion-start-scale': (resolvedMotionSettings.startScale ?? 1).toFixed(6),
        '--av-motion-end-scale': (resolvedMotionSettings.endScale ?? 1.055).toFixed(6),
      } as CSSProperties)
    : undefined;

  return (
    <div className={className ? `relative ${className}` : 'relative'}>
      <style>{`
        @keyframes av-motion-default {
          0% { transform: scale(1); }
          100% { transform: scale(1.055); }
        }

        @keyframes av-motion-slow-zoom-in {
          0% { transform: scale(1.01); }
          100% { transform: scale(1.085); }
        }

        @keyframes av-motion-slow-zoom-out {
          0% { transform: scale(1.095); }
          100% { transform: scale(1.01); }
        }

        @keyframes av-motion-diagonal-drift {
          0% { transform: translate(-3.5%, -2.5%) scale(1.04); }
          100% { transform: translate(3.5%, 2.5%) scale(1.09); }
        }

        @keyframes av-motion-cinematic-pan {
          0% { transform: translateX(-4.5%) scale(1.08); }
          100% { transform: translateX(4.5%) scale(1.08); }
        }

        @keyframes av-motion-focus-shift {
          0% { transform: translate(2%, 1.5%) scale(1.03); }
          50% { transform: translate(-2.5%, -1%) scale(1.075); }
          100% { transform: translate(1%, -2%) scale(1.1); }
        }

        @keyframes av-motion-parallax {
          0% { transform: translate3d(-2%, -1%, 0) scale(1.09) rotate(-0.8deg); }
          50% { transform: translate3d(1%, -2.5%, 0) scale(1.14) rotate(0.3deg); }
          100% { transform: translate3d(2.5%, 1.5%, 0) scale(1.11) rotate(1deg); }
        }

        @keyframes av-motion-shake-micro {
          0% { transform: translate3d(-0.45%, 0.2%, 0) scale(1.045) rotate(-0.35deg); }
          18% { transform: translate3d(0.4%, -0.3%, 0) scale(1.055) rotate(0.25deg); }
          36% { transform: translate3d(-0.25%, 0.35%, 0) scale(1.05) rotate(-0.2deg); }
          54% { transform: translate3d(0.3%, -0.2%, 0) scale(1.06) rotate(0.2deg); }
          72% { transform: translate3d(-0.35%, 0.15%, 0) scale(1.052) rotate(-0.18deg); }
          100% { transform: translate3d(0.42%, -0.24%, 0) scale(1.058) rotate(0.28deg); }
        }

        @keyframes av-motion-split {
          0% { transform: translate3d(-2.8%, -1.2%, 0) scale(1.09) rotate(-0.55deg); }
          50% { transform: translate3d(2.2%, 1.1%, 0) scale(1.125) rotate(0.45deg); }
          100% { transform: translate3d(-1.4%, 2.4%, 0) scale(1.11) rotate(-0.25deg); }
        }

        @keyframes av-motion-rotation-drift {
          0% { transform: translate3d(-1.2%, 0.6%, 0) scale(1.055) rotate(-1.2deg); }
          50% { transform: translate3d(1.4%, -1.5%, 0) scale(1.09) rotate(0.15deg); }
          100% { transform: translate3d(0.8%, 1.2%, 0) scale(1.1) rotate(1.35deg); }
        }

        @keyframes av-motion-detailed {
          0% {
            transform: translate3d(var(--av-motion-start-x), var(--av-motion-start-y), 0)
              scale(var(--av-motion-start-scale))
              rotate(var(--av-motion-start-rotate));
          }
          100% {
            transform: translate3d(var(--av-motion-end-x), var(--av-motion-end-y), 0)
              scale(var(--av-motion-end-scale))
              rotate(var(--av-motion-end-rotate));
          }
        }
      `}</style>

      <div
        className={motionClassName}
        style={{
          animation: motionAnimation,
          transformOrigin: transformOrigin,
          willChange: enableMotion ? 'transform' : undefined,
          ...detailedMotionStyle,
          ...motionStyle,
        }}
      >
        <div style={{ filter: mediaFilter }}>{children}</div>
      </div>

      {shouldShowGlassOverlay ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: resolvedFilterSettings.glassOverlayOpacity ?? 0,
            mixBlendMode: 'screen',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0.00) 45%, rgba(255,255,255,0.10) 62%, rgba(255,255,255,0.00) 100%)',
          }}
        />
      ) : null}
    </div>
  );
}