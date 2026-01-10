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
  Loader2,
  FileText,
  Play,
  Mic,
  Sparkles,
  MessageSquare,
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
import { VoiceLibraryModal } from './_components/VoiceLibraryModal';
import { GeneratePageSkeleton } from './_components/GeneratePageSkeleton';
import { useAuthGuard } from './_hooks/useAuthGuard';
import { useVideoJob } from './_hooks/useVideoJob';
import { api } from '@/lib/api';
import { AlertModal, useAlertModal } from '@/components/ui/alert-modal';

const API_URL =
  'http://localhost:3000';

const SUBSCRIBE_SENTENCE =
  'Please Subscribe & Help us reach out to more people';

function mergeText(a: string, b: string) {
  return `${a ?? ''} ${b ?? ''}`.replace(/\s+/g, ' ').trim();
}

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

export type SentenceItem = {
  id: string;
  text: string;
  image?: File | null;
  imageUrl?: string | null;
  video?: File | null;
  videoUrl?: string | null;
  imagePrompt?: string | null;
  isGeneratingImage?: boolean;
  isSavingImage?: boolean;
  savedImageId?: string | null;
  isFromLibrary?: boolean;
};

export type VoiceOverOption = {
  id: number;
  voice_id: string;
  name: string;
  use_case?: string | null;
  preview_url?: string | null;
};

