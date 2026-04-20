export type ScriptSceneTab = 'image' | 'video' | 'text' | 'overlay';

export type ScriptListItem = {
  id: string;
  title: string | null;
  language?: string;
  script: string;
  created_at: string;
  updated_at?: string;
  sentences_count: number;
  images_count: number;
  voice_over_sentences_count: number;
  voice_over_chunks_count: number;
  video_url?: string | null;
  youtube_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  voice?: {
    id: string;
    voice: string;
  } | null;
};

export type ScriptVoiceOverChunk = {
  index: number;
  text: string;
  url: string;
  durationSeconds?: number | null;
};

export type ScriptSentenceDetail = {
  id: string;
  index: number;
  text: string;
  scene_tab?: ScriptSceneTab | null;
  sceneTab?: ScriptSceneTab | null;
  voice_over_url?: string | null;
  voiceOverUrl?: string | null;
  voice_over_duration_seconds?: number | null;
  voiceOverDurationSeconds?: number | null;
  visual_effect?:
    | 'colorGrading'
    | 'animatedLighting'
    | 'glassSubtle'
    | 'glassReflections'
    | 'glassStrong'
    | null;
  visualEffect?:
    | 'colorGrading'
    | 'animatedLighting'
    | 'glassSubtle'
    | 'glassReflections'
    | 'glassStrong'
    | null;
  image_motion_effect?:
    | 'default'
    | 'slowZoomIn'
    | 'slowZoomOut'
    | 'diagonalDrift'
    | 'cinematicPan'
    | 'focusShift'
    | 'parallaxMotion'
    | 'shakeMicroMotion'
    | 'splitMotion'
    | 'rotationDrift'
    | null;
  imageMotionEffect?:
    | 'default'
    | 'slowZoomIn'
    | 'slowZoomOut'
    | 'diagonalDrift'
    | 'cinematicPan'
    | 'focusShift'
    | 'parallaxMotion'
    | 'shakeMicroMotion'
    | 'splitMotion'
    | 'rotationDrift'
    | null;
  image_motion_speed?: number | null;
  imageMotionSpeed?: number | null;
  image_filter_settings?: Record<string, unknown> | null;
  imageFilterSettings?: Record<string, unknown> | null;
  image_motion_settings?: Record<string, unknown> | null;
  imageMotionSettings?: Record<string, unknown> | null;
  image?: { id: string; image: string; prompt?: string | null } | null;
  secondaryImage?: { id: string; image: string; prompt?: string | null } | null;
  startFrameImage?: { id: string; image: string; prompt?: string | null } | null;
  endFrameImage?: { id: string; image: string; prompt?: string | null } | null;
  textBackgroundImage?: { id: string; image: string; prompt?: string | null } | null;
  video?: { id: string; video: string } | null;
  textBackgroundVideo?: { id: string; video: string } | null;
  overlay?: {
    id: string;
    title: string;
    url: string;
    mime_type?: string | null;
    mimeType?: string | null;
    settings?: Record<string, unknown> | null;
  } | null;
  text_animation_text?: string | null;
  textAnimationText?: string | null;
  text_animation_effect?: string | null;
  textAnimationEffect?: string | null;
  text_animation_settings?: Record<string, unknown> | null;
  textAnimationSettings?: Record<string, unknown> | null;
  overlay_settings?: Record<string, unknown> | null;
  overlaySettings?: Record<string, unknown> | null;
};

export type ScriptDetail = {
  id: string;
  title: string | null;
  language?: string;
  script: string;
  created_at: string;
  updated_at?: string;
  subject?: string | null;
  length?: string | null;
  style?: string | null;
  technique?: string | null;
  video_url?: string | null;
  youtube_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  voice_over_chunks?: ScriptVoiceOverChunk[] | null;
  voice?: {
    id: string;
    voice: string;
  } | null;
  sentences?: ScriptSentenceDetail[];
};

export type ScriptsListResponse = {
  items: ScriptListItem[];
  total: number;
  page: number;
  limit: number;
};