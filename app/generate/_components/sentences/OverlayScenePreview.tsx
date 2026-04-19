'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import type { SentenceItem } from '../../_types/sentences';

import {
  DEFAULT_OVERLAY_START_DELAY,
  normalizeImageFilterSettings,
  normalizeOverlaySettings,
  OVERLAY_START_DELAY_MAX,
  OVERLAY_START_DELAY_MIN,
  type OverlaySettings,
} from './ImageEffectPreview';
import {
  TextAnimationPreview,
  normalizeTextAnimationSettings,
  resolveTextAnimationEffectFromSettings,
  resolveTextAnimationText,
  type TextAnimationEffect,
  type TextAnimationSettings,
} from './TextAnimationPreview';

type OverlayScenePreviewProps = {
  isShortVideo?: boolean;
  className?: string;
  sceneImageUrl?: string | null;
  sceneVideoUrl?: string | null;
  visualEffect?: SentenceItem['visualEffect'] | null;
  imageFilterSettings?: Record<string, unknown> | null;
  overlayAssetUrl?: string | null;
  overlayMimeType?: string | null;
  overlaySettings?: Record<string, unknown> | OverlaySettings | null;
  sentenceText?: string | null;
  text?: string | null;
  textAnimationEffect?: TextAnimationEffect | null;
  textAnimationSettings?: Record<string, unknown> | TextAnimationSettings | null;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const OVERLAY_PREVIEW_FPS = 30;
const OVERLAY_MOTION_RAMP_MS = 350;

const getStablePreviewSeed = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
};

const buildImageLookFilter = (
  settings: ReturnType<typeof normalizeImageFilterSettings>,
) => {
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
};

const LEGACY_OVERLAY_WIDTH_PERCENT = 26;
const LEGACY_OVERLAY_HEIGHT_PERCENT = 22;
const LEGACY_OVERLAY_OFFSET_X = 0;
const LEGACY_OVERLAY_OFFSET_Y = -4;
const LEGACY_OVERLAY_SCALE = 1;
const LEGACY_OVERLAY_ROTATION_DEG = 0;

const isApproximately = (value: number | undefined, expected: number) => {
  return Math.abs((value ?? expected) - expected) < 0.001;
};

const usesImageTabSizedOverlay = (settings: OverlaySettings) => {
  return (
    isApproximately(settings.widthPercent, LEGACY_OVERLAY_WIDTH_PERCENT) &&
    isApproximately(settings.heightPercent, LEGACY_OVERLAY_HEIGHT_PERCENT)
  );
};

const usesLegacyOverlayTransformDefaults = (settings: OverlaySettings) => {
  return (
    isApproximately(settings.offsetX, LEGACY_OVERLAY_OFFSET_X) &&
    isApproximately(settings.offsetY, LEGACY_OVERLAY_OFFSET_Y) &&
    isApproximately(settings.scale, LEGACY_OVERLAY_SCALE) &&
    isApproximately(settings.rotationDeg, LEGACY_OVERLAY_ROTATION_DEG)
  );
};

