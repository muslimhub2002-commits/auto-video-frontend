'use client';

import { X } from 'lucide-react';

type ImagePreviewOverlayProps = {
  previewImageUrl: string;
  isPreviewClosing: boolean;
  onRequestClose: () => void;
};

export function ImagePreviewOverlay({
  previewImageUrl,
  isPreviewClosing,
  onRequestClose,
}: ImagePreviewOverlayProps) {
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
        <button
          type="button"
          onClick={onRequestClose}
          className="absolute -top-4 -right-4 p-3 rounded-full bg-white text-gray-800 shadow-2xl hover:bg-gray-100 hover:scale-110 transition-all z-10"
          title="Close preview"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={previewImageUrl}
          alt="Full preview"
          className="max-h-[85vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain bg-black/20"
        />
      </div>
    </div>
  );
}
