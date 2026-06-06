export type TimelineDraftLaneId =
  | 'visual'
  | 'text'
  | 'overlay'
  | 'voice'
  | 'soundtrack'
  | 'sfx'
  | 'transition';

export type TimelineDraftClipKind = TimelineDraftLaneId;

export type TimelineDraftLinkedAnchor = 'start' | 'end';

export type TimelineDraftSceneTab = 'image' | 'video' | 'text' | 'overlay';

export type TimelineDraftClip = {
  id: string;
  sentenceId: string;
  sentenceIndex: number;
  kind: TimelineDraftClipKind;
  laneId: TimelineDraftLaneId;
  sceneTab: TimelineDraftSceneTab;
  label: string;
  subtitle: string;
  textPreview: string;
  startSeconds: number;
  durationSeconds: number;
  endSeconds: number;
  minDurationSeconds: number;
  linkedToSentence: boolean;
  parentClipId: string | null;
  linkedAnchor: TimelineDraftLinkedAnchor;
  syncDurationWithParent: boolean;
  allowsMove: boolean;
  allowsResizeStart: boolean;
  allowsResizeEnd: boolean;
  isAudio: boolean;
  toneClassName: string;
  editorLabel?: string | null;
};

export type TimelineDraftClipOverride = {
  startSeconds?: number;
  durationSeconds?: number;
  linkedToSentence?: boolean;
};