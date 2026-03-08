'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, Check, Music2, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Pagination } from './Pagination';
import { SoundEffectEditModal } from './SoundEffectEditModal';

export type SoundEffectDto = {
  id: string;
  title: string;
  name?: string;
  url: string;
  volume_percent?: number;
  duration_seconds?: number | null;
  is_merged?: boolean;
  created_at?: string;
};

type SoundEffectsLibraryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (items: SoundEffectDto[]) => void;
  fetchPath?: string;
  pageSize?: number;
  title?: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  applyLabel?: string;
};

export function SoundEffectsLibraryModal({
  isOpen,
  onClose,
  onApply,
  fetchPath = '/sound-effects',
  pageSize = 20,
  title = 'Sound Effects Library',
  subtitle = 'Select one or more sound effects to add',
  emptyTitle = 'No saved sound effects yet',
  emptyDescription = 'Upload sound effects from a sentence to build your library.',
  applyLabel = 'Add Selected',
}: SoundEffectsLibraryModalProps) {
  const PAGE_SIZE = pageSize;
  const FILTER_DEBOUNCE_MS = 300;

  const applySavedVolumeToAudio = (audioElement: HTMLAudioElement | null, volumePercent?: number) => {
    if (!audioElement) return;
    const normalizedVolume = Math.max(0, Math.min(1, (Number(volumePercent ?? 100) || 0) / 100));
    audioElement.volume = normalizedVolume;
  };

  const [items, setItems] = useState<SoundEffectDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = PAGE_SIZE;

  const [nameFilter, setNameFilter] = useState('');
  const suppressNextFilterFetchRef = useRef(false);
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedById, setSelectedById] = useState<Record<string, SoundEffectDto>>({});

  const [editTarget, setEditTarget] = useState<SoundEffectDto | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingById, setIsDeletingById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
    setSelectedById({});
    setNameFilter('');
    suppressNextFilterFetchRef.current = true;
    void fetchItems(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (suppressNextFilterFetchRef.current) {
      suppressNextFilterFetchRef.current = false;
      return;
    }

    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current);
    }

    filterDebounceRef.current = setTimeout(() => {
      setPage(1);
      void fetchItems(1, nameFilter);
    }, FILTER_DEBOUNCE_MS);

    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current);
        filterDebounceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameFilter, isOpen]);

  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;

  const selectedCount = useMemo(() => Object.keys(selectedById).length, [selectedById]);

  const fetchItems = async (pageToLoad = 1, query: string = nameFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        items: SoundEffectDto[];
        total: number;
        page: number;
        limit: number;
      }>(fetchPath, {
        params: { page: pageToLoad, limit: PAGE_SIZE, q: String(query ?? '').trim() || undefined },
      });

      const data = response.data;
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total ?? 0) || 0);
      setPage(Number(data.page ?? pageToLoad) || pageToLoad);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch sound effects:', err);
      setError('Failed to load your sound effects library');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelected = (item: SoundEffectDto) => {
    setSelectedById((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
        return next;
      }
      next[item.id] = item;
      return next;
    });
  };

  const handleApply = () => {
    const selected = Object.values(selectedById);
    onApply(selected);
    onClose();
  };

  const saveEdits = async (params: { id: string; name: string; volumePercent: number }) => {
    const id = String(params.id ?? '').trim();
    if (!id) return;

    const nextName = String(params.name ?? '').trim();
    const volumePercent = Math.max(0, Math.min(300, Number(params.volumePercent) || 0));

    setIsSavingEdit(true);
    setError(null);
    try {
      // Update both fields. We keep the existing endpoints for compatibility.
      const [renamedRes, volumeRes] = await Promise.all([
        api.patch<SoundEffectDto>(`/sound-effects/${id}`, { name: nextName }),
        api.patch<SoundEffectDto>(`/sound-effects/volume/${id}`, {
          volumePercent,
        }),
      ]);

      const updated: SoundEffectDto = {
        ...(renamedRes.data ?? ({} as any)),
        ...(volumeRes.data ?? ({} as any)),
      };

      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...updated } : x)));
      setSelectedById((prev) => {
        if (!prev[id]) return prev;
        return { ...prev, [id]: { ...prev[id], ...updated } };
      });

      setEditTarget(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update sound effect', err);
      setError('Failed to update sound effect');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const deleteItem = async (id: string) => {
    setIsDeletingById((prev) => ({ ...prev, [id]: true }));
    try {
      await api.delete(`/sound-effects/${id}`);

      setItems((prev) => prev.filter((x) => x.id !== id));
      setSelectedById((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });

      if (editTarget?.id === id) setEditTarget(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete sound effect', err);
      setError('Failed to delete sound effect');
    } finally {
      setIsDeletingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-linear-to-br from-white via-gray-50 to-indigo-50/30 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden border border-gray-200/60 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <SoundEffectEditModal
          isOpen={Boolean(editTarget)}
          title="Edit sound effect"
          audioUrl={editTarget?.url ?? null}
          initialName={String(editTarget?.name ?? editTarget?.title ?? '').trim()}
          initialVolumePercent={Number(editTarget?.volume_percent ?? 100) || 100}
          isSaving={isSavingEdit}
          onClose={() => setEditTarget(null)}
          onSave={(values) => {
            if (!editTarget) return;
            return saveEdits({ id: editTarget.id, ...values });
          }}
        />

        <div className="relative px-8 py-6 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <Music2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-linear-to-r from-gray-900 via-purple-900 to-indigo-900 bg-clip-text text-transparent">
                  {title}
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {subtitle}
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

        <div className="flex-1 overflow-y-auto p-8 bg-linear-to-b from-transparent to-gray-50/60">
          {isLoading ? (
            <div className="animate-in fade-in duration-300">
              <div className="mb-4 flex items-center justify-between">
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-xl bg-linear-to-r from-gray-200 to-gray-300 animate-pulse"
                  >
                    <div className="w-6 h-6 rounded bg-gray-300" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/3 bg-gray-300 rounded" />
                      <div className="h-3 w-1/3 bg-gray-300 rounded" />
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
                onClick={() => fetchItems(page)}
                variant="outline"
                size="sm"
                className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
              >
                <Loader2 className="h-3.5 w-3.5" />
                Try Again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-6 bg-linear-to-br from-gray-50 to-indigo-50 rounded-3xl shadow-xl relative border border-gray-200">
                <Music2 className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-base text-gray-700 font-semibold mb-2 mt-6">{emptyTitle}</p>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                {emptyDescription}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <Input
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Filter by name..."
                />
              </div>

              <div className="mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Click to select (multi-select)
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <span>{total} total</span>
                </div>
              </div>

              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {items.map((it) => {
                  const isSelected = Boolean(selectedById[it.id]);
                  const resolvedVolume = Number(it.volume_percent ?? 100) || 100;
                  const displayName = String(it.name ?? it.title ?? 'Sound effect').trim() || 'Sound effect';
                  const isDeleting = Boolean(isDeletingById[it.id]);

                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => toggleSelected(it)}
                      className={`w-full text-left group relative rounded-xl border-2 p-4 flex items-start gap-4 transition-all duration-200 bg-white/70 hover:bg-white shadow-sm hover:shadow-md ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-300'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div
                        className={`mt-1 h-6 w-6 rounded-md border flex items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="h-4 w-4 text-white" />
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate" title={displayName}>
                              {displayName}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                              {Math.round(resolvedVolume)}%
                            </span>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditTarget(it);
                              }}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                void deleteItem(it.id);
                              }}
                              disabled={isDeleting}
                              title="Delete from library"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <audio
                            controls
                            src={it.url}
                            className="w-full h-8"
                            ref={(node) => applySavedVolumeToAudio(node, resolvedVolume)}
                            onPlay={(event) => applySavedVolumeToAudio(event.currentTarget, resolvedVolume)}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(nextPage) => {
                    setPage(nextPage);
                    void fetchItems(nextPage, nameFilter);
                  }}
                />
              </div>
            </>
          )}
        </div>

        {!isLoading && !error ? (
          <div className="flex items-center justify-between gap-3 px-8 py-5 border-t border-gray-200/80 bg-linear-to-r from-gray-50 to-indigo-50/50">
            <p className="text-xs text-gray-500">
              {selectedCount > 0
                ? `${selectedCount} selected`
                : 'Select one or more sound effects'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="gap-2 hover:bg-white transition-all"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                size="sm"
                disabled={selectedCount === 0}
                className="gap-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
              >
                {applyLabel}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
