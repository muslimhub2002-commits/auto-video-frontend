'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2, Image as ImageIcon, Check, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Pagination } from './Pagination';

interface SavedImage {
  id: string;
  image: string;
  image_style?: string;
  created_at: string;
}

interface ImageLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string, id: string) => void;
  selectedImageUrl?: string | null;
}

export function ImageLibraryModal({
  isOpen,
  onClose,
  onSelectImage,
  selectedImageUrl,
}: ImageLibraryModalProps) {
  const [images, setImages] = useState<SavedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchImages(1);
    }
  }, [isOpen, selectedImageUrl]);

  const fetchImages = async (pageToLoad = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        items: SavedImage[];
        total: number;
        page: number;
        limit: number;
      }>('/images', {
        params: { page: pageToLoad, limit },
      });
      const data = response.data;

      const items = data.items || [];
      setImages(items);
      setTotal(data.total ?? 0);
      setPage(data.page ?? pageToLoad);
      setLimit(data.limit ?? limit);

      if (selectedImageUrl) {
        const found = items.find((img) => img.image === selectedImageUrl);
        setSelectedId(found ? found.id : null);
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      console.error('Failed to fetch images:', err);
      setError('Failed to load your image library');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectImage = (img: SavedImage) => {
    setSelectedId(img.id);
    setTimeout(() => {
      onSelectImage(img.image, img.id);
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
        className="bg-linear-to-br from-white via-gray-50 to-blue-50/30 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200/50 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-8 py-6 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-linear-to-r from-gray-900 via-purple-900 to-indigo-900 bg-clip-text text-transparent">
                  Image Library
                </h2>
                <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  {images.length} {images.length === 1 ? 'image' : 'images'} in your collection
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
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
                onClick={fetchImages}
                variant="outline"
                size="sm"
                className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
              >
                <Loader2 className="h-3.5 w-3.5" />
                Try Again
              </Button>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-r from-blue-400 to-purple-500 rounded-full blur-2xl opacity-10"></div>
                <div className="p-6 bg-linear-to-br from-gray-50 to-blue-50 rounded-3xl shadow-xl relative border border-gray-200">
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                </div>
              </div>
              <p className="text-base text-gray-700 font-semibold mb-2 mt-6">
                No saved images yet
              </p>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                Save images from the generate page to build your personal library
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Click an image to select
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {images.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => handleSelectImage(img)}
                    className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                      selectedId === img.id
                        ? 'ring-4 ring-purple-500 ring-offset-2 scale-95'
                        : 'border-2 border-gray-200 hover:border-purple-400 hover:shadow-2xl hover:scale-105'
                    }`}
                  >
                    <img
                      src={img.image}
                      alt="Saved image"
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        selectedId === img.id
                          ? 'scale-110 blur-[2px]'
                          : 'group-hover:scale-110'
                      }`}
                    />
                    {/* Gradient Overlay */}
                    <div className={`absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-300 ${
                      selectedId === img.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`} />
                    
                    {/* Selection Indicator */}
                    {selectedId === img.id && (
                      <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-200">
                        <div className="p-4 bg-purple-500 rounded-full shadow-2xl">
                          <Check className="h-8 w-8 text-white" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                    
                    {/* Info Badge */}
                    <div className={`absolute bottom-0 left-0 right-0 p-3 transition-all duration-300 ${
                      selectedId === img.id ? 'translate-y-full' : 'translate-y-0'
                    }`}>
                      {img.image_style && (
                        <div className="bg-white/95 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-lg">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {img.image_style}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="absolute inset-0 bg-linear-to-tr from-purple-500/20 via-transparent to-blue-500/20" />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={fetchImages}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && images.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-8 py-5 border-t border-gray-200/80 bg-linear-to-r from-gray-50 to-blue-50/30">
            <p className="text-xs text-gray-500">
              Select an image to use it in your video
            </p>
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
