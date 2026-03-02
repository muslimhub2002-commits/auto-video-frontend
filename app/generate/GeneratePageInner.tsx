'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Video,
  Image as ImageIcon,
  FileText,
  Play,
  Mic,
  Sparkles,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import { Sidebar } from './_components/Sidebar';
import { HeaderBar } from './_components/HeaderBar';
import { ScriptSection } from './_components/ScriptSection';
import { SentencesImagesSection } from './_components/SentencesImagesSection';
import { VoiceOverSection } from './_components/VoiceOverSection';
import { GenerateVideoButton } from './_components/GenerateVideoButton';
import { VideoJobSection } from './_components/VideoJobSection';
import type { ScriptReferenceDto } from './_components/ScriptReferencesModal';
import { GeneratePageSkeleton } from './_components/GeneratePageSkeleton';
import { RenderSettingsSection } from './_components/RenderSettingsSection';
import { GenerateModalsHost } from './_components/GenerateModalsHost';
import { useAuthGuard } from './_hooks/useAuthGuard';
import { useSentencesEditor } from './_hooks/useSentencesEditor';
import { useVideoJob } from './_hooks/useVideoJob';
import { api } from '@/lib/api';
import { uploadToCloudinaryUnsigned } from '@/lib/cloudinary';
import { useAlertModal } from '@/components/ui/alert-modal';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/toast';
import type { SentenceItem } from './_types/sentences';

type ScriptCharacter = {
  key: string;
  name: string;
  description: string;
  isSahaba: boolean;
  isProphet: boolean;
  isWoman: boolean;
};

type ScriptEra = {
  key: string;
  name: string;
  description?: string;
};

type BackendSentenceDto = {
  id: string;
  text: string;
  index: number;
  image?: { id: string; image: string; prompt?: string | null } | null;
  startFrameImage?: { id: string; image: string; prompt?: string | null } | null;
  endFrameImage?: { id: string; image: string; prompt?: string | null } | null;
  video?: { id: string; video: string } | null;
  video_prompt?: string | null;
  isSuspense?: boolean;
  forced_character_keys?: string[] | null;
  character_keys?: string[] | null;
  era_key?: string | null;
  forced_era_key?: string | null;
  transition_to_next?: SentenceItem['transitionToNext'] | null;
  visual_effect?: Exclude<SentenceItem['visualEffect'], 'none'> | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ||
 'http://localhost:3000';

const SUBSCRIBE_SENTENCE =
  'Please Subscribe & Help us reach out to more people';

const SHORTS_CTA_SENTENCE =
  'You can watch the full video from the link in the first comment';

const normalizeSentenceForMatch = (value: string) => {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[.!?]+$/u, '')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ');
};

const SUBSCRIBE_SENTENCE_NORM = normalizeSentenceForMatch(SUBSCRIBE_SENTENCE);
const SHORTS_CTA_SENTENCE_NORM = normalizeSentenceForMatch(SHORTS_CTA_SENTENCE);

const isSubscribeLikeSentence = (value: string) => {
  const norm = normalizeSentenceForMatch(value);
  return norm === SUBSCRIBE_SENTENCE_NORM || norm === SHORTS_CTA_SENTENCE_NORM;
};

// Convert a data URL (e.g. AI-generated base64 image) into a File for upload
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, base64] = dataUrl.split(',');
  const match = /^data:(.+);base64$/.exec(meta);
  const mime = match?.[1] ?? 'image/png';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

