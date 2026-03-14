'use client';

import { AlertModal } from '@/components/ui/alert-modal';
import type { SentenceItem } from '../_types/sentences';
import { ImageLibraryModal } from './ImageLibraryModal';
import { VideoLibraryModal } from './VideoLibraryModal';
import { ScriptLibraryModal, type ScriptDto } from './ScriptLibraryModal';
import { ScriptReferencesModal, type ScriptReferenceDto } from './ScriptReferencesModal';
import { TransitionSoundModal } from './TransitionSoundModal';
import { VoiceLibraryModal } from './VoiceLibraryModal';
import { SoundEffectsLibraryModal, type SoundEffectDto } from './SoundEffectsLibraryModal';

type LibraryTarget =
  | {
      index: number;
      which: 'single' | 'start' | 'end' | 'reference';
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
  videoLibraryTargetIndex: number | null;
  scriptContext: string;
  sentences: SentenceItem[];
  onCloseImageLibrary: () => void;
  onSelectImage: (imageUrl: string, id: string | null, prompt?: string | null) => void;

  isVoiceLibraryOpen: boolean;
  selectedVoiceUrl: string | null;
  onCloseVoiceLibrary: () => void;
  onSelectVoice: (voiceUrl: string, id: string) => void | Promise<void>;

  isVideoLibraryOpen: boolean;
  selectedVideoUrl: string | null;
  onCloseVideoLibrary: () => void;
  onSelectVideo: (videoUrl: string, id: string | null) => void;

  isScriptLibraryOpen: boolean;
  onCloseScriptLibrary: () => void;
  onSelectScript: (script: ScriptDto) => void;

  isScriptReferencesOpen: boolean;
  onCloseScriptReferences: () => void;
  initialSelectedReferenceScripts: ScriptReferenceDto[];
  onApplyReferenceScripts: (scripts: ScriptReferenceDto[]) => void;

  isSoundEffectsLibraryOpen: boolean;
  onCloseSoundEffectsLibrary: () => void;
  onApplySoundEffects: (items: SoundEffectDto[]) => void;

  isTransitionSoundModalOpen: boolean;
  transitionSoundTransitionType: SentenceItem['transitionToNext'] | null | undefined;
  transitionSoundItems: NonNullable<SentenceItem['transitionSoundEffects']>;
  onCloseTransitionSoundModal: () => void;
  onChangeTransitionSoundDraft: (next: NonNullable<SentenceItem['transitionSoundEffects']>) => void;
  onApplyTransitionSound: () => void;
  onSaveTransitionSoundReusable: () => void | Promise<void>;
  isSavingTransitionSoundReusable: boolean;

  alertState: AlertState;
  onCloseAlert: () => void;
};

function selectedImageUrlFromTarget(sentences: SentenceItem[], libraryTarget: LibraryTarget): string | null {
  if (!libraryTarget) return null;
  const sentence = sentences[libraryTarget.index];
  if (!sentence) return null;

  if (libraryTarget.which === 'single') return sentence.imageUrl ?? null;
  if (libraryTarget.which === 'start') return sentence.startImageUrl ?? null;
  if (libraryTarget.which === 'end') return sentence.endImageUrl ?? null;
  return sentence.referenceImageUrl ?? null;
}

function selectedSentenceTextFromImageTarget(
  sentences: SentenceItem[],
  libraryTarget: LibraryTarget,
): string | null {
  if (!libraryTarget) return null;
  return sentences[libraryTarget.index]?.text ?? null;
}

function selectedSentenceTextFromVideoTarget(
  sentences: SentenceItem[],
  videoLibraryTargetIndex: number | null,
): string | null {
  if (videoLibraryTargetIndex === null) return null;
  return sentences[videoLibraryTargetIndex]?.text ?? null;
}

export function GenerateModalsHost({
  isImageLibraryOpen,
  libraryTarget,
  videoLibraryTargetIndex,
  scriptContext,
  sentences,
  onCloseImageLibrary,
  onSelectImage,
  isVoiceLibraryOpen,
  selectedVoiceUrl,
  onCloseVoiceLibrary,
  onSelectVoice,

  isVideoLibraryOpen,
  selectedVideoUrl,
  onCloseVideoLibrary,
  onSelectVideo,
  isScriptLibraryOpen,
  onCloseScriptLibrary,
  onSelectScript,
  isScriptReferencesOpen,
  onCloseScriptReferences,
  initialSelectedReferenceScripts,
  onApplyReferenceScripts,

  isSoundEffectsLibraryOpen,
  onCloseSoundEffectsLibrary,
  onApplySoundEffects,
  isTransitionSoundModalOpen,
  transitionSoundTransitionType,
  transitionSoundItems,
  onCloseTransitionSoundModal,
  onChangeTransitionSoundDraft,
  onApplyTransitionSound,
  onSaveTransitionSoundReusable,
  isSavingTransitionSoundReusable,
  alertState,
  onCloseAlert,
}: GenerateModalsHostProps) {
  const selectedImageUrl = selectedImageUrlFromTarget(sentences, libraryTarget);
  const currentImageSentenceText = selectedSentenceTextFromImageTarget(sentences, libraryTarget);
  const currentVideoSentenceText = selectedSentenceTextFromVideoTarget(
    sentences,
    videoLibraryTargetIndex,
  );

  return (
    <>
      <ImageLibraryModal
        isOpen={isImageLibraryOpen}
        selectedImageUrl={selectedImageUrl}
        scriptContext={scriptContext}
        currentSentenceText={currentImageSentenceText}
        onClose={onCloseImageLibrary}
        onSelectImage={onSelectImage}
      />

      <VoiceLibraryModal
        isOpen={isVoiceLibraryOpen}
        selectedVoiceUrl={selectedVoiceUrl}
        onClose={onCloseVoiceLibrary}
        onSelectVoice={onSelectVoice}
      />

      <VideoLibraryModal
        isOpen={isVideoLibraryOpen}
        selectedVideoUrl={selectedVideoUrl}
        scriptContext={scriptContext}
        currentSentenceText={currentVideoSentenceText}
        onClose={onCloseVideoLibrary}
        onSelectVideo={onSelectVideo}
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

      <SoundEffectsLibraryModal
        isOpen={isSoundEffectsLibraryOpen}
        onClose={onCloseSoundEffectsLibrary}
        onApply={onApplySoundEffects}
      />

      <TransitionSoundModal
        isOpen={isTransitionSoundModalOpen}
        onClose={onCloseTransitionSoundModal}
        onApply={onApplyTransitionSound}
        transitionType={transitionSoundTransitionType}
        items={transitionSoundItems}
        onChange={onChangeTransitionSoundDraft}
        onSaveReusable={onSaveTransitionSoundReusable}
        isSavingReusable={isSavingTransitionSoundReusable}
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
