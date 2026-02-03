'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Loader2, Sparkles, FileText, X, Save } from 'lucide-react';

interface ScriptSectionProps {
  script: string;
  onScriptChange: (value: string) => void;
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  referenceScripts: { id: string; title: string | null; script: string }[];
  onOpenReferenceLibrary: () => void;
  onRemoveReferenceScript: (id: string) => void;
  onClearReferenceScripts: () => void;
  hasSentences: boolean;
  scriptSubject: string;
  setScriptSubject: (value: string) => void;
  scriptSubjectContent: string;
  setScriptSubjectContent: (value: string) => void;
  scriptLength: string;
  setScriptLength: (value: string) => void;
  scriptStyle: string;
  setScriptStyle: (value: string) => void;
  scriptTechnique: string;
  setScriptTechnique: (value: string) => void;
  scriptModel: string;
  setScriptModel: (value: string) => void;
  isRandomScriptLoading: boolean;
  isSplitting: boolean;
  randomScriptError: string | null;
  splitError: string | null;
  onGenerateRandomScript: () => void;
  onSplitScript: () => void;
  onResetScript: () => void;
  onSaveDraft: () => void;
  isSavingDraft: boolean;
  onOpenLibrary: () => void;
  originalScriptSubject?: string;
  originalScriptSubjectContent?: string;
  isEnhancingScript: boolean;
  onEnhanceScript: () => void;
}