function filenameFromContentDisposition(headerValue: string | null): string | null {
  const header = String(headerValue ?? '').trim();
  if (!header) return null;

  // RFC 5987: filename*=UTF-8''...
  const starMatch = /filename\*=(?:UTF-8''|utf-8'')([^;]+)/u.exec(header);
  if (starMatch?.[1]) {
    const raw = starMatch[1].trim().replace(/^"|"$/g, '');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  const match = /filename=([^;]+)/u.exec(header);
  if (!match?.[1]) return null;
  return match[1].trim().replace(/^"|"$/g, '');
}

function extensionFromAudioMimeType(mimeTypeRaw: string): string {
  const mimeType = String(mimeTypeRaw ?? '').trim().toLowerCase().split(';')[0] ?? '';
  switch (mimeType) {
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'mp3';
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    case 'audio/ogg':
      return 'ogg';
    case 'audio/webm':
      return 'webm';
    case 'audio/flac':
      return 'flac';
    case 'audio/aac':
      return 'aac';
    default:
      return '';
  }
}

async function sha256HexForFile(file: File): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const bytes = await file.arrayBuffer();
    const digest = await subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

function parseScriptLengthMinutes(value: string): number | null {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return null;

  const secondsMatch = /([0-9]+(?:\.[0-9]+)?)\s*second/u.exec(s);
  if (secondsMatch?.[1]) {
    const seconds = Number(secondsMatch[1]);
    return Number.isFinite(seconds) ? seconds / 60 : null;
  }

  const minutesMatch = /([0-9]+(?:\.[0-9]+)?)\s*minute/u.exec(s);
  if (minutesMatch?.[1]) {
    const minutes = Number(minutesMatch[1]);
    return Number.isFinite(minutes) ? minutes : null;
  }

  return null;
}

// SentenceItem type is shared in ./_types/sentences

export type VoiceOverOption = {
  id: number;
  voice_id: string;
  name: string;
  use_case?: string | null;
  preview_url?: string | null;
  isFavorite?: boolean;
};

type ReferenceScriptPayload = {
  id: string;
  title: string | null;
  script: string;
};

export function GeneratePageInner() {
  type VoiceProvider = 'google' | 'elevenlabs';

  const IMAGE_STYLE_PRESETS = [
    {
      key: 'anime',
      label: 'Anime',
      style: 'Anime style, detailed, vibrant, high quality',
    },
    {
      key: 'realism',
      label: 'Realism',
      style: 'Photorealistic, ultra-detailed, natural lighting, high quality',
    },
    {
      key: 'cinematic',
      label: 'Cinematic',
      style: 'Cinematic film still, dramatic lighting, shallow depth of field, ultra-detailed',
    },
    {
      key: '3d',
      label: '3D Render',
      style: '3D render, high detail, global illumination, physically based rendering, high quality',
    },
    {
      key: 'watercolor',
      label: 'Watercolor',
      style: 'Watercolor illustration, soft washes, textured paper, high quality',
    },
  ] as const;

  const { user, isLoading, handleLogout } = useAuthGuard();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const routeChatId = typeof params?.id === 'string' ? params.id : null;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // When a draft is saved/loaded, we keep its script id so we can attach
  // sentence-level media (start/end frames, per-sentence video) without
  // destructive script-wide updates.
  const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
  const videoSectionRef = useRef<HTMLDivElement | null>(null);
  const { alertState, showAlert, closeAlert } = useAlertModal();
  const { showToast, ToastContainer } = useToast();

  // Form state
  const [script, setScript] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [scriptSubject, setScriptSubject] = useState('religious (Islam)');
  const [scriptSubjectContent, setScriptSubjectContent] = useState('');
  const [scriptLength, setScriptLength] = useState('1 minute');
  const [scriptStyle, setScriptStyle] = useState('Conversational');
  const [scriptTechnique, setScriptTechnique] = useState('The Dance (Context, Conflict)');
  // Default to Anthropic (Claude) as requested.
  const [scriptModel, setScriptModel] = useState('claude-sonnet-4-5');

  // Canonical characters extracted during split.
  const [scriptCharacters, setScriptCharacters] = useState<ScriptCharacter[]>([]);

  // Canonical eras extracted during split or edited by the user.
  const [scriptEras, setScriptEras] = useState<ScriptEra[]>([]);

  // Sentence image generation configuration
  const [imagePromptModel, setImagePromptModel] = useState('gpt-4.1-mini');
  const [imageModel, setImageModel] = useState('leonardo');
  const [imageStyle, setImageStyle] = useState<string>('anime');
  const [imageAspectRatio, setImageAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('9:16');
  const [hasTouchedImageAspectRatio, setHasTouchedImageAspectRatio] = useState(false);
  const [videoModel, setVideoModel] = useState<'gemini' | 'grok'>('gemini');
  const [images, setImages] = useState<File[]>([]);
  const [voiceOver, setVoiceOver] = useState<File | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [savedVoiceId, setSavedVoiceId] = useState<string | null>(null);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('google');
  const [aiStudioStyleInstructions, setAiStudioStyleInstructions] = useState('');
  const [isVoiceLibraryOpen, setIsVoiceLibraryOpen] = useState(false);
  const [voiceLibraryUrl, setVoiceLibraryUrl] = useState<string | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioUrlRef = useRef<string | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  type BackgroundSoundtrackItem = {
    id: string;
    title: string;
    url: string;
    is_favorite?: boolean;
    volume_percent?: number;
  };
  const [backgroundSoundtracks, setBackgroundSoundtracks] = useState<BackgroundSoundtrackItem[]>([]);
  const [isLoadingBackgroundSoundtracks, setIsLoadingBackgroundSoundtracks] = useState(false);
  const [backgroundSoundtracksError, setBackgroundSoundtracksError] = useState<string | null>(null);
  const [selectedBackgroundSoundtrackValue, setSelectedBackgroundSoundtrackValue] = useState<string>(
    '__default__',
  );
  const [backgroundSoundtrackVolumePercent, setBackgroundSoundtrackVolumePercent] = useState<number>(100);
  const [oneOffBackgroundSoundtrackUrl, setOneOffBackgroundSoundtrackUrl] = useState<string | null>(null);
  const [isUploadingBackgroundSoundtrack, setIsUploadingBackgroundSoundtrack] = useState(false);
  const [isSettingFavoriteBackgroundSoundtrack, setIsSettingFavoriteBackgroundSoundtrack] = useState(false);
  const [isSavingBackgroundSoundtrackVolume, setIsSavingBackgroundSoundtrackVolume] = useState(false);
  const [isDeletingBackgroundSoundtrack, setIsDeletingBackgroundSoundtrack] = useState(false);
  const [isRandomScriptLoading, setIsRandomScriptLoading] = useState(false);
  const [randomScriptError, setRandomScriptError] = useState<string | null>(
    null,
  );
  const [isEnhancingScript, setIsEnhancingScript] = useState(false);
  // Track the original config used to produce the current script
  const [originalScriptSubject, setOriginalScriptSubject] = useState<string | undefined>(undefined);
  const [originalScriptSubjectContent, setOriginalScriptSubjectContent] = useState<string | undefined>(undefined);
  const {
    sentences,
    setSentences,
    handleSentenceForcedCharacterKeysChange,
    handleSentenceForcedEraKeyChange,
    handleSentenceVisualEffectChange,
    handleTransitionToNextChange,
    handleSentenceTextChange,
    handleMergeSentenceIntoPrevious,
    handleMergeSentenceIntoNext,
    handleDeleteSentence,
    handleInsertEmptySentenceAfter,
    handleAddSuspenseScene,
  } = useSentencesEditor();
  const [isSplitting, setIsSplitting] = useState(false);
  const [isSplittingIntoShorts, setIsSplittingIntoShorts] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingGeneration, setIsSavingGeneration] = useState(false);
  const [voicesByProvider, setVoicesByProvider] = useState<Record<VoiceProvider, VoiceOverOption[]>>({
    google: [],
    elevenlabs: [],
  });
  const [isLoadingVoicesByProvider, setIsLoadingVoicesByProvider] = useState<Record<VoiceProvider, boolean>>({
    google: false,
    elevenlabs: false,
  });
  const [voicesErrorByProvider, setVoicesErrorByProvider] = useState<Record<VoiceProvider, string | null>>({
    google: null,
    elevenlabs: null,
  });
  const [selectedVoiceIdByProvider, setSelectedVoiceIdByProvider] = useState<Record<VoiceProvider, string | null>>({
    google: null,
    elevenlabs: null,
  });
  const [isSettingFavoriteVoice, setIsSettingFavoriteVoice] = useState(false);
  const [isSyncingVoices, setIsSyncingVoices] = useState(false);
  const [syncVoicesResult, setSyncVoicesResult] = useState<string | null>(null);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [generateAllImagesConfirm, setGenerateAllImagesConfirm] = useState<
    | null
    | {
      kind: 'some' | 'all';
      eligibleIndices: number[];
      missingIndices: number[];
      existingCount: number;
      missingCount: number;
    }
  >(null);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<
    | {
      index: number;
      which: 'single' | 'start' | 'end' | 'reference';
    }
    | null
  >(null);
  const [isVideoLibraryOpen, setIsVideoLibraryOpen] = useState(false);
  const [videoLibraryTargetIndex, setVideoLibraryTargetIndex] = useState<number | null>(null);
  const [isGeneratingVideoBySentenceId, setIsGeneratingVideoBySentenceId] = useState<Record<string, boolean>>({});
  const [isGeneratingVideoPromptBySentenceId, setIsGeneratingVideoPromptBySentenceId] = useState<Record<string, boolean>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    routeChatId,
  );
  const [selectedChatTitle, setSelectedChatTitle] = useState<string | null>(
    null,
  );
  const [selectedChatMessages, setSelectedChatMessages] = useState<
    | {
      id: string;
      created_at: string;
      video?: { video: string } | null;
      voice?: { voice: string } | null;
      scripts?: {
        id: string;
        title: string | null;
        script: string;
        sentences?: {
          id: string;
          text: string;
          index: number;
          image?: { id: string; image: string } | null;
        }[];
      }[];
    }[]
    | null
  >(null);
  const [isScriptLibraryOpen, setIsScriptLibraryOpen] = useState(false);
  const [isScriptReferencesOpen, setIsScriptReferencesOpen] = useState(false);
  const [referenceScripts, setReferenceScripts] = useState<ReferenceScriptPayload[]>([]);
  // Render performance and transition options
  const [isShort, setIsShort] = useState(true);
  const [useLowerFps, setUseLowerFps] = useState(false);
  const [useLowerResolution, setUseLowerResolution] = useState(false);
  const [addSubtitles, setAddSubtitles] = useState(true);
  const [enableGlitchTransitions, setEnableGlitchTransitions] = useState(true);
  const [enableZoomRotateTransitions, setEnableZoomRotateTransitions] = useState(true);

  // Long-form only: split into multiple short scripts (tabs)
  type TabKey = 'full' | `short-${number}`;
  type TabSnapshot = {
    scriptId: string | null;
    sentences: SentenceItem[];
    voiceOver: File | null;
    voiceDuration: number | null;
    savedVoiceId: string | null;
    voiceLibraryUrl: string | null;
    videoJobId: string | null;
    videoJobStatus: string | null;
    videoJobError: string | null;
    videoUrl: string | null;
  };

  type AiSplitCache = {
    ranges: Array<{ start: number; end: number }>;
    shortSnapshotsByKey: Record<string, TabSnapshot>;
  };

  // ID of the full (parent) script draft; the active tab may be a short script.
  const [fullScriptId, setFullScriptId] = useState<string | null>(null);
  const [activeShortTabIndex, setActiveShortTabIndex] = useState<number | null>(null);
  const [shortRanges, setShortRanges] = useState<Array<{ start: number; end: number }>>([]);
  const [shortScriptIds, setShortScriptIds] = useState<string[]>([]);
  const [manualSplitEnabled, setManualSplitEnabled] = useState(false);
  const [shortsValidationError, setShortsValidationError] = useState<string | null>(null);
  const tabSnapshotsRef = useRef<Record<string, TabSnapshot>>({});
  const aiSplitCacheRef = useRef<AiSplitCache | null>(null);

  // Scripts longer than 3 minutes are treated as regular (non-shorts) videos.
  const scriptLengthMinutes = parseScriptLengthMinutes(scriptLength);
  const isLongForm =
    typeof scriptLengthMinutes === 'number' &&
    Number.isFinite(scriptLengthMinutes) &&
    scriptLengthMinutes > 3;
  const isShortsTabActive = isLongForm && activeShortTabIndex !== null;
  const effectiveIsShort = isShortsTabActive ? true : isLongForm ? false : isShort;
  const effectiveAspectRatio = effectiveIsShort ? '9:16' : '16:9';

  useEffect(() => {
    if (hasTouchedImageAspectRatio) return;
    setImageAspectRatio(effectiveIsShort ? '9:16' : '16:9');
  }, [effectiveIsShort, hasTouchedImageAspectRatio]);

  useEffect(() => {
    if (!isLongForm) return;
    if (!isShort) return;
    setIsShort(false);
  }, [isLongForm, isShort]);
  const {
    videoJobId,
    videoJobStatus,
    videoJobError,
    videoUrl,
    resetJob,
    setJobFromResponse,
    setVideoJobError,
    setVideoUrl,
  } = useVideoJob(API_URL);

  const tabKeyForIndex = (index: number | null): TabKey =>
    index === null ? 'full' : (`short-${index}` as const);

  const captureActiveTabSnapshot = (): TabSnapshot => {
    return {
      scriptId: activeScriptId,
      sentences,
      voiceOver,
      voiceDuration,
      savedVoiceId,
      voiceLibraryUrl,
      videoJobId,
      videoJobStatus,
      videoJobError,
      videoUrl,
    };
  };

  const cloneSnapshot = (snapshot: TabSnapshot): TabSnapshot => {
    return {
      ...snapshot,
      sentences: Array.isArray(snapshot.sentences)
        ? snapshot.sentences.map((s) => ({ ...s }))
        : [],
    };
  };

  const applyTabSnapshot = (snapshot: TabSnapshot) => {
    setActiveScriptId(snapshot.scriptId);
    setSentences(snapshot.sentences);
    setVoiceOver(snapshot.voiceOver);
    setVoiceDuration(snapshot.voiceDuration);
    setSavedVoiceId(snapshot.savedVoiceId);
    setVoiceLibraryUrl(snapshot.voiceLibraryUrl);

    resetJob();
    setVideoJobError(snapshot.videoJobError);
    if (snapshot.videoUrl) {
      setVideoUrl(snapshot.videoUrl);
      if (snapshot.scriptId) {
        setJobFromResponse(snapshot.scriptId, 'completed');
      }
      return;
    }

    if (snapshot.videoJobId) {
      setJobFromResponse(snapshot.videoJobId, snapshot.videoJobStatus ?? 'processing');
    }
  };

  const estimateSecondsForText = (text: string) => {
    const words = String(text ?? '')
      .trim()
      .split(/\s+/u)
      .filter(Boolean).length;
    // 150 words per minute => 2.5 words per second
    return words / 2.5;
  };

  const buildManualShortRanges = (storySentences: SentenceItem[]) => {
    const minSecondsPerShort = 30;
    const totalSentences = storySentences.length;
    if (totalSentences <= 0) return [] as Array<{ start: number; end: number }>;
    if (totalSentences === 1) return [{ start: 0, end: 0 }];

    const perSentenceSeconds = storySentences.map((s) => estimateSecondsForText(s.text));
    const totalSeconds = perSentenceSeconds.reduce((sum, v) => sum + v, 0);
    if (totalSeconds <= minSecondsPerShort) {
      return [{ start: 0, end: totalSentences - 1 }];
    }

    const ranges: Array<{ start: number; end: number }> = [];
    let start = 0;
    let cursorSeconds = 0;

    const remainingSecondsFrom = (idx: number) =>
      perSentenceSeconds.slice(idx).reduce((sum, v) => sum + v, 0);

    for (let i = 0; i < totalSentences; i += 1) {
      cursorSeconds += perSentenceSeconds[i];

      const remainingSeconds = remainingSecondsFrom(i + 1);
      const canCutHere = cursorSeconds >= minSecondsPerShort;
      const remainderWouldBeValid =
        remainingSeconds === 0 || remainingSeconds >= minSecondsPerShort;

      if (canCutHere && remainderWouldBeValid) {
        ranges.push({ start, end: i });
        start = i + 1;
        cursorSeconds = 0;
      }
    }

    if (start <= totalSentences - 1) {
      if (ranges.length === 0) {
        ranges.push({ start: 0, end: totalSentences - 1 });
      } else {
        ranges[ranges.length - 1].end = totalSentences - 1;
      }
    }

    return ranges;
  };

  const createShortsCtaSentenceItem = (): SentenceItem => {
    const now = Date.now();
    return {
      id: `${now}-shorts-cta`,
      text: SHORTS_CTA_SENTENCE,
      mediaMode: 'frames',
      sceneTab: 'video',
      image: null,
      imageUrl: null,
      video: null,
      videoUrl: '/subscribe.mp4',
      imagePrompt: null,
      isGeneratingImage: false,
      isSavingImage: false,
      savedImageId: null,
      isFromLibrary: false,
      isSuspense: false,
    };
  };

  const normalizeShortTabSentences = (items: SentenceItem[]): SentenceItem[] => {
    const story = (items ?? []).filter((s) => !isSubscribeLikeSentence(s.text));
    if (story.length === 0) return [createShortsCtaSentenceItem()];
    return [...story, createShortsCtaSentenceItem()];
  };

  const validateShortRanges = (
    ranges: Array<{ start: number; end: number }>,
    storySentences: SentenceItem[],
  ): string | null => {
    if (!ranges.length) return 'Please create at least one short.';

    // Coverage + contiguity
    let expectedStart = 0;
    for (const r of ranges) {
      if (r.start !== expectedStart) return 'Short ranges must be contiguous and cover all sentences.';
      if (r.end < r.start) return 'Invalid short range detected.';
      expectedStart = r.end + 1;

      const seconds = storySentences
        .slice(r.start, r.end + 1)
        .reduce((acc, s) => acc + estimateSecondsForText(s.text), 0);
      if (seconds < 30) {
        return 'Each short must be at least 30 seconds.';
      }
    }
    if (expectedStart !== storySentences.length) {
      return 'Short ranges must cover all sentences.';
    }
    return null;
  };

  const rebuildShortTabSnapshots = (ranges: Array<{ start: number; end: number }>): string | null => {
    const fullSnapshot = tabSnapshotsRef.current.full;
    const fullSentences = fullSnapshot?.sentences ?? (activeShortTabIndex === null ? sentences : []);
    const storySentences = fullSentences.filter((s) => !isSubscribeLikeSentence(s.text));

    const error = validateShortRanges(ranges, storySentences);
    setShortsValidationError(error);
    if (error) return error;

    // Drop existing short tab snapshots and rebuild.
    setShortScriptIds([]);
    Object.keys(tabSnapshotsRef.current)
      .filter((k) => k.startsWith('short-'))
      .forEach((k) => {
        delete tabSnapshotsRef.current[k];
      });

    for (let i = 0; i < ranges.length; i += 1) {
      const range = ranges[i];
      const base = storySentences.slice(range.start, range.end + 1);
      const cloned = base.map((s) => ({ ...s }));
      const withCta = [...cloned, createShortsCtaSentenceItem()];

      const existingScriptId = null;
      tabSnapshotsRef.current[tabKeyForIndex(i)] = {
        scriptId: existingScriptId,
        sentences: withCta,
        voiceOver: null,
        voiceDuration: null,
        savedVoiceId: null,
        voiceLibraryUrl: null,
        videoJobId: null,
        videoJobStatus: null,
        videoJobError: null,
        videoUrl: null,
      };
    }

    return null;
  };

  const handleSelectShortTab = (index: number | null) => {
    if (!isLongForm) return;

    const currentKey = tabKeyForIndex(activeShortTabIndex);
    tabSnapshotsRef.current[currentKey] = captureActiveTabSnapshot();

    setActiveShortTabIndex(index);

    const nextKey = tabKeyForIndex(index);
    const next = tabSnapshotsRef.current[nextKey];
    if (next) {
      applyTabSnapshot(next);
      return;
    }

    if (index === null) return;
    if (!shortRanges[index]) return;

    // Build on-demand from full snapshot.
    rebuildShortTabSnapshots(shortRanges);
    const built = tabSnapshotsRef.current[nextKey];
    if (built) {
      applyTabSnapshot(built);
    }
  };

  const handleUploadFinalVideo = async (file: File) => {
    if (!file) return;

    const MAX_UPLOAD_MB = 250;
    const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

    const isVideoMime = String(file.type || '').toLowerCase().startsWith('video/');
    if (!isVideoMime) {
      showToast('Please choose a valid video file.', 'error');
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      showToast(`Video is too large. Max size is ${MAX_UPLOAD_MB} MB.`, 'error');
      return;
    }

    setVideoJobError(null);
    resetJob();

    setIsUploadingVideo(true);
    try {
      const form = new FormData();
      form.append('video', file);

      const res = await fetch(`${API_URL}/videos/upload`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to upload video');
      }

      const data = (await res.json()) as {
        id?: string;
        status?: string;
        videoUrl?: string | null;
      };

      const id = String(data.id ?? '').trim();
      const status = String(data.status ?? '').trim() || 'completed';
      const url = data.videoUrl ? String(data.videoUrl).trim() : '';

      if (!id || !url) {
        throw new Error('Upload succeeded but response was missing id/videoUrl');
      }

      setJobFromResponse(id, status);
      setVideoUrl(url);
      showToast('Video uploaded successfully.', 'success');
    } catch (error) {
      console.error('Upload video failed', error);
      setVideoJobError('Failed to upload video. Please try again.');
      showAlert('Failed to upload video. Please try again in a moment.', {
        type: 'error',
      });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const voices = voicesByProvider[voiceProvider];
  const isLoadingVoices = isLoadingVoicesByProvider[voiceProvider];
  const voicesError = voicesErrorByProvider[voiceProvider];
  const selectedVoiceId = selectedVoiceIdByProvider[voiceProvider];

  const handleSelectVoice = (voiceId: string) => {
    setSelectedVoiceIdByProvider((prev) => ({ ...prev, [voiceProvider]: voiceId }));
  };

  const handleReuseSavedGeneration = async (
    msg: {
      id: string;
      video?: { video: string } | null;
      voice?: { voice: string } | null;
      scripts?: {
        id: string;
        title: string | null;
        script: string;
        sentences?: {
          id: string;
          text: string;
          index: number;
          image?: { id: string; image: string } | null;
        }[];
      }[];
    },
  ) => {
    const primaryScript = msg.scripts?.[0];
    if (!primaryScript?.script) {
      showAlert('This saved generation is missing a script.', { type: 'warning' });
      return;
    }

    setSplitError(null);
    setRandomScriptError(null);
    setVoiceError(null);

    // Restore script + sentences/images
    setScript(primaryScript.script);
    setOriginalScriptSubject(scriptSubject);
    setOriginalScriptSubjectContent(
      scriptSubject === 'religious (Islam)' ? scriptSubjectContent : '',
    );

    type RestorableSentence = {
      id: string;
      text: string;
      index: number;
      image?: { id: string; image: string } | null;
      video?: { id: string; video: string } | null;
      isSuspense?: boolean;
    };

    const sortedSentences: RestorableSentence[] = (primaryScript.sentences ?? [])
      .slice()
      .sort((a, b) => a.index - b.index);

    const now = Date.now();
    const sentencesForRestore: RestorableSentence[] =
      sortedSentences.length
        ? sortedSentences
        : [
            {
              id: `${now}-0`,
              text: primaryScript.script,
              index: 0,
              image: null,
            },
          ];

    const restored: SentenceItem[] = sentencesForRestore
      .map((s, idx) => {
        const isSubscribe = (s.text || '').trim() === SUBSCRIBE_SENTENCE;
        const hasVideo = !isSubscribe && Boolean(s.video?.video);
        return {
          id: s.id || `${now}-${idx}`,
          text: s.text,
          mediaMode: isSubscribe ? 'frames' : hasVideo ? 'frames' : 'single',
          sceneTab: isSubscribe ? 'video' : hasVideo ? 'video' : 'image',
          image: null,
          imageUrl: isSubscribe ? null : s.image?.image ?? null,
          video: null,
          videoUrl: isSubscribe ? '/subscribe.mp4' : s.video?.video ?? null,
          imagePrompt: null,
          isGeneratingImage: false,
          isSavingImage: false,
          savedImageId: isSubscribe ? null : s.image?.id ?? null,
          isFromLibrary: !!s.image,
          isSuspense: !isSubscribe && Boolean(s.isSuspense),
        };
      });

    // Ensure subscribe sentence exists at the end (same rule as splitting)
    const hasSubscribe = restored.some(
      (s) => (s.text || '').trim() === SUBSCRIBE_SENTENCE,
    );
    if (!hasSubscribe) {
      restored.push({
        id: `${now}-subscribe`,
        text: SUBSCRIBE_SENTENCE,
        mediaMode: 'frames',
        sceneTab: 'video',
        image: null,
        imageUrl: null,
        video: null,
        videoUrl: '/subscribe.mp4',
        imagePrompt: null,
        isGeneratingImage: false,
        isSavingImage: false,
        savedImageId: null,
        isFromLibrary: false,
        isSuspense: false,
      });
    }
    setSentences(restored);

    // Restore voice-over (download into File so render upload works)
    if (msg.voice?.voice) {
      try {
        const res = await fetch(msg.voice.voice);
        if (!res.ok) throw new Error('Failed to download voice-over');
        const blob = await res.blob();
        const file = new File([blob], 'reused-voice-over.mp3', {
          type: blob.type || 'audio/mpeg',
        });
        setVoiceOver(file);
        setSavedVoiceId(null);
        setVoiceLibraryUrl(msg.voice.voice);

        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
          const dur = Number.isFinite(audio.duration) ? audio.duration : null;
          setVoiceDuration(dur && dur > 0 ? dur : null);
          URL.revokeObjectURL(url);
        });
      } catch {
        setVoiceOver(null);
        setVoiceDuration(null);
        setSavedVoiceId(null);
        setVoiceLibraryUrl(null);
        showAlert('Failed to load the saved voice-over. You can re-upload/select a voice.', { type: 'warning' });
      }
    } else {
      setVoiceOver(null);
      setVoiceDuration(null);
      setSavedVoiceId(null);
      setVoiceLibraryUrl(null);
    }

    // Restore the generated video URL into the VideoStatusCard area
    if (msg.video?.video) {
      setVideoJobError(null);
      setVideoUrl(msg.video.video);
      setJobFromResponse(msg.id, 'completed');

      // Smoothly scroll to the video section
      if (videoSectionRef.current) {
        videoSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // Clear the preview if this saved item has no video
      resetJob();
    }
  };

  const fetchProviderVoices = async (provider: VoiceProvider) => {
    setIsLoadingVoicesByProvider((prev) => ({ ...prev, [provider]: true }));
    setVoicesErrorByProvider((prev) => ({ ...prev, [provider]: null }));
    try {
      const res = await fetch(
        `${API_URL}/voice-overs?provider=${encodeURIComponent(provider)}`,
      );
      if (!res.ok) {
        throw new Error('Failed to load voices');
      }

      const data = (await res.json()) as VoiceOverOption[];
      setVoicesByProvider((prev) => ({ ...prev, [provider]: data }));

      setSelectedVoiceIdByProvider((prev) => {
        const previousSelected = prev[provider];
        const favorite = data.find((v) => v.isFavorite);
        const fallbackId = favorite?.voice_id ?? (data.length > 0 ? data[0].voice_id : null);
        if (!fallbackId) return { ...prev, [provider]: null };
        if (!previousSelected) return { ...prev, [provider]: fallbackId };
        const stillExists = data.some((v) => v.voice_id === previousSelected);
        return {
          ...prev,
          [provider]: stillExists ? previousSelected : fallbackId,
        };
      });
    } catch (error) {
      console.error('Failed to load voices', error);
      setVoicesErrorByProvider((prev) => ({
        ...prev,
        [provider]: 'Failed to load voices.',
      }));
    } finally {
      setIsLoadingVoicesByProvider((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const fetchVoices = async () => fetchProviderVoices(voiceProvider);

  const fetchBackgroundSoundtracks = async () => {
    if (!user) return;

    setIsLoadingBackgroundSoundtracks(true);
    setBackgroundSoundtracksError(null);
    try {
      const res = await api.get<{
        items: { id: string; title: string; url: string; is_favorite?: boolean; volume_percent?: number }[];
        total: number;
        page: number;
        limit: number;
      }>('/background-soundtracks', { params: { page: 1, limit: 100 } });

      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setBackgroundSoundtracks(items);

      setSelectedBackgroundSoundtrackValue((prev) => {
        const current = String(prev ?? '').trim() || '__default__';

        const favorite = items.find((t) => Boolean(t?.is_favorite));
        const favoriteValue = favorite?.id ? `lib:${favorite.id}` : '__default__';

        if (current === '__default__' && favoriteValue !== '__default__') {
          return favoriteValue;
        }

        if (current.startsWith('lib:')) {
          const id = current.slice('lib:'.length);
          const exists = items.some((t) => t.id === id);
          if (!exists) return favoriteValue;
        }

        return current;
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load background soundtracks', error);
      setBackgroundSoundtracksError('Failed to load soundtracks.');
    } finally {
      setIsLoadingBackgroundSoundtracks(false);
    }
  };

  useEffect(() => {
    const value = String(selectedBackgroundSoundtrackValue ?? '').trim();
    if (!value.startsWith('lib:')) return;

    const id = value.slice('lib:'.length);
    const found = backgroundSoundtracks.find((t) => t.id === id);
    const next = Number(found?.volume_percent);
    if (Number.isFinite(next)) {
      setBackgroundSoundtrackVolumePercent(next);
    } else {
      setBackgroundSoundtrackVolumePercent(100);
    }
  }, [backgroundSoundtracks, selectedBackgroundSoundtrackValue]);

  const handleSetFavoriteBackgroundSoundtrack = async (soundtrackId: string) => {
    if (!user) {
      showAlert('You must be logged in to set a favorite soundtrack.', { type: 'warning' });
      return;
    }

    const id = String(soundtrackId ?? '').trim();
    if (!id) return;

    try {
      setIsSettingFavoriteBackgroundSoundtrack(true);
      const res = await api.patch<{ id: string }>('/background-soundtracks/favorite/' + encodeURIComponent(id));
      const updatedId = String(res.data?.id ?? id).trim();

      setBackgroundSoundtracks((prev) =>
        prev.map((t) => ({
          ...t,
          is_favorite: t.id === updatedId,
        })),
      );
      setSelectedBackgroundSoundtrackValue(`lib:${updatedId}`);
      showToast('Favorite soundtrack updated', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to set favorite soundtrack', error);
      showToast('Failed to set favorite soundtrack', 'error');
    } finally {
      setIsSettingFavoriteBackgroundSoundtrack(false);
    }
  };

  const handleSaveBackgroundSoundtrackVolume = async (params: {
    soundtrackId: string;
    volumePercent: number;
  }) => {
    if (!user) {
      showAlert('You must be logged in to save a soundtrack volume.', { type: 'warning' });
      return;
    }

    const id = String(params.soundtrackId ?? '').trim();
    if (!id) return;

    const raw = Number(params.volumePercent);
    const volumePercent = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 100;

    try {
      setIsSavingBackgroundSoundtrackVolume(true);
      const res = await api.patch<{ id: string; volume_percent?: number }>(
        '/background-soundtracks/volume/' + encodeURIComponent(id),
        { volumePercent },
      );

      const updatedId = String(res.data?.id ?? id).trim();
      const saved = Number(res.data?.volume_percent);

      setBackgroundSoundtracks((prev) =>
        prev.map((t) =>
          t.id === updatedId
            ? { ...t, volume_percent: Number.isFinite(saved) ? saved : volumePercent }
            : t,
        ),
      );

      showToast('Default volume saved.', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save soundtrack volume', error);
      showToast('Failed to save default volume.', 'error');
    } finally {
      setIsSavingBackgroundSoundtrackVolume(false);
    }
  };

  const handleDeleteBackgroundSoundtrack = async (soundtrackId: string) => {
    if (!user) {
      showAlert('You must be logged in to delete a soundtrack.', { type: 'warning' });
      return;
    }

    const id = String(soundtrackId ?? '').trim();
    if (!id) return;

    try {
      setIsDeletingBackgroundSoundtrack(true);
      await api.delete('/background-soundtracks/' + encodeURIComponent(id));

      setBackgroundSoundtracks((prev) => prev.filter((t) => t.id !== id));

      setSelectedBackgroundSoundtrackValue((prev) => {
        const current = String(prev ?? '').trim() || '__default__';
        if (current === `lib:${id}`) return '__default__';
        return current;
      });

      showToast('Soundtrack deleted.', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete soundtrack', error);
      showToast('Failed to delete soundtrack.', 'error');
    } finally {
      setIsDeletingBackgroundSoundtrack(false);
    }
  };

  const handleUploadBackgroundSoundtrackUseOnce = async (file: File) => {
    if (!user) {
      showAlert('You must be logged in to upload a soundtrack.', { type: 'warning' });
      return;
    }
    if (!file) return;

    setIsUploadingBackgroundSoundtrack(true);
    try {
      const form = new FormData();
      form.append('soundtrack', file);

      const res = await api.post<{ url: string }>('/background-soundtracks/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = String(res.data?.url ?? '').trim();
      if (!url) {
        throw new Error('Upload succeeded but response was missing url');
      }

      setOneOffBackgroundSoundtrackUrl(url);
      setSelectedBackgroundSoundtrackValue('__oneoff__');
      showToast('Soundtrack uploaded (one-off).', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Upload soundtrack (one-off) failed', error);
      showAlert('Failed to upload soundtrack. Please try again.', { type: 'error' });
    } finally {
      setIsUploadingBackgroundSoundtrack(false);
    }
  };

  const handleUploadBackgroundSoundtrackAddToLibrary = async (params: { file: File; title: string }) => {
    if (!user) {
      showAlert('You must be logged in to add a soundtrack.', { type: 'warning' });
      return;
    }
    const file = params.file;
    const title = String(params.title ?? '').trim();
    if (!file) return;
    if (!title) {
      showAlert('Please enter a title for this soundtrack.', { type: 'warning' });
      return;
    }

    setIsUploadingBackgroundSoundtrack(true);
    try {
      const form = new FormData();
      form.append('soundtrack', file);
      form.append('title', title);

      const res = await api.post<{ id: string; title: string; url: string }>(
        '/background-soundtracks',
        form,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      const created = {
        id: String(res.data?.id ?? '').trim(),
        title: String(res.data?.title ?? '').trim(),
        url: String(res.data?.url ?? '').trim(),
        volume_percent: 100,
      };

      if (!created.id || !created.url) {
        throw new Error('Create succeeded but response was missing id/url');
      }

      setBackgroundSoundtracks((prev) => {
        const withoutDup = prev.filter((t) => t.id !== created.id);
        return [created, ...withoutDup];
      });
      setSelectedBackgroundSoundtrackValue(`lib:${created.id}`);
      showToast('Soundtrack added to your library.', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Add soundtrack to library failed', error);
      showAlert('Failed to add soundtrack. Please try again.', { type: 'error' });
    } finally {
      setIsUploadingBackgroundSoundtrack(false);
    }
  };

  const handleSetFavoriteVoice = async (voiceId: string) => {
    if (!user) {
      showAlert('You must be logged in to set a favorite voice.', { type: 'warning' });
      return;
    }

    try {
      setIsSettingFavoriteVoice(true);
      await api.patch(`/voice-overs/favorite/${encodeURIComponent(voiceId)}`);
      await fetchProviderVoices(voiceProvider);

      showToast('Favorite voice updated', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to set favorite voice', error);
      showToast('Failed to set favorite voice', 'error');
    }
    finally {
      setIsSettingFavoriteVoice(false);
    }
  };

  const handleOpenScriptReferences = () => {
    setIsScriptReferencesOpen(true);
  };

  const handleApplyReferenceScripts = (scripts: ScriptReferenceDto[]) => {
    const normalized: ReferenceScriptPayload[] = (scripts ?? [])
      .filter((s) => Boolean(s?.id) && Boolean(s?.script?.trim()))
      .map((s) => ({
        id: s.id,
        title: s.title ?? null,
        script: s.script,
      }));
    setReferenceScripts(normalized);
    showToast(
      normalized.length > 0
        ? `Selected ${normalized.length} reference script${normalized.length === 1 ? '' : 's'}`
        : 'No reference scripts selected',
      'success',
    );
  };

  const handleRemoveReferenceScript = (id: string) => {
    setReferenceScripts((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearReferenceScripts = () => {
    setReferenceScripts([]);
  };

  const handleSelectChat = async (chatId: string | null) => {
    setSelectedChatId(chatId);
    setSelectedChatMessages(null);
    setSelectedChatTitle(null);

    if (!chatId) return;

    try {
      const res = await api.get<{
        chat: { id: string; title: string | null };
        messages: {
          id: string;
          created_at: string;
          video?: { video: string } | null;
          voice?: { voice: string } | null;
          scripts?: {
            id: string;
            title: string | null;
            script: string;
            sentences?: {
              id: string;
              text: string;
              index: number;
              image?: { id: string; image: string } | null;
            }[];
          }[];
        }[];
      }>(`/chats/${chatId}/messages`);

      setSelectedChatTitle(res.data.chat.title);
      setSelectedChatMessages(res.data.messages || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load chat messages', error);
    }
  };

  useEffect(() => {
    // Prefetch both providers so switching is instant.
    void Promise.all([fetchProviderVoices('google'), fetchProviderVoices('elevenlabs')]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchBackgroundSoundtracks();
  }, [user]);

  const stopVoicePreview = () => {
    try {
      previewAbortRef.current?.abort();
    } catch {
      // ignore
    }
    previewAbortRef.current = null;

    try {
      previewAudioRef.current?.pause();
    } catch {
      // ignore
    }
    previewAudioRef.current = null;

    if (previewAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(previewAudioUrlRef.current);
      } catch {
        // ignore
      }
    }
    previewAudioUrlRef.current = null;
  };

  useEffect(() => {
    // Switching providers should stop any currently playing preview.
    stopVoicePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceProvider]);

  useEffect(() => {
    return () => {
      stopVoicePreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreviewVoice = async (voiceId: string) => {
    if (!voiceId) return;

    // Stop any previous preview first.
    stopVoicePreview();
    setIsPreviewingVoice(true);

    const controller = new AbortController();
    previewAbortRef.current = controller;

    try {
      const style =
        voiceProvider === 'google'
          ? String(aiStudioStyleInstructions ?? '').trim()
          : '';

      // If the user provided style instructions, generate a fresh preview so the audio matches.
      // Otherwise use the cached Cloudinary preview URL endpoint.
      if (voiceProvider === 'google' && style) {
        const previewText = 'Hello! This is a short preview of the selected voice.';

        const response = await fetch(`${API_URL}/ai/generate-voice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            script: previewText,
            voiceId,
            styleInstructions: style,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate preview');
        }

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type');
        const mimeType = contentType || 'audio/wav';

        const blob = new Blob([arrayBuffer], { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        previewAudioUrlRef.current = objectUrl;

        const audio = new Audio(objectUrl);
        previewAudioRef.current = audio;
        audio.addEventListener(
          'ended',
          () => {
            stopVoicePreview();
          },
          { once: true },
        );
        audio.addEventListener(
          'error',
          () => {
            stopVoicePreview();
          },
          { once: true },
        );

        await audio.play();
        return;
      }

      const response = await fetch(
        `${API_URL}/voice-overs/preview/${encodeURIComponent(voiceId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const data = (await response.json()) as { preview_url?: string };
      const url = String(data?.preview_url ?? '').trim();
      if (!url) {
        throw new Error('Missing preview_url from server');
      }

      // Cache the URL locally so next preview can play instantly.
      setVoicesByProvider((prev) => {
        const next = { ...prev } as typeof prev;
        const providerKey = voiceProvider;
        const list = next[providerKey];
        if (!Array.isArray(list) || list.length === 0) return prev;
        next[providerKey] = list.map((v) =>
          v.voice_id === voiceId ? { ...v, preview_url: url } : v,
        );
        return next;
      });

      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.addEventListener(
        'ended',
        () => {
          stopVoicePreview();
        },
        { once: true },
      );
      audio.addEventListener(
        'error',
        () => {
          stopVoicePreview();
        },
        { once: true },
      );

      await audio.play();
    } catch (error) {
      const isAbortError =
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        (error as { name?: unknown }).name === 'AbortError';

      if (!isAbortError) {
        console.error('Voice preview failed', error);
        showToast('Failed to preview voice. Please try again.', 'error');
      }
      stopVoicePreview();
    } finally {
      setIsPreviewingVoice(false);
    }
  };

  // When navigated to /generate/:id, auto-load that chat's messages
  useEffect(() => {
    if (routeChatId) {
      handleSelectChat(routeChatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeChatId]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...newFiles]);
    }
  };

  const handleVoiceUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVoiceOver(file);
      setVoiceDuration(null);
      setSavedVoiceId(null);
      setVoiceLibraryUrl(null);

      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        if (!Number.isNaN(audio.duration) && audio.duration > 0) {
          setVoiceDuration(audio.duration);
        }
      });
    }
  };

  const handleGenerateVoice = async (
    voiceId?: string | null,
  ) => {
    if (!script.trim()) {
      showAlert('Please provide a script before generating a voice-over.', { type: 'warning' });
      return;
    }

    if (!voiceId) {
      showAlert('Please select a voice before generating.', { type: 'warning' });
      return;
    }

    setVoiceError(null);
    setIsGeneratingVoice(true);

    try {
      const mergeSentences = (items: string[]) => {
        return items
          .map((s) => (s ?? '').trim())
          .filter(Boolean)
          .map((s) => (/[.!?]$/u.test(s) ? s : `${s}.`))
          .join(' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
      };

      const normalize = (value: string) => {
        return String(value ?? '')
          .toLowerCase()
          .trim()
          .replace(/[.!?]+$/u, '')
          .replace(/&/g, 'and')
          .replace(/\s+/g, ' ');
      };

      const shouldIncludeSubscribeInVoice = activeShortTabIndex === null;

      const sentenceTexts = (sentences || [])
        .map((s) => s.text)
        .filter(Boolean);

      const subscribeNorm = normalize(SUBSCRIBE_SENTENCE);
      const shortsCtaNorm = normalize(SHORTS_CTA_SENTENCE);

      // Shorts voice-overs should not include the old subscribe sentence,
      // but SHOULD include the shorts CTA (“You can watch the full video…”).
      let sentencesForVoice = shouldIncludeSubscribeInVoice
        ? sentenceTexts
        : sentenceTexts.filter((t) => normalize(t) !== subscribeNorm);

      if (!shouldIncludeSubscribeInVoice) {
        const hasShortsCta = sentencesForVoice.some((t) => normalize(t) === shortsCtaNorm);
        if (!hasShortsCta) {
          sentencesForVoice = [...sentencesForVoice, SHORTS_CTA_SENTENCE];
        }
      }

      let scriptForVoice =
        sentencesForVoice.length > 0 ? mergeSentences(sentencesForVoice) : script;

      // Legacy behavior for full videos: ensure the subscribe sentence exists at the end.
      if (shouldIncludeSubscribeInVoice) {
        const targetNorm = subscribeNorm;
        const mergedNorm = normalize(
          sentencesForVoice.length > 0 ? mergeSentences(sentencesForVoice) : scriptForVoice,
        );

        if (!mergedNorm.includes(targetNorm)) {
          if (sentencesForVoice.length > 0) {
            sentencesForVoice = [...sentencesForVoice, SUBSCRIBE_SENTENCE];
            scriptForVoice = mergeSentences(sentencesForVoice);
          } else {
            const base = String(scriptForVoice ?? '').trim();
            const needsPunctuation = base && !/[.!?]$/u.test(base);
            scriptForVoice = `${base}${needsPunctuation ? '.' : ''} ${SUBSCRIBE_SENTENCE}`.trim();
          }
        }
      }

      const response = await fetch(`${API_URL}/ai/generate-voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: scriptForVoice,
          sentences: sentencesForVoice.length > 0 ? sentencesForVoice : undefined,
          voiceId,
          styleInstructions:
            voiceProvider === 'google'
              ? String(aiStudioStyleInstructions ?? '').trim() || undefined
              : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate voice');
      }

      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type');
      const disposition = response.headers.get('content-disposition');

      const fallbackMime = voiceProvider === 'google' ? 'audio/wav' : 'audio/mpeg';
      const mimeType = String(contentType ?? '').trim() || fallbackMime;

      const headerFilename = filenameFromContentDisposition(disposition);
      const extFromMime = extensionFromAudioMimeType(mimeType);
      const defaultExt = voiceProvider === 'google' ? 'wav' : 'mp3';
      const fileName =
        headerFilename ||
        `${voiceProvider}-voice-over.${extFromMime || defaultExt}`;

      const blob = new Blob([arrayBuffer], { type: mimeType });
      const file = new File([blob], fileName, { type: mimeType });

      setVoiceOver(file);
      setVoiceDuration(null);
      setSavedVoiceId(null);
      setVoiceLibraryUrl(null);

      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        if (!Number.isNaN(audio.duration) && audio.duration > 0) {
          setVoiceDuration(audio.duration);
        }
      });
    } catch (error) {
      console.error('Voice generation failed', error);
      setVoiceError(
        'Failed to generate voice. Please try again in a moment.',
      );
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVoice = () => {
    setVoiceOver(null);
    setVoiceDuration(null);
    setSavedVoiceId(null);
    setVoiceLibraryUrl(null);
  };

  const persistVoiceToLibrary = async (file: File) => {
    // Upload directly to Cloudinary from the client to avoid Vercel serverless limits.
    const cloudinaryUrl = await uploadToCloudinaryUnsigned(file, {
      resourceType: 'video',
      folder: 'auto-video-generator/voices',
    });

    const hash = await sha256HexForFile(file);

    const response = await api.post<{ id: string }>('/voices/url', {
      voice: cloudinaryUrl,
      hash: hash ?? undefined,
    });

    return { id: response.data.id, url: cloudinaryUrl };
  };

  const handleSaveVoice = async () => {
    if (!voiceOver) {
      showAlert('No voice-over to save.', { type: 'warning' });
      return;
    }

    if (savedVoiceId) {
      return;
    }

    if (!user) {
      showAlert('You must be logged in to save voice-overs.', { type: 'warning' });
      return;
    }

    setIsSavingVoice(true);

    try {
      const saved = await persistVoiceToLibrary(voiceOver);
      setSavedVoiceId(saved.id);
      setVoiceLibraryUrl(null);
    } catch (error) {
      console.error('Save voice-over failed', error);
      showAlert('Failed to save voice-over. Please try again.', { type: 'error' });
    } finally {
      setIsSavingVoice(false);
    }
  };

  const handleOpenVoiceLibrary = () => {
    setIsVoiceLibraryOpen(true);
  };

  const handleVoiceLibrarySelect = async (voiceUrl: string, id: string) => {
    try {
      const res = await fetch(voiceUrl);
      if (!res.ok) {
        throw new Error('Failed to fetch voice from library');
      }
      const blob = await res.blob();
      const fileName = 'library-voice-over.mp3';
      const file = new File([blob], fileName, {
        type: blob.type || 'audio/mpeg',
      });

      setVoiceOver(file);
      setVoiceDuration(null);
      setSavedVoiceId(id);
      setVoiceLibraryUrl(voiceUrl);

      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        if (!Number.isNaN(audio.duration) && audio.duration > 0) {
          setVoiceDuration(audio.duration);
        }
      });
    } catch (error) {
      console.error('Select voice from library failed', error);
      showAlert('Failed to load voice from library. Please try again.', { type: 'error' });
    }
  };

  const handleGenerate = async () => {
    if (!script.trim()) {
      showAlert('Please provide a script', { type: 'warning' });
      return;
    }
    if (!voiceOver) {
      showAlert('Please provide a voice-over', { type: 'warning' });
      return;
    }
    if (!sentences.length) {
      showAlert('Please split the script into sentences first', { type: 'warning' });
      return;
    }

    const missingMediaForImageTab = sentences.some((s) => {
      const text = String(s.text ?? '').trim();
      if (isSubscribeLikeSentence(text)) return false;
      const tab = s.sceneTab ?? (s.mediaMode === 'frames' ? 'video' : 'image');
      if (tab !== 'image') return false;
      return !s.image && !s.imageUrl;
    });

    if (missingMediaForImageTab) {
      showAlert('Please provide an image for each sentence on the Image tab.', {
        type: 'warning',
      });
      return;
    }

    const missingVideoTab = sentences
      .map((s, index) => {
        const text = String(s.text ?? '').trim();
        if (isSubscribeLikeSentence(text)) return null;
        const tab = s.sceneTab ?? (s.mediaMode === 'frames' ? 'video' : 'image');
        if (tab !== 'video') return null;

        const url = String(s.videoUrl ?? '').trim();
        const hasHttpUrl = url.startsWith('http://') || url.startsWith('https://');
        return hasHttpUrl ? null : index;
      })
      .filter((v): v is number => v !== null);

    if (missingVideoTab.length > 0) {
      showAlert(
        `You are on the Video tab for ${missingVideoTab.length} sentence(s), but no video is generated yet. Generate the sentence video or switch back to the Image tab.`,
        { type: 'warning' },
      );
      return;
    }

    resetJob();

    setIsGenerating(true);
    try {
      const form = new FormData();
      form.append('voiceOver', voiceOver);

      const resolveBackgroundMusicSrcForRender = (): string | undefined => {
        const value = String(selectedBackgroundSoundtrackValue ?? '').trim();
        if (value === '__none__') return '__none__';

        // If the user uploaded a one-off soundtrack, always use it for rendering
        // even if another soundtrack is currently selected in the dropdown.
        // (Unless the user explicitly chose "None" above.)
        const oneOffUrl = String(oneOffBackgroundSoundtrackUrl ?? '').trim();
        if (oneOffUrl) return oneOffUrl;

        if (!value || value === '__default__') return undefined;
        if (value === '__oneoff__') {
          return undefined;
        }
        if (value.startsWith('lib:')) {
          const id = value.slice('lib:'.length);
          const found = backgroundSoundtracks.find((t) => t.id === id);
          return found?.url ? String(found.url).trim() : undefined;
        }
        return undefined;
      };

      const backgroundMusicSrc = resolveBackgroundMusicSrcForRender();
      if (backgroundMusicSrc) {
        form.append('backgroundMusicSrc', backgroundMusicSrc);
      }

      const normalizedBackgroundMusicVolume = Math.max(
        0,
        Math.min(1, (backgroundSoundtrackVolumePercent ?? 100) / 100),
      );
      // Only send when it deviates from default (keeps payload minimal).
      if (normalizedBackgroundMusicVolume !== 1) {
        form.append(
          'backgroundMusicVolume',
          String(normalizedBackgroundMusicVolume),
        );
      }

      const sentencePayload = sentences.map((s) => {
        const text = String(s.text ?? '');
        const trimmed = text.trim();

        const transitionToNext = s.transitionToNext ?? null;
        if (isSubscribeLikeSentence(trimmed)) {
          return {
            text,
            isSuspense: false,
            mediaType: 'video' as const,
            videoUrl: '/subscribe.mp4',
            ...(transitionToNext ? { transitionToNext } : {}),
          };
        }

        const tab = s.sceneTab ?? (s.mediaMode === 'frames' ? 'video' : 'image');
        if (tab === 'video') {
          return {
            text,
            isSuspense: Boolean(s.isSuspense),
            mediaType: 'video' as const,
            videoUrl: String(s.videoUrl ?? '').trim(),
            ...(transitionToNext ? { transitionToNext } : {}),
          };
        }

        const visualEffect = s.visualEffect ?? null;

        return {
          text,
          isSuspense: Boolean(s.isSuspense),
          mediaType: 'image' as const,
          ...(transitionToNext ? { transitionToNext } : {}),
          ...(visualEffect ? { visualEffect } : {}),
        };
      });
      form.append('sentences', JSON.stringify(sentencePayload));
      form.append('scriptLength', scriptLength);
      if (voiceDuration && voiceDuration > 0) {
        form.append('audioDurationSeconds', String(voiceDuration));
      }

      // Render configuration flags
      form.append('isShort', effectiveIsShort ? 'true' : 'false');
      form.append('useLowerFps', useLowerFps ? 'true' : 'false');
      form.append(
        'useLowerResolution',
        useLowerResolution ? 'true' : 'false',
      );
      form.append('addSubtitles', addSubtitles ? 'true' : 'false');
      form.append(
        'enableGlitchTransitions',
        enableGlitchTransitions ? 'true' : 'false',
      );
      form.append(
        'enableZoomRotateTransitions',
        enableZoomRotateTransitions ? 'true' : 'false',
      );

      // Prepare image files only for sentences on the Image tab (excluding the subscribe sentence).
      // The backend will align these uploads to image-tab sentences in sentence order.
      const imageUploads: File[] = [];

      // eslint-disable-next-line no-restricted-syntax
      for (let index = 0; index < sentences.length; index += 1) {
        const s = sentences[index];
        const text = String(s?.text ?? '').trim();
        if (isSubscribeLikeSentence(text)) continue;

        const tab = s.sceneTab ?? (s.mediaMode === 'frames' ? 'video' : 'image');
        if (tab !== 'image') continue;

        if (s.image) {
          imageUploads.push(s.image);
          continue;
        }

        if (s.imageUrl?.startsWith('data:')) {
          imageUploads.push(dataUrlToFile(s.imageUrl, `sentence-${index + 1}.png`));
          continue;
        }

        if (s.imageUrl) {
          try {
            const res = await fetch(s.imageUrl);
            if (!res.ok) {
              throw new Error('Failed to fetch image URL');
            }
            const blob = await res.blob();
            imageUploads.push(
              new File([blob], `sentence-${index + 1}.png`, {
                type: blob.type || 'image/png',
              }),
            );
            continue;
          } catch (error) {
            console.error('Failed to prepare image upload', error);
            showAlert(
              `Failed to prepare image for sentence ${index + 1}. Please try re-selecting the image.`,
              { type: 'error' },
            );
            return;
          }
        }
      }

      imageUploads.forEach((file) => form.append('images', file));

      const res = await fetch(`${API_URL}/videos`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        throw new Error('Failed to start video generation');
      }

      const data = (await res.json()) as {
        id: string;
        status: string;
      };

      setJobFromResponse(data.id, data.status);

      // Smoothly scroll to the video status section after starting generation
      if (videoSectionRef.current) {
        videoSectionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    } catch (err) {
      console.error('Start video generation failed', err);
      setVideoJobError('Failed to start video generation. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateRandomScript = async () => {
    setRandomScriptError(null);
    setIsRandomScriptLoading(true);
    setScript('');
    // Clear existing sentences and voice-over when generating a new script
    setSentences([]);
    setSplitError(null);
    setScriptCharacters([]);
    setScriptEras([]);
    setVoiceOver(null);
    setVoiceDuration(null);
    setSavedVoiceId(null);
    setVoiceLibraryUrl(null);
    // Reset original config until generation finishes
    setOriginalScriptSubject(undefined);
    setOriginalScriptSubjectContent(undefined);

    try {
      const usingReferences = referenceScripts.length > 0;

      const response = await fetch(`${API_URL}/ai/generate-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: scriptSubject,
          subjectContent:
            scriptSubject === 'religious (Islam)'
              ? scriptSubjectContent || undefined
              : undefined,
          length: scriptLength,
          technique: scriptTechnique,
          model: scriptModel,
          ...(usingReferences
            ? {
              referenceScripts: referenceScripts.map((s) => ({
                id: s.id,
                title: s.title ?? undefined,
                script: s.script,
              })),
            }
            : {
              style: scriptStyle,
              systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : undefined,
            }),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start script generation');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Stream chunks into the textarea as they arrive
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          setScript((prev) => prev + chunk);
        }
      }
    } catch (error) {
      console.error('Random script generation failed', error);
      setRandomScriptError(
        'Failed to generate script. Please try again in a moment.',
      );
    } finally {
      setIsRandomScriptLoading(false);
      // After generation completes, if we have a script, capture original config
      // Excludes model/length/style per requirements
      setOriginalScriptSubject(scriptSubject);
      setOriginalScriptSubjectContent(
        scriptSubject === 'religious (Islam)' ? scriptSubjectContent : ''
      );
    }
  };

  const handleSplitScript = async () => {
    if (!script.trim()) {
      setSplitError('Please enter or generate a script first.');
      return;
    }

    setSplitError(null);
    setIsSplitting(true);
    try {
      const response = await fetch(`${API_URL}/ai/split-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script,
          model: scriptModel,
          systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to split script');
      }

      const data = (await response.json()) as {
        sentences: Array<{
          text: string;
          characterKeys: string[];
          eraKey: string | null;
        }>;
        characters?: ScriptCharacter[];
        eras?: ScriptEra[];
      };

      // Normalize and ensure the subscribe sentence appears only once at the end
      const normalize = (value: string) => {
        return value
          .toLowerCase()
          .trim()
          .replace(/[.!?]+$/u, '')
          .replace(/&/g, 'and')
          .replace(/\s+/g, ' ');
      };

      const targetNorm = normalize(SUBSCRIBE_SENTENCE);

      const processed: Array<{
        text: string;
        characterKeys: string[];
        eraKey: string | null;
      }> = [];
      let hasSubscribe = false;

      for (const raw of data.sentences ?? []) {
        const trimmed = String(raw?.text ?? '').trim();
        if (!trimmed) continue;
        const norm = normalize(trimmed);
        if (norm === targetNorm) {
          if (!hasSubscribe) {
            hasSubscribe = true;
            processed.push({
              text: SUBSCRIBE_SENTENCE,
              characterKeys: [],
              eraKey: null,
            });
          }
        } else {
          processed.push({
            text: trimmed,
            characterKeys: Array.isArray(raw?.characterKeys)
              ? raw.characterKeys.map((k) => String(k ?? '').trim()).filter(Boolean)
              : [],
            eraKey: String(raw?.eraKey ?? '').trim() || null,
          });
        }
      }

      if (!hasSubscribe) {
        processed.push({
          text: SUBSCRIBE_SENTENCE,
          characterKeys: [],
          eraKey: null,
        });
      }

      const now = Date.now();
      const items: SentenceItem[] = processed.map(({ text, characterKeys, eraKey }, idx) => ({
        id: `${now}-${idx}`,
        text,
        characterKeys: characterKeys.length ? Array.from(new Set(characterKeys)) : null,
        eraKey,
        forcedEraKey: eraKey,
        mediaMode: 'single',
        sceneTab: text === SUBSCRIBE_SENTENCE ? 'video' : 'image',
        forcedCharacterKeys: Array.from(new Set(characterKeys)),
        image: null,
        imageUrl: null,
        video: text === SUBSCRIBE_SENTENCE ? null : null,
        videoUrl: text === SUBSCRIBE_SENTENCE ? '/subscribe.mp4' : null,
        startImage: null,
        startImageUrl: null,
        startImagePrompt: null,
        startSavedImageId: null,
        endImage: null,
        endImageUrl: null,
        endImagePrompt: null,
        endSavedImageId: null,
        isSuspense: false,
      }));

      setFullScriptId(null);
      setActiveScriptId(null);
      setActiveShortTabIndex(null);
      setShortRanges([]);
      setShortScriptIds([]);
      setManualSplitEnabled(false);
      setShortsValidationError(null);
      tabSnapshotsRef.current = {};
      aiSplitCacheRef.current = null;
      setSentences(items);
      setScriptCharacters(Array.isArray(data.characters) ? data.characters : []);
      setScriptEras(Array.isArray(data.eras) ? data.eras : []);
    } catch (error) {
      console.error('Split script failed', error);
      setSplitError('Failed to split script. Please try again.');
    } finally {
      setIsSplitting(false);
    }
  };

  const handleSplitIntoShortsWithAi = async () => {
    if (!isLongForm) return;
    if (sentences.length === 0) return;

    setIsSplittingIntoShorts(true);
    try {
      // Persist any edits on the current tab before splitting.
      tabSnapshotsRef.current[tabKeyForIndex(activeShortTabIndex)] =
        captureActiveTabSnapshot();

      // Ensure we have a stable full snapshot to split from.
      if (activeShortTabIndex === null) {
        tabSnapshotsRef.current.full = tabSnapshotsRef.current.full ?? captureActiveTabSnapshot();
      }

      const fullSnapshot = tabSnapshotsRef.current.full;
      if (!fullSnapshot) {
        showToast('Unable to locate Full Video content for splitting.', 'error');
        return;
      }

      const fullSentences = fullSnapshot.sentences;
      const storySentences = fullSentences.filter((s) => !isSubscribeLikeSentence(s.text));
      const storyTexts = storySentences.map((s) => String(s.text ?? '').trim()).filter(Boolean);

      if (storyTexts.length < 2) {
        showToast('Not enough sentences to split into shorts.', 'error');
        return;
      }

      const res = await api.post('/ai/split-into-shorts', {
        sentences: storyTexts,
        model: imagePromptModel,
      });

      const data = res.data as { ranges?: Array<{ start: number; end: number }> };
      const ranges = Array.isArray(data?.ranges) ? data.ranges : [];

      // This was generated by AI, so the Manual split switch should be OFF.
      setManualSplitEnabled(false);
      setShortRanges(ranges);
      const error = rebuildShortTabSnapshots(ranges);
      if (error) {
        showToast(error, 'error');
        return;
      }

      // Cache the AI split so toggling Manual split OFF can restore it.
      const shortSnapshotsByKey: Record<string, TabSnapshot> = {};
      for (let i = 0; i < ranges.length; i += 1) {
        const key = tabKeyForIndex(i);
        const snap = tabSnapshotsRef.current[key];
        if (snap) shortSnapshotsByKey[key] = cloneSnapshot(snap);
      }
      aiSplitCacheRef.current = {
        ranges: ranges.map((r) => ({ start: r.start, end: r.end })),
        shortSnapshotsByKey,
      };

      // After re-splitting, return to Full Video to avoid landing on an invalid short tab index.
      setActiveShortTabIndex(null);
      applyTabSnapshot(fullSnapshot);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Split into shorts failed', error);
      showToast('Failed to split into shorts. Please try again.', 'error');
    } finally {
      setIsSplittingIntoShorts(false);
    }
  };

  const handleSplitIntoShortsManually = () => {
    if (!isLongForm) return;
    if (sentences.length === 0) return;

    // Persist any edits on the current tab before splitting.
    tabSnapshotsRef.current[tabKeyForIndex(activeShortTabIndex)] =
      captureActiveTabSnapshot();

    // Ensure we have a stable full snapshot to split from.
    if (activeShortTabIndex === null) {
      tabSnapshotsRef.current.full = tabSnapshotsRef.current.full ?? captureActiveTabSnapshot();
    }

    const fullSnapshot = tabSnapshotsRef.current.full;
    if (!fullSnapshot) {
      showToast('Unable to locate Full Video content for splitting.', 'error');
      return;
    }

    const fullSentences = fullSnapshot.sentences;
    const storySentences = fullSentences.filter((s) => !isSubscribeLikeSentence(s.text));
    const ranges = buildManualShortRanges(storySentences);

    const error = rebuildShortTabSnapshots(ranges);
    if (error) {
      showToast(error, 'error');
      return;
    }

    setManualSplitEnabled(true);
    setShortRanges(ranges);
    setActiveShortTabIndex(null);
    applyTabSnapshot(fullSnapshot);
  };

  const handleResetScriptAndSentences = () => {
    setFullScriptId(null);
    setActiveScriptId(null);
    setActiveShortTabIndex(null);
    setShortRanges([]);
    setShortScriptIds([]);
    setManualSplitEnabled(false);
    setShortsValidationError(null);
    tabSnapshotsRef.current = {};
    aiSplitCacheRef.current = null;
    aiSplitCacheRef.current = null;
    setScript('');
    setSentences([]);
    setSplitError(null);
    setScriptCharacters([]);
    setScriptEras([]);
    setOriginalScriptSubject(undefined);
    setOriginalScriptSubjectContent(undefined);
  };

  const handleScriptCharactersChange = (next: ScriptCharacter[]) => {
    setScriptCharacters(Array.isArray(next) ? next : []);
  };

  const handleScriptErasChange = (next: ScriptEra[]) => {
    setScriptEras(Array.isArray(next) ? next : []);
  };

  const handleOpenScriptLibrary = () => {
    setIsScriptLibraryOpen(true);
  };

  const mapBackendSentencesToUi = (backend: BackendSentenceDto[]): SentenceItem[] => {
    const sorted = [...backend].sort((a, b) => a.index - b.index);
    return sorted.map((s) => {
      const subscribeLike = isSubscribeLikeSentence(s.text);

      const inferredCharacterKeys = Array.isArray(s.character_keys)
        ? s.character_keys
        : null;
      const forcedCharacterKeys = Array.isArray(s.forced_character_keys)
        ? s.forced_character_keys
        : null;
      const resolvedForcedCharacterKeys =
        forcedCharacterKeys ?? inferredCharacterKeys;

      const inferredEraKey = String(s.era_key ?? '').trim() || null;
      const forcedEraKey =
        s.forced_era_key === null || s.forced_era_key === undefined
          ? null
          : String(s.forced_era_key).trim();
      const resolvedForcedEraKey = forcedEraKey !== null ? forcedEraKey : inferredEraKey;

      return {
        id: s.id,
        text: s.text,
        characterKeys: inferredCharacterKeys,
        eraKey: inferredEraKey,
        forcedEraKey: resolvedForcedEraKey,
        mediaMode: subscribeLike || s.startFrameImage || s.endFrameImage ? 'frames' : 'single',
        sceneTab: subscribeLike ? 'video' : s.video ? 'video' : 'image',
        forcedCharacterKeys: resolvedForcedCharacterKeys,
        transitionToNext: s.transition_to_next ?? null,
        visualEffect: s.visual_effect ?? null,
        image: null,
        imageUrl: subscribeLike ? null : s.image?.image ?? null,
        startImage: null,
        startImageUrl: s.startFrameImage?.image ?? null,
        startImagePrompt: s.startFrameImage?.prompt ?? null,
        startSavedImageId: s.startFrameImage?.id ?? null,
        endImage: null,
        endImageUrl: s.endFrameImage?.image ?? null,
        endImagePrompt: s.endFrameImage?.prompt ?? null,
        endSavedImageId: s.endFrameImage?.id ?? null,
        video: null,
        videoUrl: subscribeLike ? '/subscribe.mp4' : s.video?.video ?? null,
        savedVideoId: s.video?.id ?? null,
        videoPrompt: String(s.video_prompt ?? '').trim() || null,
        imagePrompt: s.image?.prompt ?? null,
        isGeneratingImage: false,
        isGeneratingStartImage: false,
        isGeneratingEndImage: false,
        isSavingImage: false,
        savedImageId: subscribeLike ? null : s.image?.id ?? null,
        isFromLibrary: !!s.image,
        isSuspense: !subscribeLike && Boolean(s.isSuspense),
      };
    });
  };

  const downloadVoiceAsFile = async (params: {
    url: string;
    fileName: string;
  }): Promise<File | null> => {
    const url = String(params.url ?? '').trim();
    if (!url) return null;

    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new File([blob], params.fileName, {
        type: String(blob.type ?? '').trim() || 'audio/mpeg',
      });
    } catch {
      return null;
    }
  };

  const getAudioDurationSeconds = (file: File): Promise<number | null> => {
    return new Promise((resolve) => {
      try {
        const objectUrl = URL.createObjectURL(file);
        const audio = new Audio(objectUrl);

        const cleanup = () => {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {
            // ignore
          }
        };

        audio.addEventListener(
          'loadedmetadata',
          () => {
            const dur = Number.isFinite(audio.duration) ? audio.duration : null;
            cleanup();
            resolve(dur && dur > 0 ? dur : null);
          },
          { once: true },
        );

        audio.addEventListener(
          'error',
          () => {
            cleanup();
            resolve(null);
          },
          { once: true },
        );
      } catch {
        resolve(null);
      }
    });
  };

  const handleSelectScriptFromLibrary = (draft: {
    id: string;
    script: string;
    video_url?: string | null;
    shorts_scripts?: string[] | null;
    short_scripts?: Array<{
      id: string;
      video_url?: string | null;
      sentences?: BackendSentenceDto[];
      voice?: { id: string; voice: string } | null;
    }>;
    subject?: string | null;
    subject_content?: string | null;
    length?: string | null;
    style?: string | null;
    technique?: string | null;
    reference_scripts?: { id: string; title: string | null; script: string }[];
    voice?: { id: string; voice: string } | null;
    characters?: ScriptCharacter[];
    eras?: ScriptEra[];
    sentences?: BackendSentenceDto[];
  }) => {
    setFullScriptId(draft.id);
    setActiveScriptId(draft.id);
    setActiveShortTabIndex(null);
    setShortRanges([]);
    setShortScriptIds([]);
    setManualSplitEnabled(false);
    setShortsValidationError(null);
    tabSnapshotsRef.current = {};

    setScript(draft.script);

    const loadedSubject = (draft.subject ?? '').trim() || 'religious (Islam)';
    const loadedSubjectContent = (draft.subject_content ?? '').trim();
    const loadedLength = (draft.length ?? '').trim() || '1 minute';
    const loadedStyle = (draft.style ?? '').trim() || 'Conversational';
    const loadedTechnique = (draft.technique ?? '').trim() || 'The Dance (Context, Conflict)';

    setScriptSubject(loadedSubject);
    setScriptSubjectContent(loadedSubject === 'religious (Islam)' ? loadedSubjectContent : '');
    setScriptLength(loadedLength);
    setScriptStyle(loadedStyle);
    setScriptTechnique(loadedTechnique);

    // Restore reference scripts (if any) so UI disables style/system prompt accordingly.
    const loadedRefs = (draft.reference_scripts ?? [])
      .filter((s) => Boolean(s?.id) && Boolean(s?.script?.trim()))
      .map((s) => ({ id: s.id, title: s.title ?? null, script: s.script }));
    setReferenceScripts(loadedRefs);

    // Capture loaded config as the "original" baseline for the loaded script
    setOriginalScriptSubject(loadedSubject);
    setOriginalScriptSubjectContent(
      loadedSubject === 'religious (Islam)' ? loadedSubjectContent : ''
    );

    setScriptCharacters(Array.isArray(draft.characters) ? draft.characters : []);
    setScriptEras(Array.isArray(draft.eras) ? draft.eras : []);

    if (draft.sentences && draft.sentences.length > 0) {
      const mapped = mapBackendSentencesToUi(draft.sentences);
      setSentences(mapped);

      tabSnapshotsRef.current.full = {
        scriptId: draft.id,
        sentences: mapped,
        voiceOver: null,
        voiceDuration: null,
        savedVoiceId: null,
        voiceLibraryUrl: null,
        videoJobId: null,
        videoJobStatus: null,
        videoJobError: null,
        videoUrl: draft.video_url ?? null,
      };
    } else {
      setSentences([]);
    }

    // If the draft has an associated voice, load it as the current voice-over
    if (draft.voice?.voice && draft.voice.id) {
      (async () => {
        try {
          const res = await fetch(draft.voice!.voice);
          if (!res.ok) return;
          const blob = await res.blob();
          const fileName = 'draft-voice-over.mp3';
          const file = new File([blob], fileName, {
            type: blob.type || 'audio/mpeg',
          });

          setVoiceOver(file);
          setSavedVoiceId(draft.voice!.id);
          setVoiceLibraryUrl(draft.voice!.voice);

          const url = URL.createObjectURL(file);
          const audio = new Audio(url);
          audio.addEventListener('loadedmetadata', () => {
            if (!Number.isNaN(audio.duration) && audio.duration > 0) {
              setVoiceDuration(audio.duration);
            }
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to load draft voice-over', error);
        }
      })();
    }

    // Restore the generated video (if the draft has one)
    if (draft.video_url) {
      setVideoJobError(null);
      setVideoUrl(draft.video_url);
      // We just need a stable key so VideoStatusCard renders;
      // status is set to completed so we don't poll.
      setJobFromResponse(draft.id, 'completed');

      if (videoSectionRef.current) {
        videoSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      resetJob();
    }

    setSplitError(null);

    const shortIds = Array.isArray(draft.shorts_scripts)
      ? draft.shorts_scripts.map((s) => String(s ?? '').trim()).filter(Boolean)
      : [];

    if (shortIds.length > 0) {
      setManualSplitEnabled(true);
      setShortScriptIds(shortIds);

      (async () => {
        try {
          const embeddedShorts = Array.isArray(draft.short_scripts)
            ? draft.short_scripts
            : [];

          if (embeddedShorts.length === 0) {
            // No embedded shorts available; avoid making N API calls.
            // The Script Library selection flow should fetch `/scripts/:id` which includes `short_scripts`.
            // eslint-disable-next-line no-console
            console.warn('Selected script has shorts_scripts but no short_scripts payload.');
            return;
          }

          const fullSnapshot = tabSnapshotsRef.current.full;
          const fullSentencesForMatch = fullSnapshot?.sentences ?? [];
          const fullStory = fullSentencesForMatch
            .filter((s) => !isSubscribeLikeSentence(s.text))
            .map((s) => normalizeSentenceForMatch(s.text));

          const ranges: Array<{ start: number; end: number }> = [];
          let cursor = 0;

          for (let idx = 0; idx < embeddedShorts.length; idx += 1) {
            const shortScript = embeddedShorts[idx];

            const mappedShortRaw = Array.isArray(shortScript.sentences)
              ? mapBackendSentencesToUi(shortScript.sentences)
              : [];

            // Normalize: remove any subscribe sentences and always end with the shorts CTA.
            const mappedShort = normalizeShortTabSentences(mappedShortRaw);

            const shortVoiceFile =
              shortScript.voice?.voice
                ? await downloadVoiceAsFile({
                    url: shortScript.voice.voice,
                    fileName: `draft-short-${idx + 1}-voice-over.mp3`,
                  })
                : null;

            const shortVoiceDuration = shortVoiceFile
              ? await getAudioDurationSeconds(shortVoiceFile)
              : null;

            tabSnapshotsRef.current[tabKeyForIndex(idx)] = {
              scriptId: shortScript.id,
              sentences: mappedShort,
              voiceOver: shortVoiceFile,
              voiceDuration: shortVoiceDuration,
              savedVoiceId: shortScript.voice?.id ?? null,
              voiceLibraryUrl: shortScript.voice?.voice ?? null,
              videoJobId: null,
              videoJobStatus: null,
              videoJobError: null,
              videoUrl: shortScript.video_url ?? null,
            };

            // Derive a best-effort mapping back onto the full story sentences.
            const shortStory = mappedShort
              .filter((s) => !isSubscribeLikeSentence(s.text))
              .map((s) => normalizeSentenceForMatch(s.text));

            const len = shortStory.length;
            if (!len) return;

            let foundStart = -1;
            for (let i = cursor; i <= fullStory.length - len; i += 1) {
              let ok = true;
              for (let j = 0; j < len; j += 1) {
                if (fullStory[i + j] !== shortStory[j]) {
                  ok = false;
                  break;
                }
              }
              if (ok) {
                foundStart = i;
                break;
              }
            }

            if (foundStart === -1) {
              // Fallback: assume sequential split based on lengths.
              foundStart = cursor;
            }

            const end = Math.min(fullStory.length - 1, foundStart + len - 1);
            ranges.push({ start: foundStart, end });
            cursor = end + 1;
          }

          if (fullStory.length > 0 && ranges.length > 0) {
            setShortRanges(ranges);
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to load short scripts', e);
        }
      })();
    }
  };

  const handleEnhanceScript = async () => {
    if (!script.trim()) {
      setRandomScriptError('Please enter or generate a script before enhancing.');
      return;
    }

    try {
      setRandomScriptError(null);
      setIsEnhancingScript(true);
      // Clear any previous split state but keep the prior script
      setSentences([]);
      setSplitError(null);

      const res = await fetch(`${API_URL}/ai/enhance-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script,
          length: scriptLength,
          style: scriptStyle,
          technique: scriptTechnique,
          model: scriptModel,
          systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to start script enhancement');
      }

      // Start streaming the enhanced script into the textarea
      setScript('');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          setScript((prev) => prev + chunk);
        }
      }
    } catch (error) {
      console.error('Enhance script failed', error);
      setRandomScriptError('Failed to enhance script. Please try again.');
    } finally {
      setIsEnhancingScript(false);
    }
  };

  const handleSentenceImageUpload = (
    index: number,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const isVideo = file.type?.startsWith('video/');
    setSentences((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            mediaMode: 'single',
            sceneTab: isVideo ? 'video' : 'image',
            image: isVideo ? null : file,
            imageUrl: isVideo ? null : null,
            video: isVideo ? file : null,
            videoUrl: isVideo ? null : null,
            savedVideoId: null,
            imagePrompt: isVideo ? null : item.imagePrompt,
            savedImageId: null,
            isFromLibrary: false,
          }
          : item,
      ),
    );
  };

  const handleSentenceMediaModeChange = (
    index: number,
    mode: 'single' | 'frames',
  ) => {
    setSentences((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        // When switching from Image -> Video, seed the video reference/start frame
        // from the existing single image (if present) so users don't need to re-select it.
        // Only fill empty targets; never overwrite explicit video inputs.
        const hasSingleImage = Boolean(item.image || item.imageUrl);
        const hasReference = Boolean(item.referenceImage || item.referenceImageUrl);
        const hasStartFrame = Boolean(item.startImage || item.startImageUrl);

        const seededReferenceFields =
          mode === 'frames' && hasSingleImage && !hasReference
            ? {
                referenceImage: item.image ?? null,
                referenceImageUrl: item.image ? null : item.imageUrl ?? null,
              }
            : {};

        const seededStartFrameFields =
          mode === 'frames' && hasSingleImage && !hasStartFrame
            ? {
                startImage: item.image ?? null,
                startImageUrl: item.image ? null : item.imageUrl ?? null,
              }
            : {};

        // Important: do not clear previously generated/uploaded media when toggling.
        // Users may want to switch modes temporarily and come back without losing frames.
        return {
          ...item,
          mediaMode: mode,
          sceneTab: mode === 'frames' ? 'video' : 'image',
          ...seededReferenceFields,
          ...seededStartFrameFields,
        };
      }),
    );
  };

  const handleSentenceFrameImageUpload = (
    index: number,
    which: 'start' | 'end',
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const target = sentences[index];

    // Uploaded start/end frames are not persisted unless the draft exists.
    // Require a saved/loaded draft so the user doesn't lose frame images on refresh.
    // if (!activeScriptId || !target || !isUuid(target.id)) {
    //   showAlert('Save/load this script draft first to persist frame images.', {
    //     type: 'warning',
    //   });
    //   // Reset input so selecting the same file again still triggers onChange.
    //   // eslint-disable-next-line no-param-reassign
    //   e.target.value = '';
    //   return;
    // }

    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.type?.startsWith('image/')) return;

    setSentences((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          mediaMode: 'frames',
          startImage: which === 'start' ? file : item.startImage ?? null,
          startImageUrl: which === 'start' ? null : item.startImageUrl ?? null,
          startImagePrompt: which === 'start' ? null : item.startImagePrompt ?? null,
          startSavedImageId: which === 'start' ? null : item.startSavedImageId ?? null,
          endImage: which === 'end' ? file : item.endImage ?? null,
          endImageUrl: which === 'end' ? null : item.endImageUrl ?? null,
          endImagePrompt: which === 'end' ? null : item.endImagePrompt ?? null,
          endSavedImageId: which === 'end' ? null : item.endSavedImageId ?? null,
        };
      }),
    );
  };

  const removeSentenceFrameImage = (index: number, which: 'start' | 'end') => {
    setSentences((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          startImage: which === 'start' ? null : item.startImage ?? null,
          startImageUrl: which === 'start' ? null : item.startImageUrl ?? null,
          startImagePrompt: which === 'start' ? null : item.startImagePrompt ?? null,
          startSavedImageId: which === 'start' ? null : item.startSavedImageId ?? null,
          endImage: which === 'end' ? null : item.endImage ?? null,
          endImageUrl: which === 'end' ? null : item.endImageUrl ?? null,
          endImagePrompt: which === 'end' ? null : item.endImagePrompt ?? null,
          endSavedImageId: which === 'end' ? null : item.endSavedImageId ?? null,
        };
      }),
    );
  };

  const removeSentenceImage = (index: number) => {
    setSentences((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            image: null,
            imageUrl: null,
            video: null,
            videoUrl: null,
            savedVideoId: null,
            startImage: null,
            startImageUrl: null,
            startImagePrompt: null,
            startSavedImageId: null,
            endImage: null,
            endImageUrl: null,
            endImagePrompt: null,
            endSavedImageId: null,
            imagePrompt: null,
            savedImageId: null,
            isFromLibrary: false,
            sceneTab: 'image',
            mediaMode: 'single',
          }
          : item,
      ),
    );
  };

  const handleGenerateSentenceImage = async (index: number, promptOverride?: string) => {
    const target = sentences[index];
    if (!target) return;

    const style = IMAGE_STYLE_PRESETS.find((s) => s.key === imageStyle)?.style || IMAGE_STYLE_PRESETS[0].style;

    setSentences((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isGeneratingImage: true } : item,
      ),
    );

    try {
      const res = await api.post('/ai/generate-image-from-sentence', {
        sentence: target.text,
        script,
        subject: scriptSubject,
        eras: scriptEras.length ? scriptEras : undefined,
        forcedEraKey:
          typeof target.forcedEraKey === 'string' ? target.forcedEraKey.trim() : '',
        style,
        scriptLength,
        isShort: effectiveIsShort,
        aspectRatio: imageAspectRatio,
        promptModel: imagePromptModel,
        imageModel,
        characters: scriptCharacters.length ? scriptCharacters : undefined,
        forcedCharacterKeys: Array.isArray(target.forcedCharacterKeys)
          ? target.forcedCharacterKeys
          : undefined,
        prompt: promptOverride?.trim() ? promptOverride.trim() : undefined,
      });

      const data = res.data as {
        prompt: string;
        imageBase64?: string;
        imageUrl?: string;
        savedImageId?: string;
      };

      const imageUrl =
        (data.imageUrl && String(data.imageUrl)) ||
        (data.imageBase64
          ? `data:image/png;base64,${data.imageBase64}`
          : null);

      if (!imageUrl) {
        throw new Error('Image generation returned no imageUrl');
      }

      setSentences((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
              ...item,
              imageUrl,
              imagePrompt: data.prompt,
              isGeneratingImage: false,
              isFromLibrary: false,
              savedImageId: data.savedImageId ?? item.savedImageId ?? null,
            }
            : item,
        ),
      );
    } catch (error) {
      console.error('Generate image failed', error);
      setSentences((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, isGeneratingImage: false } : item,
        ),
      );
      setSplitError('Failed to generate image for this sentence.');
    }
  };

  const handleGenerateSentenceReferenceImage = async (index: number) => {
    const target = sentences[index];
    if (!target) return;

    const style = IMAGE_STYLE_PRESETS.find((s) => s.key === imageStyle)?.style || IMAGE_STYLE_PRESETS[0].style;

    setSentences((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isGeneratingReferenceImage: true } : item,
      ),
    );

    try {
      const res = await api.post('/ai/generate-image-from-sentence', {
        sentence: target.text,
        script,
        subject: scriptSubject,
        eras: scriptEras.length ? scriptEras : undefined,
        forcedEraKey:
          typeof target.forcedEraKey === 'string' ? target.forcedEraKey.trim() : '',
        style,
        scriptLength,
        isShort: effectiveIsShort,
        aspectRatio: imageAspectRatio,
        promptModel: imagePromptModel,
        imageModel,
        characters: scriptCharacters.length ? scriptCharacters : undefined,
        forcedCharacterKeys: Array.isArray(target.forcedCharacterKeys)
          ? target.forcedCharacterKeys
          : undefined,
      });

      const data = res.data as {
        prompt: string;
        imageBase64?: string;
        imageUrl?: string;
      };

      const imageUrl =
        (data.imageUrl && String(data.imageUrl)) ||
        (data.imageBase64
          ? `data:image/png;base64,${data.imageBase64}`
          : null);

      if (!imageUrl) {
        throw new Error('Image generation returned no imageUrl');
      }

      setSentences((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                referenceImage: null,
                referenceImageUrl: imageUrl,
                isGeneratingReferenceImage: false,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error('Generate reference image failed', error);
      setSentences((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, isGeneratingReferenceImage: false } : item,
        ),
      );
      setSplitError('Failed to generate reference image for this sentence.');
    }
  };

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );

  const handleGenerateSentenceFrameImage = async (
    index: number,
    which: 'start' | 'end',
  ) => {
    const target = sentences[index];
    if (!target) return;

    const style = IMAGE_STYLE_PRESETS.find((s) => s.key === imageStyle)?.style || IMAGE_STYLE_PRESETS[0].style;

    // if (!activeScriptId || !isUuid(target.id)) {
    //   showAlert('Save/load this script draft first to persist frame images.', {
    //     type: 'warning',
    //   });
    //   return;
    // }

    setSentences((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              isGeneratingStartImage:
                which === 'start' ? true : item.isGeneratingStartImage,
              isGeneratingEndImage:
                which === 'end' ? true : item.isGeneratingEndImage,
            }
          : item,
      ),
    );

    try {
      const continuityPrompt =
        which === 'end'
          ? (target.startImagePrompt ?? target.imagePrompt ?? undefined)
          : undefined;

      const res = await api.post('/ai/generate-image-from-sentence', {
        sentence: target.text,
        script,
        subject: scriptSubject,
        eras: scriptEras.length ? scriptEras : undefined,
        forcedEraKey:
          typeof target.forcedEraKey === 'string' ? target.forcedEraKey.trim() : '',
        style,
        scriptLength,
        isShort: effectiveIsShort,
        aspectRatio: imageAspectRatio,
        promptModel: imagePromptModel,
        imageModel,
        characters: scriptCharacters.length ? scriptCharacters : undefined,
        forcedCharacterKeys: Array.isArray(target.forcedCharacterKeys)
          ? target.forcedCharacterKeys
          : undefined,
        frameType: which,
        continuityPrompt,
      });

      const data = res.data as {
        prompt: string;
        imageBase64?: string;
        imageUrl?: string;
        savedImageId?: string;
      };

      const imageUrl =
        (data.imageUrl && String(data.imageUrl)) ||
        (data.imageBase64
          ? `data:image/png;base64,${data.imageBase64}`
          : null);

      if (!imageUrl) {
        throw new Error('Image generation returned no imageUrl');
      }

      const savedId = data.savedImageId ?? null;

      setSentences((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item;
          if (which === 'start') {
            return {
              ...item,
              startImageUrl: imageUrl,
              startImagePrompt: data.prompt,
              startSavedImageId: savedId,
              isGeneratingStartImage: false,
            };
          }
          return {
            ...item,
            endImageUrl: imageUrl,
            endImagePrompt: data.prompt,
            endSavedImageId: savedId,
            isGeneratingEndImage: false,
          };
        }),
      );

      if (!savedId) {
        showAlert('Frame image generated but not saved. Please try again.', {
          type: 'warning',
        });
        return;
      }
    } catch (error) {
      console.error('Generate frame image failed', error);
      setSentences((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                isGeneratingStartImage:
                  which === 'start' ? false : item.isGeneratingStartImage,
                isGeneratingEndImage:
                  which === 'end' ? false : item.isGeneratingEndImage,
              }
            : item,
        ),
      );
      setSplitError('Failed to generate frame image for this sentence.');
    }
  };

  const handleGenerateSentenceVideoFrames = async (index: number) => {
    const sentence = sentences[index];
    if (!sentence) return;

    const scriptId = String(activeScriptId ?? '').trim();
    const canUsePersistedEndpoint = Boolean(scriptId) && isUuid(sentence.id);

    try {
      showToast('Generating video for this sentence…', 'info');

      const prompt = String(sentence.text ?? '').trim();
      if (!prompt) {
        showToast('Sentence text is required to generate a video.', 'error');
        return;
      }

      const isLooping = !sentence.endImage && !sentence.endImageUrl;

      const resolveFrameFile = async (
        which: 'start' | 'end',
      ): Promise<File | null> => {
        if (which === 'start') {
          if (sentence.startImage) return sentence.startImage;
          if (sentence.startImageUrl?.startsWith('data:')) {
            return dataUrlToFile(sentence.startImageUrl, `sentence-${index + 1}-start.png`);
          }
          if (sentence.startImageUrl) {
            const r = await fetch(sentence.startImageUrl);
            if (!r.ok) return null;
            const blob = await r.blob();
            return new File([blob], `sentence-${index + 1}-start.png`, {
              type: blob.type || 'image/png',
            });
          }
          return null;
        }

        // end frame
        if (sentence.endImage) return sentence.endImage;
        if (sentence.endImageUrl?.startsWith('data:')) {
          return dataUrlToFile(sentence.endImageUrl, `sentence-${index + 1}-end.png`);
        }
        if (sentence.endImageUrl) {
          const r = await fetch(sentence.endImageUrl);
          if (!r.ok) return null;
          const blob = await r.blob();
          return new File([blob], `sentence-${index + 1}-end.png`, {
            type: blob.type || 'image/png',
          });
        }
        return null;
      };

      const startFrame = await resolveFrameFile('start');
      if (!startFrame) {
        showToast('Start frame image is required.', 'error');
        return;
      }

      const endFrame = isLooping ? null : await resolveFrameFile('end');
      if (!isLooping && !endFrame) {
        showToast('End frame image is required (or enable looping).', 'error');
        return;
      }

      const form = new FormData();
      form.append('startFrame', startFrame);
      if (endFrame) {
        form.append('endFrame', endFrame);
      }
      form.append('isLooping', isLooping ? 'true' : 'false');
      form.append('prompt', prompt);
      form.append('aspectRatio', effectiveAspectRatio);

      let url: string | null = null;
      let savedVideoId: string | null = null;

      if (canUsePersistedEndpoint) {
        const res = await api.post(
          `/scripts/${encodeURIComponent(scriptId)}/sentences/${encodeURIComponent(
            sentence.id,
          )}/generate-video`,
          form,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          },
        );

        const updatedScript = res.data as {
          sentences?: Array<{
            id: string;
            video?: { id: string; video: string } | null;
          }>;
        };

        const updated = (updatedScript.sentences ?? []).find(
          (s) => s.id === sentence.id,
        );

        url = updated?.video?.video ?? null;
        savedVideoId = updated?.video?.id ?? null;
      } else {
        const res = await api.post('/ai/generate-video-from-frames', form, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        url = (res.data as { videoUrl?: string })?.videoUrl ?? null;
        savedVideoId = null;
      }

      if (!url) {
        showToast('Video generated but no URL was returned.', 'warning');
        return;
      }

      // Persist per-mode video so it can be restored when switching modes.
      setSentences((prev) =>
        prev.map((s, i) =>
          i === index
            ? {
                ...s,
                videoUrl: url,
                savedVideoId,
                framesVideoUrl: url,
                framesSavedVideoId: savedVideoId,
              }
            : s,
        ),
      );

      showToast('Sentence video generated.', 'success');
    } catch (error) {
      console.error('Generate sentence video failed', error);
      showToast('Failed to generate sentence video. Please try again.', 'error');
    }
  };

  const handleGenerateSentenceVideoFromText = async (index: number) => {
    const sentence = sentences[index];
    if (!sentence) return;

    try {
      showToast('Generating video for this sentence…', 'info');

      const prompt = String(sentence.videoPrompt ?? '').trim();
      if (!prompt) {
        showToast('Video prompt is required.', 'error');
        return;
      }

      const res = await api.post('/ai/generate-video-from-text', {
        prompt,
        aspectRatio: effectiveAspectRatio,
        ...(videoModel === 'grok' ? { model: 'grok-imagine-video' } : {}),
      });

      const url = (res.data as { videoUrl?: string })?.videoUrl ?? null;
      if (!url) {
        showToast('Video generated but no URL was returned.', 'warning');
        return;
      }

      setSentences((prev) =>
        prev.map((s, i) =>
          i === index
            ? {
                ...s,
                videoUrl: url,
                savedVideoId: null,
                textVideoUrl: url,
                textSavedVideoId: null,
              }
            : s,
        ),
      );

      showToast('Sentence video generated.', 'success');
    } catch (error) {
      console.error('Generate sentence video (text) failed', error);
      showToast('Failed to generate sentence video. Please try again.', 'error');
    }
  };

  const handleGenerateSentenceVideoFromReferenceImage = async (index: number) => {
    const sentence = sentences[index];
    if (!sentence) return;

    try {
      showToast('Generating video for this sentence…', 'info');

      const prompt = String(sentence.videoPrompt ?? '').trim();
      if (!prompt) {
        showToast('Video prompt is required.', 'error');
        return;
      }

      const resolveReferenceFile = async (): Promise<File | null> => {
        if (sentence.referenceImage) return sentence.referenceImage;
        if (sentence.referenceImageUrl?.startsWith('data:')) {
          return dataUrlToFile(
            sentence.referenceImageUrl,
            `sentence-${index + 1}-reference.png`,
          );
        }
        if (sentence.referenceImageUrl) {
          const r = await fetch(sentence.referenceImageUrl);
          if (!r.ok) return null;
          const blob = await r.blob();
          return new File([blob], `sentence-${index + 1}-reference.png`, {
            type: blob.type || 'image/png',
          });
        }
        return null;
      };

      const referenceImage = await resolveReferenceFile();
      if (!referenceImage) {
        showToast('Reference image is required.', 'error');
        return;
      }

      const form = new FormData();
      form.append('referenceImage', referenceImage);
      form.append('prompt', prompt);
      form.append('aspectRatio', effectiveAspectRatio);
      if (videoModel === 'grok') {
        form.append('model', 'grok-imagine-video');
      }

      const res = await api.post('/ai/generate-video-from-reference-image', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const url = (res.data as { videoUrl?: string })?.videoUrl ?? null;
      if (!url) {
        showToast('Video generated but no URL was returned.', 'warning');
        return;
      }

      setSentences((prev) =>
        prev.map((s, i) =>
          i === index
            ? {
                ...s,
                videoUrl: url,
                savedVideoId: null,
                referenceVideoUrl: url,
                referenceSavedVideoId: null,
              }
            : s,
        ),
      );

      showToast('Sentence video generated.', 'success');
    } catch (error) {
      console.error('Generate sentence video (reference image) failed', error);
      showToast('Failed to generate sentence video. Please try again.', 'error');
    }
  };

  const handleSentenceVideoGenerationModeChange = (
    index: number,
    mode: 'frames' | 'text' | 'referenceImage',
  ) => {
    setSentences((prev) =>
      prev.map((s, i) =>
        i === index
          ? (() => {
              if (s.videoUrl === '/subscribe.mp4') {
                const nextSubscribe: SentenceItem = { ...s, videoGenerationMode: mode };
                nextSubscribe.videoPrompt =
                  mode === 'text' || mode === 'referenceImage'
                    ? (nextSubscribe.videoPrompt ?? '')
                    : nextSubscribe.videoPrompt ?? null;
                return nextSubscribe;
              }

              const previousMode = (s.videoGenerationMode ?? 'referenceImage') as NonNullable<
                SentenceItem['videoGenerationMode']
              >;

              const next: SentenceItem = { ...s, videoGenerationMode: mode };

              // Migrate legacy surface fields into the previous mode slot once.
              if (next.videoUrl && next.videoUrl !== '/subscribe.mp4') {
                if (previousMode === 'frames' && !next.framesVideoUrl) {
                  next.framesVideoUrl = next.videoUrl;
                  next.framesSavedVideoId = next.savedVideoId ?? null;
                } else if (previousMode === 'text' && !next.textVideoUrl) {
                  next.textVideoUrl = next.videoUrl;
                  next.textSavedVideoId = next.savedVideoId ?? null;
                } else if (previousMode === 'referenceImage' && !next.referenceVideoUrl) {
                  next.referenceVideoUrl = next.videoUrl;
                  next.referenceSavedVideoId = next.savedVideoId ?? null;
                }
              }

              // Restore the target mode's video into the surface fields.
              if (mode === 'frames') {
                next.videoUrl = next.framesVideoUrl ?? null;
                next.savedVideoId = next.framesSavedVideoId ?? null;
              } else if (mode === 'text') {
                next.videoUrl = next.textVideoUrl ?? null;
                next.savedVideoId = next.textSavedVideoId ?? null;
              } else {
                next.videoUrl = next.referenceVideoUrl ?? null;
                next.savedVideoId = next.referenceSavedVideoId ?? null;
              }

              next.videoPrompt =
                mode === 'text' || mode === 'referenceImage'
                  ? (next.videoPrompt ?? '')
                  : next.videoPrompt ?? null;

              return next;
            })()
          : s,
      ),
    );
  };

  const handleRemoveSentenceGeneratedVideoForMode = (
    index: number,
    mode: 'frames' | 'text' | 'referenceImage',
  ) => {
    setSentences((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;

        const next: typeof s = { ...s };

        if (mode === 'frames') {
          next.framesVideoUrl = null;
          next.framesSavedVideoId = null;
        } else if (mode === 'text') {
          next.textVideoUrl = null;
          next.textSavedVideoId = null;
        } else {
          next.referenceVideoUrl = null;
          next.referenceSavedVideoId = null;
        }

        // Keep the active-mode surface fields in sync.
        const activeMode = (next.videoGenerationMode ?? 'referenceImage') as NonNullable<SentenceItem['videoGenerationMode']>;
        if (activeMode === mode) {
          next.videoUrl = null;
          next.savedVideoId = null;
        }

        return next;
      }),
    );
  };

  const handleSentenceVideoPromptChange = (index: number, next: string) => {
    setSentences((prev) =>
      prev.map((s, i) => (i === index ? { ...s, videoPrompt: next } : s)),
    );
  };

  const handleGenerateSentenceVideoPromptWithAi = async (index: number) => {
    const sentence = sentences[index];
    if (!sentence) return;
    if (sentence.videoUrl === '/subscribe.mp4') return;

    setIsGeneratingVideoPromptBySentenceId((prev) => ({
      ...prev,
      [sentence.id]: true,
    }));

    try {
      const mode =
        (sentence.videoGenerationMode ?? 'referenceImage') === 'referenceImage'
          ? 'referenceImage'
          : 'text';

      const res = await api.post<{ prompt: string }>('/ai/generate-video-prompt', {
        script,
        sentence: sentence.text,
        mode,
      });

      const prompt = String(res.data?.prompt ?? '').trim();
      if (!prompt) {
        showAlert('AI did not return a prompt. Please try again.', { type: 'warning' });
        return;
      }

      setSentences((prev) =>
        prev.map((s, i) => (i === index ? { ...s, videoPrompt: prompt } : s)),
      );
    } catch (error) {
      console.error('Generate video prompt failed', error);
      showAlert('Failed to generate a video prompt. Please try again.', { type: 'error' });
    } finally {
      setIsGeneratingVideoPromptBySentenceId((prev) => ({
        ...prev,
        [sentence.id]: false,
      }));
    }
  };

  const handleSentenceReferenceImageUpload = (
    index: number,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    setSentences((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
              ...s,
              referenceImage: file,
              referenceImageUrl: file ? null : s.referenceImageUrl ?? null,
            }
          : s,
      ),
    );
  };

  const handleRemoveSentenceReferenceImage = (index: number) => {
    setSentences((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, referenceImage: null, referenceImageUrl: null }
          : s,
      ),
    );
  };

  const handleGenerateSentenceVideo = async (index: number) => {
    const sentence = sentences[index];
    if (!sentence) return;
    if (sentence.videoUrl === '/subscribe.mp4') return;

    setIsGeneratingVideoBySentenceId((prev) => ({
      ...prev,
      [sentence.id]: true,
    }));

    try {
      const mode = (sentence.videoGenerationMode ?? 'referenceImage') as NonNullable<
        SentenceItem['videoGenerationMode']
      >;

      if (mode === 'frames') {
        if (videoModel === 'grok') {
          showToast('Grok video generation does not support Frames mode.', 'error');
          return;
        }
        await handleGenerateSentenceVideoFrames(index);
      } else if (mode === 'text') {
        await handleGenerateSentenceVideoFromText(index);
      } else {
        await handleGenerateSentenceVideoFromReferenceImage(index);
      }
    } finally {
      setIsGeneratingVideoBySentenceId((prev) => ({
        ...prev,
        [sentence.id]: false,
      }));
    }
  };

  const handleGenerateAllSentenceImages = async () => {
    if (!sentences.length || isGeneratingAllImages) return;

    const eligibleIndices = sentences
      .map((item, index) => (isSubscribeLikeSentence(item.text) ? null : index))
      .filter((index): index is number => index !== null);

    const missingIndices = eligibleIndices.filter((index) => {
      const item = sentences[index];
      return Boolean(item) && !item.image && !item.imageUrl;
    });

    const existingCount = eligibleIndices.length - missingIndices.length;

    const runGenerateAll = async (indices: number[]) => {
      if (!indices.length) return;

      setIsGeneratingAllImages(true);
      try {
        // Generate images sequentially to avoid overwhelming the backend/API
        // eslint-disable-next-line no-restricted-syntax
        for (const index of indices) {
          // eslint-disable-next-line no-await-in-loop
          await handleGenerateSentenceImage(index);
        }
      } finally {
        setIsGeneratingAllImages(false);
      }
    };

    // All sentences already have images.
    if (!missingIndices.length) {
      showToast('All sentence images are already generated. Replace all images?', 'info');
      setGenerateAllImagesConfirm({
        kind: 'all',
        eligibleIndices,
        missingIndices: [],
        existingCount: eligibleIndices.length,
        missingCount: 0,
      });
      return;
    }

    // Some sentences already have images.
    if (existingCount > 0) {
      setGenerateAllImagesConfirm({
        kind: 'some',
        eligibleIndices,
        missingIndices,
        existingCount,
        missingCount: missingIndices.length,
      });
      return;
    }

    // None have images yet - generate all missing (which is all eligible).
    await runGenerateAll(missingIndices);
    return;
  };

  const handleVideoModelChange = (next: 'gemini' | 'grok') => {
    setVideoModel(next);
    if (next !== 'grok') return;

    setSentences((prev) =>
      prev.map((s) => {
        const mode = (s.videoGenerationMode ?? 'referenceImage') as NonNullable<
          SentenceItem['videoGenerationMode']
        >;

        if (mode !== 'frames') return s;

        const keepSubscribe = s.videoUrl === '/subscribe.mp4';
        const restoredUrl = keepSubscribe
          ? s.videoUrl
          : (s.referenceVideoUrl ?? null);

        return {
          ...s,
          videoGenerationMode: 'referenceImage',
          videoUrl: restoredUrl,
          savedVideoId: keepSubscribe ? s.savedVideoId ?? null : null,
        };
      }),
    );
  };

  const handleSaveSentenceImage = async (index: number) => {
    const target = sentences[index];
    if (!target) return;
    if (target.savedImageId) {
      return;
    }
    if (!user) {
      showAlert('You must be logged in to save images.', { type: 'warning' });
      return;
    }
    if (!target.image && !target.imageUrl) {
      showAlert('No image to save for this sentence.', { type: 'warning' });
      return;
    }

    setSentences((prev) =>
      prev.map((item, i) => (i === index ? { ...item, isSavingImage: true } : item)),
    );

    try {
      let fileToUpload: File | null = null;

      if (target.image) {
        fileToUpload = target.image;
      } else if (target.imageUrl?.startsWith('data:')) {
        fileToUpload = dataUrlToFile(target.imageUrl, `sentence-${index + 1}.png`);
      }

      if (!fileToUpload) {
        throw new Error('Unable to prepare image file for upload');
      }

      const formData = new FormData();
      formData.append('image', fileToUpload);

      const response = await api.post<{ id: string }>('/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const saved = response.data;

      setSentences((prev) =>
        prev.map((item, i) =>
          i === index
            ? { ...item, isSavingImage: false, savedImageId: saved.id }
            : item,
        ),
      );
    } catch (error) {
      console.error('Save image failed', error);
      showAlert('Failed to save image. Please try again.', { type: 'error' });
      setSentences((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, isSavingImage: false } : item,
        ),
      );
    }
  };

  const handleSelectFromLibrary = (
    index: number,
    which: 'single' | 'start' | 'end' | 'reference' = 'single',
  ) => {
    setLibraryTarget({ index, which });
    setIsLibraryModalOpen(true);
  };

  const handleSelectVideoFromLibrary = (index: number) => {
    setVideoLibraryTargetIndex(index);
    setIsVideoLibraryOpen(true);
  };

  const handleLibraryVideoSelect = (videoUrl: string, id: string) => {
    if (videoLibraryTargetIndex === null) return;

    const index = videoLibraryTargetIndex;

    setSentences((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            sceneTab: 'video',
            video: null,
            videoUrl,
            savedVideoId: id,
          }
          : item,
      ),
    );

    setVideoLibraryTargetIndex(null);
  };

  const handleLibraryImageSelect = (
    imageUrl: string,
    id: string,
    prompt?: string | null,
  ) => {
    if (!libraryTarget) return;

    const { index, which } = libraryTarget;

    setSentences((prev) =>
      prev.map((item, i) =>
        i === index
          ? which === 'single'
            ? {
              ...item,
              imageUrl,
              image: null,
              imagePrompt: prompt ?? null,
              isFromLibrary: true,
              savedImageId: id,
            }
            : which === 'start'
              ? {
                ...item,
                startImageUrl: imageUrl,
                startImage: null,
                startImagePrompt: prompt ?? null,
                isFromLibrary: true,
                startSavedImageId: id,
              }
              : which === 'end'
                ? {
                  ...item,
                  endImageUrl: imageUrl,
                  endImage: null,
                  endImagePrompt: prompt ?? null,
                  isFromLibrary: true,
                  endSavedImageId: id,
                }
                : {
                  ...item,
                  referenceImageUrl: imageUrl,
                  referenceImage: null,
                  isFromLibrary: true,
                }
          : item,
      ),
    );

    setLibraryTarget(null);
  };

  const handleSyncElevenLabsVoices = async () => {
    setSyncVoicesResult(null);
    setIsSyncingVoices(true);
    try {
      const res = await fetch(`${API_URL}/voice-overs/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to sync voices');
      }

      const data = (await res.json()) as {
        imported: number;
        updated: number;
      };
      setSyncVoicesResult(
        `Synced voices successfully. Imported: ${data.imported}, Updated: ${data.updated}`,
      );

      // Refresh local cache of voices after a successful sync
      fetchVoices();
    } catch (error) {
      console.error('Sync ElevenLabs voices failed', error);
      setSyncVoicesResult('Failed to sync ElevenLabs voices. Check backend logs.');
    } finally {
      setIsSyncingVoices(false);
    }
  };

  const handleSaveGeneration = async () => {
    if (!videoUrl) {
      showAlert('No generated video found to save.', { type: 'warning' });
      return;
    }

    if (!script.trim()) {
      showAlert('Please provide a script before saving.', { type: 'warning' });
      return;
    }

    if (!voiceOver) {
      showAlert('Please provide or select a voice-over before saving.', { type: 'warning' });
      return;
    }

    setIsSavingGeneration(true);

    try {
      // Ensure images are saved and collect image IDs per sentence
      const sentencePayload: { text: string; image_id?: string; isSuspense?: boolean }[] = [];

      // eslint-disable-next-line no-restricted-syntax
      for (let index = 0; index < sentences.length; index += 1) {
        const s = sentences[index];
        let imageId = s.savedImageId ?? null;

        if (!imageId && (s.image || s.imageUrl)) {
          let fileToUpload: File | null = null;

          if (s.image) {
            fileToUpload = s.image;
          } else if (s.imageUrl?.startsWith('data:')) {
            fileToUpload = dataUrlToFile(
              s.imageUrl,
              `sentence-${index + 1}.png`,
            );
          }

          if (fileToUpload) {
            const formData = new FormData();
            formData.append('image', fileToUpload);
            if ((s.imagePrompt ?? '').trim()) {
              formData.append('prompt', (s.imagePrompt ?? '').trim());
            }

            const response = await api.post<{ id: string }>(
              '/images',
              formData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              },
            );

            imageId = response.data.id;
          }
        }

        sentencePayload.push({
          text: s.text,
          image_id: imageId ?? undefined,
          isSuspense: Boolean(s.isSuspense) && !isSubscribeLikeSentence(s.text),
        });
      }

      // Ensure we have a persisted voice and get its ID
      let voiceId = savedVoiceId;

      if (!voiceId) {
        const saved = await persistVoiceToLibrary(voiceOver);
        voiceId = saved.id;
        setSavedVoiceId(voiceId);
      }

      await api.post('/messages/save-generation', {
        script,
        video_url: videoUrl,
        voice_id: voiceId ?? undefined,
        sentences: sentencePayload.length > 0 ? sentencePayload : undefined,
        chat_id: selectedChatId ?? routeChatId ?? undefined,
        subject: scriptSubject,
        subject_content:
          scriptSubject === 'religious (Islam)' ? (scriptSubjectContent || null) : null,
        length: scriptLength,
        style: referenceScripts.length > 0 ? null : scriptStyle,
        technique: scriptTechnique,
        reference_script_ids:
          referenceScripts.length > 0 ? referenceScripts.map((s) => s.id) : undefined,
      });

      showAlert('Saved to your chats successfully.', { type: 'success' });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Save generation failed', error);
      showAlert('Failed to save this generation. Please try again.', { type: 'error' });
    } finally {
      setIsSavingGeneration(false);
    }
  };

  const handleSaveScriptDraft = async () => {
    if (!script.trim()) {
      showAlert('Please enter or generate a script before saving a draft.', { type: 'warning' });
      return;
    }

    // Shorts are only supported for long-form scripts.
    if (activeShortTabIndex !== null && (!isLongForm || !tabSnapshotsRef.current.full)) {
      showAlert('Switch to Full Video tab before saving this draft.', { type: 'warning' });
      return;
    }

    setIsSavingDraft(true);

    try {
      // Snapshot the active tab before saving.
      tabSnapshotsRef.current[tabKeyForIndex(activeShortTabIndex)] = captureActiveTabSnapshot();
      if (activeShortTabIndex === null) {
        tabSnapshotsRef.current.full = tabSnapshotsRef.current.full ?? captureActiveTabSnapshot();
      }

      const fullSnapshot =
        tabSnapshotsRef.current.full ?? (activeShortTabIndex === null ? captureActiveTabSnapshot() : null);

      if (!fullSnapshot) {
        showAlert('Nothing to save yet.', { type: 'warning' });
        return;
      }

      const localActiveSnapshot =
        tabSnapshotsRef.current[tabKeyForIndex(activeShortTabIndex)] ?? captureActiveTabSnapshot();

      const coerceImageFile = async (params: {
        file?: File | null;
        url?: string | null;
        filename: string;
      }): Promise<File | null> => {
        if (params.file) return params.file;
        const url = String(params.url ?? '').trim();
        if (!url) return null;

        if (url.startsWith('data:')) {
          return dataUrlToFile(url, params.filename);
        }

        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const blob = await res.blob();
          const mimeType = String(blob.type ?? '').trim();
          if (!mimeType.startsWith('image/')) return null;
          const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
          const base = params.filename.replace(/\.[a-z0-9]+$/i, '');
          return new File([blob], `${base}.${ext}`, { type: mimeType || 'image/png' });
        } catch {
          return null;
        }
      };

      const uploadImageIfNeeded = async (params: {
        existingId?: string | null;
        file?: File | null;
        url?: string | null;
        filename: string;
        prompt?: string | null;
      }): Promise<string | null> => {
        if (params.existingId) return params.existingId;
        if (!params.file && !params.url) return null;

        const fileToUpload = await coerceImageFile({
          file: params.file,
          url: params.url,
          filename: params.filename,
        });
        if (!fileToUpload) return null;

        const formData = new FormData();
        formData.append('image', fileToUpload);
        if ((params.prompt ?? '').trim()) {
          formData.append('prompt', (params.prompt ?? '').trim());
        }

        const response = await api.post<{ id: string }>('/images', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.id;
      };

      const buildSentencePayload = async (items: SentenceItem[], prefix: string) => {
        const payload: {
          text: string;
          character_keys?: string[] | null;
          era_key?: string | null;
          forced_era_key?: string | null;
          image_id?: string;
          start_frame_image_id?: string;
          end_frame_image_id?: string;
          video_id?: string;
          video_prompt?: string;
          isSuspense?: boolean;
          forced_character_keys?: string[];
          transition_to_next?: SentenceItem['transitionToNext'] | null;
          visual_effect?: Exclude<SentenceItem['visualEffect'], 'none'> | null;
        }[] = [];

        for (let index = 0; index < items.length; index += 1) {
          const s = items[index];
          const imageId = await uploadImageIfNeeded({
            existingId: s.savedImageId ?? null,
            file: s.image,
            url: s.imageUrl,
            filename: `${prefix}-sentence-${index + 1}.png`,
            prompt: s.imagePrompt ?? null,
          });

          const startFrameImageId = await uploadImageIfNeeded({
            existingId: s.startSavedImageId ?? null,
            file: s.startImage,
            url: s.startImageUrl,
            filename: `${prefix}-sentence-${index + 1}-start.png`,
            prompt: s.startImagePrompt ?? null,
          });

          const endFrameImageId = await uploadImageIfNeeded({
            existingId: s.endSavedImageId ?? null,
            file: s.endImage,
            url: s.endImageUrl,
            filename: `${prefix}-sentence-${index + 1}-end.png`,
            prompt: s.endImagePrompt ?? null,
          });

          payload.push({
            text: s.text,
            character_keys:
              Array.isArray(s.characterKeys) && s.characterKeys.length
                ? s.characterKeys
                : null,
            era_key: String(s.eraKey ?? '').trim() || null,
            forced_era_key:
              s.forcedEraKey === null || s.forcedEraKey === undefined
                ? null
                : String(s.forcedEraKey).trim(),
            image_id: imageId ?? undefined,
            start_frame_image_id: startFrameImageId ?? undefined,
            end_frame_image_id: endFrameImageId ?? undefined,
            video_id: s.savedVideoId ?? undefined,
            video_prompt: String(s.videoPrompt ?? '').trim() || undefined,
            isSuspense: Boolean(s.isSuspense) && !isSubscribeLikeSentence(s.text),
            forced_character_keys: Array.isArray(s.forcedCharacterKeys)
              ? s.forcedCharacterKeys
              : undefined,
            transition_to_next: s.transitionToNext ?? null,
            visual_effect:
              s.visualEffect === 'colorGrading' ||
              s.visualEffect === 'animatedLighting' ||
              s.visualEffect === 'glassSubtle' ||
              s.visualEffect === 'glassReflections' ||
              s.visualEffect === 'glassStrong'
                ? s.visualEffect
                : null,
          });
        }

        return payload;
      };

      const persistMissingSentenceVideos = async (params: {
        scriptId: string;
        backendSentences: BackendSentenceDto[];
        localSentences: SentenceItem[];
      }): Promise<Map<number, { id: string; video: string }>> => {
        const updates = new Map<number, { id: string; video: string }>();

        const sorted = [...(params.backendSentences ?? [])].sort(
          (a, b) => a.index - b.index,
        );

        for (const bs of sorted) {
          const local = params.localSentences?.[bs.index];
          if (!local) continue;

          const url = String(local.videoUrl ?? '').trim();
          if (!url || url === '/subscribe.mp4') continue;

          // If we already have a persisted video ID, skip.
          if (local.savedVideoId || bs.video?.id) continue;

          try {
            const response = await api.post<{ id: string; video: string }>(
              `/scripts/${encodeURIComponent(params.scriptId)}/sentences/${encodeURIComponent(bs.id)}/video`,
              {
                videoUrl: url,
                video_type: videoModel,
                video_size: 'portrait',
              },
            );

            const saved = response.data;
            if (saved?.id) {
              updates.set(bs.index, { id: saved.id, video: saved.video });
            }
          } catch (error) {
            // Best-effort: draft save should still succeed even if some video persistence fails.
            console.error('Persist sentence video failed', error);
          }
        }

        return updates;
      };

      const fullSentencePayload = await buildSentencePayload(fullSnapshot.sentences, 'full');

      // Optionally attach a voice-over to the draft if available
      let voiceId = fullSnapshot.savedVoiceId;

      if (!voiceId && fullSnapshot.voiceOver) {
        const saved = await persistVoiceToLibrary(fullSnapshot.voiceOver);
        voiceId = saved.id;

        // Only update the visible state if we're on the full tab.
        if (activeShortTabIndex === null) {
          setSavedVoiceId(voiceId);
        }
      }

      const shouldSendShorts =
        isLongForm && (shortRanges.length > 0 || shortScriptIds.length > 0);

      let shortsScriptIdsToLink: string[] | undefined;

      if (shouldSendShorts) {
        const shortsCount = shortRanges.length > 0 ? shortRanges.length : shortScriptIds.length;

        if (shortRanges.length > 0) {
          const storySentences = fullSnapshot.sentences.filter(
            (s) => !isSubscribeLikeSentence(s.text),
          );
          const rangeError = validateShortRanges(shortRanges, storySentences);
          if (rangeError) {
            showAlert(rangeError, { type: 'warning' });
            return;
          }
        }

        // If we have explicit ranges (manual/AI split), ensure short snapshots exist.
        if (shortRanges.length > 0) {
          const missingAny = shortRanges.some(
            (_, idx) => !tabSnapshotsRef.current[tabKeyForIndex(idx)],
          );
          if (missingAny) {
            // Rebuild from the full tab so shorts inherit media.
            tabSnapshotsRef.current.full = fullSnapshot;
            const rebuildError = rebuildShortTabSnapshots(shortRanges);
            if (rebuildError) {
              showAlert(rebuildError, { type: 'warning' });
              return;
            }
          }
        }

        if (shortsCount > 0) {
          const upsertedShortIds: string[] = [];

          for (let i = 0; i < shortsCount; i += 1) {
            const snapKey = tabKeyForIndex(i);
            const snap = tabSnapshotsRef.current[snapKey];
            const rawItems = snap?.sentences ?? [];
            const items = rawItems.length ? rawItems : [createShortsCtaSentenceItem()];

            // Optionally attach a voice-over to the short if available
            let shortVoiceId = snap?.savedVoiceId ?? null;
            let shortVoiceLibraryUrl = snap?.voiceLibraryUrl ?? null;

            if (!shortVoiceId && snap?.voiceOver) {
              const saved = await persistVoiceToLibrary(snap.voiceOver);
              shortVoiceId = saved.id;
              shortVoiceLibraryUrl = saved.url;

              // Only update the visible state if we're on this short tab.
              if (activeShortTabIndex === i) {
                setSavedVoiceId(shortVoiceId);
                setVoiceLibraryUrl(shortVoiceLibraryUrl);
              }
            }

            // Ensure CTA exists and is last.
            const withoutEmpty = items.filter((s) => String(s.text ?? '').trim());
            const endsWithCta =
              withoutEmpty.length > 0 &&
              (withoutEmpty[withoutEmpty.length - 1].text || '').trim() === SHORTS_CTA_SENTENCE;
            const finalItems = endsWithCta
              ? withoutEmpty
              : [
                  ...withoutEmpty.filter((s) => !isSubscribeLikeSentence(s.text)),
                  createShortsCtaSentenceItem(),
                ];

            const shortSentencesPayload = await buildSentencePayload(
              finalItems,
              `short-${i + 1}`,
            );

            const shortPayload = {
              script: finalItems
                .map((s) => String(s.text ?? '').trim())
                .filter(Boolean)
                .join(' '),
              voice_id: shortVoiceId ?? undefined,
              title: `Short ${i + 1}`,
              video_url: snap?.videoUrl ?? undefined,
              characters: scriptCharacters.length ? scriptCharacters : undefined,
              eras: scriptEras.length ? scriptEras : undefined,
              sentences: shortSentencesPayload,
              subject: scriptSubject,
              subject_content:
                scriptSubject === 'religious (Islam)' ? (scriptSubjectContent || null) : null,
              length: scriptLength,
              style: referenceScripts.length > 0 ? null : scriptStyle,
              technique: scriptTechnique,
              reference_script_ids:
                referenceScripts.length > 0
                  ? referenceScripts.map((s) => s.id)
                  : undefined,
              is_short_script: true,
            };

            const existingShortId =
              String(snap?.scriptId ?? shortScriptIds[i] ?? '').trim() || null;

            const upsertedShort = existingShortId
              ? await api.patch(`/scripts/${encodeURIComponent(existingShortId)}`, shortPayload)
              : await api.post('/scripts', shortPayload);

            const id = String((upsertedShort.data as any)?.id ?? '').trim();
            if (!id) {
              showAlert('Failed to save a short draft. Please try again.', { type: 'error' });
              return;
            }

            upsertedShortIds.push(id);

            // Persist any generated sentence videos (best-effort) so video_id is stored in the draft.
            const shortBackendSentences = Array.isArray((upsertedShort.data as any)?.sentences)
              ? ((upsertedShort.data as any).sentences as BackendSentenceDto[])
              : [];
            if (shortBackendSentences.length > 0) {
              await persistMissingSentenceVideos({
                scriptId: id,
                backendSentences: shortBackendSentences,
                localSentences: finalItems,
              });
            }

            // Keep local snapshot IDs in sync.
            tabSnapshotsRef.current[snapKey] = {
              ...(tabSnapshotsRef.current[snapKey] ?? {
                sentences: finalItems,
                voiceOver: null,
                voiceDuration: null,
                savedVoiceId: null,
                voiceLibraryUrl: null,
                videoJobId: null,
                videoJobStatus: null,
                videoJobError: null,
                videoUrl: snap?.videoUrl ?? null,
              }),
              scriptId: id,
              savedVoiceId: shortVoiceId,
              voiceLibraryUrl: shortVoiceLibraryUrl,
            };
          }

          shortsScriptIdsToLink = upsertedShortIds;
          setShortScriptIds(upsertedShortIds);
        } else {
          // Explicitly clear shorts on save.
          shortsScriptIdsToLink = [];
          setShortScriptIds([]);
        }
      }

      const existingFullId = String(fullScriptId ?? fullSnapshot.scriptId ?? '').trim() || null;

      const payload: {
        script: string;
        voice_id?: string;
        video_url?: string;
        characters?: ScriptCharacter[];
        eras?: ScriptEra[];
        sentences?: {
          text: string;
          character_keys?: string[] | null;
          era_key?: string | null;
          forced_era_key?: string | null;
          image_id?: string;
          start_frame_image_id?: string;
          end_frame_image_id?: string;
          video_id?: string;
          video_prompt?: string;
          isSuspense?: boolean;
          forced_character_keys?: string[];
          transition_to_next?: SentenceItem['transitionToNext'] | null;
          visual_effect?: Exclude<SentenceItem['visualEffect'], 'none'> | null;
        }[];
        subject?: string;
        subject_content?: string | null;
        length?: string;
        style?: string | null;
        technique?: string | null;
        reference_script_ids?: string[];
        shorts_script_ids?: string[];
      } = {
        script,
        voice_id: voiceId ?? undefined,
        video_url: existingFullId ? undefined : fullSnapshot.videoUrl ?? undefined,
        characters: scriptCharacters.length ? scriptCharacters : undefined,
        eras: scriptEras.length ? scriptEras : undefined,
        sentences: fullSentencePayload.length > 0 ? fullSentencePayload : undefined,
        subject: scriptSubject,
        subject_content:
          scriptSubject === 'religious (Islam)' ? (scriptSubjectContent || null) : null,
        length: scriptLength,
        style: referenceScripts.length > 0 ? null : scriptStyle,
        technique: scriptTechnique,
        reference_script_ids:
          referenceScripts.length > 0 ? referenceScripts.map((s) => s.id) : undefined,
        shorts_script_ids: shouldSendShorts ? (shortsScriptIdsToLink ?? []) : undefined,
      };

      const upserted = existingFullId
        ? await api.patch(`/scripts/${encodeURIComponent(existingFullId)}`, payload)
        : await api.post('/scripts', payload);

      const upsertedScript = upserted.data as {
        id: string;
        characters?: ScriptCharacter[];
        eras?: ScriptEra[];
        sentences?: BackendSentenceDto[];
        shorts_scripts?: string[] | null;
      };

      if (upsertedScript?.id) {
        setFullScriptId(upsertedScript.id);
        if (activeShortTabIndex === null) {
          setActiveScriptId(upsertedScript.id);
        }
      }

      if (Array.isArray(upsertedScript?.characters)) {
        setScriptCharacters(upsertedScript.characters);
      }

      if (Array.isArray(upsertedScript?.eras)) {
        setScriptEras(upsertedScript.eras);
      }

      if (upsertedScript?.sentences && upsertedScript.sentences.length > 0) {
        const videoUpdates = await persistMissingSentenceVideos({
          scriptId: upsertedScript.id,
          backendSentences: upsertedScript.sentences,
          localSentences: fullSnapshot.sentences,
        });

        const mappedFull = mapBackendSentencesToUi(upsertedScript.sentences).map((s, idx) => {
          const local = fullSnapshot.sentences?.[idx];
          const update = videoUpdates.get(idx);

          // Preserve local generated videoUrl immediately after save, even before it's persisted.
          const mergedVideoUrl =
            s.videoUrl ?? (local?.videoUrl && local.videoUrl !== '/subscribe.mp4' ? local.videoUrl : null);

          return update
            ? {
              ...s,
              videoUrl: update.video ?? mergedVideoUrl,
              savedVideoId: update.id,
            }
            : {
              ...s,
              videoUrl: mergedVideoUrl,
            };
        });

        tabSnapshotsRef.current.full = {
          ...fullSnapshot,
          scriptId: upsertedScript.id,
          sentences: mappedFull,
          savedVoiceId: voiceId ?? null,
        };

        if (activeShortTabIndex === null) {
          setSentences(mappedFull);
        }
      }

      const returnedShortIds = Array.isArray(upsertedScript?.shorts_scripts)
        ? upsertedScript.shorts_scripts.map((s) => String(s ?? '').trim()).filter(Boolean)
        : [];

      if (shouldSendShorts) {
        const idsToUse =
          returnedShortIds.length > 0
            ? returnedShortIds
            : Array.isArray(shortsScriptIdsToLink)
              ? shortsScriptIdsToLink
              : [];

        setShortScriptIds(idsToUse);

        // Keep snapshots aligned with the final ID list without re-fetching.
        for (let idx = 0; idx < idsToUse.length; idx += 1) {
          const key = tabKeyForIndex(idx);
          const snap = tabSnapshotsRef.current[key];
          if (!snap) continue;
          tabSnapshotsRef.current[key] = { ...snap, scriptId: idsToUse[idx] };
        }

        if (activeShortTabIndex !== null) {
          const snap = tabSnapshotsRef.current[tabKeyForIndex(activeShortTabIndex)];
          if (snap) applyTabSnapshot(snap);
        }
      }

      showAlert(existingFullId ? 'Draft updated successfully.' : 'Draft saved successfully.', {
        type: 'success',
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Save script draft failed', error);
      showAlert('Failed to save draft. Please try again.', { type: 'error' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  if (isLoading) {
    return <GeneratePageSkeleton />;
  }

  return (
    <div className="flex h-screen bg-white text-gray-900">
      <ToastContainer />
      {/* Sidebar */}
      <Sidebar
        user={user}
        isOpen={isSidebarOpen}
        onLogout={handleLogout}
        activeChatId={selectedChatId}
        onNewGeneration={() => {
          setSelectedChatId(null);
          setSelectedChatMessages(null);
          setSelectedChatTitle(null);
          router.push('/generate');
        }}
        onSelectChat={(chatId) => {
          if (chatId) {
            router.push(`/generate/${chatId}`);
          } else {
            router.push('/generate');
          }
        }}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <HeaderBar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center py-12 relative">
              <div className="inline-block relative mb-6">
                <div className="absolute inset-0 bg-linear-to-r from-purple-400 to-blue-400 blur-xl opacity-50 rounded-full"></div>
                <div className="relative bg-linear-to-br from-purple-500 to-blue-600 p-4 rounded-2xl shadow-xl">
                  <Video className="h-16 w-16 text-white" />
                </div>
              </div>
              <h2 className="text-4xl font-bold mb-3 bg-linear-to-r from-gray-900 via-purple-900 to-blue-900 bg-clip-text text-transparent">
                Generate Your Video
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Provide your script, images, and voice-over to create an
                AI-directed video with professional results
              </p>
            </div>

            {/* Collapsible Chat Messages Section */}
            {selectedChatMessages && selectedChatMessages.length > 0 && (
              <div className="bg-linear-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="px-6 py-6 border-b border-gray-100 flex items-center gap-3">
                  <div className="p-2 bg-linear-to-br from-purple-100 to-blue-100 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900">
                      All Videos
                    </h3>
                    <p className="text-xs text-gray-600 flex items-center gap-1.5 font-normal">
                      <Sparkles className="h-3 w-3" />
                      {selectedChatMessages.length} saved generation{selectedChatMessages.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-6 pt-2">
                  <Accordion type="multiple" className="w-full space-y-3">
                    {selectedChatMessages.map((msg) => {
                      const primaryScript = msg.scripts?.[0];
                      const sentencesForScript = primaryScript?.sentences || [];
                      const generationTitle = primaryScript?.title || 'Untitled generation';

                      return (
                        <AccordionItem
                          key={msg.id}
                          value={msg.id}
                          className="border border-gray-200 rounded-xl bg-white shadow-sm"
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 rounded-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
                              <div className="flex items-center gap-3 w-full">
                                <div className="p-2 bg-linear-to-br from-purple-100 to-blue-100 rounded-lg">
                                  <FileText className="h-4 w-4 text-purple-600" />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{generationTitle}</p>
                                  <p className="text-xs text-gray-500 line-clamp-1">
                                    {primaryScript?.script.substring(0, 80) || 'Saved generation'}
                                    {primaryScript?.script && primaryScript.script.length > 80 ? '…' : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mx-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void handleReuseSavedGeneration(msg);
                                  }}
                                  className="group/reuse relative inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-linear-to-r from-purple-500 via-purple-600 to-blue-600 hover:from-purple-600 hover:via-purple-700 hover:to-blue-700 text-white font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden"
                                  aria-label="Reuse this generation"
                                  title="Load this configuration into the editor"
                                >
                                  {/* Shine effect on hover */}
                                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/reuse:translate-x-full transition-transform duration-700 skew-x-12"></div>

                                  {/* Icon with smooth rotation */}
                                  <RotateCcw className="relative h-4 w-4 group-hover/reuse:rotate-360 transition-transform duration-500 ease-out" />

                                  {/* Text */}
                                  <span className="relative drop-shadow-sm text-sm">Reuse</span>
                                </button>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-5 pb-4 pt-1 space-y-6">
                            {primaryScript && (
                              <div className="mb-2">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="p-2 bg-linear-to-br from-purple-100 to-blue-100 rounded-lg">
                                    <FileText className="h-5 w-5 text-purple-600" />
                                  </div>
                                  <h4 className="text-sm font-semibold text-gray-700">Script</h4>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 rounded-lg p-4 border border-gray-100">
                                  {primaryScript.script}
                                </p>
                              </div>
                            )}

                            {sentencesForScript.length > 0 && (
                              <div className="space-y-4 mb-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="p-1.5 bg-linear-to-br from-cyan-100 to-blue-100 rounded-lg">
                                    <ImageIcon className="h-4 w-4 text-cyan-600" />
                                  </div>
                                  <h4 className="text-base font-bold text-gray-900">Sentences & Images</h4>
                                </div>
                                <div className="space-y-3">
                                  {sentencesForScript
                                    .slice()
                                    .sort((a, b) => a.index - b.index)
                                    .map((s, idx) => (
                                      <div
                                        key={s.id}
                                        className="group flex flex-col md:flex-row gap-4 rounded-xl border border-gray-200 p-4 bg-linear-to-br from-white to-gray-50 hover:shadow-md transition-all duration-200"
                                      >
                                        <div className="flex items-start gap-3 flex-1">
                                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-linear-to-br from-purple-500 to-blue-500 text-white text-xs font-bold shrink-0">
                                            {idx + 1}
                                          </span>
                                          <div className="text-sm text-gray-800 leading-relaxed">{s.text}</div>
                                        </div>
                                        {s.image && (
                                          <div className="relative w-full md:w-40 h-24 rounded-lg overflow-hidden border-2 border-gray-200 shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                            <img
                                              src={s.image.image}
                                              alt="Sentence visual"
                                              className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-5 mt-4 border-t border-gray-200 items-center">
                              {msg.video && (
                                <div className="group relative">
                                  <div className="absolute -inset-0.5 bg-linear-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-xl opacity-75 group-hover:opacity-100 blur transition duration-200"></div>
                                  <a
                                    href={msg.video.video}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="relative flex items-center justify-center gap-3 px-6 py-4 bg-linear-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                                  >
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                      <Play className="h-5 w-5 group-hover:scale-110 transition-transform" fill="currentColor" />
                                    </div>
                                    <span className="text-base">Watch Video</span>
                                    <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                  </a>
                                </div>
                              )}
                              {msg.voice && (
                                <div className="relative group">
                                  <div className="absolute -inset-0.5 bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 rounded-xl opacity-50 group-hover:opacity-75 blur transition duration-200"></div>
                                  <div className="relative flex items-center gap-4 bg-linear-to-br from-purple-50 via-white to-pink-50 rounded-xl p-4 border border-purple-200/50 shadow-md hover:shadow-lg transition-all duration-200">
                                    <div className="p-3 bg-linear-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shrink-0">
                                      <Mic className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Voice Over</p>
                                      <audio
                                        controls
                                        src={msg.voice.voice}
                                        className="w-full h-8"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </div>
            )}

            {/* Generate Form */}
            <div className="bg-linear-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <Accordion type="multiple" defaultValue={['script', 'sentences', 'voice']} className="w-full">
                <ScriptSection
                  script={script}
                  onScriptChange={setScript}
                  systemPrompt={systemPrompt}
                  onSystemPromptChange={setSystemPrompt}
                  referenceScripts={referenceScripts}
                  onOpenReferenceLibrary={handleOpenScriptReferences}
                  onRemoveReferenceScript={handleRemoveReferenceScript}
                  onClearReferenceScripts={handleClearReferenceScripts}
                  hasSentences={sentences.length > 0}
                  scriptSubject={scriptSubject}
                  setScriptSubject={setScriptSubject}
                  scriptSubjectContent={scriptSubjectContent}
                  setScriptSubjectContent={setScriptSubjectContent}
                  scriptLength={scriptLength}
                  setScriptLength={setScriptLength}
                  scriptStyle={scriptStyle}
                  setScriptStyle={setScriptStyle}
                  scriptTechnique={scriptTechnique}
                  setScriptTechnique={setScriptTechnique}
                  scriptModel={scriptModel}
                  setScriptModel={setScriptModel}
                  isRandomScriptLoading={isRandomScriptLoading}
                  isSplitting={isSplitting}
                  randomScriptError={randomScriptError}
                  splitError={splitError}
                  onGenerateRandomScript={handleGenerateRandomScript}
                  onSplitScript={handleSplitScript}
                  onResetScript={handleResetScriptAndSentences}
                  onSaveDraft={handleSaveScriptDraft}
                  isSavingDraft={isSavingDraft}
                  onOpenLibrary={handleOpenScriptLibrary}
                  originalScriptSubject={originalScriptSubject}
                  originalScriptSubjectContent={originalScriptSubjectContent}
                  isEnhancingScript={isEnhancingScript}
                  onEnhanceScript={handleEnhanceScript}
                />

                <SentencesImagesSection
                  sentences={sentences}
                  isShortVideo={effectiveIsShort}
                  isLongForm={isLongForm}
                  shortsTabs={(shortRanges.length
                    ? shortRanges
                    : shortScriptIds.map((_id, idx) => {
                        const snap = tabSnapshotsRef.current[tabKeyForIndex(idx)];
                        const count = (snap?.sentences ?? []).filter(
                          (s) => !isSubscribeLikeSentence(s.text),
                        ).length;
                        return { start: 0, end: Math.max(0, count - 1) };
                      })
                  ).map((r, idx) => ({
                    label: `Short ${idx + 1}`,
                    count: Math.max(0, r.end - r.start + 1),
                  }))}
                  activeShortTabIndex={activeShortTabIndex}
                  onSelectShortTab={handleSelectShortTab}
                  manualSplitEnabled={manualSplitEnabled}
                  onManualSplitToggle={async (next) => {
                    if (!next) {
                      // Persist any edits on the current tab.
                      tabSnapshotsRef.current[tabKeyForIndex(activeShortTabIndex)] =
                        captureActiveTabSnapshot();

                      // Restore the full tab content (if we have it).
                      if (tabSnapshotsRef.current.full) {
                        applyTabSnapshot(tabSnapshotsRef.current.full);
                      }

                      setManualSplitEnabled(false);
                      setActiveShortTabIndex(null);

                      const cachedAi = aiSplitCacheRef.current;
                      if (cachedAi && cachedAi.ranges.length > 0) {
                        setShortRanges(cachedAi.ranges);
                        setShortScriptIds([]);
                        setShortsValidationError(null);

                        // Replace current short snapshots with the cached AI ones.
                        Object.keys(tabSnapshotsRef.current)
                          .filter((k) => k.startsWith('short-'))
                          .forEach((k) => {
                            delete tabSnapshotsRef.current[k];
                          });

                        Object.entries(cachedAi.shortSnapshotsByKey).forEach(([k, snap]) => {
                          tabSnapshotsRef.current[k] = cloneSnapshot(snap);
                        });
                      } else {
                        setShortRanges([]);
                        setShortScriptIds([]);
                        setShortsValidationError(null);

                        // Drop all short snapshots.
                        Object.keys(tabSnapshotsRef.current)
                          .filter((k) => k.startsWith('short-'))
                          .forEach((k) => {
                            delete tabSnapshotsRef.current[k];
                          });
                      }
                      return;
                    }
                    handleSplitIntoShortsManually();
                  }}
                  onSplitWithAi={handleSplitIntoShortsWithAi}
                  isSplittingWithAi={isSplittingIntoShorts}
                  shortsValidationError={shortsValidationError}
                  imageAspectRatio={imageAspectRatio}
                  onImageAspectRatioChange={(next) => {
                    setHasTouchedImageAspectRatio(true);
                    setImageAspectRatio(next);
                  }}
                  imagePromptModel={imagePromptModel}
                  onImagePromptModelChange={setImagePromptModel}
                  imageModel={imageModel}
                  onImageModelChange={setImageModel}
                  imageStyle={imageStyle}
                  onImageStyleChange={setImageStyle}
                  videoModel={videoModel}
                  onVideoModelChange={handleVideoModelChange}
                  scriptCharacters={scriptCharacters}
                  onScriptCharactersChange={handleScriptCharactersChange}
                  onSentenceForcedCharacterKeysChange={handleSentenceForcedCharacterKeysChange}
                  scriptEras={scriptEras}
                  onScriptErasChange={handleScriptErasChange}
                  onSentenceForcedEraKeyChange={handleSentenceForcedEraKeyChange}
                  onSentenceVisualEffectChange={handleSentenceVisualEffectChange}
                  onTransitionToNextChange={handleTransitionToNextChange}
                  onInsertEmptySentenceAfter={handleInsertEmptySentenceAfter}
                  onSentenceImageUpload={handleSentenceImageUpload}
                  onRemoveSentenceImage={removeSentenceImage}
                  onSentenceFrameImageUpload={handleSentenceFrameImageUpload}
                  onRemoveSentenceFrameImage={removeSentenceFrameImage}
                  onSentenceMediaModeChange={handleSentenceMediaModeChange}
                  onGenerateSentenceFrameImage={handleGenerateSentenceFrameImage}
                  onGenerateSentenceVideo={handleGenerateSentenceVideo}
                  onRemoveSentenceGeneratedVideoForMode={handleRemoveSentenceGeneratedVideoForMode}
                  onSentenceVideoGenerationModeChange={
                    handleSentenceVideoGenerationModeChange
                  }
                  onSentenceVideoPromptChange={handleSentenceVideoPromptChange}
                  onGenerateSentenceVideoPrompt={handleGenerateSentenceVideoPromptWithAi}
                  isGeneratingVideoPromptBySentenceId={isGeneratingVideoPromptBySentenceId}
                  onSentenceReferenceImageUpload={
                    handleSentenceReferenceImageUpload
                  }
                  onRemoveSentenceReferenceImage={
                    handleRemoveSentenceReferenceImage
                  }
                  isGeneratingVideoBySentenceId={isGeneratingVideoBySentenceId}
                  setIsGeneratingVideoBySentenceId={setIsGeneratingVideoBySentenceId}
                  onDeleteSentence={handleDeleteSentence}
                  onGenerateSentenceImage={handleGenerateSentenceImage}
                  onGenerateSentenceReferenceImage={handleGenerateSentenceReferenceImage}
                  onGenerateAllImages={handleGenerateAllSentenceImages}
                  isGeneratingAllImages={isGeneratingAllImages}
                  onSentenceTextChange={handleSentenceTextChange}
                  onMergeSentenceIntoPrevious={handleMergeSentenceIntoPrevious}
                  onMergeSentenceIntoNext={handleMergeSentenceIntoNext}
                  onSaveSentenceImage={handleSaveSentenceImage}
                  onSelectFromLibrary={handleSelectFromLibrary}
                  onSelectVideoFromLibrary={handleSelectVideoFromLibrary}
                  onAddSuspenseScene={handleAddSuspenseScene}
                  scriptStyle={scriptStyle}
                  scriptTechnique={scriptTechnique}
                  scriptModel={scriptModel}
                  systemPrompt={systemPrompt}
                  apiUrl={API_URL}
                />

                <VoiceOverSection
                  script={script}
                  voiceOver={voiceOver}
                  voiceDuration={voiceDuration}
                  voiceError={voiceError}
                  isGeneratingVoice={isGeneratingVoice}
                  isPreviewingVoice={isPreviewingVoice}
                  isSavingVoice={isSavingVoice}
                  savedVoiceId={savedVoiceId}
                  voiceProvider={voiceProvider}
                  onVoiceProviderChange={(p) => {
                    setVoiceProvider(p);
                  }}
                  styleInstructions={
                    voiceProvider === 'google' ? aiStudioStyleInstructions : ''
                  }
                  onStyleInstructionsChange={(value) => {
                    setAiStudioStyleInstructions(value);
                  }}
                  voices={voices}
                  isLoadingVoices={isLoadingVoices}
                  voicesError={voicesError}
                  selectedVoiceId={selectedVoiceId}
                  onSelectVoice={handleSelectVoice}
                  onRefreshVoices={fetchVoices}
                  onSetFavoriteVoice={handleSetFavoriteVoice}
                  isSettingFavoriteVoice={isSettingFavoriteVoice}
                  onVoiceUpload={handleVoiceUpload}
                  onGenerateVoice={handleGenerateVoice}
                  onPreviewVoice={handlePreviewVoice}
                  onRemoveVoice={removeVoice}
                  onSaveVoice={handleSaveVoice}
                  onOpenLibrary={handleOpenVoiceLibrary}
                />
              </Accordion>
              <RenderSettingsSection
                isShort={isShortsTabActive ? true : isShort}
                onIsShortChange={isShortsTabActive ? ((_value: boolean) => {}) : setIsShort}
                disableIsShort={isLongForm || isShortsTabActive}
                useLowerFps={useLowerFps}
                onUseLowerFpsChange={setUseLowerFps}
                useLowerResolution={useLowerResolution}
                onUseLowerResolutionChange={setUseLowerResolution}
                addSubtitles={addSubtitles}
                onAddSubtitlesChange={setAddSubtitles}
              />

              {/* Generate Button */}
              <GenerateVideoButton
                isGenerating={isGenerating}
                videoJobStatus={videoJobStatus}
                script={script}
                voiceOver={voiceOver}
                onGenerate={handleGenerate}
                onUploadVideo={handleUploadFinalVideo}
                isUploadingVideo={isUploadingVideo}
                backgroundSoundtracks={backgroundSoundtracks}
                selectedBackgroundSoundtrackValue={selectedBackgroundSoundtrackValue}
                backgroundSoundtrackVolumePercent={backgroundSoundtrackVolumePercent}
                onBackgroundSoundtrackVolumePercentChange={setBackgroundSoundtrackVolumePercent}
                onSelectedBackgroundSoundtrackValueChange={(value) => {
                  setSelectedBackgroundSoundtrackValue(value);

                  if (value !== '__oneoff__') return;
                  if (oneOffBackgroundSoundtrackUrl) return;
                  setSelectedBackgroundSoundtrackValue('__default__');
                }}
                hasOneOffBackgroundSoundtrack={Boolean(oneOffBackgroundSoundtrackUrl)}
                oneOffBackgroundSoundtrackUrl={oneOffBackgroundSoundtrackUrl}
                onToast={showToast}
                onSetFavoriteBackgroundSoundtrack={handleSetFavoriteBackgroundSoundtrack}
                isSettingFavoriteBackgroundSoundtrack={isSettingFavoriteBackgroundSoundtrack}
                onSaveBackgroundSoundtrackVolume={handleSaveBackgroundSoundtrackVolume}
                isSavingBackgroundSoundtrackVolume={isSavingBackgroundSoundtrackVolume}
                onDeleteBackgroundSoundtrack={handleDeleteBackgroundSoundtrack}
                isDeletingBackgroundSoundtrack={isDeletingBackgroundSoundtrack}
                onUploadBackgroundSoundtrackUseOnce={handleUploadBackgroundSoundtrackUseOnce}
                onUploadBackgroundSoundtrackAddToLibrary={handleUploadBackgroundSoundtrackAddToLibrary}
                isUploadingBackgroundSoundtrack={isUploadingBackgroundSoundtrack}
              />
            </div>

            {/* Video job status & preview */}
            <div ref={videoSectionRef}>
              <VideoJobSection
                videoJobId={videoJobId}
                videoJobStatus={videoJobStatus}
                videoJobError={videoJobError}
                videoUrl={videoUrl}
                isShortVideo={effectiveIsShort}
                scriptId={activeScriptId}
                scriptTextForUpload={sentences
                  .map((s) => String(s?.text ?? '').trim())
                  .filter(Boolean)
                  .join(' ')
                  .trim()}
                scriptCharacters={scriptCharacters}
                onSaveGeneration={handleSaveGeneration}
                isSavingGeneration={isSavingGeneration}
                canSaveGeneration={!!videoUrl && !!script.trim() && !!voiceOver && sentences.length > 0}
                onRetry={handleGenerate}
              />
            </div>

            {/* Debug: Sync ElevenLabs voices into backend DB */}
            {/* <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Debug: Sync ElevenLabs Voices</p>
                <button
                  type="button"
                  onClick={handleSyncElevenLabsVoices}
                  disabled={isSyncingVoices}
                  className="inline-flex items-center rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSyncingVoices && (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  )}
                  {isSyncingVoices ? 'Syncing...' : 'Sync Voices Now'}
                </button>
              </div>
              {syncVoicesResult && (
                <p className="text-xs text-gray-600">{syncVoicesResult}</p>
              )}
            </div> */}
          </div>
        </div>
      </div>

      <GenerateModalsHost
        isImageLibraryOpen={isLibraryModalOpen}
        libraryTarget={libraryTarget}
        sentences={sentences}
        onCloseImageLibrary={() => {
          setIsLibraryModalOpen(false);
          setLibraryTarget(null);
        }}
        onSelectImage={handleLibraryImageSelect}
        isVoiceLibraryOpen={isVoiceLibraryOpen}
        selectedVoiceUrl={voiceLibraryUrl}
        onCloseVoiceLibrary={() => {
          setIsVoiceLibraryOpen(false);
        }}
        onSelectVoice={handleVoiceLibrarySelect}

        isVideoLibraryOpen={isVideoLibraryOpen}
        selectedVideoUrl={
          videoLibraryTargetIndex === null
            ? null
            : sentences[videoLibraryTargetIndex]?.videoUrl ?? null
        }
        onCloseVideoLibrary={() => {
          setIsVideoLibraryOpen(false);
          setVideoLibraryTargetIndex(null);
        }}
        onSelectVideo={handleLibraryVideoSelect}
        isScriptLibraryOpen={isScriptLibraryOpen}
        onCloseScriptLibrary={() => setIsScriptLibraryOpen(false)}
        onSelectScript={handleSelectScriptFromLibrary}
        isScriptReferencesOpen={isScriptReferencesOpen}
        onCloseScriptReferences={() => setIsScriptReferencesOpen(false)}
        initialSelectedReferenceScripts={referenceScripts.map((s) => ({
          id: s.id,
          title: s.title,
          script: s.script,
        }))}
        onApplyReferenceScripts={handleApplyReferenceScripts}
        alertState={alertState}
        onCloseAlert={closeAlert}
      />

      {/* Generate All Images Confirmation */}
      <AlertDialog
        isOpen={Boolean(generateAllImagesConfirm)}
        onClose={() => setGenerateAllImagesConfirm(null)}
        onCancel={() => {
          if (!generateAllImagesConfirm) return;

          if (generateAllImagesConfirm.kind === 'some') {
            const indices = generateAllImagesConfirm.missingIndices;
            setGenerateAllImagesConfirm(null);
            if (indices.length) {
              void (async () => {
                setIsGeneratingAllImages(true);
                try {
                  // eslint-disable-next-line no-restricted-syntax
                  for (const index of indices) {
                    // eslint-disable-next-line no-await-in-loop
                    await handleGenerateSentenceImage(index);
                  }
                } finally {
                  setIsGeneratingAllImages(false);
                }
              })();
            }
            return;
          }

          setGenerateAllImagesConfirm(null);
        }}
        onConfirm={() => {
          if (!generateAllImagesConfirm) return;
          const indices = generateAllImagesConfirm.eligibleIndices;
          setGenerateAllImagesConfirm(null);
          if (indices.length) {
            void (async () => {
              setIsGeneratingAllImages(true);
              try {
                // eslint-disable-next-line no-restricted-syntax
                for (const index of indices) {
                  // eslint-disable-next-line no-await-in-loop
                  await handleGenerateSentenceImage(index);
                }
              } finally {
                setIsGeneratingAllImages(false);
              }
            })();
          }
        }}
        title={
          generateAllImagesConfirm?.kind === 'all'
            ? 'Replace all sentence images?'
            : 'Replace existing sentence images?'
        }
        description={
          generateAllImagesConfirm?.kind === 'all'
            ? 'All sentences already have images. This will regenerate and overwrite every sentence image (except the subscribe sentence).'
            : `Some sentences already have images (${generateAllImagesConfirm?.existingCount ?? 0}). Do you want to replace them too, or only generate the missing ones (${generateAllImagesConfirm?.missingCount ?? 0})?`
        }
        confirmText={
          generateAllImagesConfirm?.kind === 'all' ? 'Replace all' : 'Replace all images'
        }
        cancelText={
          generateAllImagesConfirm?.kind === 'some' ? 'Generate missing only' : 'Cancel'
        }
        variant="warning"
      />

    </div>
  );
}
