import type { GlobalSettings } from '@ishtar/commons/types';

export const globalSettings: GlobalSettings = {
  defaultGeminiModel: 'gemini-2.0-flash-lite',
  supportedGeminiModels: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
  ],
  temperature: 1,
};