export function GeneratePageInner() {
  const { user, isLoading, handleLogout } = useAuthGuard();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const routeChatId = typeof params?.id === 'string' ? params.id : null;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const videoSectionRef = useRef<HTMLDivElement | null>(null);
  const { alertState, showAlert, closeAlert } = useAlertModal();

  // Form state
  const [script, setScript] = useState('');
  const [scriptSubject, setScriptSubject] = useState('religious (Islam)');
  const [scriptSubjectContent, setScriptSubjectContent] = useState('');
  const [scriptLength, setScriptLength] = useState('30 seconds');
  const [scriptStyle, setScriptStyle] = useState('Conversational');
  const [scriptModel, setScriptModel] = useState('gpt-4o-mini');
  const [images, setImages] = useState<File[]>([]);
  const [voiceOver, setVoiceOver] = useState<File | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [savedVoiceId, setSavedVoiceId] = useState<string | null>(null);
  const [isVoiceLibraryOpen, setIsVoiceLibraryOpen] = useState(false);
  const [voiceLibraryUrl, setVoiceLibraryUrl] = useState<string | null>(null);
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
  const [voices, setVoices] = useState<VoiceOverOption[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [isSyncingVoices, setIsSyncingVoices] = useState(false);
  const [syncVoicesResult, setSyncVoicesResult] = useState<string | null>(null);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryTargetIndex, setLibraryTargetIndex] = useState<number | null>(
    null,
  );
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
  // Render performance and transition options
  const [useLowerFps, setUseLowerFps] = useState(true);
  const [useLowerResolution, setUseLowerResolution] = useState(true);
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
  } = useVideoJob(API_URL);

  const fetchElevenLabsVoices = async () => {
    setIsLoadingVoices(true);
    setVoicesError(null);
    try {
      const res = await fetch(`${API_URL}/voice-overs`);
      if (!res.ok) {
        throw new Error('Failed to load voices');
      }

      const data = (await res.json()) as VoiceOverOption[];
      setVoices(data);

      if (!selectedVoiceId && data.length > 0) {
        setSelectedVoiceId(data[0].voice_id);
      }
    } catch (error) {
      console.error('Failed to load ElevenLabs voices', error);
      setVoicesError('Failed to load ElevenLabs voices.');
    } finally {
      setIsLoadingVoices(false);
    }
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
    fetchElevenLabsVoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleGenerateVoiceWithElevenLabs = async (
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
      const scriptNorm = normalize(script);

      let scriptForVoice = script;
      if (!scriptNorm.includes(targetNorm)) {
        const base = script.trim();
        const needsPunctuation = base && !/[.!?]$/u.test(base);
        scriptForVoice = `${base}${needsPunctuation ? '.' : ''} ${SUBSCRIBE_SENTENCE}`;
      }

      const response = await fetch(`${API_URL}/ai/generate-voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: scriptForVoice,
          voiceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate voice using ElevenLabs');
      }

      const blob = await response.blob();
      const fileName = 'elevenlabs-voice-over.mp3';
      const file = new File([blob], fileName, {
        type: blob.type || 'audio/mpeg',
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
      console.error('ElevenLabs voice generation failed', error);
      setVoiceError(
        'Failed to generate voice using ElevenLabs. Please try again in a moment.',
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
      const formData = new FormData();
      formData.append('voice', voiceOver);

      const response = await api.post<{ id: string }>('/voices', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const saved = response.data;
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
    const missingMedia = sentences.some(
      (s) => !s.image && !s.imageUrl && !s.video && !s.videoUrl,
    );
    if (missingMedia) {
      showAlert(
        'Please provide an image or a video for each sentence (upload or AI-generated)',
        { type: 'warning' },
      );
      return;
    }

    resetJob();

    setIsGenerating(true);
    try {
      const form = new FormData();
      form.append('voiceOver', voiceOver);

      const sentencePayload = sentences.map((s) => ({
        text: s.text,
      }));
      form.append('sentences', JSON.stringify(sentencePayload));
      form.append('scriptLength', scriptLength);
      if (voiceDuration && voiceDuration > 0) {
        form.append('audioDurationSeconds', String(voiceDuration));
      }

      // Render configuration flags
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

      // Prepare image files for each sentence, including library images with URLs
      const imageFiles = await Promise.all(
        sentences.map(async (s, index) => {
          if (s.image) {
            return s.image;
          }

          if (s.imageUrl?.startsWith('data:')) {
            // AI-generated base64 image
            return dataUrlToFile(
              s.imageUrl,
              `sentence-${index + 1}.png`,
            );
          }

          if (s.imageUrl) {
            // Image selected from library (Cloudinary or remote URL) – download to a File
            try {
              const res = await fetch(s.imageUrl);
              if (!res.ok) return null;
              const blob = await res.blob();
              return new File(
                [blob],
                `sentence-${index + 1}.png`,
                { type: blob.type || 'image/png' },
              );
            } catch {
              return null;
            }
          }

          return null;
        }),
      );

      // Append images in the same order as sentences
      imageFiles.forEach((file) => {
        if (file) {
          form.append('images', file);
        }
      });

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
          style: scriptStyle,
          model: scriptModel,
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
        body: JSON.stringify({ script, model: scriptModel }),
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
        image: null,
        imageUrl: null,
        video: text === SUBSCRIBE_SENTENCE ? null : null,
        videoUrl: text === SUBSCRIBE_SENTENCE ? '/subscribe.mp4' : null,
      }));

      setSentences(items);
    } catch (error) {
      console.error('Split script failed', error);
      setSplitError('Failed to split script. Please try again.');
    } finally {
      setIsSplitting(false);
    }
  };

  const handleResetScriptAndSentences = () => {
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
    voice?: { id: string; voice: string } | null;
    sentences?: {
      id: string;
      text: string;
      index: number;
      image?: { id: string; image: string } | null;
    }[];
  }) => {
    setScript(draft.script);
    // Capture the current config as the "original" baseline for the loaded script
    setOriginalScriptSubject(scriptSubject);
    setOriginalScriptSubjectContent(
      scriptSubject === 'religious (Islam)' ? scriptSubjectContent : ''
    );

    if (draft.sentences && draft.sentences.length > 0) {
      const sorted = [...draft.sentences].sort((a, b) => a.index - b.index);
      const mapped: SentenceItem[] = sorted.map((s) => ({
        id: s.id,
        text: s.text,
        image: null,
        imageUrl: s.image?.image ?? null,
        video: s.text === SUBSCRIBE_SENTENCE ? null : null,
        videoUrl: s.text === SUBSCRIBE_SENTENCE ? '/subscribe.mp4' : null,
        imagePrompt: null,
        isGeneratingImage: false,
        isSavingImage: false,
        savedImageId: s.image?.id ?? null,
        isFromLibrary: !!s.image,
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
          model: scriptModel,
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
            image: isVideo ? null : file,
            imageUrl: isVideo ? item.imageUrl : item.imageUrl,
            video: isVideo ? file : null,
            videoUrl: isVideo ? null : item.videoUrl,
          }
          : item,
      ),
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
            imagePrompt: null,
            isFromLibrary: false,
          }
          : item,
      ),
    );
  };

  const handleMergeSentenceToPrevious = (index: number) => {
    setSentences((prev) => {
      if (index <= 0) return prev;

      const current = prev[index];
      const previous = prev[index - 1];
      if (!current || !previous) return prev;

      // Keep the previous sentence's media; move the text into it.
      // Prevent breaking the special subscribe sentence.
      if (
        current.text.trim() === SUBSCRIBE_SENTENCE ||
        previous.text.trim() === SUBSCRIBE_SENTENCE
      ) {
        return prev;
      }

      const next = [...prev];
      next[index - 1] = {
        ...previous,
        text: mergeText(previous.text, current.text),
      };
      next.splice(index, 1);
      return next;
    });
  };

  const handleMergeSentenceToNext = (index: number) => {
    setSentences((prev) => {
      if (index >= prev.length - 1) return prev;

      const current = prev[index];
      const nextSentence = prev[index + 1];
      if (!current || !nextSentence) return prev;

      // Keep the next sentence's media; move the text into it.
      // Prevent breaking the special subscribe sentence.
      if (
        current.text.trim() === SUBSCRIBE_SENTENCE ||
        nextSentence.text.trim() === SUBSCRIBE_SENTENCE
      ) {
        return prev;
      }

      const next = [...prev];
      next[index + 1] = {
        ...nextSentence,
        text: mergeText(current.text, nextSentence.text),
      };
      next.splice(index, 1);
      return next;
    });
  };

  const handleSentenceTextChange = (index: number, text: string) => {
    setSentences((prev) =>
      prev.map((item, i) => (i === index ? { ...item, text } : item)),
    );
  };

  const handleGenerateSentenceImage = async (index: number) => {
    const target = sentences[index];
    if (!target) return;

    setSentences((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isGeneratingImage: true } : item,
      ),
    );

    try {
      const response = await fetch(
        `${API_URL}/ai/generate-image-from-sentence`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sentence: target.text,
            subject: scriptSubject,
            style: scriptStyle,
            scriptLength,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = (await response.json()) as {
        prompt: string;
        imageBase64: string;
      };

      const imageUrl = `data:image/png;base64,${data.imageBase64}`;

      setSentences((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
              ...item,
              imageUrl,
              imagePrompt: data.prompt,
              isGeneratingImage: false,
              isFromLibrary: false,
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

  const handleSelectFromLibrary = (index: number) => {
    setLibraryTargetIndex(index);
    setIsLibraryModalOpen(true);
  };

  const handleLibraryImageSelect = (imageUrl: string, id: string) => {
    if (libraryTargetIndex === null) return;

    setSentences((prev) =>
      prev.map((item, i) =>
        i === libraryTargetIndex
          ? {
            ...item,
            imageUrl,
            image: null,
            imagePrompt: null,
            isFromLibrary: true,
            savedImageId: id,
          }
          : item,
      ),
    );

    setLibraryTargetIndex(null);
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
      fetchElevenLabsVoices();
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
      const sentencePayload: { text: string; image_id?: string }[] = [];

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
        });
      }

      // Ensure we have a persisted voice and get its ID
      let voiceId = savedVoiceId;

      if (!voiceId) {
        const formData = new FormData();
        formData.append('voice', voiceOver);

        const response = await api.post<{ id: string }>(
          '/voices',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          },
        );

        voiceId = response.data.id;
        setSavedVoiceId(voiceId);
      }

      await api.post('/messages/save-generation', {
        script,
        video_url: videoUrl,
        voice_id: voiceId ?? undefined,
        sentences: sentencePayload.length > 0 ? sentencePayload : undefined,
        chat_id: selectedChatId ?? routeChatId ?? undefined,
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
      const sentencePayload: { text: string; image_id?: string }[] = [];

      // Ensure any uploaded or generated images are saved to the images table
      // so their IDs can be linked to sentences in the draft.
      // Do this sequentially to avoid overwhelming the backend.
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
        });
      }

      // Optionally attach a voice-over to the draft if available
      let voiceId = savedVoiceId;

      if (!voiceId && voiceOver) {
        const formData = new FormData();
        formData.append('voice', voiceOver);

        const response = await api.post<{ id: string }>(
          '/voices',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          },
        );

        voiceId = response.data.id;
        setSavedVoiceId(voiceId);
      }

      const payload: {
        script: string;
        voice_id?: string;
        sentences?: { text: string; image_id?: string }[];
      } = {
        script,
        voice_id: voiceId ?? undefined,
        sentences: sentencePayload.length > 0 ? sentencePayload : undefined,
      };

      await api.post('/scripts', payload);

      showAlert('Draft saved successfully.', { type: 'success' });
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
                              <div className="flex items-center gap-3">
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
                  hasSentences={sentences.length > 0}
                  scriptSubject={scriptSubject}
                  setScriptSubject={setScriptSubject}
                  scriptSubjectContent={scriptSubjectContent}
                  setScriptSubjectContent={setScriptSubjectContent}
                  scriptLength={scriptLength}
                  setScriptLength={setScriptLength}
                  scriptStyle={scriptStyle}
                  setScriptStyle={setScriptStyle}
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
                  onGenerateSentenceImage={handleGenerateSentenceImage}
                  onGenerateAllImages={handleGenerateAllSentenceImages}
                  isGeneratingAllImages={isGeneratingAllImages}
                  onSentenceTextChange={handleSentenceTextChange}
                  onSaveSentenceImage={handleSaveSentenceImage}
                  onSelectFromLibrary={handleSelectFromLibrary}
                  onMergeSentenceToPrevious={handleMergeSentenceToPrevious}
                  onMergeSentenceToNext={handleMergeSentenceToNext}
                />

                <VoiceOverSection
                  script={script}
                  voiceOver={voiceOver}
                  voiceDuration={voiceDuration}
                  voiceError={voiceError}
                  isGeneratingVoice={isGeneratingVoice}
                  isSavingVoice={isSavingVoice}
                  savedVoiceId={savedVoiceId}
                  voices={voices}
                  isLoadingVoices={isLoadingVoices}
                  voicesError={voicesError}
                  selectedVoiceId={selectedVoiceId}
                  onSelectVoice={setSelectedVoiceId}
                  onRefreshVoices={fetchElevenLabsVoices}
                  onVoiceUpload={handleVoiceUpload}
                  onGenerateVoiceWithElevenLabs={handleGenerateVoiceWithElevenLabs}
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
                  <label className={`relative flex items-start gap-3 p-4 rounded-xl border-2 bg-white cursor-pointer transition-all duration-300 group ${enableGlitchTransitions
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
                  </label>
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
          libraryTargetIndex !== null
            ? sentences[libraryTargetIndex]?.imageUrl ?? null
            : null
        }
        onClose={() => {
          setIsLibraryModalOpen(false);
          setLibraryTargetIndex(null);
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
