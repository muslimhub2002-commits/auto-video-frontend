'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Sparkles, Users, X, Trash2 } from 'lucide-react';
import { API_URL } from '@/lib/api';

export type ScriptCharacter = {
  key: string;
  name: string;
  description: string;
  isSahaba: boolean;
  isProphet: boolean;
  isWoman: boolean;
};

type CharactersModalProps = {
  isOpen: boolean;
  characters: ScriptCharacter[];
  onClose: () => void;
  onSave: (next: ScriptCharacter[]) => void;
};

export function CharactersModal({
  isOpen,
  characters,
  onClose,
  onSave,
}: CharactersModalProps) {
  const initial = useMemo(() => (Array.isArray(characters) ? characters : []), [characters]);

  const [draft, setDraft] = useState<ScriptCharacter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enhancingKey, setEnhancingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setDraft(initial);
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const streamEnhanceCharacterPrompt = async (params: {
    name: string;
    description: string;
    onChunk?: (chunk: string) => void;
  }) => {
    const baseName = String(params.name ?? '').trim();
    const baseDescription = String(params.description ?? '').trim();
    const baseSentence = baseDescription
      ? `${baseName ? `${baseName}: ` : ''}${baseDescription}`
      : baseName;

    const res = await fetch(`${API_URL}/ai/enhance-sentence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sentence: baseSentence,
        style: 'Descriptive',
        userPrompt:
          'Expand this into a more detailed image-generation character prompt while keeping the same person/identity. ' +
          'Add specific facial features, hairstyle, age range, clothing/dressing details, physique/body type, and any small accessories if fitting. ' +
          'Keep it as exactly ONE sentence, but it can be long with commas/semicolons. ' +
          'Do not add any extra characters. Do not mention being Sahaba/Prophet/Woman. Do not add any religious figures. ' +
          'Return only the final prompt text.',
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error('Failed to generate detailed character prompt');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) continue;
      fullText += chunk;
      params.onChunk?.(chunk);
    }

    return fullText.trim();
  };

  const handleEnhanceCharacterPrompt = async (idx: number) => {
    const c = draft[idx];
    if (!c) return;
    const blocked = Boolean(c.isSahaba || c.isProphet || c.isWoman);
    if (blocked) return;

    try {
      setError(null);
      setEnhancingKey(c.key);

      const enhanced = await streamEnhanceCharacterPrompt({
        name: c.name,
        description: c.description,
      });

      if (!enhanced) {
        throw new Error('Empty enhanced prompt returned');
      }

      setDraft((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, description: enhanced } : p)),
      );
    } catch (e) {
      console.error('Enhance character prompt failed', e);
      setError('Failed to generate detailed character prompt. Please try again.');
    } finally {
      setEnhancingKey(null);
    }
  };

  const generateKey = () => {
    const base =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `char-${crypto.randomUUID().slice(0, 8)}`
        : `char-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    const existing = new Set(draft.map((p) => p.key));
    let key = base;
    while (existing.has(key)) {
      key = `${base}-${Math.random().toString(16).slice(2, 6)}`;
    }
    return key;
  };

  const handleSave = () => {
    setError(null);

    const cleaned = draft.map((c) => ({
      ...c,
      key: String(c.key ?? '').trim(),
      name: String(c.name ?? '').trim(),
      description: String(c.description ?? '').trim(),
      isSahaba: Boolean(c.isSahaba),
      isProphet: Boolean(c.isProphet),
      isWoman: Boolean(c.isWoman),
    }));

    const invalid = cleaned.find((c) => !c.key || !c.name || !c.description);
    if (invalid) {
      setError('All character fields are required (name and description).');
      return;
    }

    const keySet = new Set<string>();
    for (const c of cleaned) {
      if (keySet.has(c.key)) {
        setError('Character keys must be unique.');
        return;
      }
      keySet.add(c.key);
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
              <div className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-md shadow-blue-500/20">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Manage Characters</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Define characters for consistent image generation
                </p>
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
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              {error}
            </div>
          ) : null}

          {draft.length === 0 ? (
            <div className="text-sm text-gray-700 bg-white/80 border border-gray-200 rounded-2xl px-4 py-4">
              No characters yet. Click “Add character” to create one.
            </div>
          ) : null}

          <div className="space-y-4">
            {draft.map((c, idx) => (
              <div
                key={c.key}
                className="group rounded-2xl border border-gray-200 bg-linear-to-br from-white to-gray-50/30 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
              >
                <div className="p-5 space-y-4">
                  {/* Header with delete button */}
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-700">#{idx + 1}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleEnhanceCharacterPrompt(idx)}
                        disabled={
                          Boolean(c.isSahaba || c.isProphet || c.isWoman) ||
                          enhancingKey === c.key
                        }
                        title={
                          c.isSahaba || c.isProphet || c.isWoman
                            ? 'Prompt enhancement is disabled for Sahaba/Prophet/Woman characters'
                            : 'Generate a more detailed facial/dressing/physique prompt'
                        }
                        className="h-9 px-3 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:hover:from-blue-600 disabled:hover:to-indigo-600"
                      >
                        {enhancingKey === c.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        <span className="text-xs font-semibold">Enhance prompt</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDraft((prev) => prev.filter((_, i) => i !== idx))}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Name</label>
                      <input
                        value={c.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setDraft((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, name: value } : p)),
                          );
                        }}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                        placeholder="e.g., Abu Bakr"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={c.description}
                        onChange={(e) => {
                          const value = e.target.value;
                          setDraft((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, description: value } : p)),
                          );
                        }}
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
                        rows={5}
                        placeholder="Visual description and attributes for image generation..."
                      />
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={Boolean(c.isSahaba)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setDraft((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, isSahaba: checked } : p)),
                          );
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="text-sm font-medium text-gray-700">Sahaba</span>
                    </label>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={Boolean(c.isProphet)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setDraft((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, isProphet: checked } : p)),
                          );
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="text-sm font-medium text-gray-700">Prophet</span>
                    </label>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={Boolean(c.isWoman)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setDraft((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, isWoman: checked } : p)),
                          );
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="text-sm font-medium text-gray-700">Woman</span>
                    </label>
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
              setDraft((prev) => [
                ...prev,
                {
                  key,
                  name: '',
                  description: '',
                  isSahaba: false,
                  isProphet: false,
                  isWoman: false,
                },
              ]);
            }}
            className="gap-2 h-10 px-4 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Character
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
              className="h-10 px-6 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
