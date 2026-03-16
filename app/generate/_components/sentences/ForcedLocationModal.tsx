'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, X } from 'lucide-react';

import type { ScriptLocation } from './LocationsModal';

type ForcedLocationModalProps = {
  isOpen: boolean;
  locations: ScriptLocation[];
  selectedKey?: string | null;
  onClose: () => void;
  onClear: () => void;
  onSave: (next: string | null) => void;
};

export function ForcedLocationModal({
  isOpen,
  locations,
  selectedKey,
  onClose,
  onClear,
  onSave,
}: ForcedLocationModalProps) {
  const initialLocations = useMemo(
    () => (Array.isArray(locations) ? locations : []),
    [locations],
  );
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
        <div className="px-8 py-6 border-b border-gray-200/80 bg-linear-to-r from-sky-50 via-cyan-50 to-emerald-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-linear-to-br from-cyan-500 to-teal-600 rounded-2xl shadow-md shadow-cyan-500/20">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Force Location</h3>
                <p className="text-sm text-gray-500 mt-0.5">Assign a specific location to this sentence</p>
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

        <div className="px-8 py-6 max-h-[calc(90vh-200px)] overflow-y-auto space-y-3">
          {initialLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <MapPin className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No locations available</p>
              <p className="text-sm text-gray-500">Create locations first to assign them here</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">{draft ? '1 location selected' : 'No location selected'}</p>
              </div>

              {initialLocations.map((entry) => {
                const checked = draft === entry.key;
                return (
                  <label
                    key={entry.key}
                    className={
                      `group flex items-start gap-4 rounded-xl border-2 bg-white p-4 cursor-pointer transition-all duration-200 ` +
                      (checked
                        ? 'border-cyan-300 bg-cyan-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50')
                    }
                  >
                    <input
                      type="radio"
                      name="forced-location"
                      checked={checked}
                      onChange={() => setDraft(entry.key)}
                      className="mt-0.5 h-5 w-5 border-gray-300 text-cyan-600 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <MapPin className="h-4 w-4 text-cyan-600 shrink-0" />
                        <p className="text-sm font-semibold text-gray-900">{entry.name}</p>
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{entry.key}</span>
                      </div>
                      {entry.description ? (
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{entry.description}</p>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </>
          )}
        </div>

        <div className="px-8 py-5 border-t border-gray-100 bg-linear-to-br from-gray-50 to-white flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClear();
              onClose();
            }}
            className="h-10 px-5 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            disabled={initialLocations.length === 0}
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
              className="h-10 px-6 bg-linear-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
              disabled={initialLocations.length === 0}
            >
              Apply Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}