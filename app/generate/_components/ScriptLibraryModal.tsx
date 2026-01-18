'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { X, Loader2, FileText, Sparkles, Plus, Pencil, Trash2, Copy } from 'lucide-react';
import { Pagination } from './Pagination';
import { useToast } from '@/components/ui/toast';

interface ScriptSentenceDto {
  id: string;
  text: string;
  index: number;
  image?: {
    id: string;
    image: string;
  } | null;
}

interface ScriptDto {
  id: string;
  title: string | null;
  script: string;
  created_at: string;
   voice?: {
     id: string;
     voice: string;
   } | null;
  sentences?: ScriptSentenceDto[];
}

interface ScriptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScript: (script: ScriptDto) => void;
}

export function ScriptLibraryModal({
  isOpen,
  onClose,
  onSelectScript,
}: ScriptLibraryModalProps) {
  const { showToast, ToastContainer } = useToast();
  const [scripts, setScripts] = useState<ScriptDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [isAddScriptModalOpen, setIsAddScriptModalOpen] = useState(false);
  const [isEditScriptModalOpen, setIsEditScriptModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<ScriptDto | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingScript, setDeletingScript] = useState<ScriptDto | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchScripts(1);
    }
  }, [isOpen]);

  const fetchScripts = async (pageToLoad = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        items: ScriptDto[];
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

  const computeSentencesFromScript = (scriptText: string) => {
    return scriptText
      .split('.')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text) => ({ text }));
  };

  const refreshAfterMutation = async (preferredPage = page) => {
    const nextTotal = Math.max(0, total - 1);
    const nextTotalPages = nextTotal > 0 ? Math.max(1, Math.ceil(nextTotal / limit)) : 1;
    const safePage = Math.min(preferredPage, nextTotalPages);
    await fetchScripts(safePage);
  };

  const handleSelect = (script: ScriptDto) => {
    setSelectedId(script.id);
    setTimeout(() => {
      onSelectScript(script);
      onClose();
    }, 250);
  };

  const handleCopyScript = async (e: React.MouseEvent, script: ScriptDto) => {
    e.stopPropagation();

    const textToCopy = (script.script || '').trim();
    if (!textToCopy) {
      showToast('Nothing to copy', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast('Script copied to clipboard', 'success');
      return;
    } catch {
      // Fallback for older browsers / blocked clipboard permissions
      try {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(ok ? 'Script copied to clipboard' : 'Failed to copy script', ok ? 'success' : 'error');
      } catch {
        showToast('Failed to copy script', 'error');
      }
    }
  };

  if (!isOpen) return null;

  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <ToastContainer />
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
                <h2 className="text-xl font-bold text-gray-900">Script Library</h2>
                <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  Review and reuse your saved drafts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsAddScriptModalOpen(true)}
                className="bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-200 gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Script
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/80 rounded-xl transition-all hover:scale-105 hover:shadow-md group"
              >
                <X className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-linear-to-b from-transparent to-gray-50/50">
          {isLoading ? (
            <div className="animate-in fade-in duration-300">
              <div className="mb-3 flex items-center justify-between">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-xl bg-linear-to-r from-gray-200 to-gray-300 animate-pulse">
                    <div className="space-y-3">
                      <div className="h-5 w-3/4 bg-gray-300 rounded" />
                      <div className="h-3 w-full bg-gray-300 rounded" />
                      <div className="h-3 w-5/6 bg-gray-300 rounded" />
                      <div className="flex gap-2 mt-2">
                        <div className="h-6 w-20 bg-gray-300 rounded-full" />
                        <div className="h-6 w-24 bg-gray-300 rounded-full" />
                      </div>
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
              <p className="text-sm font-medium text-gray-700 mb-1">No drafts yet</p>
              <p className="text-xs text-gray-500 text-center max-w-sm">
                Save scripts as drafts from the Script section to see them here.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Click a script to select
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <span>{total} total</span>
                </div>
              </div>
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {scripts.map((script) => {
                const sentences = script.sentences || [];
                const withImages = sentences.filter((s) => s.image).length;

                return (
                  <div
                    key={script.id}
                    className={`rounded-xl border px-4 py-3 transition-all duration-200 bg-white hover:shadow-md hover:border-primary/40 group ${
                      selectedId === script.id ? 'border-primary ring-2 ring-primary/30' : 'border-gray-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(script)}
                      className="w-full text-left flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                            {script.title || 'Untitled Script'}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(script.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {script.script}
                        </p>
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingScript(script);
                              setIsEditScriptModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition-all duration-200 flex items-center gap-1.5"
                            title="Edit script"
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="text-[10px] font-medium">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleCopyScript(e, script)}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 flex items-center gap-1.5"
                            title="Copy script"
                          >
                            <Copy className="h-3 w-3" />
                            <span className="text-[10px] font-medium">Copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingScript(script);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all duration-200 flex items-center gap-1.5"
                            title="Delete script"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="text-[10px] font-medium">Delete</span>
                          </button>
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
                  </div>
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
            Select a script draft to load its text and sentences into the generator.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            className="gap-2 hover:bg-gray-50"
          >
            <X className="h-3.5 w-3.5" />
            Close
          </Button>
        </div>
      </div>

      {/* Add Script Modal */}
      <AddScriptModal
        isOpen={isAddScriptModalOpen}
        onClose={() => setIsAddScriptModalOpen(false)}
        onScriptAdded={() => {
          setIsAddScriptModalOpen(false);
          setPage(1);
          fetchScripts(1);
        }}
      />

      {/* Edit Script Modal */}
      <EditScriptModal
        isOpen={isEditScriptModalOpen}
        script={editingScript}
        onClose={() => {
          setIsEditScriptModalOpen(false);
          setEditingScript(null);
        }}
        onScriptUpdated={async () => {
          setIsEditScriptModalOpen(false);
          setEditingScript(null);
          await fetchScripts(page);
        }}
        computeSentencesFromScript={computeSentencesFromScript}
      />

      {/* Delete Confirmation */}
      <ConfirmDeleteScriptModal
        isOpen={isDeleteConfirmOpen}
        script={deletingScript}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setDeletingScript(null);
        }}
        onDeleted={async () => {
          setIsDeleteConfirmOpen(false);
          setDeletingScript(null);
          await refreshAfterMutation(page);
        }}
      />
    </div>
  );
}

// Add Script Modal Component
interface AddScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScriptAdded: () => void;
}

function AddScriptModal({ isOpen, onClose, onScriptAdded }: AddScriptModalProps) {
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setScript('');
      setIsSubmitting(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload: { script: string; title?: string } = {
        script: script.trim(),
      };

      const trimmedTitle = title.trim();
      if (trimmedTitle) payload.title = trimmedTitle;

      await api.post('/scripts', payload);
      onScriptAdded();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to create script:', err);
      setSubmitError('Failed to save script. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200/50 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-gray-200/80 bg-linear-to-r from-purple-50 via-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-linear-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Script</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Save a script to your library for future use
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
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {submitError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            ) : null}

            {/* Title Input */}
            <div className="space-y-2">
              <label htmlFor="script-title" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                Script Title
              </label>
              <input
                id="script-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-sm bg-white/50"
              />
              <p className="text-[11px] text-gray-500">
                Optional — leave empty to save as “Untitled Script”.
              </p>
            </div>

            {/* Script Content */}
            <div className="space-y-2 flex-1">
              <label htmlFor="script-content" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Script Content
              </label>
              <textarea
                id="script-content"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Paste or type your script here...\n\nSeparate sentences with periods for automatic breakdown."
                rows={12}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm resize-none bg-white/50 font-mono"
                required
              />
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="font-medium">{script.split('.').filter(s => s.trim()).length}</span>
                sentences detected
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200/80 bg-gray-50/50">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="gap-2"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !script.trim()}
              className="bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Add to Library
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Script Modal Component
interface EditScriptModalProps {
  isOpen: boolean;
  script: ScriptDto | null;
  onClose: () => void;
  onScriptUpdated: () => void;
  computeSentencesFromScript: (scriptText: string) => Array<{ text: string }>;
}

function EditScriptModal({
  isOpen,
  script,
  onClose,
  onScriptUpdated,
  computeSentencesFromScript,
}: EditScriptModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && script) {
      setTitle(script.title ?? '');
      setContent(script.script ?? '');
      setIsSubmitting(false);
      setSubmitError(null);
    }
    if (!isOpen) {
      setIsSubmitting(false);
      setSubmitError(null);
    }
  }, [isOpen, script]);

  if (!isOpen || !script) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const trimmedTitle = title.trim();
      const trimmedScript = content.trim();

      const payload: {
        title?: string;
        script?: string;
        sentences?: Array<{ text: string }>;
      } = {
        title: trimmedTitle ? trimmedTitle : '',
        script: trimmedScript,
      };

      // Safety: only auto-generate sentences if the script currently has none.
      // This avoids unintentionally wiping sentence-level image assignments.
      if ((script.sentences?.length ?? 0) === 0) {
        payload.sentences = computeSentencesFromScript(trimmedScript);
      }

      await api.patch(`/scripts/${script.id}`, payload);
      onScriptUpdated();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update script:', err);
      setSubmitError('Failed to update script. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200/50 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 py-4 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-linear-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                <Pencil className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Script</h2>
                <p className="text-xs text-gray-600 mt-0.5">Update your draft and save changes</p>
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

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {submitError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            ) : null}

            <div className="space-y-2">
              <label
                htmlFor="edit-script-title"
                className="text-sm font-semibold text-gray-700 flex items-center gap-2"
              >
                <FileText className="h-4 w-4 text-purple-600" />
                Script Title
              </label>
              <input
                id="edit-script-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-sm bg-white/50"
              />
              <p className="text-[11px] text-gray-500">Leave empty to save as “Untitled Script”.</p>
            </div>

            <div className="space-y-2 flex-1">
              <label
                htmlFor="edit-script-content"
                className="text-sm font-semibold text-gray-700 flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Script Content
              </label>
              <textarea
                id="edit-script-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Update your script..."
                rows={12}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm resize-none bg-white/50 font-mono"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200/80 bg-gray-50/50">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="gap-2"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !content.trim()}
              className="bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete confirmation modal
interface ConfirmDeleteScriptModalProps {
  isOpen: boolean;
  script: ScriptDto | null;
  onClose: () => void;
  onDeleted: () => void;
}

function ConfirmDeleteScriptModal({
  isOpen,
  script,
  onClose,
  onDeleted,
}: ConfirmDeleteScriptModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen || !script) return null;

  const handleDelete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await api.delete(`/scripts/${script.id}`);
      onDeleted();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete script:', err);
      setSubmitError('Failed to delete script. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200/50 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200/80 bg-linear-to-r from-red-50 via-white to-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-600 rounded-xl shadow-lg">
                <Trash2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete Script</h2>
                <p className="text-xs text-gray-600 mt-0.5">This action can’t be undone.</p>
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

        <div className="p-6 space-y-4">
          {submitError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-800 font-semibold">
              {script.title || 'Untitled Script'}
            </p>
            <p className="text-xs text-gray-600 mt-1 line-clamp-3">{script.script}</p>
          </div>

          <p className="text-sm text-gray-700">
            Are you sure you want to permanently delete this script?
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200/80 bg-gray-50/50">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="gap-2"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
