'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Music2, Pause, Play, Save, X } from 'lucide-react';

export type SoundEffectEditValues = {
  name: string;
  volumePercent: number;
};

type SoundEffectEditModalProps = {
  isOpen: boolean;
  title?: string;
  audioUrl?: string | null;
  initialName: string;
  initialVolumePercent: number;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: SoundEffectEditValues) => void | Promise<void>;
};

const clampVolume = (raw: unknown) => {
  const v = Number(raw);
  if (!Number.isFinite(v)) return 100;
  return Math.max(0, Math.min(100, v));
};

export function SoundEffectEditModal({
  isOpen,
  title,
  audioUrl,
  initialName,
  initialVolumePercent,
  isSaving,
  onClose,
  onSave,
}: SoundEffectEditModalProps) {
  const [name, setName] = useState('');
  const [volumePercent, setVolumePercent] = useState(100);

  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPreview = () => {
    const audio = audioRef.current;
    if (!audio) {
      setPreviewStatus('idle');
      return;
    }
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }
    setPreviewStatus('idle');
  };

  const handleClose = () => {
    stopPreview();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    setName(String(initialName ?? '').trim());
    setVolumePercent(clampVolume(initialVolumePercent));
  }, [isOpen, initialName, initialVolumePercent]);

  useEffect(() => {
    if (!isOpen) return;

    const url = String(audioUrl ?? '').trim();
    if (!url) {
      audioRef.current = null;
      setPreviewStatus('idle');
      return;
    }

    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, clampVolume(volumePercent) / 100));
    audio.onended = () => setPreviewStatus('idle');
    audio.onerror = () => setPreviewStatus('idle');
    audioRef.current = audio;

    return () => {
      try {
        audio.pause();
      } catch {
        // ignore
      }
      audioRef.current = null;
      setPreviewStatus('idle');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, clampVolume(volumePercent) / 100));
  }, [volumePercent]);

  const resolvedTitle = useMemo(() => {
    const t = String(title ?? '').trim();
    if (t) return t;
    return 'Edit sound effect';
  }, [title]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={resolvedTitle}
    >
      <div
        className="bg-linear-to-br from-white via-gray-50 to-indigo-50/30 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-gray-200/60 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 py-5 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-linear-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg shrink-0">
                <Music2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold bg-linear-to-r from-gray-900 via-purple-900 to-indigo-900 bg-clip-text text-transparent">
                  {resolvedTitle}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Update the display name and default volume.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-2.5 hover:bg-white/80 rounded-xl transition-all hover:scale-105 hover:shadow-md group"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-700">Name</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 mt-2"
              placeholder="Sound effect name"
              disabled={Boolean(isSaving)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-gray-700">Volume</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                {Math.round(volumePercent)}%
              </span>
            </div>

            <div className="mt-3">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={volumePercent}
                onChange={(e) => setVolumePercent(clampVolume(e.target.value))}
                className="w-full"
                disabled={Boolean(isSaving)}
                aria-label="Volume percent"
              />
            </div>

            <div className="mt-3 relative">
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={String(volumePercent)}
                onChange={(e) => setVolumePercent(clampVolume(e.target.value))}
                className="h-10 pr-10"
                disabled={Boolean(isSaving)}
              />
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                %
              </div>
            </div>

            <p className="mt-2 text-[11px] text-gray-500">
              100% is the original volume. You can not go above 100%.
            </p>
          </div>

          {String(audioUrl ?? '').trim() ? (
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-900">Preview</p>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Plays with the current volume setting.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2 h-9 border-gray-200 text-gray-700 hover:bg-white"
                  disabled={Boolean(isSaving)}
                  onClick={() => {
                    if (previewStatus === 'playing' || previewStatus === 'loading') {
                      stopPreview();
                      return;
                    }

                    const audio = audioRef.current;
                    if (!audio) return;

                    setPreviewStatus('loading');
                    const p = audio.play();
                    if (!p || typeof (p as any).then !== 'function') {
                      setPreviewStatus('playing');
                      return;
                    }

                    (p as Promise<void>)
                      .then(() => setPreviewStatus('playing'))
                      .catch(() => setPreviewStatus('idle'));
                  }}
                  title={previewStatus === 'idle' ? 'Play preview' : 'Stop preview'}
                >
                  {previewStatus === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : previewStatus === 'playing' ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span className="text-xs font-semibold">
                    {previewStatus === 'loading'
                      ? 'Loading...'
                      : previewStatus === 'playing'
                        ? 'Stop'
                        : 'Play'}
                  </span>
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-5 border-t border-gray-200/80 bg-linear-to-r from-gray-50 to-indigo-50/50">
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
            size="sm"
            className="gap-2 hover:bg-white transition-all"
            disabled={Boolean(isSaving)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              const nextName = String(name ?? '').trim();
              if (!nextName) return;
              void Promise.resolve(
                onSave({
                  name: nextName,
                  volumePercent: clampVolume(volumePercent),
                }),
              );
            }}
            size="sm"
            className="gap-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
            disabled={Boolean(isSaving) || !String(name ?? '').trim()}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
