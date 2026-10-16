import { z } from 'zod';
export const voiceProviderSchema = z.enum([
  'edge',
  'vbee',
  'minimax',
  'elevenlabs',
  'fishaudio',
  'kokoro',
]);
export const voiceQuerySchema = z.object({
  provider: voiceProviderSchema.default('edge'),
  page: z.coerce.number().int().min(1).max(100).default(1),
  search: z.string().max(100).default(''),
});
export const voiceGenerateSchema = z.object({
  provider: voiceProviderSchema,
  voiceId: z.string().min(1).max(200),
  text: z.string().trim().min(1).max(4000),
  speed: z.number().finite().min(0.5).max(1.5),
});
export type VoiceChoice = {
  id: string;
  name: string;
  gender: string;
  locale: string;
  preview: boolean;
};
export type VoiceResult = {
  voiceId: string;
  voiceName: string;
  durationSeconds: number;
  dataUrl: string;
  words: { text: string; startSeconds: number; endSeconds: number }[];
  creditCost: number;
};
