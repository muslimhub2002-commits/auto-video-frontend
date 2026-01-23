'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { AlertDialog } from '@/components/ui/alert-dialog';
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

interface ScriptTemplateDto {
  id: string;
  title: string;
  description?: string | null;
  created_at?: string;
  scripts: ScriptReferenceDto[];
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
  const [activeTab, setActiveTab] = useState<'scripts' | 'templates'>('scripts');

  const [scripts, setScripts] = useState<ScriptReferenceDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  const [templates, setTemplates] = useState<ScriptTemplateDto[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [templatesPage, setTemplatesPage] = useState(1);
  const [templatesTotal, setTemplatesTotal] = useState(0);
  const [templatesLimit, setTemplatesLimit] = useState(20);

  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [createTemplateError, setCreateTemplateError] = useState<string | null>(null);

  const [templateScripts, setTemplateScripts] = useState<ScriptReferenceDto[]>([]);
  const [isLoadingTemplateScripts, setIsLoadingTemplateScripts] = useState(false);
  const [templateScriptsError, setTemplateScriptsError] = useState<string | null>(null);
  const [templateScriptsPage, setTemplateScriptsPage] = useState(1);
  const [templateScriptsTotal, setTemplateScriptsTotal] = useState(0);
  const [templateScriptsLimit, setTemplateScriptsLimit] = useState(20);

  const [templateSelectedById, setTemplateSelectedById] = useState<Record<string, ScriptReferenceDto>>({});

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Keep selection across pages.
  const [selectedById, setSelectedById] = useState<Record<string, ScriptReferenceDto>>({});

  useEffect(() => {
    if (!isOpen) return;

    const initialMap: Record<string, ScriptReferenceDto> = {};
    for (const s of initialSelected ?? []) {
      if (s?.id) initialMap[s.id] = s;
    }
    setSelectedById(initialMap);

    setActiveTab('scripts');
    setPage(1);
    fetchScripts(1);

    setTemplatesPage(1);
    fetchTemplates(1);
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

  const fetchTemplateScripts = async (pageToLoad = 1) => {
    setIsLoadingTemplateScripts(true);
    setTemplateScriptsError(null);
    try {
      const response = await api.get<{
        items: ScriptReferenceDto[];
        total: number;
        page: number;
        limit: number;
      }>('/scripts', {
        params: { page: pageToLoad, limit: templateScriptsLimit },
      });

      const data = response.data;
      const items = data.items || [];

      setTemplateScripts(items);
      setTemplateScriptsTotal(data.total ?? 0);
      setTemplateScriptsPage(data.page ?? pageToLoad);
      setTemplateScriptsLimit(data.limit ?? templateScriptsLimit);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch scripts for template modal:', err);
      setTemplateScriptsError('Failed to load scripts');
    } finally {
      setIsLoadingTemplateScripts(false);
    }
  };

  const fetchTemplates = async (pageToLoad = 1) => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);
    try {
      const response = await api.get<{
        items: ScriptTemplateDto[];
        total: number;
        page: number;
        limit: number;
      }>('/script-templates', {
        params: { page: pageToLoad, limit: templatesLimit },
      });

      const data = response.data;
      const items = data.items || [];

      setTemplates(items);
      setTemplatesTotal(data.total ?? 0);
      setTemplatesPage(data.page ?? pageToLoad);
      setTemplatesLimit(data.limit ?? templatesLimit);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch script templates:', err);
      setTemplatesError('Failed to load your script templates');
    } finally {
      setIsLoadingTemplates(false);
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

  const openCreateTemplate = () => {
    setCreateTemplateError(null);
    setTemplateTitle('');
    setEditingTemplateId(null);
    setTemplateSelectedById({});
    setTemplateScriptsPage(1);
    void fetchTemplateScripts(1);
    setIsCreateTemplateOpen(true);
  };

  const openEditTemplate = (template: ScriptTemplateDto) => {
    setCreateTemplateError(null);
    setEditingTemplateId(template.id);
    setTemplateTitle(template.title ?? '');

    const selectedMap: Record<string, ScriptReferenceDto> = {};
    for (const s of template.scripts ?? []) {
      if (s?.id) selectedMap[s.id] = s;
    }
    setTemplateSelectedById(selectedMap);

    setTemplateScriptsPage(1);
    void fetchTemplateScripts(1);
    setIsCreateTemplateOpen(true);
  };

  const openDeleteModal = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteModalOpen(true);
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/script-templates/${encodeURIComponent(templateToDelete)}`);
      setDeleteModalOpen(false);
      setTemplateToDelete(null);
      await fetchTemplates(1);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete template:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateTemplate = async () => {
    const title = templateTitle.trim();
    if (!title) {
      setCreateTemplateError('Template title is required');
      return;
    }

    const scriptIds = Object.keys(templateSelectedById);
    if (scriptIds.length === 0) {
      setCreateTemplateError('Select at least one script');
      return;
    }

    setIsCreatingTemplate(true);
    setCreateTemplateError(null);
    try {
      if (editingTemplateId) {
        await api.patch(`/script-templates/${encodeURIComponent(editingTemplateId)}`, {
          title,
          scriptIds,
        });
      } else {
        await api.post('/script-templates', {
          title,
          scriptIds,
        });
      }

      setIsCreateTemplateOpen(false);
      setEditingTemplateId(null);
      setActiveTab('templates');
      await fetchTemplates(1);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to create script template:', err);
      setCreateTemplateError(editingTemplateId ? 'Failed to update template' : 'Failed to create template');
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  if (!isOpen) return null;

  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  const templatesTotalPages = templatesTotal > 0 ? Math.max(1, Math.ceil(templatesTotal / templatesLimit)) : 1;
  const templateScriptsTotalPages = templateScriptsTotal > 0 ? Math.max(1, Math.ceil(templateScriptsTotal / templateScriptsLimit)) : 1;

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
                  {activeTab === 'scripts'
                    ? 'Select scripts to reuse their writing style'
                    : 'Manage reusable script collections'}
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
          {/* Tabs */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-white/80 border border-gray-200 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab('scripts')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'scripts'
                  ? 'bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                All Scripts
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'templates'
                  ? 'bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Script Templates
              </button>
            </div>

            {activeTab === 'templates' ? (
              <Button
                type="button"
                size="sm"
                onClick={openCreateTemplate}
                className="gap-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                Add Template
              </Button>
            ) : null}
          </div>

          {activeTab === 'scripts' ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {isLoading ? 'Loading…' : 'Select any number of scripts'}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-linear-to-r from-purple-100 to-indigo-100 text-purple-700 font-medium shadow-sm">
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
                          className={`group w-full text-left rounded-xl border px-4 py-3 transition-all duration-200 bg-white hover:shadow-md hover:border-primary/40 flex items-start justify-between gap-3 ${isSelected
                            ? 'border-purple-500 ring-2 ring-purple-200 shadow-sm'
                            : 'border-gray-200 hover:border-purple-300'
                            }`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="relative mt-0.5 shrink-0">
                              <div
                                className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${isSelected
                                  ? 'bg-linear-to-br from-purple-500 to-indigo-600 border-purple-500 shadow-md shadow-purple-200'
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
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {isLoadingTemplates ? 'Loading Templates…' : 'Your Template Collections'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Browse your saved templates and select one to apply
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 rounded-lg bg-gray-100 font-medium">
                    Page {templatesPage} of {templatesTotalPages}
                  </span>
                </div>
              </div>

              {isLoadingTemplates ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm animate-pulse"
                    >
                      <div className="flex items-start gap-5">
                        <div className="p-3 rounded-xl bg-gray-200 shrink-0">
                          <div className="h-6 w-6" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="h-5 w-48 bg-gray-200 rounded-lg" />
                          <div className="h-3 w-32 bg-gray-200 rounded" />
                          <div className="flex flex-wrap gap-2 mt-3">
                            <div className="h-6 w-24 bg-gray-200 rounded-full" />
                            <div className="h-6 w-32 bg-gray-200 rounded-full" />
                            <div className="h-6 w-20 bg-gray-200 rounded-full" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-9 w-16 bg-gray-200 rounded-lg" />
                          <div className="h-9 w-16 bg-gray-200 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : templatesError ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="p-4 rounded-2xl bg-red-50 mb-4">
                    <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-600 font-bold mb-2">{templatesError}</p>
                  <p className="text-xs text-gray-500 mb-4">Something went wrong while loading your templates</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchTemplates(templatesPage)}
                    className="gap-2 border-red-200 text-red-700 hover:bg-red-50 shadow-sm"
                  >
                    <Loader2 className="h-3.5 w-3.5" />
                    Try Again
                  </Button>
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-linear-to-r from-purple-100 to-indigo-100 rounded-full blur-2xl opacity-50" />
                    <div className="relative p-5 rounded-2xl bg-linear-to-br from-purple-50 to-indigo-50 border-2 border-purple-200/50 shadow-lg">
                      <Sparkles className="h-12 w-12 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">
                    Create Your First Template
                  </h3>
                  <p className="text-sm text-gray-600 text-center max-w-sm mb-6">
                    Templates let you save collections of scripts to quickly reuse their writing style and tone across different projects.
                  </p>
                  <div className="flex flex-col gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">1</span>
                      <span>Click "Add Template" to save your collection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">2</span>
                      <span>Browse and select your favorite scripts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">3</span>
                      <span>Click Create Template</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {templates.map((t) => {
                      const count = t.scripts?.length ?? 0;
                      const scriptTitles = (t.scripts ?? []).map((s) => s.title || 'Untitled Script');

                      return (
                        <div
                          key={t.id}
                          className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white hover:border-purple-300 hover:shadow-lg transition-all duration-300 p-6"
                        >
                          <div className="flex items-start gap-5">
                            <div className="p-3 rounded-xl bg-linear-to-br from-purple-100 to-indigo-100 text-purple-600 shadow-sm group-hover:shadow-md transition-shadow shrink-0">
                              <Sparkles className="h-6 w-6" />
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-base font-bold text-gray-900">
                                  {t.title}
                                </h4>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                                  <FileText className="h-3 w-3" />
                                  {count}
                                </span>
                              </div>
                              
                              <p className="text-xs text-gray-500 mb-3">
                                Created {t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'recently'}
                              </p>
                              
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                  Included Scripts:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {scriptTitles.slice(0, 5).map((name, idx) => (
                                    <span
                                      key={`${t.id}-s-${idx}`}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-medium border border-gray-200"
                                    >
                                      <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      {name}
                                    </span>
                                  ))}
                                  {count > 5 ? (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                                      +{count - 5} more
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onApply(t.scripts || []);
                                  onClose();
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-purple-200 bg-linear-to-r from-purple-50 to-indigo-50 text-sm font-semibold text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-all shadow-sm hover:shadow"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Select
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditTemplate(t)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-blue-200 bg-white text-sm font-semibold text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm hover:shadow"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteModal(t.id)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-red-200 bg-white text-sm font-semibold text-red-700 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm hover:shadow"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                          
                          <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-purple-100/20 to-indigo-100/20 rounded-full blur-3xl -z-10 group-hover:scale-150 transition-transform duration-500" />
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6">
                    <Pagination
                      currentPage={templatesPage}
                      totalPages={templatesTotalPages}
                      onPageChange={fetchTemplates}
                    />
                  </div>
                </>
              )}
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
            {activeTab === 'scripts' ? (
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                disabled={selectedCount === 0}
                className="gap-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                Apply ({selectedCount})
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      {isCreateTemplateOpen ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsCreateTemplateOpen(false)}
        >
          <div
            className="w-full bg-white max-w-5xl rounded-3xl bg-linear-to-br from-white via-gray-50 to-purple-50/20 shadow-2xl border border-gray-200/50 overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative px-7 py-5 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-linear-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {editingTemplateId ? 'Edit Template' : 'Create New Template'}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Build a reusable collection of reference scripts
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateTemplateOpen(false)}
                  className="p-2 hover:bg-white/80 rounded-xl transition-all hover:scale-105 hover:shadow-md group"
                >
                  <X className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                </button>
              </div>
            </div>

            <div className="p-7 space-y-5 bg-linear-to-b from-transparent to-gray-50/30 max-h-[calc(99vh-200px)] overflow-y-auto scrollbar-hide overscroll-contain touch-pan-y">
              {createTemplateError ? (
                <div className="rounded-xl border border-red-200 bg-linear-to-r from-red-50 to-pink-50 px-4 py-3 shadow-sm animate-in slide-in-from-top-2 duration-200">
                  <p className="text-sm text-red-700 font-medium">{createTemplateError}</p>
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">1</span>
                  Template Name
                </label>
                <input
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-4 focus:ring-purple-100 focus:border-purple-400 bg-white shadow-sm hover:border-gray-300"
                  placeholder="e.g., Engaging Story Hooks, Product Showcases, Tutorial Scripts..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">2</span>
                  Select Scripts
                </label>
                
                <div className="rounded-2xl border-2 border-gray-200 bg-white shadow-lg overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200 bg-linear-to-r from-purple-50/50 to-indigo-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-gray-800">
                        Available Scripts
                      </p>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-linear-to-r from-purple-100 to-indigo-100 text-purple-700 font-semibold text-xs shadow-sm">
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
                        {Object.keys(templateSelectedById).length} selected
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      Page {templateScriptsPage} of {templateScriptsTotalPages}
                    </p>
                  </div>

                  <div className="max-h-80 overflow-y-auto bg-gray-50/30 scrollbar-hide overscroll-contain touch-pan-y">
                    {isLoadingTemplateScripts ? (
                      <div className="divide-y divide-gray-100">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="px-5 py-4 flex items-start gap-4 animate-pulse"
                          >
                            <div className="h-6 w-6 rounded-lg bg-gray-300 shrink-0" />
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="h-4 w-3/4 bg-gray-300 rounded" />
                              <div className="h-3 w-full bg-gray-200 rounded" />
                              <div className="h-3 w-5/6 bg-gray-200 rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : templateScriptsError ? (
                      <div className="p-6">
                        <p className="text-sm text-red-600 font-semibold mb-3">{templateScriptsError}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => fetchTemplateScripts(templateScriptsPage)}
                          className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <Loader2 className="h-3.5 w-3.5" />
                          Try Again
                        </Button>
                      </div>
                    ) : templateScripts.length === 0 ? (
                      <div className="p-6 text-center">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-700">No scripts available</p>
                        <p className="text-xs text-gray-500 mt-1">Create some scripts first to add them to templates</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {templateScripts.map((s) => {
                          const isSelected = Boolean(templateSelectedById[s.id]);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setTemplateSelectedById((prev) => {
                                  const next = { ...prev };
                                  if (next[s.id]) delete next[s.id];
                                  else next[s.id] = s;
                                  return next;
                                });
                              }}
                              className={`w-full text-left px-5 py-4 hover:bg-purple-50/30 flex items-start gap-4 transition-all duration-200 group ${
                                isSelected ? 'bg-purple-50/50' : 'bg-white hover:shadow-sm'
                              }`}
                            >
                              <div className="relative mt-0.5 shrink-0">
                                <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-linear-to-br from-purple-500 to-indigo-600 border-purple-500 shadow-md shadow-purple-200 scale-105'
                                    : 'bg-white border-gray-300 group-hover:border-purple-400 group-hover:shadow-sm'
                                }`}>
                                  {isSelected ? (
                                    <svg
                                      className="h-4 w-4 text-white animate-in zoom-in-50 duration-200"
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
                                  ) : null}
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-bold text-gray-900 truncate">
                                    {s.title || 'Untitled Script'}
                                  </p>
                                  <span className="text-xs text-gray-400 shrink-0">
                                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{s.script}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-3 border-t border-gray-200 bg-white">
                    <Pagination
                      currentPage={templateScriptsPage}
                      totalPages={templateScriptsTotalPages}
                      onPageChange={fetchTemplateScripts}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-7 py-5 border-t border-gray-200/80 flex items-center justify-between gap-3 bg-white/80 backdrop-blur-sm">
              <p className="text-xs text-gray-500">
                Templates help you quickly reuse writing styles across projects
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateTemplateOpen(false)}
                  className="gap-2 hover:bg-gray-50 px-5"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateTemplate}
                  disabled={isCreatingTemplate}
                  className="gap-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all px-6"
                >
                  {isCreatingTemplate ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {editingTemplateId ? 'Save Changes' : 'Create Template'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      <AlertDialog
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleDeleteTemplate}
        title="Delete Template?"
        description="This will permanently delete this template and all its associations. This action cannot be undone."
        confirmText="Delete Template"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
