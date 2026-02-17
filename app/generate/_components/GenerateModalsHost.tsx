'use client';

import { AlertModal } from '@/components/ui/alert-modal';
import type { SentenceItem } from '../_types/sentences';
import { ImageLibraryModal } from './ImageLibraryModal';
import { ScriptLibraryModal, type ScriptDto } from './ScriptLibraryModal';
import { ScriptReferencesModal, type ScriptReferenceDto } from './ScriptReferencesModal';
import { VoiceLibraryModal } from './VoiceLibraryModal';

type LibraryTarget =
  | {
      index: number;
      which: 'single' | 'start' | 'end';
    }
  | null;

type AlertState = {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
};

type GenerateModalsHostProps = {
  isImageLibraryOpen: boolean;
  libraryTarget: LibraryTarget;
  sentences: SentenceItem[];
  onCloseImageLibrary: () => void;
  onSelectImage: (imageUrl: string, id: string, prompt?: string | null) => void;

  isVoiceLibraryOpen: boolean;
  selectedVoiceUrl: string | null;
  onCloseVoiceLibrary: () => void;
  onSelectVoice: (voiceUrl: string, id: string) => void | Promise<void>;

  isScriptLibraryOpen: boolean;
  onCloseScriptLibrary: () => void;
  onSelectScript: (script: ScriptDto) => void;

  isScriptReferencesOpen: boolean;
  onCloseScriptReferences: () => void;
  initialSelectedReferenceScripts: ScriptReferenceDto[];
  onApplyReferenceScripts: (scripts: ScriptReferenceDto[]) => void;

  alertState: AlertState;
  onCloseAlert: () => void;
};

function selectedImageUrlFromTarget(sentences: SentenceItem[], libraryTarget: LibraryTarget): string | null {
  if (!libraryTarget) return null;
  const sentence = sentences[libraryTarget.index];
  if (!sentence) return null;

  if (libraryTarget.which === 'single') return sentence.imageUrl ?? null;
  if (libraryTarget.which === 'start') return sentence.startImageUrl ?? null;
  return sentence.endImageUrl ?? null;
}

export function GenerateModalsHost({
  isImageLibraryOpen,
  libraryTarget,
  sentences,
  onCloseImageLibrary,
  onSelectImage,
  isVoiceLibraryOpen,
  selectedVoiceUrl,
  onCloseVoiceLibrary,
  onSelectVoice,
  isScriptLibraryOpen,
  onCloseScriptLibrary,
  onSelectScript,
  isScriptReferencesOpen,
  onCloseScriptReferences,
  initialSelectedReferenceScripts,
  onApplyReferenceScripts,
  alertState,
  onCloseAlert,
}: GenerateModalsHostProps) {
  const selectedImageUrl = selectedImageUrlFromTarget(sentences, libraryTarget);

  return (
    <>
      <ImageLibraryModal
        isOpen={isImageLibraryOpen}
        selectedImageUrl={selectedImageUrl}
        onClose={onCloseImageLibrary}
        onSelectImage={onSelectImage}
      />

      <VoiceLibraryModal
        isOpen={isVoiceLibraryOpen}
        selectedVoiceUrl={selectedVoiceUrl}
        onClose={onCloseVoiceLibrary}
        onSelectVoice={onSelectVoice}
      />

      <ScriptLibraryModal
        isOpen={isScriptLibraryOpen}
        onClose={onCloseScriptLibrary}
        onSelectScript={onSelectScript}
      />

      <ScriptReferencesModal
        isOpen={isScriptReferencesOpen}
        onClose={onCloseScriptReferences}
        initialSelected={initialSelectedReferenceScripts}
        onApply={onApplyReferenceScripts}
      />

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={onCloseAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />
    </>
  );
}
