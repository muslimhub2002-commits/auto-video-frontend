'use client';

import type { CSSProperties, ReactNode } from 'react';

import type { SentenceItem } from '../../_types/sentences';

const PREVIEW_MOTION_DURATION_MS = 6200;
export const IMAGE_MOTION_SPEED_MIN = 0.5;
export const IMAGE_MOTION_SPEED_MAX = 2.5;
export const IMAGE_MOTION_SPEED_STEP = 0.1;
export const DEFAULT_IMAGE_MOTION_SPEED = 1;

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

type ImageEffectPreviewProps = {
  visualEffect: SentenceItem['visualEffect'] | null | undefined;
  imageMotionEffect: SentenceItem['imageMotionEffect'] | null | undefined;
  imageMotionSpeed?: number | null | undefined;
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
  children,
  enableMotion = true,
  className,
  motionClassName,
  motionStyle,
}: ImageEffectPreviewProps) {
  const normalizedVisualEffect = visualEffect ?? null;

  const isColorGrading = normalizedVisualEffect === 'colorGrading';
  const isAnimatedLighting = normalizedVisualEffect === 'animatedLighting';
  const isGlassSubtle = normalizedVisualEffect === 'glassSubtle';
  const isGlassReflections = normalizedVisualEffect === 'glassReflections';
  const isGlassStrong = normalizedVisualEffect === 'glassStrong';

  const glassFilter = isGlassSubtle
    ? 'contrast(1.06) saturate(1.08) brightness(1.02)'
    : isGlassReflections
      ? 'contrast(1.07) saturate(1.10) brightness(1.02)'
      : isGlassStrong
        ? 'contrast(1.10) saturate(1.12) brightness(1.03)'
        : undefined;

  const shouldShowGlassOverlay = isGlassReflections || isGlassStrong;
  const glassOverlayOpacity = isGlassStrong ? 0.22 : 0.16;

  const mediaFilter = [
    isColorGrading ? 'contrast(1.12) saturate(1.16) brightness(0.98)' : null,
    glassFilter ?? null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  const normalizedMotionSpeed = normalizeImageMotionSpeed(imageMotionSpeed);
  const motionDurationMs = Math.max(1800, PREVIEW_MOTION_DURATION_MS / normalizedMotionSpeed);

  const motionAnimation = enableMotion
    ? `${getMotionAnimationName(imageMotionEffect)} ${motionDurationMs}ms ease-in-out infinite alternate`
    : undefined;

  return (
    <div className={className ? `relative ${className}` : 'relative'}>
      <style>{`
        @keyframes av-light-sweep {
          0% { transform: translate(-10%, -6%) scale(1.05); }
          50% { transform: translate(10%, 4%) scale(1.12); }
          100% { transform: translate(-6%, 8%) scale(1.08); }
        }

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
      `}</style>

      <div
        className={motionClassName}
        style={{
          animation: motionAnimation,
          transformOrigin: getMotionTransformOrigin(imageMotionEffect),
          willChange: enableMotion ? 'transform' : undefined,
          ...motionStyle,
        }}
      >
        <div style={{ filter: mediaFilter }}>{children}</div>
      </div>

      {isAnimatedLighting ? (
        <div
          className="pointer-events-none absolute -inset-[20%]"
          style={{
            animation: 'av-light-sweep 5200ms ease-in-out infinite',
            opacity: 0.34,
            mixBlendMode: 'screen',
            background:
              'radial-gradient(circle at 40% 35%, rgba(255, 80, 200, 0.55) 0%, rgba(80, 160, 255, 0.30) 38%, rgba(0,0,0,0) 70%)',
          }}
        />
      ) : null}

      {shouldShowGlassOverlay ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: glassOverlayOpacity,
            mixBlendMode: 'screen',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0.00) 45%, rgba(255,255,255,0.10) 62%, rgba(255,255,255,0.00) 100%)',
          }}
        />
      ) : null}
    </div>
  );
}