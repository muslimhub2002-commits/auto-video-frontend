'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2, Video as VideoIcon, Check, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Pagination } from './Pagination';

interface SavedVideo {
  id: string;
  video: string;
  video_type?: string | null;
  created_at: string;
}

interface VideoLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (videoUrl: string, id: string) => void;
  selectedVideoUrl?: string | null;
}

export function VideoLibraryModal({
  isOpen,
  onClose,
  onSelectVideo,
  selectedVideoUrl,
}: VideoLibraryModalProps) {
  const [videos, setVideos] = useState<SavedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchVideos(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedVideoUrl]);

  const fetchVideos = async (pageToLoad = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        items: SavedVideo[];
        total: number;
        page: number;
        limit: number;
      }>('/videos-library', {
        params: { page: pageToLoad, limit },
      });

      const data = response.data;
      const items = data.items || [];

      setVideos(items);
      setTotal(data.total ?? 0);
      setPage(data.page ?? pageToLoad);
      setLimit(data.limit ?? limit);

      if (selectedVideoUrl) {
        const found = items.find((v) => v.video === selectedVideoUrl);
        setSelectedId(found ? found.id : null);
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err);
      setError('Failed to load your video library');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVideo = (v: SavedVideo) => {
    setSelectedId(v.id);
    setTimeout(() => {
      onSelectVideo(v.video, v.id);
      onClose();
    }, 250);
  };

  if (!isOpen) return null;

  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-linear-to-br from-white via-gray-50 to-blue-50/30 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200/50 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-8 py-6 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                <VideoIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-linear-to-r from-gray-900 via-purple-900 to-indigo-900 bg-clip-text text-transparent">
                  Video Library
                </h2>
                <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  {videos.length} {videos.length === 1 ? 'video' : 'videos'} in your collection
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
        <div className="flex-1 overflow-y-auto p-8 bg-linear-to-b from-transparent to-gray-50/50">
          {isLoading ? (
            <div className="animate-in fade-in duration-300">
              <div className="mb-4 flex items-center justify-between">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-video rounded-xl bg-linear-to-br from-gray-200 to-gray-300 animate-pulse" />
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
                onClick={() => fetchVideos(page)}
                variant="outline"
                size="sm"
                className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
              >
                <Loader2 className="h-3.5 w-3.5" />
                Try Again
              </Button>
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-r from-blue-400 to-purple-500 rounded-full blur-2xl opacity-10"></div>
                <div className="p-6 bg-linear-to-br from-gray-50 to-blue-50 rounded-3xl shadow-xl relative border border-gray-200">
                  <VideoIcon className="h-12 w-12 text-gray-400" />
                </div>
              </div>
              <p className="text-base text-gray-700 font-semibold mb-2 mt-6">No saved videos yet</p>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                Generate and save sentence videos to build your personal library
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Click a video to select
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <span>
                    {total} total
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {videos.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleSelectVideo(v)}
                    className={`group relative aspect-video rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                      selectedId === v.id
                        ? 'ring-4 ring-purple-500 ring-offset-2 scale-[0.98]'
                        : 'border-2 border-gray-200 hover:border-purple-400 hover:shadow-2xl hover:scale-[1.02]'
                    }`}
                  >
                    <video
                      src={v.video}
                      muted
                      playsInline
                      preload="metadata"
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        selectedId === v.id ? 'scale-105 blur-[1px]' : 'group-hover:scale-105'
                      }`}
                    />

                    <div
                      className={`absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-300 ${
                        selectedId === v.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />

                    {selectedId === v.id ? (
                      <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-200">
                        <div className="p-4 bg-purple-500 rounded-full shadow-2xl">
                          <Check className="h-8 w-8 text-white" strokeWidth={3} />
                        </div>
                      </div>
                    ) : null}

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      {v.video_type ? (
                        <div className="bg-white/95 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-lg">
                          <p className="text-xs font-medium text-gray-700 truncate">{v.video_type}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(nextPage) => {
                      setPage(nextPage);
                      fetchVideos(nextPage);
                    }}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
