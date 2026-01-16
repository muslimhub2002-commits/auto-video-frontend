'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { X, Loader2, FileText, Sparkles } from 'lucide-react';
import { Pagination } from './Pagination';

interface ScriptSentenceDto {
  id: string;
  text: string;
  index: number;
  image?: {
    id: string;
    image: string;
  } | null;
}

export interface ScriptReferenceDto {
  id: string;
  title: string | null;
  script: string;
  created_at?: string;
  voice?: {
    id: string;
    voice: string;
  } | null;
  sentences?: ScriptSentenceDto[];
}

interface ScriptReferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelected?: ScriptReferenceDto[];
  onApply: (scripts: ScriptReferenceDto[]) => void;
}

export function ScriptReferencesModal({
  isOpen,
  onClose,
  initialSelected,
  onApply,
}: ScriptReferencesModalProps) {
  const [scripts, setScripts] = useState<ScriptReferenceDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  // Keep selection across pages.
  const [selectedById, setSelectedById] = useState<Record<string, ScriptReferenceDto>>({});

  useEffect(() => {
    if (!isOpen) return;

    const initialMap: Record<string, ScriptReferenceDto> = {};
    for (const s of initialSelected ?? []) {
      if (s?.id) initialMap[s.id] = s;
    }
    setSelectedById(initialMap);

    setPage(1);
    fetchScripts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchScripts = async (pageToLoad = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        items: ScriptReferenceDto[];
        total: number;
        page: number;
        limit: number;
      }>('/scripts', {
        params: { page: pageToLoad, limit },
      });
      const data = response.data;
      const items = data.items || [];
      setScripts(items);
      setTotal(data.total ?? 0);
      setPage(data.page ?? pageToLoad);
      setLimit(data.limit ?? limit);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch scripts:', err);
      setError('Failed to load your script drafts');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCount = Object.keys(selectedById).length;
  const selectedList = useMemo(() => Object.values(selectedById), [selectedById]);

  const toggleSelected = (script: ScriptReferenceDto) => {
    setSelectedById((prev) => {
      const next = { ...prev };
      if (next[script.id]) {
        delete next[script.id];
      } else {
        next[script.id] = script;
      }
      return next;
    });
  };

  const handleApply = () => {
    onApply(selectedList);
    onClose();
  };

  if (!isOpen) return null;

  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-linear-to-br from-white via-gray-50 to-blue-50/30 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200/50 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Reference Scripts
                </h2>
                <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  Select scripts to reuse their writing style
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/80 rounded-xl transition-all hover:scale-105 hover:shadow-md group"
            >
              <X className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-linear-to-b from-transparent to-gray-50/50">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {isLoading ? 'Loading…' : 'Select any number of scripts'}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 font-medium shadow-sm">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {selectedCount} selected
              </span>
              <span className="text-gray-400">•</span>
              <span>
                Page {page} of {totalPages}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="animate-in fade-in duration-300">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-linear-to-r from-gray-200 to-gray-300 animate-pulse"
                  >
                    <div className="space-y-3">
                      <div className="h-5 w-3/4 bg-gray-300 rounded" />
                      <div className="h-3 w-full bg-gray-300 rounded" />
                      <div className="h-3 w-5/6 bg-gray-300 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-red-600 font-semibold mb-2">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchScripts(page)}
                className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
              >
                <Loader2 className="h-3.5 w-3.5" />
                Try Again
              </Button>
            </div>
          ) : scripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-10 w-10 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                No drafts yet
              </p>
              <p className="text-xs text-gray-500 text-center max-w-sm">
                Save scripts as drafts from the Script section to see them here.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {scripts.map((script) => {
                  const isSelected = Boolean(selectedById[script.id]);
                  const sentences = script.sentences || [];
                  const withImages = sentences.filter((s) => s.image).length;

                  return (
                    <button
                      key={script.id}
                      type="button"
                      onClick={() => toggleSelected(script)}
                      className={`group w-full text-left rounded-xl border px-4 py-3 transition-all duration-200 bg-white hover:shadow-md hover:border-primary/40 flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-purple-500 ring-2 ring-purple-200 shadow-sm'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="relative mt-0.5 flex-shrink-0">
                          <div
                            className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                              isSelected
                                ? 'bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-500 shadow-md shadow-purple-200'
                                : 'bg-white border-gray-300 group-hover:border-purple-400 group-hover:shadow-sm'
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="h-3 w-3 text-white animate-in zoom-in-50 duration-200"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                              {script.title || 'Untitled Script'}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {script.created_at
                                ? new Date(script.created_at).toLocaleString()
                                : 'Selected'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {script.script}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-[11px] text-gray-500">
                        <span>
                          {sentences.length} sentence{sentences.length === 1 ? '' : 's'}
                        </span>
                        <span>
                          {withImages} with image{withImages === 1 ? '' : 's'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={fetchScripts}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200/80 bg-white/80">
          <p className="text-[11px] text-gray-500">
            These scripts will be injected into the AI prompt history as style references.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              className="gap-2 hover:bg-gray-50"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={selectedCount === 0}
              className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              Apply ({selectedCount})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
