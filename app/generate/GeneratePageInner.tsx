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
import { ImageLibraryModal } from './_components/ImageLibraryModal';
import { ScriptLibraryModal } from './_components/ScriptLibraryModal';
import {
  ScriptReferencesModal,
  type ScriptReferenceDto,
} from './_components/ScriptReferencesModal';
import { VoiceLibraryModal } from './_components/VoiceLibraryModal';
import { GeneratePageSkeleton } from './_components/GeneratePageSkeleton';
import { useAuthGuard } from './_hooks/useAuthGuard';
import { useVideoJob } from './_hooks/useVideoJob';
import { api } from '@/lib/api';
import { uploadToCloudinaryUnsigned } from '@/lib/cloudinary';
import { AlertModal, useAlertModal } from '@/components/ui/alert-modal';
import { useToast } from '@/components/ui/toast';
import type { SentenceItem } from './_types/sentences';

const API_URL = process.env.NEXT_PUBLIC_API_URL ||
 'http://localhost:3000';

const SUBSCRIBE_SENTENCE =
  'Please Subscribe & Help us reach out to more people';

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
  const [isRandomScriptLoading, setIsRandomScriptLoading] = useState(false);
  const [randomScriptError, setRandomScriptError] = useState<string | null>(
    null,
  );
  const [isEnhancingScript, setIsEnhancingScript] = useState(false);
  // Track the original config used to produce the current script
  const [originalScriptSubject, setOriginalScriptSubject] = useState<string | undefined>(undefined);
  const [originalScriptSubjectContent, setOriginalScriptSubjectContent] = useState<string | undefined>(undefined);
  const [sentences, setSentences] = useState<SentenceItem[]>([]);
  const [isSplitting, setIsSplitting] = useState(false);
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
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<
    | {
      index: number;
      which: 'single' | 'start' | 'end';
    }
    | null
  >(null);
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
  const [enableGlitchTransitions, setEnableGlitchTransitions] = useState(true);
  const [enableZoomRotateTransitions, setEnableZoomRotateTransitions] = useState(true);
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
        const list = next.google;
        if (!Array.isArray(list) || list.length === 0) return prev;
        next.google = list.map((v) =>
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

      // Ensure the ElevenLabs script includes the subscribe sentence
      // at the end, similar to how we handle it when splitting.
      const normalize = (value: string) => {
        return value
          .toLowerCase()
          .trim()
          .replace(/[.!?]+$/u, '')
          .replace(/&/g, 'and')
          .replace(/\s+/g, ' ');
      };

      const targetNorm = normalize(SUBSCRIBE_SENTENCE);
      const sentenceTexts = (sentences || []).map((s) => s.text).filter(Boolean);
      const baseText = sentenceTexts.length > 0 ? mergeSentences(sentenceTexts) : script;
      const scriptNorm = normalize(baseText);

      let sentencesForVoice = sentenceTexts;

      if (sentencesForVoice.length > 0) {
        const mergedNorm = normalize(mergeSentences(sentencesForVoice));
        if (!mergedNorm.includes(targetNorm)) {
          sentencesForVoice = [...sentencesForVoice, SUBSCRIBE_SENTENCE];
        }
      }

      let scriptForVoice = baseText;
      if (!scriptNorm.includes(targetNorm)) {
        const base = baseText.trim();
        const needsPunctuation = base && !/[.!?]$/u.test(base);
        scriptForVoice = `${base}${needsPunctuation ? '.' : ''} ${SUBSCRIBE_SENTENCE}`;
      }

      if (sentencesForVoice.length > 0) {
        scriptForVoice = mergeSentences(sentencesForVoice);
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

      const blob = await response.blob();
      const ext = voiceProvider === 'google' ? 'wav' : 'mp3';
      const fileName = `${voiceProvider}-voice-over.${ext}`;
      const file = new File([blob], fileName, {
        type:
          blob.type || (voiceProvider === 'google' ? 'audio/wav' : 'audio/mpeg'),
      });

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

    const subscribeSentence = 'Please Subscribe & Help us reach out to more people';

    const missingMediaForImageTab = sentences.some((s) => {
      const text = String(s.text ?? '').trim();
      if (text === subscribeSentence) return false;
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
        if (text === subscribeSentence) return null;
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

      const sentencePayload = sentences.map((s) => {
        const text = String(s.text ?? '');
        const trimmed = text.trim();
        if (trimmed === subscribeSentence) {
          return {
            text,
            isSuspense: Boolean(s.isSuspense),
            mediaType: 'video' as const,
            videoUrl: '/subscribe.mp4',
          };
        }

        const tab = s.sceneTab ?? (s.mediaMode === 'frames' ? 'video' : 'image');
        if (tab === 'video') {
          return {
            text,
            isSuspense: Boolean(s.isSuspense),
            mediaType: 'video' as const,
            videoUrl: String(s.videoUrl ?? '').trim(),
          };
        }

        return {
          text,
          isSuspense: Boolean(s.isSuspense),
          mediaType: 'image' as const,
        };
      });
      form.append('sentences', JSON.stringify(sentencePayload));
      form.append('scriptLength', scriptLength);
      if (voiceDuration && voiceDuration > 0) {
        form.append('audioDurationSeconds', String(voiceDuration));
      }

      // Render configuration flags
      form.append('isShort', isShort ? 'true' : 'false');
      form.append('useLowerFps', useLowerFps ? 'true' : 'false');
      form.append(
        'useLowerResolution',
        useLowerResolution ? 'true' : 'false',
      );
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
        if (text === subscribeSentence) continue;

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

      const data = (await response.json()) as { sentences: string[] };

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

      const processedSentences: string[] = [];
      let hasSubscribe = false;

      for (const raw of data.sentences ?? []) {
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const norm = normalize(trimmed);
        if (norm === targetNorm) {
          if (!hasSubscribe) {
            hasSubscribe = true;
            processedSentences.push(SUBSCRIBE_SENTENCE);
          }
        } else {
          processedSentences.push(trimmed);
        }
      }

      if (!hasSubscribe) {
        processedSentences.push(SUBSCRIBE_SENTENCE);
      }

      const now = Date.now();
      const items: SentenceItem[] = processedSentences.map((text, idx) => ({
        id: `${now}-${idx}`,
        text,
        mediaMode: 'single',
        sceneTab: text === SUBSCRIBE_SENTENCE ? 'video' : 'image',
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

      setActiveScriptId(null);
      setSentences(items);
    } catch (error) {
      console.error('Split script failed', error);
      setSplitError('Failed to split script. Please try again.');
    } finally {
      setIsSplitting(false);
    }
  };

  const handleResetScriptAndSentences = () => {
    setActiveScriptId(null);
    setScript('');
    setSentences([]);
    setSplitError(null);
    setOriginalScriptSubject(undefined);
    setOriginalScriptSubjectContent(undefined);
  };

  const handleOpenScriptLibrary = () => {
    setIsScriptLibraryOpen(true);
  };

  const handleSelectScriptFromLibrary = (draft: {
    id: string;
    script: string;
    video_url?: string | null;
    subject?: string | null;
    subject_content?: string | null;
    length?: string | null;
    style?: string | null;
    technique?: string | null;
    reference_scripts?: { id: string; title: string | null; script: string }[];
    voice?: { id: string; voice: string } | null;
    sentences?: {
      id: string;
      text: string;
      index: number;
      image?: { id: string; image: string; prompt?: string | null } | null;
      startFrameImage?: { id: string; image: string; prompt?: string | null } | null;
      endFrameImage?: { id: string; image: string; prompt?: string | null } | null;
      video?: { id: string; video: string } | null;
      isSuspense?: boolean;
    }[];
  }) => {
    setActiveScriptId(draft.id);
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

    if (draft.sentences && draft.sentences.length > 0) {
      const sorted = [...draft.sentences].sort((a, b) => a.index - b.index);
      const mapped: SentenceItem[] = sorted.map((s) => ({
        id: s.id,
        text: s.text,
        mediaMode: s.startFrameImage || s.endFrameImage ? 'frames' : 'single',
        sceneTab:
          (s.text || '').trim() === SUBSCRIBE_SENTENCE
            ? 'video'
            : s.video
              ? 'video'
              : 'image',
        image: null,
        imageUrl: s.image?.image ?? null,
        startImage: null,
        startImageUrl: s.startFrameImage?.image ?? null,
        startImagePrompt: s.startFrameImage?.prompt ?? null,
        startSavedImageId: s.startFrameImage?.id ?? null,
        endImage: null,
        endImageUrl: s.endFrameImage?.image ?? null,
        endImagePrompt: s.endFrameImage?.prompt ?? null,
        endSavedImageId: s.endFrameImage?.id ?? null,
        video: s.text === SUBSCRIBE_SENTENCE ? null : null,
        videoUrl: s.text === SUBSCRIBE_SENTENCE ? '/subscribe.mp4' : s.video?.video ?? null,
        savedVideoId: s.video?.id ?? null,
        imagePrompt: s.image?.prompt ?? null,
        isGeneratingImage: false,
        isGeneratingStartImage: false,
        isGeneratingEndImage: false,
        isSavingImage: false,
        savedImageId: s.image?.id ?? null,
        isFromLibrary: !!s.image,
        isSuspense: Boolean(s.isSuspense) && s.text !== SUBSCRIBE_SENTENCE,
      }));
      setSentences(mapped);
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
            sceneTab: 'image',
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

        // Important: do not clear previously generated/uploaded media when toggling.
        // Users may want to switch modes temporarily and come back without losing frames.
        return {
          ...item,
          mediaMode: mode,
          sceneTab: mode === 'frames' ? 'video' : 'image',
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

  const handleSentenceTextChange = (index: number, text: string) => {
    setSentences((prev) =>
      prev.map((item, i) => (i === index ? { ...item, text } : item)),
    );
  };

  const mergeSentenceText = (targetText: string, sourceText: string) => {
    const parts = [targetText, sourceText]
      .map((t) => (t ?? '').trim())
      .filter(Boolean);
    return parts.join(' ');
  };

  const handleMergeSentenceIntoPrevious = (index: number) => {
    setSentences((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const targetIndex = index - 1;
      const target = prev[targetIndex];
      const source = prev[index];
      if (!target || !source) return prev;

      const next = prev.map((item, i) =>
        i === targetIndex
          ? { ...item, text: mergeSentenceText(item.text, source.text) }
          : item,
      );
      next.splice(index, 1);
      return next;
    });
  };

  const handleMergeSentenceIntoNext = (index: number) => {
    setSentences((prev) => {
      if (index < 0 || index >= prev.length - 1) return prev;
      const targetIndex = index + 1;
      const target = prev[targetIndex];
      const source = prev[index];
      if (!target || !source) return prev;

      const next = prev.map((item, i) =>
        i === targetIndex
          ? { ...item, text: mergeSentenceText(item.text, source.text) }
          : item,
      );
      next.splice(index, 1);
      return next;
    });
  };

  const handleDeleteSentence = (index: number) => {
    setSentences((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAddSuspenseScene = (sourceIndex: number) => {
    setSentences((prev) => {
      const source = prev[sourceIndex];
      if (!source) return prev;

      const newId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `suspense-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const copy: SentenceItem = {
        ...source,
        id: newId,
        isSuspense: true,
        isGeneratingImage: false,
        isSavingImage: false,
        // Keep the saved image reference so drafts can round-trip the suspense scene media.
        savedImageId: source.savedImageId ?? null,
      };

      // Only one suspense scene should exist. Adding a new one replaces the previous.
      const withoutExistingSuspense = prev.filter((s) => !s.isSuspense);
      return [copy, ...withoutExistingSuspense];
    });
  };

  const handleGenerateSentenceImage = async (index: number, promptOverride?: string) => {
    const target = sentences[index];
    if (!target) return;

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
        style: scriptStyle,
        scriptLength,
        isShort,
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
        style: scriptStyle,
        scriptLength,
        isShort,
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

  const handleGenerateSentenceVideo = async (index: number) => {
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

      setSentences((prev) =>
        prev.map((s, i) =>
          i === index ? { ...s, videoUrl: url, savedVideoId } : s,
        ),
      );

      showToast('Sentence video generated.', 'success');
    } catch (error) {
      console.error('Generate sentence video failed', error);
      showToast('Failed to generate sentence video. Please try again.', 'error');
    }
  };

  const handleGenerateAllSentenceImages = async () => {
    if (!sentences.length || isGeneratingAllImages) return;

    const indicesToGenerate = sentences
      .map((item, index) =>
        // Skip if this is the subscribe sentence or it already has media
        item.text === SUBSCRIBE_SENTENCE || item.image || item.imageUrl
          ? null
          : index,
      )
      .filter((index): index is number => index !== null);

    if (!indicesToGenerate.length) {
      // All sentences already have images
      return;
    }

    setIsGeneratingAllImages(true);
    try {
      // Generate images sequentially to avoid overwhelming the backend/API
      // eslint-disable-next-line no-restricted-syntax
      for (const index of indicesToGenerate) {
        // eslint-disable-next-line no-await-in-loop
        await handleGenerateSentenceImage(index);
      }
    } finally {
      setIsGeneratingAllImages(false);
    }
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
    which: 'single' | 'start' | 'end' = 'single',
  ) => {
    setLibraryTarget({ index, which });
    setIsLibraryModalOpen(true);
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
              : {
                ...item,
                endImageUrl: imageUrl,
                endImage: null,
                endImagePrompt: prompt ?? null,
                isFromLibrary: true,
                endSavedImageId: id,
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
          isSuspense: Boolean(s.isSuspense) && (s.text || '').trim() !== SUBSCRIBE_SENTENCE,
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

    setIsSavingDraft(true);

    try {
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

      const sentencePayload: {
        text: string;
        image_id?: string;
        start_frame_image_id?: string;
        end_frame_image_id?: string;
        video_id?: string;
        isSuspense?: boolean;
      }[] = [];

      // Ensure any uploaded or generated images are saved to the images table
      // so their IDs can be linked to sentences in the draft.
      // Do this sequentially to avoid overwhelming the backend.
      // eslint-disable-next-line no-restricted-syntax
      for (let index = 0; index < sentences.length; index += 1) {
        const s = sentences[index];
        const imageId = await uploadImageIfNeeded({
          existingId: s.savedImageId ?? null,
          file: s.image,
          url: s.imageUrl,
          filename: `sentence-${index + 1}.png`,
          prompt: s.imagePrompt ?? null,
        });

        const startFrameImageId = await uploadImageIfNeeded({
          existingId: s.startSavedImageId ?? null,
          file: s.startImage,
          url: s.startImageUrl,
          filename: `sentence-${index + 1}-start.png`,
          prompt: s.startImagePrompt ?? null,
        });

        const endFrameImageId = await uploadImageIfNeeded({
          existingId: s.endSavedImageId ?? null,
          file: s.endImage,
          url: s.endImageUrl,
          filename: `sentence-${index + 1}-end.png`,
          prompt: s.endImagePrompt ?? null,
        });

        sentencePayload.push({
          text: s.text,
          image_id: imageId ?? undefined,
          start_frame_image_id: startFrameImageId ?? undefined,
          end_frame_image_id: endFrameImageId ?? undefined,
          video_id: s.savedVideoId ?? undefined,
          isSuspense: Boolean(s.isSuspense) && (s.text || '').trim() !== SUBSCRIBE_SENTENCE,
        });
      }

      // Optionally attach a voice-over to the draft if available
      let voiceId = savedVoiceId;

      if (!voiceId && voiceOver) {
        const saved = await persistVoiceToLibrary(voiceOver);
        voiceId = saved.id;
        setSavedVoiceId(voiceId);
      }

      const payload: {
        script: string;
        voice_id?: string;
        video_url?: string;
        sentences?: {
          text: string;
          image_id?: string;
          start_frame_image_id?: string;
          end_frame_image_id?: string;
          video_id?: string;
          isSuspense?: boolean;
        }[];
        subject?: string;
        subject_content?: string | null;
        length?: string;
        style?: string | null;
        technique?: string | null;
        reference_script_ids?: string[];
      } = {
        script,
        voice_id: voiceId ?? undefined,
        video_url: activeScriptId ? undefined : videoUrl ?? undefined,
        sentences: sentencePayload.length > 0 ? sentencePayload : undefined,
        subject: scriptSubject,
        subject_content:
          scriptSubject === 'religious (Islam)' ? (scriptSubjectContent || null) : null,
        length: scriptLength,
        style: referenceScripts.length > 0 ? null : scriptStyle,
        technique: scriptTechnique,
        reference_script_ids:
          referenceScripts.length > 0 ? referenceScripts.map((s) => s.id) : undefined,
      };

      const upserted = activeScriptId
        ? await api.patch(`/scripts/${encodeURIComponent(activeScriptId)}`, payload)
        : await api.post('/scripts', payload);

      const upsertedScript = upserted.data as {
        id: string;
        sentences?: {
          id: string;
          text: string;
          index: number;
          image?: { id: string; image: string; prompt?: string | null } | null;
          startFrameImage?: { id: string; image: string; prompt?: string | null } | null;
          endFrameImage?: { id: string; image: string; prompt?: string | null } | null;
          video?: { id: string; video: string } | null;
          isSuspense?: boolean;
        }[];
      };

      if (upsertedScript?.id) {
        setActiveScriptId(upsertedScript.id);
      }

      if (upsertedScript?.sentences && upsertedScript.sentences.length > 0) {
        const sorted = [...upsertedScript.sentences].sort((a, b) => a.index - b.index);
        const mapped: SentenceItem[] = sorted.map((s) => ({
          id: s.id,
          text: s.text,
          mediaMode: s.startFrameImage || s.endFrameImage ? 'frames' : 'single',
          sceneTab:
            (s.text || '').trim() === SUBSCRIBE_SENTENCE
              ? 'video'
              : s.video
                ? 'video'
                : 'image',
          image: null,
          imageUrl: s.image?.image ?? null,
          startImage: null,
          startImageUrl: s.startFrameImage?.image ?? null,
          startImagePrompt: s.startFrameImage?.prompt ?? null,
          startSavedImageId: s.startFrameImage?.id ?? null,
          endImage: null,
          endImageUrl: s.endFrameImage?.image ?? null,
          endImagePrompt: s.endFrameImage?.prompt ?? null,
          endSavedImageId: s.endFrameImage?.id ?? null,
          video: s.text === SUBSCRIBE_SENTENCE ? null : null,
          videoUrl: s.text === SUBSCRIBE_SENTENCE ? '/subscribe.mp4' : s.video?.video ?? null,
          savedVideoId: s.video?.id ?? null,
          imagePrompt: s.image?.prompt ?? null,
          isGeneratingImage: false,
          isGeneratingStartImage: false,
          isGeneratingEndImage: false,
          isSavingImage: false,
          savedImageId: s.image?.id ?? null,
          isFromLibrary: !!s.image,
          isSuspense: Boolean(s.isSuspense) && s.text !== SUBSCRIBE_SENTENCE,
        }));

        setSentences(mapped);

        // Persist any local sentence-level videos (generated via non-persistent endpoint or uploaded)
        // once we have real sentence IDs.
        for (let index = 0; index < mapped.length; index += 1) {
          const local = sentences[index];
          const persisted = mapped[index];
          if (!local || !persisted) continue;
          if ((persisted.text || '').trim() === SUBSCRIBE_SENTENCE) continue;
          if (persisted.savedVideoId) continue;

          const hasFile = Boolean(local.video);
          const url = String(local.videoUrl ?? '').trim();
          const hasHttpUrl = url.startsWith('http://') || url.startsWith('https://');

          if (!hasFile && !hasHttpUrl) continue;

          const formData = new FormData();
          if (hasFile && local.video) {
            formData.append('video', local.video);
          } else {
            formData.append('videoUrl', url);
          }

          const res = await api.post<{ id: string; video: string }>(
            `/scripts/${encodeURIComponent(upsertedScript.id)}/sentences/${encodeURIComponent(
              persisted.id,
            )}/video`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
          );

          setSentences((prev) =>
            prev.map((item) =>
              item.id === persisted.id
                ? { ...item, videoUrl: res.data.video, savedVideoId: res.data.id }
                : item,
            ),
          );
        }
      }

      showAlert(activeScriptId ? 'Draft updated successfully.' : 'Draft saved successfully.', {
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
                  onSentenceImageUpload={handleSentenceImageUpload}
                  onRemoveSentenceImage={removeSentenceImage}
                  onSentenceFrameImageUpload={handleSentenceFrameImageUpload}
                  onRemoveSentenceFrameImage={removeSentenceFrameImage}
                  onSentenceMediaModeChange={handleSentenceMediaModeChange}
                  onGenerateSentenceFrameImage={handleGenerateSentenceFrameImage}
                  onGenerateSentenceVideo={handleGenerateSentenceVideo}
                  onDeleteSentence={handleDeleteSentence}
                  onGenerateSentenceImage={handleGenerateSentenceImage}
                  onGenerateAllImages={handleGenerateAllSentenceImages}
                  isGeneratingAllImages={isGeneratingAllImages}
                  onSentenceTextChange={handleSentenceTextChange}
                  onMergeSentenceIntoPrevious={handleMergeSentenceIntoPrevious}
                  onMergeSentenceIntoNext={handleMergeSentenceIntoNext}
                  onSaveSentenceImage={handleSaveSentenceImage}
                  onSelectFromLibrary={handleSelectFromLibrary}
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
                  onPreviewVoice={
                    voiceProvider === 'google' ? handlePreviewVoice : undefined
                  }
                  onRemoveVoice={removeVoice}
                  onSaveVoice={handleSaveVoice}
                  onOpenLibrary={handleOpenVoiceLibrary}
                />
              </Accordion>
              {/* Render Settings */}
              <div className="px-6 pb-5 pt-5 border-t border-gray-200 bg-linear-to-br from-gray-50 to-white">
                <div className="flex items-center gap-3 mb-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-linear-to-br from-indigo-400 to-purple-500 blur-md opacity-40 rounded-xl"></div>
                    <div className="relative p-2.5 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold bg-linear-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">Render Configuration</h3>
                    <p className="text-sm text-gray-600">Fine-tune quality and performance</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Is Short Option */}
                  <label
                    className={`relative flex items-start gap-3 p-4 rounded-xl border-2 bg-white cursor-pointer transition-all duration-300 group ${isShort
                      ? 'border-indigo-400 shadow-lg shadow-indigo-100'
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                      }`}
                  >
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        className="peer h-5 w-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 cursor-pointer checked:scale-110 checked:border-indigo-500"
                        checked={isShort}
                        onChange={(e) => setIsShort(e.target.checked)}
                      />
                      <div
                        className={`absolute inset-0 rounded bg-indigo-500 opacity-0 transition-opacity duration-300 pointer-events-none ${isShort ? 'animate-ping' : ''
                          }`}
                        style={{ animationIterationCount: 1, animationDuration: '0.5s' }}
                      ></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">Is Short</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Aspect ratio</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">On: 9:16 (Shorts). Off: 16:9 (Regular)</p>
                    </div>
                  </label>

                  {/* Lower FPS Option */}
                  <label className={`relative flex items-start gap-3 p-4 rounded-xl border-2 bg-white cursor-pointer transition-all duration-300 group ${useLowerFps
                    ? 'border-indigo-400 shadow-lg shadow-indigo-100'
                    : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                    }`}>
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        className="peer h-5 w-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 cursor-pointer checked:scale-110 checked:border-indigo-500"
                        checked={useLowerFps}
                        onChange={(e) => setUseLowerFps(e.target.checked)}
                      />
                      <div className={`absolute inset-0 rounded bg-indigo-500 opacity-0 transition-opacity duration-300 pointer-events-none ${useLowerFps ? 'animate-ping' : ''
                        }`} style={{ animationIterationCount: 1, animationDuration: '0.5s' }}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">Lower FPS</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Faster</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">24 fps instead of 30 fps (~20% faster)</p>
                    </div>
                  </label>

                  {/* Lower Resolution Option */}
                  <label className={`relative flex items-start gap-3 p-4 rounded-xl border-2 bg-white cursor-pointer transition-all duration-300 group ${useLowerResolution
                    ? 'border-indigo-400 shadow-lg shadow-indigo-100'
                    : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                    }`}>
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        className="peer h-5 w-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 cursor-pointer checked:scale-110 checked:border-indigo-500"
                        checked={useLowerResolution}
                        onChange={(e) =>
                          setUseLowerResolution(e.target.checked)
                        }
                      />
                      <div className={`absolute inset-0 rounded bg-indigo-500 opacity-0 transition-opacity duration-300 pointer-events-none ${useLowerResolution ? 'animate-ping' : ''
                        }`} style={{ animationIterationCount: 1, animationDuration: '0.5s' }}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">720p Resolution</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Faster</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Use 720p instead of 1080p (~50% faster)</p>
                    </div>
                  </label>

                  {/* Glitch Transitions Option */}
                  {/* <label className={`relative flex items-start gap-3 p-4 rounded-xl border-2 bg-white cursor-pointer transition-all duration-300 group ${enableGlitchTransitions
                      ? 'border-purple-400 shadow-lg shadow-purple-100'
                      : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                    }`}>
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        className="peer h-5 w-5 rounded border-2 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 cursor-pointer checked:scale-110 checked:border-purple-500"
                        checked={enableGlitchTransitions}
                        onChange={(e) =>
                          setEnableGlitchTransitions(e.target.checked)
                        }
                      />
                      <div className={`absolute inset-0 rounded bg-purple-500 opacity-0 transition-opacity duration-300 pointer-events-none ${enableGlitchTransitions ? 'animate-ping' : ''
                        }`} style={{ animationIterationCount: 1, animationDuration: '0.5s' }}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">Glitch Effect</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">1x per video</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">RGB channel split effect on middle scene</p>
                    </div>
                  </label> */}
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <span className="font-semibold">Tip:</span> Enable performance options for faster previews, disable them for final high-quality exports.
                    </p>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <GenerateVideoButton
                isGenerating={isGenerating}
                videoJobStatus={videoJobStatus}
                script={script}
                voiceOver={voiceOver}
                onGenerate={handleGenerate}
              />
            </div>

            {/* Video job status & preview */}
            <div ref={videoSectionRef}>
              <VideoJobSection
                videoJobId={videoJobId}
                videoJobStatus={videoJobStatus}
                videoJobError={videoJobError}
                videoUrl={videoUrl}
                script={script}
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

      {/* Image Library Modal */}
      <ImageLibraryModal
        isOpen={isLibraryModalOpen}
        selectedImageUrl={
          libraryTarget
            ? libraryTarget.which === 'single'
              ? sentences[libraryTarget.index]?.imageUrl ?? null
              : libraryTarget.which === 'start'
                ? sentences[libraryTarget.index]?.startImageUrl ?? null
                : sentences[libraryTarget.index]?.endImageUrl ?? null
            : null
        }
        onClose={() => {
          setIsLibraryModalOpen(false);
          setLibraryTarget(null);
        }}
        onSelectImage={handleLibraryImageSelect}
      />

      {/* Voice Library Modal */}
      <VoiceLibraryModal
        isOpen={isVoiceLibraryOpen}
        selectedVoiceUrl={voiceLibraryUrl}
        onClose={() => {
          setIsVoiceLibraryOpen(false);
        }}
        onSelectVoice={handleVoiceLibrarySelect}
      />

      {/* Script Library Modal */}
      <ScriptLibraryModal
        isOpen={isScriptLibraryOpen}
        onClose={() => setIsScriptLibraryOpen(false)}
        onSelectScript={handleSelectScriptFromLibrary}
      />

      {/* Script References Modal */}
      <ScriptReferencesModal
        isOpen={isScriptReferencesOpen}
        onClose={() => setIsScriptReferencesOpen(false)}
        initialSelected={referenceScripts.map((s) => ({
          id: s.id,
          title: s.title,
          script: s.script,
        }))}
        onApply={handleApplyReferenceScripts}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />
    </div>
  );
}
