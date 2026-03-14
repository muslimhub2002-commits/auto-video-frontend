'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog } from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X,
  Loader2,
  Image as ImageIcon,
  Check,
  Sparkles,
  Search,
  Trash2,
  Download,
  Save,
  ExternalLink,
  Eye,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Pagination } from './Pagination';
import { ImagePreviewOverlay } from './sentences/ImagePreviewOverlay';
import { useAiSearchTerm } from './useAiSearchTerm';
import { useDebouncedValue } from './useDebouncedValue';

interface SavedImage {
  id: string;
  image: string;
  prompt?: string | null;
  image_style?: string | null;
  image_size?: 'portrait' | 'landscape' | null;
  created_at: string;
}

interface FreestockImage {
  id: string;
  externalId: string;
  source: 'pexels' | 'pixabay';
  image: string;
  thumbnail: string;
  prompt?: string | null;
  image_style?: string | null;
  image_size?: 'portrait' | 'landscape' | null;
  color?: string | null;
  width?: number | null;
  height?: number | null;
  authorName?: string | null;
  authorUrl?: string | null;
  pexelsUrl?: string | null;
  pixabayUrl?: string | null;
  downloadUrl: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface ImageLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string, id: string | null, prompt?: string | null) => void;
  selectedImageUrl?: string | null;
  scriptContext?: string | null;
  currentSentenceText?: string | null;
}

type ActiveTab = 'entities' | 'freestock' | 'pixabay';

type DeleteState = {
  image: SavedImage;
  force: boolean;
  title: string;
  description: string;
} | null;

const entityOrientationOptions = [
  { label: 'All orientations', value: '' },
  { label: 'Landscape', value: 'landscape' },
  { label: 'Portrait', value: 'portrait' },
];

const freestockOrientationOptions = [
  { label: 'Any orientation', value: '' },
  { label: 'Landscape', value: 'landscape' },
  { label: 'Portrait', value: 'portrait' },
  { label: 'Square', value: 'square' },
];

const freestockSizeOptions = [
  { label: 'Any size', value: '' },
  { label: 'Large', value: 'large' },
  { label: 'Medium', value: 'medium' },
  { label: 'Small', value: 'small' },
];

const EMPTY_SELECT_VALUE = '__all__';

const FILTER_SUMMARY_LABEL_LIMIT = 3;

const getImageAspectClass = (orientation?: 'portrait' | 'landscape' | null) =>
  orientation === 'portrait' ? 'aspect-4/5' : 'aspect-square';

const getFreestockImageAspectClass = (orientation?: 'portrait' | 'landscape' | null) =>
  orientation === 'portrait' ? 'aspect-5/6' : 'aspect-square';

const downloadAsset = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const toSummaryText = (value: string) => value.trim().replace(/\s+/g, ' ');

const buildFilterSummary = (items: Array<string | null | undefined>) => {
  const labels = items
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item));

  if (labels.length === 0) {
    return 'No active filters';
  }

  if (labels.length <= FILTER_SUMMARY_LABEL_LIMIT) {
    return labels.join(' • ');
  }

  return `${labels.slice(0, FILTER_SUMMARY_LABEL_LIMIT - 1).join(' • ')} • +${labels.length - (FILTER_SUMMARY_LABEL_LIMIT - 1)} more`;
};

