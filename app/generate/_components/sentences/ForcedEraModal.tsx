'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, X } from 'lucide-react';

import type { ScriptEra } from './ErasModal';

type ForcedEraModalProps = {
  isOpen: boolean;
  eras: ScriptEra[];
  selectedKey?: string | null;
  onClose: () => void;
  onClear: () => void;
  onSave: (next: string | null) => void;
};

export function ForcedEraModal({
  isOpen,
  eras,
  selectedKey,
  onClose,
  onClear,
  onSave,
}: ForcedEraModalProps) {
  const initialEras = useMemo(() => (Array.isArray(eras) ? eras : []), [eras]);
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(String(selectedKey ?? '').trim() || null);
  }, [isOpen, selectedKey]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-200/80 overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-300"
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
                <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Force Era</h3>
                <p className="text-sm text-gray-500 mt-0.5">Assign a specific era to this sentence</p>
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
        <div className="px-8 py-6 max-h-[calc(90vh-200px)] overflow-y-auto space-y-3">
          {initialEras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Clock className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No eras available</p>
              <p className="text-sm text-gray-500">Create eras first to assign them here</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">{draft ? '1 era selected' : 'No era selected'}</p>
              </div>

              {initialEras.map((e) => {
                const checked = draft === e.key;
                return (
                  <label
                    key={e.key}
                    className={
                      `group flex items-start gap-4 rounded-xl border-2 bg-white p-4 cursor-pointer transition-all duration-200 ` +
                      (checked
                        ? 'border-violet-300 bg-violet-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50')
                    }
                  >
                    <input
                      type="radio"
                      name="forced-era"
                      checked={checked}
                      onChange={() => setDraft(e.key)}
                      className="mt-0.5 h-5 w-5 border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <Clock className="h-4 w-4 text-violet-600 shrink-0" />
                        <p className="text-sm font-semibold text-gray-900">{e.name}</p>
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{e.key}</span>
                      </div>
                      {e.description ? (
                        <p className="text-xs text-gray-600 leading-relaxed">{e.description}</p>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-linear-to-br from-gray-50 to-white flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClear();
              onClose();
            }}
            className="h-10 px-5 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            disabled={initialEras.length === 0}
          >
            Clear Selection
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
              onClick={() => {
                onSave(draft);
                onClose();
              }}
              className="h-10 px-6 bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              disabled={initialEras.length === 0}
            >
              Apply Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
