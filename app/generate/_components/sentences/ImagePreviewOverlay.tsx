'use client';

import { X } from 'lucide-react';

import type { SentenceItem } from '../../_types/sentences';

type ImagePreviewOverlayProps = {
  previewImageUrl: string;
  visualEffect: SentenceItem['visualEffect'] | null;
  isPreviewClosing: boolean;
  onRequestClose: () => void;
};

export function ImagePreviewOverlay({
  previewImageUrl,
  visualEffect,
  isPreviewClosing,
  onRequestClose,
}: ImagePreviewOverlayProps) {
  const normalized = visualEffect ?? null;

  const isColorGrading = normalized === 'colorGrading';
  const isAnimatedLighting = normalized === 'animatedLighting';

  const mediaFilter = isColorGrading
    ? 'contrast(1.12) saturate(1.16) brightness(0.98)'
    : undefined;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 ${isPreviewClosing
        ? 'animate-out fade-out-0 duration-200'
        : 'animate-in fade-in-0 duration-200'
        }`}
      onClick={onRequestClose}
    >
      <div
        className={`relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center ${isPreviewClosing
          ? 'animate-out zoom-out-95 fade-out-0 duration-200'
          : 'animate-in zoom-in-95 fade-in-0 duration-200'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes av-light-sweep {
            0% { transform: translate(-10%, -6%) scale(1.05); }
            50% { transform: translate(10%, 4%) scale(1.12); }
            100% { transform: translate(-6%, 8%) scale(1.08); }
          }
        `}</style>

        <button
          type="button"
          onClick={onRequestClose}
          className="absolute -top-4 -right-4 p-3 rounded-full bg-white text-gray-800 shadow-2xl hover:bg-gray-100 hover:scale-110 transition-all z-10"
          title="Close preview"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative max-h-[85vh] w-auto max-w-full rounded-2xl shadow-2xl bg-black/20 overflow-hidden">
          <div className="relative" style={{ filter: mediaFilter }}>
            <img
              src={previewImageUrl}
              alt="Full preview"
              className="max-h-[85vh] w-auto max-w-full object-contain"
            />

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
          </div>
        </div>
      </div>
    </div>
  );
}