export function ImageLibraryModal({
  isOpen,
  onClose,
  onSelectImage,
  selectedImageUrl,
  scriptContext,
  currentSentenceText,
}: ImageLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('entities');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(selectedImageUrl ?? null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const [entityImages, setEntityImages] = useState<SavedImage[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityError, setEntityError] = useState<string | null>(null);
  const [entityPage, setEntityPage] = useState(1);
  const [entityTotal, setEntityTotal] = useState(0);
  const [entityLimit, setEntityLimit] = useState(20);
  const [entityQuery, setEntityQuery] = useState('');
  const [entityOrientation, setEntityOrientation] = useState('');

  const [freestockImages, setFreestockImages] = useState<FreestockImage[]>([]);
  const [freestockLoading, setFreestockLoading] = useState(false);
  const [freestockError, setFreestockError] = useState<string | null>(null);
  const [freestockPage, setFreestockPage] = useState(1);
  const [freestockTotal, setFreestockTotal] = useState(0);
  const [freestockLimit, setFreestockLimit] = useState(20);
  const [freestockQuery, setFreestockQuery] = useState('');
  const [freestockOrientation, setFreestockOrientation] = useState('');
  const [freestockSize, setFreestockSize] = useState('');
  const [freestockColor, setFreestockColor] = useState('');
  const [pixabayImages, setPixabayImages] = useState<FreestockImage[]>([]);
  const [pixabayLoading, setPixabayLoading] = useState(false);
  const [pixabayError, setPixabayError] = useState<string | null>(null);
  const [pixabayPage, setPixabayPage] = useState(1);
  const [pixabayTotal, setPixabayTotal] = useState(0);
  const [pixabayLimit, setPixabayLimit] = useState(20);
  const [pixabayQuery, setPixabayQuery] = useState('');
  const [pixabayOrientation, setPixabayOrientation] = useState('');
  const [pixabaySize, setPixabaySize] = useState('');
  const [pixabayColor, setPixabayColor] = useState('');
  const [savingImageIds, setSavingImageIds] = useState<Record<string, boolean>>({});
  const [savedImageIds, setSavedImageIds] = useState<Record<string, string>>({});
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isPreviewClosing, setIsPreviewClosing] = useState(false);

  const debouncedEntityQuery = useDebouncedValue(entityQuery, 300);
  const debouncedFreestockQuery = useDebouncedValue(freestockQuery, 300);
  const debouncedFreestockColor = useDebouncedValue(freestockColor, 300);
  const debouncedPixabayQuery = useDebouncedValue(pixabayQuery, 300);
  const debouncedPixabayColor = useDebouncedValue(pixabayColor, 300);
  const {
    isGenerating: isGeneratingAiSearch,
    error: aiSearchError,
    setError: setAiSearchError,
    generateSearchTerm,
  } = useAiSearchTerm({
    medium: 'image',
    scriptContext,
    sentenceContext: currentSentenceText,
  });

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('entities');
    setIsFiltersExpanded(false);
  }, [isOpen]);

  useEffect(() => {
    setSelectedUrl(selectedImageUrl ?? null);
  }, [isOpen, selectedImageUrl]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const run = async () => {
      setEntityLoading(true);
      setEntityError(null);
      try {
        const response = await api.get<PaginatedResponse<SavedImage>>('/images', {
          params: {
            page: entityPage,
            limit: entityLimit,
            q: debouncedEntityQuery || undefined,
            orientation: entityOrientation || undefined,
          },
        });

        if (cancelled) return;
        setEntityImages(response.data.items || []);
        setEntityTotal(response.data.total ?? 0);
        setEntityPage(response.data.page ?? entityPage);
        setEntityLimit(response.data.limit ?? entityLimit);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to fetch images:', error);
        setEntityError('Failed to load your image library');
      } finally {
        if (!cancelled) setEntityLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isOpen, entityPage, entityLimit, debouncedEntityQuery, entityOrientation]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'freestock') return;

    let cancelled = false;

    const run = async () => {
      setFreestockLoading(true);
      setFreestockError(null);
      try {
        const response = await api.get<PaginatedResponse<FreestockImage>>(
          '/images/pexels/search',
          {
            params: {
              page: freestockPage,
              limit: freestockLimit,
              q: debouncedFreestockQuery || undefined,
              orientation: freestockOrientation || undefined,
              size: freestockSize || undefined,
              color: debouncedFreestockColor || undefined,
            },
          },
        );

        if (cancelled) return;
        setFreestockImages(response.data.items || []);
        setFreestockTotal(response.data.total ?? 0);
        setFreestockPage(response.data.page ?? freestockPage);
        setFreestockLimit(response.data.limit ?? freestockLimit);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to fetch Pexels images:', error);
        setFreestockError('Failed to load freestock images');
      } finally {
        if (!cancelled) setFreestockLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    activeTab,
    freestockPage,
    freestockLimit,
    debouncedFreestockQuery,
    freestockOrientation,
    freestockSize,
    debouncedFreestockColor,
  ]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'pixabay') return;

    let cancelled = false;

    const run = async () => {
      setPixabayLoading(true);
      setPixabayError(null);
      try {
        const response = await api.get<PaginatedResponse<FreestockImage>>(
          '/images/pixabay/search',
          {
            params: {
              page: pixabayPage,
              limit: pixabayLimit,
              q: debouncedPixabayQuery || undefined,
              orientation: pixabayOrientation || undefined,
              size: pixabaySize || undefined,
              color: debouncedPixabayColor || undefined,
            },
          },
        );

        if (cancelled) return;
        setPixabayImages(response.data.items || []);
        setPixabayTotal(response.data.total ?? 0);
        setPixabayPage(response.data.page ?? pixabayPage);
        setPixabayLimit(response.data.limit ?? pixabayLimit);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to fetch Pixabay images:', error);
        setPixabayError('Failed to load Pixabay images');
      } finally {
        if (!cancelled) setPixabayLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    activeTab,
    pixabayPage,
    pixabayLimit,
    debouncedPixabayQuery,
    pixabayOrientation,
    pixabaySize,
    debouncedPixabayColor,
  ]);

  const refreshEntityImages = async () => {
    setEntityLoading(true);
    setEntityError(null);
    try {
      const response = await api.get<PaginatedResponse<SavedImage>>('/images', {
        params: {
          page: entityPage,
          limit: entityLimit,
          q: debouncedEntityQuery || undefined,
          orientation: entityOrientation || undefined,
        },
      });
      setEntityImages(response.data.items || []);
      setEntityTotal(response.data.total ?? 0);
      setEntityPage(response.data.page ?? entityPage);
      setEntityLimit(response.data.limit ?? entityLimit);
    } catch (error) {
      console.error('Failed to refresh images:', error);
      setEntityError('Failed to refresh your image library');
    } finally {
      setEntityLoading(false);
    }
  };

  const refreshFreestockImages = async () => {
    setFreestockLoading(true);
    setFreestockError(null);
    try {
      const response = await api.get<PaginatedResponse<FreestockImage>>(
        '/images/pexels/search',
        {
          params: {
            page: freestockPage,
            limit: freestockLimit,
            q: debouncedFreestockQuery || undefined,
            orientation: freestockOrientation || undefined,
            size: freestockSize || undefined,
            color: debouncedFreestockColor || undefined,
          },
        },
      );

      setFreestockImages(response.data.items || []);
      setFreestockTotal(response.data.total ?? 0);
      setFreestockPage(response.data.page ?? freestockPage);
      setFreestockLimit(response.data.limit ?? freestockLimit);
    } catch (error) {
      console.error('Failed to refresh Pexels images:', error);
      setFreestockError('Failed to load freestock images');
    } finally {
      setFreestockLoading(false);
    }
  };

  const refreshPixabayImages = async () => {
    setPixabayLoading(true);
    setPixabayError(null);
    try {
      const response = await api.get<PaginatedResponse<FreestockImage>>(
        '/images/pixabay/search',
        {
          params: {
            page: pixabayPage,
            limit: pixabayLimit,
            q: debouncedPixabayQuery || undefined,
            orientation: pixabayOrientation || undefined,
            size: pixabaySize || undefined,
            color: debouncedPixabayColor || undefined,
          },
        },
      );

      setPixabayImages(response.data.items || []);
      setPixabayTotal(response.data.total ?? 0);
      setPixabayPage(response.data.page ?? pixabayPage);
      setPixabayLimit(response.data.limit ?? pixabayLimit);
    } catch (error) {
      console.error('Failed to refresh Pixabay images:', error);
      setPixabayError('Failed to load Pixabay images');
    } finally {
      setPixabayLoading(false);
    }
  };

  const handleSelectEntityImage = (image: SavedImage) => {
    setSelectedUrl(image.image);
    window.setTimeout(() => {
      onSelectImage(image.image, image.id, image.prompt ?? null);
      onClose();
    }, 220);
  };

  const handleSelectFreestockImage = (image: FreestockImage) => {
    setSelectedUrl(image.image);
    window.setTimeout(() => {
      onSelectImage(image.image, null, image.prompt ?? null);
      onClose();
    }, 220);
  };

  const handleSaveFreestockImage = async (image: FreestockImage) => {
    setSavingImageIds((prev) => ({ ...prev, [image.id]: true }));
    if (image.source === 'pixabay') {
      setPixabayError(null);
    } else {
      setFreestockError(null);
    }

    const importPath = image.source === 'pixabay' ? '/images/pixabay/import' : '/images/pexels/import';

    try {
      const response = await api.post<SavedImage>(importPath, {
        imageUrl: image.image,
        downloadUrl: image.downloadUrl,
        prompt: image.prompt,
        image_style: image.image_style,
        image_size: image.image_size,
        color: image.color,
        source: image.source,
      });

      setSavedImageIds((prev) => ({ ...prev, [image.id]: response.data.id }));
      await refreshEntityImages();
    } catch (error) {
      console.error(`Failed to save ${image.source} image:`, error);
      if (image.source === 'pixabay') {
        setPixabayError('Failed to save this image to your library');
      } else {
        setFreestockError('Failed to save this image to your library');
      }
    } finally {
      setSavingImageIds((prev) => ({ ...prev, [image.id]: false }));
    }
  };

  const handleDeleteImage = async () => {
    if (!deleteState) return;

    setIsDeleting(true);
    setEntityError(null);
    try {
      await api.delete(`/images/${deleteState.image.id}`, {
        params: {
          force: deleteState.force ? 'true' : undefined,
        },
      });

      if (selectedUrl === deleteState.image.image) {
        setSelectedUrl(null);
      }

      setDeleteState(null);
      await refreshEntityImages();
    } catch (error: any) {
      const response = error?.response?.data;
      if (response?.code === 'IMAGE_REFERENCED') {
        setDeleteState({
          image: deleteState.image,
          force: true,
          title: 'Image is referenced',
          description: `This image is used by ${response.referenceCount ?? 'one or more'} script sentence(s). Deleting it may leave broken URLs in existing scripts. Delete anyway?`,
        });
      } else {
        console.error('Failed to delete image:', error);
        setDeleteState(null);
        setEntityError('Failed to delete this image');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const openImagePreview = (imageUrl: string) => {
    setIsPreviewClosing(false);
    setPreviewImageUrl(imageUrl);
  };

  const closeImagePreview = () => {
    setIsPreviewClosing(true);
    window.setTimeout(() => {
      setPreviewImageUrl(null);
      setIsPreviewClosing(false);
    }, 200);
  };

  const handleAiSearch = async () => {
    const searchTerm = await generateSearchTerm();
    if (!searchTerm) return;

    if (activeTab === 'entities') {
      setEntityQuery(searchTerm);
      setEntityPage(1);
    } else if (activeTab === 'pixabay') {
      setPixabayQuery(searchTerm);
      setPixabayPage(1);
    } else {
      setFreestockQuery(searchTerm);
      setFreestockPage(1);
    }

    setAiSearchError(null);
  };

  if (!isOpen) return null;

  const activeTotal =
    activeTab === 'entities' ? entityTotal : activeTab === 'pixabay' ? pixabayTotal : freestockTotal;
  const activeCount =
    activeTab === 'entities'
      ? entityImages.length
      : activeTab === 'pixabay'
        ? pixabayImages.length
        : freestockImages.length;
  const activePage =
    activeTab === 'entities' ? entityPage : activeTab === 'pixabay' ? pixabayPage : freestockPage;
  const activeLimit =
    activeTab === 'entities' ? entityLimit : activeTab === 'pixabay' ? pixabayLimit : freestockLimit;
  const activeTotalPages = activeTotal > 0 ? Math.max(1, Math.ceil(activeTotal / activeLimit)) : 1;
  const isLoading =
    activeTab === 'entities'
      ? entityLoading
      : activeTab === 'pixabay'
        ? pixabayLoading
        : freestockLoading;
  const error =
    activeTab === 'entities' ? entityError : activeTab === 'pixabay' ? pixabayError : freestockError;
  const externalProviderLabel = activeTab === 'pixabay' ? 'Pixabay' : 'Pexels';
  const externalImages = activeTab === 'pixabay' ? pixabayImages : freestockImages;
  const activeFilterSummary =
    activeTab === 'entities'
      ? buildFilterSummary([
          entityQuery ? `Search: ${toSummaryText(entityQuery)}` : null,
          entityOrientation ? `Orientation: ${entityOrientation}` : null,
        ])
      : buildFilterSummary([
          (activeTab === 'pixabay' ? pixabayQuery : freestockQuery)
            ? `Search: ${toSummaryText(activeTab === 'pixabay' ? pixabayQuery : freestockQuery)}`
            : null,
          (activeTab === 'pixabay' ? pixabayOrientation : freestockOrientation)
            ? `Orientation: ${activeTab === 'pixabay' ? pixabayOrientation : freestockOrientation}`
            : null,
          (activeTab === 'pixabay' ? pixabaySize : freestockSize)
            ? `Size: ${activeTab === 'pixabay' ? pixabaySize : freestockSize}`
            : null,
          (activeTab === 'pixabay' ? pixabayColor : freestockColor)
            ? `Color: ${toSummaryText(activeTab === 'pixabay' ? pixabayColor : freestockColor)}`
            : null,
        ]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="bg-linear-to-br from-white via-gray-50 to-blue-50/30 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200/50 animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-gray-200/80 bg-linear-to-r from-indigo-50/95 via-white to-pink-50/80 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-purple-500 to-indigo-600 shadow-md">
                  <ImageIcon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">Image Library</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100">
                      <Sparkles className="h-3 w-3" />
                      {activeTotal} result{activeTotal === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {activeTab === 'entities'
                      ? 'Your saved images'
                      : activeTab === 'pixabay'
                        ? 'Curated and searchable Pixabay images'
                        : 'Curated and searchable Pexels images'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/85 text-gray-500 shadow-sm ring-1 ring-gray-200/80 transition hover:bg-white hover:text-gray-700"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid min-w-90 grid-cols-3 gap-1 rounded-2xl bg-white/90 p-1 shadow-sm ring-1 ring-indigo-100/80">
                  <button
                    type="button"
                    onClick={() => setActiveTab('entities')}
                    className={
                      activeTab === 'entities'
                        ? 'rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm'
                        : 'rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-gray-900'
                    }
                  >
                    Your Assets
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('freestock')}
                    className={
                      activeTab === 'freestock'
                        ? 'rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm'
                        : 'rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-gray-900'
                    }
                  >
                    Pexels
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pixabay')}
                    className={
                      activeTab === 'pixabay'
                        ? 'rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm'
                        : 'rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-gray-900'
                    }
                  >
                    Pixabay
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFiltersExpanded((current) => !current)}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white/90 px-3 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-indigo-100/80 transition hover:bg-white"
                >
                  <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                  Filters
                  <ChevronDown
                    className={isFiltersExpanded ? 'h-4 w-4 text-gray-500 transition-transform rotate-180' : 'h-4 w-4 text-gray-500 transition-transform'}
                  />
                </button>
              </div>

              <div className="flex flex-col gap-1 lg:items-end">
                <p className="hidden text-right text-[11px] font-medium text-gray-500 md:block">
                  {activeTab === 'entities'
                    ? 'Search, preview, select, or delete'
                    : `Browse, preview, select, save, or download from ${externalProviderLabel}`}
                </p>
                {!isFiltersExpanded ? (
                  <p className="text-xs text-gray-500 lg:text-right">{activeFilterSummary}</p>
                ) : null}
              </div>
            </div>
          </div>

          {!isFiltersExpanded ? (
            <></>
          ) : (
          <div className="border-b border-gray-200/80 px-8 py-4 bg-white/75">
            {activeTab === 'entities' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-3">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={entityQuery}
                    onChange={(e) => {
                      setAiSearchError(null);
                      setEntityQuery(e.target.value);
                      setEntityPage(1);
                    }}
                    placeholder="Search saved images by prompt"
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <Select
                  value={entityOrientation || EMPTY_SELECT_VALUE}
                  onValueChange={(value) => {
                    setEntityOrientation(value === EMPTY_SELECT_VALUE ? '' : value);
                    setEntityPage(1);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white text-sm text-gray-700 shadow-sm">
                    <SelectValue placeholder="All orientations" />
                  </SelectTrigger>
                  <SelectContent>
                    {entityOrientationOptions.map((option) => (
                      <SelectItem
                        key={option.value || EMPTY_SELECT_VALUE}
                        value={option.value || EMPTY_SELECT_VALUE}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleAiSearch()}
                    disabled={isGeneratingAiSearch || !currentSentenceText?.trim()}
                    className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    {isGeneratingAiSearch ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Search with AI
                  </Button>
                  <p className="text-xs text-gray-500">
                    Uses the full script and the active sentence to suggest a better search phrase.
                  </p>
                </div>

                {aiSearchError ? <p className="text-xs text-red-600">{aiSearchError}</p> : null}
              </div>
            ) : (
              <div className="space-y-3">
                {/* <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-600">
                  Browse curated Pexels images or refine with search filters
                </p> */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <label className="relative block md:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={activeTab === 'pixabay' ? pixabayQuery : freestockQuery}
                    onChange={(e) => {
                      setAiSearchError(null);
                      if (activeTab === 'pixabay') {
                        setPixabayQuery(e.target.value);
                        setPixabayPage(1);
                      } else {
                        setFreestockQuery(e.target.value);
                        setFreestockPage(1);
                      }
                    }}
                    placeholder={`Search ${externalProviderLabel} images`}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <Select
                  value={(activeTab === 'pixabay' ? pixabayOrientation : freestockOrientation) || EMPTY_SELECT_VALUE}
                  onValueChange={(value) => {
                    if (activeTab === 'pixabay') {
                      setPixabayOrientation(value === EMPTY_SELECT_VALUE ? '' : value);
                      setPixabayPage(1);
                    } else {
                      setFreestockOrientation(value === EMPTY_SELECT_VALUE ? '' : value);
                      setFreestockPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white text-sm text-gray-700 shadow-sm">
                    <SelectValue placeholder="Any orientation" />
                  </SelectTrigger>
                  <SelectContent>
                    {freestockOrientationOptions.map((option) => (
                      <SelectItem
                        key={option.value || EMPTY_SELECT_VALUE}
                        value={option.value || EMPTY_SELECT_VALUE}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={(activeTab === 'pixabay' ? pixabaySize : freestockSize) || EMPTY_SELECT_VALUE}
                  onValueChange={(value) => {
                    if (activeTab === 'pixabay') {
                      setPixabaySize(value === EMPTY_SELECT_VALUE ? '' : value);
                      setPixabayPage(1);
                    } else {
                      setFreestockSize(value === EMPTY_SELECT_VALUE ? '' : value);
                      setFreestockPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white text-sm text-gray-700 shadow-sm">
                    <SelectValue placeholder="Any size" />
                  </SelectTrigger>
                  <SelectContent>
                    {freestockSizeOptions.map((option) => (
                      <SelectItem
                        key={option.value || EMPTY_SELECT_VALUE}
                        value={option.value || EMPTY_SELECT_VALUE}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
{/* 
                <input
                  value={freestockColor}
                  onChange={(e) => {
                    setFreestockColor(e.target.value);
                    setFreestockPage(1);
                  }}
                  placeholder="Color"
                  className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                /> */}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleAiSearch()}
                    disabled={isGeneratingAiSearch || !currentSentenceText?.trim()}
                    className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    {isGeneratingAiSearch ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Search with AI
                  </Button>
                  <p className="text-xs text-gray-500">
                    Uses the full script and the active sentence to suggest a better search phrase.
                  </p>
                </div>

                {aiSearchError ? <p className="text-xs text-red-600">{aiSearchError}</p> : null}
              </div>
            )}
          </div>
          )}

          <div className="flex-1 overflow-y-auto p-8 bg-linear-to-b from-transparent to-gray-50/50">
            {isLoading ? (
              <div className="animate-in fade-in duration-300">
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                      <div className="aspect-square rounded-xl bg-linear-to-br from-gray-200 to-gray-300 animate-pulse" />
                      <div className="mt-3 h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
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
                  onClick={() => {
                    if (activeTab === 'entities') {
                      void refreshEntityImages();
                    } else if (activeTab === 'pixabay') {
                      void refreshPixabayImages();
                    } else {
                      void refreshFreestockImages();
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Loader2 className="h-3.5 w-3.5" />
                  Try Again
                </Button>
              </div>
            ) : activeCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="absolute inset-0 bg-linear-to-r from-blue-400 to-purple-500 rounded-full blur-2xl opacity-10" />
                  <div className="p-6 bg-linear-to-br from-gray-50 to-blue-50 rounded-3xl shadow-xl relative border border-gray-200">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                </div>
                <p className="text-base text-gray-700 font-semibold mb-2 mt-6">
                  {activeTab === 'entities'
                    ? 'No saved images found'
                    : `No ${externalProviderLabel.toLowerCase()} images found`}
                </p>
                <p className="text-sm text-gray-500 text-center max-w-sm">
                  {activeTab === 'entities'
                    ? 'Try a different prompt or orientation filter.'
                    : `Try a broader search term or loosen the ${externalProviderLabel.toLowerCase()} filters.`}
                </p>
              </div>
            ) : activeTab === 'entities' ? (
              <>
                <div className="mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Click an image to select it
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>
                      Page {activePage} of {activeTotalPages}
                    </span>
                    <span>{activeTotal} total</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {entityImages.map((image) => {
                    const isSelected = selectedUrl === image.image;
                    return (
                      <div
                        key={image.id}
                        onClick={() => handleSelectEntityImage(image)}
                        className={
                          isSelected
                            ? 'group relative overflow-hidden rounded-2xl bg-white ring-4 ring-purple-500 ring-offset-2 shadow-xl cursor-pointer'
                            : 'group relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm hover:border-purple-400 hover:shadow-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1'
                        }
                      >
                        <div className={`relative overflow-hidden ${getImageAspectClass(image.image_size)}`}>
                          <img
                            src={image.image}
                            alt={image.prompt ?? 'Saved image'}
                            loading="lazy"
                            decoding="async"
                            className={
                              isSelected
                                ? 'h-full w-full object-cover scale-110 blur-[2px] transition-all duration-300'
                                : 'h-full w-full object-cover transition-all duration-300 group-hover:scale-105'
                            }
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent" />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openImagePreview(image.image);
                            }}
                            className="absolute left-3 top-3 z-10 rounded-xl bg-white/90 p-2 text-indigo-700 shadow-lg transition hover:bg-indigo-50"
                            title="Preview full image"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteState({
                                image,
                                force: false,
                                title: 'Delete image',
                                description:
                                  'Delete this image from your library? Existing scripts may still point to its URL.',
                              });
                            }}
                            className="absolute right-3 top-3 z-10 rounded-xl bg-white/90 p-2 text-red-600 shadow-lg transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {isSelected ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="rounded-full bg-purple-500 p-4 shadow-2xl">
                                <Check className="h-8 w-8 text-white" strokeWidth={3} />
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-3 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-semibold text-gray-800">
                              {image.prompt?.trim() || 'Saved image'}
                            </p>
                            {image.image_size ? (
                              <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                                {image.image_size}
                              </span>
                            ) : null}
                          </div>
                          {image.image_style ? (
                            <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
                              {image.image_style}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Select uses the remote {externalProviderLabel} image instantly. Save adds it to your library.
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>
                      Page {activePage} of {activeTotalPages}
                    </span>
                    <span>{activeTotal} total</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {externalImages.map((image) => {
                    const isSelected = selectedUrl === image.image;
                    const isSaving = Boolean(savingImageIds[image.id]);
                    const isSaved = Boolean(savedImageIds[image.id]);
                    const providerLabel = image.source === 'pixabay' ? 'Pixabay' : 'Pexels';

                    return (
                      <div
                        key={image.id}
                        className={
                          isSelected
                            ? 'overflow-hidden rounded-2xl bg-white ring-4 ring-purple-500 ring-offset-2 shadow-xl'
                            : 'overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl'
                        }
                      >
                        <div className={`group relative w-full overflow-hidden ${getFreestockImageAspectClass(image.image_size)}`}>
                          <button
                            type="button"
                            onClick={() => handleSelectFreestockImage(image)}
                            className="block h-full w-full"
                          >
                          <img
                            src={image.thumbnail || image.image}
                            alt={image.prompt ?? 'Pexels image'}
                            loading="lazy"
                            decoding="async"
                            className={
                              isSelected
                                ? 'h-full w-full object-cover scale-110 blur-[2px] transition-all duration-300'
                                : 'h-full w-full object-cover transition-all duration-300 group-hover:scale-105'
                            }
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openImagePreview(image.image);
                            }}
                            className="absolute left-3 top-3 z-10 rounded-xl bg-white/90 p-2 text-indigo-700 shadow-lg transition hover:bg-indigo-50"
                            title="Preview full image"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {isSelected ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="rounded-full bg-purple-500 p-4 shadow-2xl">
                                <Check className="h-8 w-8 text-white" strokeWidth={3} />
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                                {image.prompt?.trim() || `${providerLabel} image`}
                              </p>
                              {image.authorName ? (
                                <p className="mt-1 text-xs text-gray-500">by {image.authorName}</p>
                              ) : null}
                            </div>
                            {image.image_size ? (
                              <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                                {image.image_size}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                            {image.width && image.height ? (
                              <span className="rounded-full bg-gray-100 px-2 py-1">
                                {image.width} x {image.height}
                              </span>
                            ) : null}
                            {image.color ? (
                              <span className="rounded-full bg-gray-100 px-2 py-1">
                                {image.color}
                              </span>
                            ) : null}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSelectFreestockImage(image)}
                              className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Select
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void handleSaveFreestockImage(image)}
                              disabled={isSaving || isSaved}
                              className="gap-1"
                            >
                              {isSaving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              {isSaved ? 'Saved' : 'Save'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => downloadAsset(image.downloadUrl, `${image.externalId}.jpg`)}
                              className="gap-1"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {!isLoading && !error && activeCount > 0 ? (
            <div className="flex items-center justify-between gap-3 px-8 py-5 border-t border-gray-200/80 bg-linear-to-r from-gray-50 to-blue-50/30">
              <p className="text-xs text-gray-500">
                {activeTab === 'entities'
                  ? 'Select an image to use it in your video, or delete entries you no longer need.'
                  : `${externalProviderLabel} images can be selected immediately or saved into your library first.`}
              </p>

              <div className="flex items-center gap-3">
                {activeTotalPages > 1 ? (
                  <Pagination
                    currentPage={activePage}
                    totalPages={activeTotalPages}
                    onPageChange={(nextPage) => {
                      if (activeTab === 'entities') {
                        setEntityPage(nextPage);
                      } else if (activeTab === 'pixabay') {
                        setPixabayPage(nextPage);
                      } else {
                        setFreestockPage(nextPage);
                      }
                    }}
                  />
                ) : null}

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
            </div>
          ) : null}
        </div>
      </div>

      <AlertDialog
        isOpen={Boolean(deleteState)}
        onClose={() => {
          if (!isDeleting) setDeleteState(null);
        }}
        onCancel={() => setDeleteState(null)}
        onConfirm={() => void handleDeleteImage()}
        title={deleteState?.title ?? 'Delete image'}
        description={deleteState?.description ?? ''}
        confirmText={deleteState?.force ? 'Delete anyway' : 'Delete image'}
        cancelText="Cancel"
        variant={deleteState?.force ? 'warning' : 'danger'}
        isLoading={isDeleting}
      />

      {previewImageUrl ? (
        <ImagePreviewOverlay
          previewImageUrl={previewImageUrl}
          visualEffect={null}
          imageMotionEffect={null}
          imageMotionSpeed={null}
          imageFilterSettings={null}
          imageMotionSettings={null}
          isPreviewClosing={isPreviewClosing}
          onRequestClose={closeImagePreview}
        />
      ) : null}
    </>
  );
}