export function ScriptSection(props: ScriptSectionProps) {
  const {
    script,
    onScriptChange,
    systemPrompt,
    onSystemPromptChange,
    referenceScripts,
    onOpenReferenceLibrary,
    onRemoveReferenceScript,
    onClearReferenceScripts,
    hasSentences,
    scriptSubject,
    setScriptSubject,
    scriptSubjectContent,
    setScriptSubjectContent,
    scriptLength,
    setScriptLength,
    scriptStyle,
    setScriptStyle,
    scriptTechnique,
    setScriptTechnique,
    scriptModel,
    setScriptModel,
    isRandomScriptLoading,
    isSplitting,
    randomScriptError,
    splitError,
    onGenerateRandomScript,
    onSplitScript,
    onResetScript,
    onSaveDraft,
    isSavingDraft,
    onOpenLibrary,
    originalScriptSubject,
    originalScriptSubjectContent,
    isEnhancingScript,
    onEnhanceScript,
  } = props;

  const isUsingReferences = (referenceScripts?.length ?? 0) > 0;

  // Check if script config has changed (excluding model, length, and style)
  const hasConfigChanged =
    originalScriptSubject !== undefined &&
    (scriptSubject !== originalScriptSubject ||
      scriptSubjectContent !== originalScriptSubjectContent);

  const shouldShowEnhanceButton = script.trim().length > 0;
  const isEnhanceDisabled = hasSentences || hasConfigChanged || isEnhancingScript;

  return (
    <AccordionItem value="script" className="border-b border-gray-200 px-6">
      <AccordionTrigger className="hover:no-underline py-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">Script</h3>
            <p className="text-sm text-gray-500">Write or generate your video script</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-6 pb-2">
          {/* Reference Scripts */}
          <div className="bg-linear-to-br from-white to-gray-50 rounded-lg p-5 border border-gray-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full"></div>
                  Reference Scripts (optional)
                </h4>
                <p className="text-xs text-gray-600">
                  When you select reference scripts, the AI will analyze them and mimic their narrative style.
                  Style/tone and the text prompt below will be disabled and ignored for generation.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isUsingReferences ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onClearReferenceScripts}
                    className="gap-2"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  onClick={onOpenReferenceLibrary}
                  className="gap-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isUsingReferences ? 'Edit' : 'Add'}
                </Button>
              </div>
            </div>

            {isUsingReferences ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {referenceScripts.map((ref) => (
                  <div
                    key={ref.id}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 shadow-sm"
                  >
                    <span className="max-w-55 truncate">
                      {ref.title || 'Untitled Script'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveReferenceScript(ref.id)}
                      className="rounded-full p-1 hover:bg-gray-100"
                      aria-label="Remove reference"
                    >
                      <X className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-500">
                No reference scripts selected.
              </p>
            )}
          </div>

          {/* System Prompt Override */}
          <div className="bg-linear-to-br from-white to-gray-50 rounded-lg p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full"></div>
              System Prompt (optional)
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              Optional writing guidance. Disabled when using reference scripts.
            </p>
            <Textarea
              id="systemPrompt"
              placeholder="Paste/write your custom system prompt here..."
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              disabled={isUsingReferences}
              rows={4}
              className={`bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 resize-none rounded-lg shadow-sm ${isUsingReferences ? 'opacity-60 cursor-not-allowed' : ''
                }`}
            />
            {isUsingReferences ? (
              <p className="text-xs text-amber-700 mt-2">
                Reference scripts are selected, so this field is ignored for generation.
              </p>
            ) : null}
          </div>

          {/* Script Configuration */}
          <div className="bg-linear-to-br from-gray-50 to-gray-100/50 rounded-lg p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full"></div>
              Script Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Subject */}
              <Select value={scriptSubject} onValueChange={setScriptSubject}>
                <SelectTrigger label="Subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="religious (Islam)">Religious (Islam)</SelectItem>
                  <SelectItem value="motivational">Motivational</SelectItem>
                  <SelectItem value="storytelling / drama">Storytelling / Drama</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                </SelectContent>
              </Select>

              {/* Subject Content - only for Religious (Islam) */}
              {scriptSubject === 'religious (Islam)' ? (
                <Select
                  value={scriptSubjectContent}
                  onValueChange={setScriptSubjectContent}
                >
                  <SelectTrigger label="Subject Content">
                    <SelectValue placeholder="Select content" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quranic Miracles">Quranic Miracles</SelectItem>
                    <SelectItem value="Quranic Stories">Quranic Stories</SelectItem>
                    <SelectItem value="Hadith Stories">Hadith Stories</SelectItem>
                    <SelectItem value="Stories of the Sahaba">Stories of the Sahaba</SelectItem>
                    <SelectItem value="Names and Attributes of Allah">Names and Attributes of Allah</SelectItem>
                    <SelectItem value="Daily Duas and Remembrances">Daily Duas and Remembrances</SelectItem>
                    <SelectItem value="Islamic Morals and Manners">Islamic Morals and Manners</SelectItem>
                    <SelectItem value="Seerah of the Prophet">Seerah of the Prophet</SelectItem>
                    <SelectItem value="Specific Prophet Story">Specific Prophet Story</SelectItem>
                    <SelectItem value="Specific Enemy of Allah">Specific Enemy of Allah</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}

              {/* Length */}
              <Select value={scriptLength} onValueChange={setScriptLength}>
                <SelectTrigger label="Length">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30 seconds">30 seconds</SelectItem>
                  <SelectItem value="1 minute">1 minute</SelectItem>
                  <SelectItem value="2 minutes">2 minutes</SelectItem>
                  <SelectItem value="3 minutes">3 minutes</SelectItem>
                  <SelectItem value="4 minutes">4 minutes</SelectItem>
                  <SelectItem value="5 minutes">5 minutes</SelectItem>
                </SelectContent>
              </Select>

              {/* Style */}
              <Select value={scriptStyle} onValueChange={setScriptStyle}>
                <SelectTrigger label="Style" disabled={isUsingReferences}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Formal">Formal</SelectItem>
                  <SelectItem value="Informal">Informal</SelectItem>
                  <SelectItem value="Conversational">Conversational</SelectItem>
                  <SelectItem value="Humorous">Humorous</SelectItem>
                  <SelectItem value="Inspirational">Inspirational</SelectItem>
                  <SelectItem value="Storytelling/Narrative">Storytelling / Narrative</SelectItem>
                  <SelectItem value="Persuasive">Persuasive</SelectItem>
                  <SelectItem value="Educational/Instructional">Educational / Instructional</SelectItem>
                  <SelectItem value="Fast Paced">Fast Paced</SelectItem>
                  <SelectItem value="Wisdom">Wisdom</SelectItem>
                </SelectContent>
              </Select>

              {/* Technique */}
              <Select value={scriptTechnique} onValueChange={setScriptTechnique}>
                <SelectTrigger label="Technique">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="The Dance (Context, Conflict)">
                    The Dance
                  </SelectItem>
                  <SelectItem value="Loss Aversion">Loss Aversion</SelectItem>
                  <SelectItem value="The Rhythm">The Rhythm</SelectItem>
                  <SelectItem value="Confrontation Technique">
                    Confrontation Technique
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Model */}
              <Select value={scriptModel} onValueChange={setScriptModel}>
                <SelectTrigger label="Model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4.5</SelectItem>
                  <SelectItem value="claude-sonnet-4-0">Claude Sonnet 4.0</SelectItem>

                  <SelectItem value="claude-opus-4-5">Claude Opus 4.5</SelectItem>
                  <SelectItem value="claude-opus-4-0">Claude Opus 4.0</SelectItem>

                  <SelectItem value="claude-haiku-4-5">Claude Haiku 4.5</SelectItem>

                  <SelectItem value="claude-3-7-sonnet-latest">Claude 3.7 Sonnet</SelectItem>
                  <SelectItem value="claude-3-opus-latest">Claude 3 Opus</SelectItem>
                  <SelectItem value="claude-3-5-haiku-latest">Claude 3.5 Haiku</SelectItem>

                  <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
                  <SelectItem value="gpt-4.1-mini">GPT-4.1 mini</SelectItem>
                  <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-5">GPT-5</SelectItem>
                  <SelectItem value="gpt-5.1">GPT-5.1</SelectItem>
                  <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="default"
              onClick={onGenerateRandomScript}
              disabled={isRandomScriptLoading}
              className="gap-2 bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all"
            >
              {isRandomScriptLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating script...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate AI Script
                </>
              )}
            </Button>
            {shouldShowEnhanceButton && (
              <Button
                type="button"
                size="default"
                onClick={onEnhanceScript}
                disabled={isEnhanceDisabled}
                className="gap-2 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnhancingScript ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enhancing script...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Enhance
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              size="default"
              onClick={onSplitScript}
              disabled={isSplitting || !script.trim() || isRandomScriptLoading}
              className="gap-2 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
            >
              {isSplitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Splitting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Split into Sentences
                </>
              )}
            </Button>
            <Button
              type="button"
              size="default"
              onClick={onSaveDraft}
              disabled={isSavingDraft || !script.trim()}
              className="gap-2 bg-linear-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white shadow-md hover:shadow-lg transition-all"
            >
              {isSavingDraft ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving draft...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save as Draft
                </>
              )}
            </Button>
            <Button
              type="button"
              size="default"
              onClick={onOpenLibrary}
              className="gap-2 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Sparkles className="h-4 w-4" />
              From Library
            </Button>
            {hasSentences && (
              <Button
                type="button"
                size="default"
                onClick={onResetScript}
                className="gap-2 bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all animate-in zoom-in-50 fade-in duration-300"
              >
                <X className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>

          {/* Script Textarea */}
          <div className="space-y-3">
            <Label htmlFor="script" className="text-sm font-medium text-gray-700">
              Your Script
            </Label>
            <Textarea
              id="script"
              placeholder="Enter your video script here, or click 'Generate AI Script' to let AI write one..."
              value={script}
              onChange={(e) => onScriptChange(e.target.value)}
              readOnly={isSplitting || hasSentences}
              rows={12}
              className={`bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 resize-none rounded-lg shadow-sm transition-all ${isSplitting || hasSentences ? 'opacity-80 cursor-not-allowed' : ''
                }`}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="h-1 w-1 rounded-full bg-gray-400"></span>
                <span>{script.length} characters</span>
              </div>
              {(randomScriptError || splitError) && (
                <p className="text-xs text-red-500">
                  {randomScriptError || splitError}
                </p>
              )}
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
