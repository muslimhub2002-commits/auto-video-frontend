'use client';

import type { CSSProperties } from 'react';

import type { SentenceItem } from '../_types/sentences';
import {
  normalizeImageMotionSettings,
  resolveImageMotionSpeed,
} from '../_components/sentences/ImageEffectPreview';

const MOTION_CYCLE_DURATION_SECONDS = 6.2;

const clampNumber = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const getPingPongProgress = (value: number) => {
  const wrapped = ((value % 2) + 2) % 2;
  return wrapped <= 1 ? wrapped : 2 - wrapped;
};

const easeInOutCubic = (value: number) => {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
};

const interpolateMotionValue = (params: {
  start: number;
  end: number;
  boundedProgress: number;
  extendedProgress: number;
  noLimit: boolean;
}) => {
  if (params.noLimit) {
    return params.start + (params.end - params.start) * Math.max(0, params.extendedProgress);
  }

  const easedProgress = easeInOutCubic(clampNumber(params.boundedProgress, 0, 1));
  return params.start + (params.end - params.start) * easedProgress;
};

export function buildPreviewImageMotionStyle(params: {
  imageMotionEffect: SentenceItem['imageMotionEffect'] | null | undefined;
  imageMotionSettings: Record<string, unknown> | null | undefined;
  imageMotionSpeed: number | null | undefined;
  isShortVideo: boolean;
  elapsedMs: number;
}): CSSProperties {
  const normalizedSpeed = resolveImageMotionSpeed(
    params.imageMotionSpeed,
    params.imageMotionSettings,
    params.isShortVideo,
  );
  const resolvedMotion = normalizeImageMotionSettings(
    params.imageMotionSettings,
    params.imageMotionEffect ?? 'default',
    normalizedSpeed,
    params.isShortVideo,
  );

  const elapsedSeconds = Math.max(0, params.elapsedMs) / 1000;
  const forwardMotionProgress =
    Math.max(0, elapsedSeconds / MOTION_CYCLE_DURATION_SECONDS) * (resolvedMotion.speed ?? 1);
  const boundedProgress = getPingPongProgress(forwardMotionProgress);
  const scale = interpolateMotionValue({
    start: resolvedMotion.startScale ?? 1,
    end: resolvedMotion.endScale ?? 1.055,
    boundedProgress,
    extendedProgress: forwardMotionProgress,
    noLimit: resolvedMotion.scaleEndNoLimit === true,
  });
  const translateX = interpolateMotionValue({
    start: resolvedMotion.translateXStart ?? 0,
    end: resolvedMotion.translateXEnd ?? 0,
    boundedProgress,
    extendedProgress: forwardMotionProgress,
    noLimit: resolvedMotion.translateXEndNoLimit === true,
  });
  const translateY = interpolateMotionValue({
    start: resolvedMotion.translateYStart ?? 0,
    end: resolvedMotion.translateYEnd ?? 0,
    boundedProgress,
    extendedProgress: forwardMotionProgress,
    noLimit: resolvedMotion.translateYEndNoLimit === true,
  });
  const rotate = interpolateMotionValue({
    start: resolvedMotion.rotateStart ?? 0,
    end: resolvedMotion.rotateEnd ?? 0,
    boundedProgress,
    extendedProgress: forwardMotionProgress,
    noLimit: resolvedMotion.rotateEndNoLimit === true,
  });

  return {
    transformOrigin: `${(resolvedMotion.originX ?? 50).toFixed(1)}% ${(resolvedMotion.originY ?? 50).toFixed(1)}%`,
    transform: `translate(${translateX.toFixed(2)}%, ${translateY.toFixed(2)}%) scale(${scale.toFixed(4)}) rotate(${rotate.toFixed(2)}deg)`,
    willChange: 'transform',
  };
}