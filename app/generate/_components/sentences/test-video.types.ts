import type { SentenceItem } from '../../_types/sentences';

export type TestVideoVoiceMode = 'current' | 'none' | 'upload';

export type GenerateTestVideoRequest = {
	selectedIndices: number[];
	selectedSentences: SentenceItem[];
	voiceMode: TestVideoVoiceMode;
	uploadedVoiceOver: File | null;
};