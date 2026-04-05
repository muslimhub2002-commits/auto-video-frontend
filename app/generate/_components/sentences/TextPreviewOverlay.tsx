'use client';

import { X } from 'lucide-react';

import type { SentenceItem } from '../../_types/sentences';
import { TextAnimationPreview, type TextAnimationSettings } from './TextAnimationPreview';

type TextPreviewOverlayProps = {
  isShortVideo: boolean;
  sentenceText?: string | null;
  text?: string | null;
  effect?: SentenceItem['textAnimationEffect'] | null;
  settings?: Record<string, unknown> | TextAnimationSettings | null;
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  isPreviewClosing: boolean;
  onRequestClose: () => void;
};

export function TextPreviewOverlay({
  isShortVideo,
  sentenceText,
  text,
  effect,
  settings,
  backgroundImageUrl,
  backgroundVideoUrl,
  isPreviewClosing,
  onRequestClose,
}: TextPreviewOverlayProps) {
  const previewFrameClass = isShortVideo
    ? 'w-full max-w-[24rem] aspect-[9/16]'
    : 'w-full max-w-5xl aspect-video';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm ${
        isPreviewClosing
          ? 'animate-out fade-out-0 duration-200'
          : 'animate-in fade-in-0 duration-200'
      }`}
      onClick={onRequestClose}
    >
      <div
        className={`relative flex max-h-[90vh] w-full items-center justify-center ${
          isPreviewClosing
            ? 'animate-out zoom-out-95 fade-out-0 duration-200'
            : 'animate-in zoom-in-95 fade-in-0 duration-200'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onRequestClose}
          className="absolute -right-4 -top-4 z-10 rounded-full bg-white p-3 text-gray-800 shadow-2xl transition-all hover:scale-110 hover:bg-gray-100"
          title="Close preview"
        >
          <X className="h-5 w-5" />
        </button>

        <TextAnimationPreview
          sentenceText={sentenceText}
          text={text}
          effect={effect}
          settings={settings}
          backgroundImageUrl={backgroundImageUrl}
          backgroundVideoUrl={backgroundVideoUrl}
          isShortVideo={isShortVideo}
          className={`${previewFrameClass} overflow-hidden rounded-2xl bg-slate-950 shadow-2xl`}
          contentClassName="p-[7%]"
          enableMotion
          repeatMotion
        />
      </div>
    </div>
  );
}