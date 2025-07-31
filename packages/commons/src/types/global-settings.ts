import type { GeminiModel } from './ai-models';

export type GlobalSettings = {
  defaultGeminiModel: GeminiModel | null;
  supportedGeminiModels: GeminiModel[] | null;
  temperature: number | null;
};
