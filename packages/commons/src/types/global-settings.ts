import type { GeminiModel } from './ai-models';

export type GlobalSettings = {
  defaultGeminiModel: GeminiModel;
  supportedGeminiModels: GeminiModel[];
  temperature: number;
};
