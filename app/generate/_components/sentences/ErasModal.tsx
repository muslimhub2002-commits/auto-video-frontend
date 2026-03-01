'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Plus, Trash2, X } from 'lucide-react';

export type ScriptEra = {
  key: string;
  name: string;
  description?: string;
};

type ErasModalProps = {
  isOpen: boolean;
  eras: ScriptEra[];
  onClose: () => void;
  onSave: (next: ScriptEra[]) => void;
};

export function ErasModal({ isOpen, eras, onClose, onSave }: ErasModalProps) {
  const initial = useMemo(() => (Array.isArray(eras) ? eras : []), [eras]);

  const [draft, setDraft] = useState<ScriptEra[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setDraft(initial);
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const generateKey = () => {
    const existing = new Set(draft.map((e) => String(e.key ?? '').trim()).filter(Boolean));

    let maxNum = 0;
    for (const k of existing) {
      const m = /^E(\d+)$/iu.exec(k);
      if (!m?.[1]) continue;
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }

    let next = maxNum + 1;
    let candidate = `E${next}`;
    while (existing.has(candidate)) {
      next += 1;
      candidate = `E${next}`;
    }

    return candidate;
  };

  const handleSave = () => {
    setError(null);

    const cleaned = draft.map((e) => ({
      key: String(e.key ?? '').trim(),
      name: String(e.name ?? '').trim(),
      description: String(e.description ?? '').trim() || undefined,
    }));

    const invalid = cleaned.find((e) => !e.key || !e.name);
    if (invalid) {
      setError('All eras require a name.');
      return;
    }

    const keySet = new Set<string>();
    for (const e of cleaned) {
      if (keySet.has(e.key)) {
        setError('Era keys must be unique.');
        return;
      }
      keySet.add(e.key);
    }

    onSave(cleaned);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-60 min-h-screen flex items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-200/80 overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200/80 bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-linear-to-br from-violet-500 to-indigo-600 rounded-2xl shadow-md shadow-violet-500/20">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Manage Eras</h3>
                <p className="text-sm text-gray-500 mt-0.5">Define time periods to guide visual consistency</p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-9 w-9 p-0 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[67vh] overflow-y-auto space-y-4">
          {error ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{error}</div>
          ) : null}

          {draft.length === 0 ? (
            <div className="text-sm text-gray-700 bg-white/80 border border-gray-200 rounded-2xl px-4 py-4">
              No eras yet. Click “Add era” to create one.
            </div>
          ) : null}

          <div className="space-y-4">
            {draft.map((e, idx) => (
              <div
                key={e.key}
                className="group rounded-2xl border border-gray-200 bg-linear-to-br from-white to-gray-50/30 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-violet-700">{e.key || `#${idx + 1}`}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDraft((prev) => prev.filter((_, i) => i !== idx))}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete era"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Name</label>
                      <input
                        value={e.name ?? ''}
                        onChange={(ev) => {
                          const value = ev.target.value;
                          setDraft((prev) => prev.map((p, i) => (i === idx ? { ...p, name: value } : p)));
                        }}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                        placeholder="e.g., 7th-century Arabia"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-2">Description (optional)</label>
                      <textarea
                        value={e.description ?? ''}
                        onChange={(ev) => {
                          const value = ev.target.value;
                          setDraft((prev) => prev.map((p, i) => (i === idx ? { ...p, description: value } : p)));
                        }}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none transition-shadow"
                        rows={4}
                        placeholder="Visual details like architecture, clothing, lighting, and mood..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-linear-to-br from-gray-50 to-white flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const key = generateKey();
              setDraft((prev) => [...prev, { key, name: '', description: '' }]);
            }}
            className="gap-2 h-10 px-4 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Era
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-5 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="h-10 px-6 bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
