'use client';

import {
  Film,
  ImageIcon,
  Layers3,
  Type,
} from 'lucide-react';
import {
  getDefaultImageMotionSpeed,
  ImageEffectPreview,
} from '../../generate/_components/sentences/ImageEffectPreview';
import { OverlayScenePreview } from '../../generate/_components/sentences/OverlayScenePreview';
import { TextAnimationPreview } from '../../generate/_components/sentences/TextAnimationPreview';
import type { ScriptSceneTab, ScriptSentenceDetail } from './script-types';

type SentenceScenePreviewProps = {
  sentence: ScriptSentenceDetail;
  isShortVideo: boolean;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asTrimmedString(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function getBestImageUrl(sentence: ScriptSentenceDetail) {
  return (
    asTrimmedString(sentence.image?.image) ||
    asTrimmedString(sentence.textBackgroundImage?.image) ||
    asTrimmedString(sentence.secondaryImage?.image) ||
    asTrimmedString(sentence.startFrameImage?.image) ||
    asTrimmedString(sentence.endFrameImage?.image)
  );
}

function getBestVideoUrl(sentence: ScriptSentenceDetail) {
  return (
    asTrimmedString(sentence.video?.video) ||
    asTrimmedString(sentence.textBackgroundVideo?.video)
  );
}

export function hasSentenceTextLayer(sentence: ScriptSentenceDetail) {
  return Boolean(
    asTrimmedString(sentence.text_animation_text) ||
      asTrimmedString(sentence.textAnimationText) ||
      asTrimmedString(sentence.text_animation_effect) ||
      asTrimmedString(sentence.textAnimationEffect) ||
      asObject(sentence.text_animation_settings) ||
      asObject(sentence.textAnimationSettings),
  );
}

export function hasSentenceOverlayLayer(sentence: ScriptSentenceDetail) {
  return Boolean(asTrimmedString(sentence.overlay?.url));
}

export function resolveSentenceSceneTab(sentence: ScriptSentenceDetail): ScriptSceneTab {
  const directValue = sentence.scene_tab ?? sentence.sceneTab ?? null;

  if (
    directValue === 'image' ||
    directValue === 'video' ||
    directValue === 'text' ||
    directValue === 'overlay'
  ) {
    return directValue;
  }

  if (hasSentenceOverlayLayer(sentence)) return 'overlay';
  if (hasSentenceTextLayer(sentence)) return 'text';
  if (asTrimmedString(sentence.video?.video)) return 'video';
  return 'image';
}

function getSceneImageUrl(sentence: ScriptSentenceDetail, sceneTab: ScriptSceneTab) {
  if (sceneTab === 'image') {
    return (
      asTrimmedString(sentence.image?.image) ||
      asTrimmedString(sentence.secondaryImage?.image) ||
      asTrimmedString(sentence.startFrameImage?.image) ||
      asTrimmedString(sentence.endFrameImage?.image)
    );
  }

  if (sceneTab === 'text') {
    return (
      asTrimmedString(sentence.textBackgroundImage?.image) ||
      asTrimmedString(sentence.image?.image)
    );
  }

  if (sceneTab === 'overlay') {
    return getBestImageUrl(sentence);
  }

  return null;
}

function getSceneVideoUrl(sentence: ScriptSentenceDetail, sceneTab: ScriptSceneTab) {
  if (sceneTab === 'video') {
    return asTrimmedString(sentence.video?.video);
  }

  if (sceneTab === 'text') {
    return (
      asTrimmedString(sentence.textBackgroundVideo?.video) ||
      asTrimmedString(sentence.video?.video)
    );
  }

  if (sceneTab === 'overlay') {
    return getBestVideoUrl(sentence);
  }

  return null;
}

function getResolvedTextSettings(
  sentence: ScriptSentenceDetail,
  sceneTab: ScriptSceneTab,
) {
  const base =
    asObject(sentence.text_animation_settings) ||
    asObject(sentence.textAnimationSettings) ||
    {};

  if (sceneTab === 'image') {
    return {
      ...base,
      backgroundMode: 'inheritImage',
      backgroundColor: 'transparent',
      backgroundDim: 0,
    };
  }

  if (sceneTab === 'video') {
    return {
      ...base,
      backgroundMode: 'inheritVideo',
      backgroundColor: 'transparent',
      backgroundDim: 0,
    };
  }

  return Object.keys(base).length > 0 ? base : null;
}

function getResolvedOverlaySettings(
  sentence: ScriptSentenceDetail,
  sceneTab: ScriptSceneTab,
) {
  const base =
    asObject(sentence.overlay_settings) ||
    asObject(sentence.overlaySettings) ||
    asObject(sentence.overlay?.settings) ||
    {};

  let backgroundMode = base.backgroundMode;

  if (sceneTab === 'image') {
    backgroundMode = 'image';
  } else if (sceneTab === 'video') {
    backgroundMode = 'video';
  } else if (sceneTab === 'text') {
    backgroundMode = getSceneVideoUrl(sentence, sceneTab) ? 'video' : 'image';
  }

  return {
    ...base,
    backgroundMode,
    includeText: base.includeText === true,
    textLayer:
      typeof base.textLayer === 'string' &&
      (base.textLayer === 'below' || base.textLayer === 'above')
        ? base.textLayer
        : 'above',
  };
}

function getPlaceholderContent(sceneTab: ScriptSceneTab) {
  if (sceneTab === 'video') {
    return {
      icon: <Film className="h-5 w-5" />,
      title: 'No saved video scene',
      subtitle: 'This sentence is set to the video tab, but there is no video clip attached yet.',
    };
  }

  if (sceneTab === 'text') {
    return {
      icon: <Type className="h-5 w-5" />,
      title: 'No text background available',
      subtitle: 'This sentence uses the text tab, but there is no background image or video to render against.',
    };
  }

  if (sceneTab === 'overlay') {
    return {
      icon: <Layers3 className="h-5 w-5" />,
      title: 'No overlay scene asset',
      subtitle: 'This sentence uses the overlay tab, but the overlay asset has not been saved yet.',
    };
  }

  return {
    icon: <ImageIcon className="h-5 w-5" />,
    title: 'No saved image scene',
    subtitle: 'This sentence is set to the image tab, but there is no image attached yet.',
  };
}

function PreviewPlaceholder({ sceneTab }: { sceneTab: ScriptSceneTab }) {
  const content = getPlaceholderContent(sceneTab);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-white/15 bg-slate-950 px-6 text-center text-white/80">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80">
        {content.icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">{content.title}</p>
        <p className="text-xs leading-6 text-white/65">{content.subtitle}</p>
      </div>
    </div>
  );
}

export function SentenceScenePreview({
  sentence,
  isShortVideo,
}: SentenceScenePreviewProps) {
  const sceneTab = resolveSentenceSceneTab(sentence);
  const overlayUrl = asTrimmedString(sentence.overlay?.url);
  const overlayMimeType =
    asTrimmedString(sentence.overlay?.mime_type) ||
    asTrimmedString(sentence.overlay?.mimeType);
  const imageUrl = getSceneImageUrl(sentence, sceneTab);
  const videoUrl = getSceneVideoUrl(sentence, sceneTab);
  const visualEffect = sentence.visual_effect ?? sentence.visualEffect ?? null;
  const imageMotionEffect =
    sentence.image_motion_effect ?? sentence.imageMotionEffect ?? 'default';
  const imageMotionSpeed =
    sentence.image_motion_speed ??
    sentence.imageMotionSpeed ??
    getDefaultImageMotionSpeed(isShortVideo);
  const imageFilterSettings =
    asObject(sentence.image_filter_settings) ||
    asObject(sentence.imageFilterSettings) ||
    null;
  const imageMotionSettings =
    asObject(sentence.image_motion_settings) ||
    asObject(sentence.imageMotionSettings) ||
    null;
  const textSettings = getResolvedTextSettings(sentence, sceneTab);
  const textAnimationText =
    asTrimmedString(sentence.text_animation_text) ||
    asTrimmedString(sentence.textAnimationText) ||
    sentence.text;
  const textAnimationEffect =
    asTrimmedString(sentence.text_animation_effect) ||
    asTrimmedString(sentence.textAnimationEffect) ||
    null;
  const frameClassName = isShortVideo
    ? 'mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-[28px] bg-slate-950 shadow-2xl'
    : 'aspect-video w-full overflow-hidden rounded-[28px] bg-slate-950 shadow-2xl';

  if (sceneTab === 'overlay') {
    if (!overlayUrl) {
      return (
        <div className={frameClassName}>
          <PreviewPlaceholder sceneTab={sceneTab} />
        </div>
      );
    }

    return (
      <OverlayScenePreview
        isShortVideo={isShortVideo}
        className={frameClassName}
        sceneImageUrl={imageUrl}
        sceneVideoUrl={videoUrl}
        visualEffect={visualEffect as any}
        imageFilterSettings={imageFilterSettings}
        overlayAssetUrl={overlayUrl}
        overlayMimeType={overlayMimeType}
        overlaySettings={getResolvedOverlaySettings(sentence, sceneTab)}
        sentenceText={sentence.text}
        text={textAnimationText}
        textAnimationEffect={textAnimationEffect as any}
        textAnimationSettings={textSettings}
      />
    );
  }

  if (sceneTab === 'text') {
    return (
      <TextAnimationPreview
        sentenceText={sentence.text}
        text={textAnimationText}
        effect={textAnimationEffect as any}
        settings={textSettings}
        visualEffect={visualEffect as any}
        imageFilterSettings={imageFilterSettings}
        backgroundImageUrl={imageUrl}
        backgroundVideoUrl={videoUrl}
        isShortVideo={isShortVideo}
        className={frameClassName}
        contentClassName="p-[7%]"
        enableMotion
        repeatMotion
        motionResetKey={sentence.id}
      />
    );
  }

  if (sceneTab === 'video') {
    if (!videoUrl) {
      return (
        <div className={frameClassName}>
          <PreviewPlaceholder sceneTab={sceneTab} />
        </div>
      );
    }

    return (
      <div className={frameClassName}>
        <ImageEffectPreview
          visualEffect={visualEffect as any}
          imageMotionEffect={imageMotionEffect as any}
          imageMotionSpeed={imageMotionSpeed}
          isShortVideo={isShortVideo}
          imageFilterSettings={imageFilterSettings}
          imageMotionSettings={imageMotionSettings}
          className="h-full w-full"
          enableMotion={false}
        >
          <video
            src={videoUrl}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        </ImageEffectPreview>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={frameClassName}>
        <PreviewPlaceholder sceneTab={sceneTab} />
      </div>
    );
  }

  return (
    <div className={frameClassName}>
      <ImageEffectPreview
        visualEffect={visualEffect as any}
        imageMotionEffect={imageMotionEffect as any}
        imageMotionSpeed={imageMotionSpeed}
        isShortVideo={isShortVideo}
        imageFilterSettings={imageFilterSettings}
        imageMotionSettings={imageMotionSettings}
        className="h-full w-full"
        motionResetKey={sentence.id}
        enableMotion
      >
        <img
          src={imageUrl}
          alt={`Sentence ${sentence.index + 1} scene preview`}
          className="h-full w-full object-cover"
        />
      </ImageEffectPreview>
    </div>
  );
}