const inferOverlayIsImage = (url: string | null, mimeType: string | null) => {
  const normalizedMimeType = String(mimeType ?? '').trim().toLowerCase();
  if (normalizedMimeType.startsWith('image/')) return true;
  if (normalizedMimeType.startsWith('video/')) return false;

  const normalizedUrl = String(url ?? '').trim().toLowerCase();
  return /\.(apng|avif|gif|jpe?g|png|svg|webp)(?:\?|#|$)/u.test(normalizedUrl);
};

export function OverlayScenePreview({
  isShortVideo = true,
  className,
  sceneImageUrl = null,
  sceneVideoUrl = null,
  visualEffect = null,
  imageFilterSettings = null,
  overlayAssetUrl = null,
  overlayMimeType = null,
  overlaySettings,
  sentenceText,
  text,
  textAnimationEffect,
  textAnimationSettings,
}: OverlayScenePreviewProps) {
  const resolvedOverlay = normalizeOverlaySettings(overlaySettings, 'image');
  const resolvedTextEffect = resolveTextAnimationEffectFromSettings(
    textAnimationSettings,
    textAnimationEffect ?? 'slideCutFast',
  );
  const resolvedText = normalizeTextAnimationSettings(
    textAnimationSettings,
    resolvedTextEffect,
    isShortVideo,
  );
  const resolvedTextValue = resolveTextAnimationText(text, sentenceText);
  const showText = resolvedOverlay.includeText === true && resolvedTextValue.length > 0;
  const shouldUseImageTabSizing = usesImageTabSizedOverlay(resolvedOverlay);
  const shouldUseLegacyCenteredTransform =
    shouldUseImageTabSizing && usesLegacyOverlayTransformDefaults(resolvedOverlay);
  const overlayTextAnimationSettings: TextAnimationSettings = {
    ...(textAnimationSettings &&
    typeof textAnimationSettings === 'object' &&
    !Array.isArray(textAnimationSettings)
      ? textAnimationSettings
      : {}),
    backgroundMode: 'solid',
    backgroundColor: 'transparent',
    backgroundDim: 0,
  };
  const overlayTextMotionResetKey = JSON.stringify({
    text: resolvedTextValue,
    effect: resolvedTextEffect,
    settings: resolvedText,
    textLayer: resolvedOverlay.textLayer ?? 'above',
  });
  const resolvedBackgroundLook = normalizeImageFilterSettings(
    imageFilterSettings,
    visualEffect ?? null,
  );
  const backgroundMediaFilter = buildImageLookFilter(resolvedBackgroundLook);
  const previewSeed = getStablePreviewSeed(
    `${String(sceneImageUrl ?? '')}|${String(sceneVideoUrl ?? '')}|${String(overlayAssetUrl ?? '')}|${resolvedTextValue}`,
  );
  const lightingX = ((previewSeed * 320) % 100 + 100) % 100;
  const lightingY = (35 + 25 * Math.sin(previewSeed * 8) + 100) % 100;
  const lightingAlpha =
    (0.22 + 0.1 * Math.sin(previewSeed * 12)) *
    (resolvedBackgroundLook.animatedLightingIntensity ?? 0);
  const glassOverlayOpacity = Math.max(
    0,
    Math.min(0.4, resolvedBackgroundLook.glassOverlayOpacity ?? 0),
  );
  const isImageOverlayAsset = inferOverlayIsImage(overlayAssetUrl, overlayMimeType);
  const overlayAnimationDurationSeconds = clamp(7 / (resolvedOverlay.speed ?? 1), 2.4, 14);
  const overlayStartDelayMs =
    clamp(
      Number(resolvedOverlay.startDelaySeconds ?? DEFAULT_OVERLAY_START_DELAY) || 0,
      OVERLAY_START_DELAY_MIN,
      OVERLAY_START_DELAY_MAX,
    ) * 1000;
  const overlayPreviewCycleMs = Math.max(
    overlayAnimationDurationSeconds * 1000 + overlayStartDelayMs,
    1,
  );
  const backgroundMode = resolvedOverlay.backgroundMode ?? 'image';
  const backgroundMissing =
    (backgroundMode === 'image' && !sceneImageUrl) ||
    (backgroundMode === 'video' && !sceneVideoUrl);
  const overlayMotionResetKey = JSON.stringify({
    overlayAssetUrl,
    overlayMimeType,
    overlaySettings: resolvedOverlay,
  });
  const [animationElapsedMs, setAnimationElapsedMs] = useState(0);

  useEffect(() => {
    let animationFrameId = 0;
    const startedAt = performance.now();

    const updateFrame = (now: number) => {
      const elapsed = now - startedAt;
      setAnimationElapsedMs(elapsed % overlayPreviewCycleMs);
      animationFrameId = window.requestAnimationFrame(updateFrame);
    };

    animationFrameId = window.requestAnimationFrame(updateFrame);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [overlayMotionResetKey, overlayPreviewCycleMs]);

  const overlayVisible = !overlayAssetUrl || animationElapsedMs >= overlayStartDelayMs;
  const delayedOverlayAnimationMs = Math.max(0, animationElapsedMs - overlayStartDelayMs);
  const cycleFrames = Math.max(
    1,
    Math.round(overlayAnimationDurationSeconds * OVERLAY_PREVIEW_FPS),
  );
  const animationFrame = (delayedOverlayAnimationMs / 1000) * OVERLAY_PREVIEW_FPS;
  const phase = ((animationFrame % cycleFrames) / cycleFrames) * Math.PI * 2;
  const motionRamp = shouldUseImageTabSizing
    ? 0
    : clamp(delayedOverlayAnimationMs / OVERLAY_MOTION_RAMP_MS, 0, 1);
  const floatYOffset = shouldUseImageTabSizing ? 0 : Math.sin(phase) * 0.8 * motionRamp;
  const floatRotation = shouldUseImageTabSizing
    ? 0
    : Math.sin(phase + Math.PI / 2) * 1.25 * motionRamp;
  const overlayFrameStyle: CSSProperties = {
    position: 'absolute',
    ...(shouldUseImageTabSizing
      ? {
          inset: 0,
          transform: shouldUseLegacyCenteredTransform
            ? undefined
            : `translate(${resolvedOverlay.offsetX ?? 0}%, ${resolvedOverlay.offsetY ?? 0}%) scale(${resolvedOverlay.scale ?? 1}) rotate(${resolvedOverlay.rotationDeg ?? 0}deg)`,
        }
      : {
          left: `calc(50% + ${resolvedOverlay.offsetX ?? 0}%)`,
          top: `calc(50% + ${resolvedOverlay.offsetY ?? 0}%)`,
          width: `${resolvedOverlay.widthPercent ?? 26}%`,
          height: `${resolvedOverlay.heightPercent ?? 22}%`,
          transform: `translate(-50%, -50%) translateY(${floatYOffset.toFixed(2)}%) scale(${resolvedOverlay.scale ?? 1}) rotate(${(
            (resolvedOverlay.rotationDeg ?? 0) + floatRotation
          ).toFixed(2)}deg)`,
        }),
    transformOrigin: 'center center',
    opacity: resolvedOverlay.opacity ?? 1,
    zIndex: 20,
  };
  const overlayAssetClassName = shouldUseImageTabSizing
    ? 'block h-full w-full object-cover'
    : 'block h-full w-full object-contain';

  return (
    <div
      className={`relative overflow-hidden rounded-[1.5rem] bg-slate-950 text-white ${className ?? ''}`}
    >
      <div className="absolute inset-0">
        {backgroundMode === 'image' || backgroundMode === 'video' ? (
          <div className="absolute inset-0" style={{ filter: backgroundMediaFilter }}>
            {backgroundMode === 'image' && sceneImageUrl ? (
              <img
                src={sceneImageUrl}
                alt="Overlay background"
                className="h-full w-full object-cover"
              />
            ) : null}
            {backgroundMode === 'video' && sceneVideoUrl ? (
              <video
                src={sceneVideoUrl}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
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

            {glassOverlayOpacity > 0.001 ? (
              <div
                className="absolute inset-0"
                style={{
                  opacity: glassOverlayOpacity,
                  mixBlendMode: 'screen',
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0.00) 45%, rgba(255,255,255,0.10) 62%, rgba(255,255,255,0.00) 100%)',
                }}
              />
            ) : null}
          </div>
        ) : null}
        {backgroundMode === 'solid' ? (
          <div
            className="h-full w-full"
            style={{ backgroundColor: resolvedOverlay.backgroundColor ?? '#020617' }}
          />
        ) : null}
        {backgroundMode === 'gradient' ? (
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `linear-gradient(${resolvedOverlay.gradientAngleDeg ?? 135}deg, ${resolvedOverlay.gradientFrom ?? '#020617'} 0%, ${resolvedOverlay.gradientTo ?? '#1d4ed8'} 100%)`,
            }}
          />
        ) : null}

        <div className="absolute inset-0 bg-black/15" />

        {backgroundMissing ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/78 px-6 text-center text-sm font-medium text-slate-200">
            {backgroundMode === 'image'
              ? 'This overlay scene is set to use the Image tab background, but no image is available yet.'
              : 'This overlay scene is set to use the Video tab background, but no video is available yet.'}
          </div>
        ) : null}
      </div>

      {showText && resolvedOverlay.textLayer === 'below' ? (
        <div className="pointer-events-none absolute inset-0 z-10">
          <TextAnimationPreview
            sentenceText={sentenceText}
            text={text}
            effect={resolvedTextEffect}
            settings={overlayTextAnimationSettings}
            isShortVideo={isShortVideo}
            className="h-full w-full bg-transparent"
            contentClassName="p-[7%]"
            enableMotion
            repeatMotion
            motionResetKey={overlayTextMotionResetKey}
          />
        </div>
      ) : null}

      <div style={overlayFrameStyle}>
        {overlayAssetUrl && overlayVisible ? (
          isImageOverlayAsset ? (
            <img
              src={overlayAssetUrl}
              alt="Overlay asset"
              className={overlayAssetClassName}
            />
          ) : (
            <video
              src={overlayAssetUrl}
              className={overlayAssetClassName}
              autoPlay
              muted
              loop
              playsInline
            />
          )
        ) : !overlayAssetUrl ? (
          <div className={`flex h-full w-full items-center justify-center border-2 border-dashed border-white/20 bg-slate-950/35 px-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-white/70 ${shouldUseImageTabSizing ? '' : 'rounded-[1.2rem]'}`}>
            Upload or choose an overlay asset
          </div>
        ) : null}
      </div>

      {showText && resolvedOverlay.textLayer === 'above' ? (
        <div className="pointer-events-none absolute inset-0 z-30">
          <TextAnimationPreview
            sentenceText={sentenceText}
            text={text}
            effect={resolvedTextEffect}
            settings={overlayTextAnimationSettings}
            isShortVideo={isShortVideo}
            className="h-full w-full bg-transparent"
            contentClassName="p-[7%]"
            enableMotion
            repeatMotion
            motionResetKey={overlayTextMotionResetKey}
          />
        </div>
      ) : null}
    </div>
  );
}