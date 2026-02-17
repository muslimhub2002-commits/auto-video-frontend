export type SentenceItem = {
  id: string;
  text: string;
  mediaMode?: 'single' | 'frames';
  sceneTab?: 'image' | 'video';

  // Optional per-sentence visual effect applied on the media itself (not transitions).
  // Null/undefined means no effect.
  visualEffect?:
    | 'none'
    | 'colorGrading'
    | 'animatedLighting'
    | null;

  // Optional override for the cut between this sentence and the next.
  // When null/undefined, the renderer will pick a transition automatically.
  transitionToNext?:
    | 'none'
    | 'glitch'
    | 'whip'
    | 'flash'
    | 'fade'
    | 'chromaLeak'
    | null;

  // When set, image generation will reference ONLY these canonical character key(s)
  // and will skip LLM-based character mapping.
  forcedCharacterKeys?: string[] | null;

  image?: File | null;
  imageUrl?: string | null;
  video?: File | null;
  videoUrl?: string | null;
  savedVideoId?: string | null;
  startImage?: File | null;
  startImageUrl?: string | null;
  startImagePrompt?: string | null;
  startSavedImageId?: string | null;
  endImage?: File | null;
  endImageUrl?: string | null;
  endImagePrompt?: string | null;
  endSavedImageId?: string | null;
  imagePrompt?: string | null;
  isGeneratingImage?: boolean;
  isGeneratingStartImage?: boolean;
  isGeneratingEndImage?: boolean;
  isSavingImage?: boolean;
  savedImageId?: string | null;
  isFromLibrary?: boolean;
  isSuspense?: boolean;
};
