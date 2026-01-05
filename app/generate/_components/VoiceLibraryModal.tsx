'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2, Mic, Check, Sparkles, Headphones } from 'lucide-react';
import { api } from '@/lib/api';
import { Pagination } from './Pagination';

interface SavedVoice {
  id: string;
  voice: string;
  voice_type?: string;
  voice_lang?: string;
  created_at: string;
}

interface VoiceLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVoice: (voiceUrl: string, id: string) => void;
  selectedVoiceUrl?: string | null;
}

export function VoiceLibraryModal({
  isOpen,
  onClose,
  onSelectVoice,
  selectedVoiceUrl,
}: VoiceLibraryModalProps) {
  const [voices, setVoices] = useState<SavedVoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchVoices(1);
    }
  }, [isOpen, selectedVoiceUrl]);

  const fetchVoices = async (pageToLoad = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        items: SavedVoice[];
        total: number;
        page: number;
        limit: number;
      }>('/voices', {
        params: { page: pageToLoad, limit },
      });
      const data = response.data;

      const items = data.items || [];
      setVoices(items);
      setTotal(data.total ?? 0);
      setPage(data.page ?? pageToLoad);
      setLimit(data.limit ?? limit);

      if (selectedVoiceUrl) {
        const found = items.find((v) => v.voice === selectedVoiceUrl);
        setSelectedId(found ? found.id : null);
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      console.error('Failed to fetch voices:', err);
      setError('Failed to load your voice library');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (voice: SavedVoice) => {
    setSelectedId(voice.id);
    setTimeout(() => {
      onSelectVoice(voice.voice, voice.id);
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-linear-to-br from-white via-gray-50 to-purple-50/40 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden border border-gray-200/60 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-8 py-6 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                <Headphones className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-linear-to-r from-gray-900 via-purple-900 to-indigo-900 bg-clip-text text-transparent">
                  Voice Library
                </h2>
                <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  {voices.length} saved voice{voices.length === 1 ? '' : 's'} ready to use
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-white/80 rounded-xl transition-all hover:scale-105 hover:shadow-md group"
            >
              <X className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-linear-to-b from-transparent to-gray-50/60">
          {isLoading ? (
            <div className="animate-in fade-in duration-300">
              <div className="mb-4 flex items-center justify-between">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-gray-300" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-300 rounded" />
                      <div className="h-3 w-1/2 bg-gray-300 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-5 bg-linear-to-br from-red-50 to-pink-50 rounded-2xl mb-4 shadow-lg">
                <X className="h-10 w-10 text-red-500" />
              </div>
              <p className="text-sm text-red-600 font-semibold mb-2">{error}</p>
              <p className="text-xs text-gray-500 mb-4">Please check your connection and try again</p>
              <Button
                onClick={() => fetchVoices(page)}
                variant="outline"
                size="sm"
                className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
              >
                <Loader2 className="h-3.5 w-3.5" />
                Try Again
              </Button>
            </div>
          ) : voices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-r from-blue-400 to-purple-500 rounded-full blur-2xl opacity-10" />
                <div className="p-6 bg-linear-to-br from-gray-50 to-purple-50 rounded-3xl shadow-xl relative border border-gray-200">
                  <Mic className="h-12 w-12 text-gray-400" />
                </div>
              </div>
              <p className="text-base text-gray-700 font-semibold mb-2 mt-6">No saved voices yet</p>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                Generate or upload a voice-over and save it to build your voice library.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Click a voice to select
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <span>{total} total</span>
                </div>
              </div>
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {voices.map((voice) => (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => handleSelect(voice)}
                    className={`w-full text-left group relative rounded-xl border-2 p-4 flex items-center gap-4 transition-all duration-200 bg-white/70 hover:bg-white shadow-sm hover:shadow-md ${
                      selectedId === voice.id
                        ? 'border-purple-500 ring-2 ring-purple-300'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="p-3 bg-linear-to-br from-purple-100 to-indigo-100 rounded-lg shadow-sm">
                      <Headphones className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          Saved voice
                        </p>
                        {selectedId === voice.id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                            <Check className="h-3 w-3" />
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        {voice.voice_type && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                            {voice.voice_type}
                          </span>
                        )}
                        {voice.voice_lang && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            {voice.voice_lang}
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        <audio controls src={voice.voice} className="w-full h-8" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Pagination */}
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={fetchVoices}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && voices.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-8 py-5 border-t border-gray-200/80 bg-linear-to-r from-gray-50 to-purple-50/60">
            <p className="text-xs text-gray-500">Select a voice to use it in your video</p>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-white transition-all hover:scale-105"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
