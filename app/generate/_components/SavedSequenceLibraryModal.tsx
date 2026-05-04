'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FolderOpen,
  Layers3,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  SavedSequenceDetailDto,
  SavedSequenceSummaryDto,
} from '../_types/saved-sequences';
import { Pagination } from './Pagination';

type ToastType = 'info' | 'success' | 'warning' | 'error';

type SavedSequenceLibraryModalProps = {
  isOpen: boolean;
  isApplying?: boolean;
  onClose: () => void;
  onApply: (sequence: SavedSequenceDetailDto) => void | Promise<void>;
  onToast: (message: string, type?: ToastType) => void;
};

const PAGE_SIZE = 10;

function getErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }
  if (Array.isArray(message)) {
    const firstMessage = message.find(
      (value) => typeof value === 'string' && value.trim(),
    );
    if (typeof firstMessage === 'string') {
      return firstMessage.trim();
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

function getSavedSequenceSceneCount(item: SavedSequenceSummaryDto) {
  return Number(item.scene_count ?? item.sceneCount ?? 0) || 0;
}

function formatSavedSequenceDate(item: SavedSequenceSummaryDto) {
  const rawValue =
    String(item.updated_at ?? item.updatedAt ?? item.created_at ?? item.createdAt ?? '').trim();
  if (!rawValue) return 'Unknown date';

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
}

export function SavedSequenceLibraryModal({
  isOpen,
  isApplying = false,
  onClose,
  onApply,
  onToast,
}: SavedSequenceLibraryModalProps) {
  const [items, setItems] = useState<SavedSequenceSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTitle, setSearchTitle] = useState('');
  const [debouncedSearchTitle, setDebouncedSearchTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearchTitle('');
    setDebouncedSearchTitle('');
    setEditingId(null);
    setEditingTitle('');
    setPage(1);
  }, [isOpen]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTitle(searchTitle.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchTitle]);

  const fetchSavedSequences = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<{
          items: SavedSequenceSummaryDto[];
          total: number;
          page: number;
          limit: number;
        }>('/saved-sequences', {
          params: {
            page: pageToLoad,
            limit: PAGE_SIZE,
            ...(debouncedSearchTitle ? { q: debouncedSearchTitle } : {}),
          },
        });

        setItems(Array.isArray(response.data.items) ? response.data.items : []);
        setTotal(Number(response.data.total ?? 0) || 0);
        setPage(Number(response.data.page ?? pageToLoad) || pageToLoad);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError, 'Failed to load saved sequences.'));
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearchTitle],
  );

  useEffect(() => {
    if (!isOpen) return;
    void fetchSavedSequences(1);
  }, [fetchSavedSequences, isOpen]);

  const totalPages = useMemo(
    () => (total > 0 ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1),
    [total],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={() => {
          if (isApplying || loadingId) return;
          onClose();
        }}
      />

      <div className="relative flex h-[min(86vh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl">
        <div className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                <Layers3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Saved Scene Sequences</h3>
                <p className="text-sm text-white/75">
                  Load, rename, or delete reusable scene flows.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isApplying || loadingId) return;
                onClose();
              }}
              className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
              aria-label="Close saved scene sequence library"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-linear-to-b from-slate-50 via-white to-white">
          <div className="border-b border-slate-200/80 px-6 py-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTitle}
                onChange={(event) => setSearchTitle(event.target.value)}
                placeholder="Search saved sequences"
                className="pl-9"
                disabled={isLoading || isApplying}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isLoading ? (
              <div className="flex h-full items-center justify-center gap-3 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading saved sequences...
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <p className="max-w-md text-sm text-red-600">{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void fetchSavedSequences(page);
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-500">
                <Layers3 className="h-10 w-10 text-slate-300" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    No saved sequences yet
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Save a scene flow from the editor to reuse it on other scripts.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {items.map((item) => {
                  const itemId = String(item.id ?? '').trim();
                  const isEditing = editingId === itemId;
                  const isDeleting = deletingId === itemId;
                  const isLoadingItem = loadingId === itemId;
                  const trimmedTitle = editingTitle.trim();

                  return (
                    <div
                      key={itemId}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="space-y-3">
                              <Input
                                value={editingTitle}
                                onChange={(event) => setEditingTitle(event.target.value)}
                                maxLength={255}
                                disabled={isRenaming}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={!trimmedTitle || isRenaming}
                                  onClick={async () => {
                                    if (!trimmedTitle || !itemId) return;
                                    setIsRenaming(true);
                                    try {
                                      await api.patch(
                                        `/saved-sequences/${encodeURIComponent(itemId)}`,
                                        { title: trimmedTitle },
                                      );
                                      setEditingId(null);
                                      setEditingTitle('');
                                      onToast('Saved sequence renamed.', 'success');
                                      await fetchSavedSequences(page);
                                    } catch (renameError) {
                                      onToast(
                                        getErrorMessage(
                                          renameError,
                                          'Failed to rename saved sequence.',
                                        ),
                                        'error',
                                      );
                                    } finally {
                                      setIsRenaming(false);
                                    }
                                  }}
                                >
                                  {isRenaming ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : null}
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isRenaming}
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingTitle('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="truncate text-base font-semibold text-slate-900">
                                {item.title || 'Untitled sequence'}
                              </h4>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                  {getSavedSequenceSceneCount(item)} scenes
                                </span>
                                <span>Updated {formatSavedSequenceDate(item)}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {!isEditing ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-9 w-9"
                              disabled={isApplying || isLoadingItem || isDeleting}
                              onClick={() => {
                                setEditingId(itemId);
                                setEditingTitle(item.title || '');
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-9 w-9 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              disabled={isApplying || isLoadingItem || isDeleting}
                              onClick={async () => {
                                if (!itemId) return;
                                const confirmed = window.confirm(
                                  `Delete saved sequence \"${item.title || 'Untitled sequence'}\"?`,
                                );
                                if (!confirmed) return;

                                setDeletingId(itemId);
                                try {
                                  await api.delete(
                                    `/saved-sequences/${encodeURIComponent(itemId)}`,
                                  );
                                  onToast('Saved sequence deleted.', 'success');
                                  const nextTotal = Math.max(0, total - 1);
                                  const nextTotalPages =
                                    nextTotal > 0
                                      ? Math.max(1, Math.ceil(nextTotal / PAGE_SIZE))
                                      : 1;
                                  const nextPage = Math.min(page, nextTotalPages);
                                  await fetchSavedSequences(nextPage);
                                } catch (deleteError) {
                                  onToast(
                                    getErrorMessage(
                                      deleteError,
                                      'Failed to delete saved sequence.',
                                    ),
                                    'error',
                                  );
                                } finally {
                                  setDeletingId(null);
                                }
                              }}
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      {!isEditing ? (
                        <div className="mt-5 flex justify-end">
                          <Button
                            type="button"
                            disabled={isApplying || isLoadingItem || isDeleting}
                            onClick={async () => {
                              if (!itemId) return;
                              setLoadingId(itemId);
                              try {
                                const response = await api.get<SavedSequenceDetailDto>(
                                  `/saved-sequences/${encodeURIComponent(itemId)}`,
                                );
                                await onApply(response.data);
                                onClose();
                              } catch (applyError) {
                                onToast(
                                  getErrorMessage(
                                    applyError,
                                    'Failed to load saved sequence.',
                                  ),
                                  'error',
                                );
                              } finally {
                                setLoadingId(null);
                              }
                            }}
                          >
                            {isLoadingItem ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <FolderOpen className="mr-2 h-4 w-4" />
                            )}
                            Load Sequence
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200/80 px-6 py-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchSavedSequences} />
          </div>
        </div>
      </div>
    </div>
  );
}