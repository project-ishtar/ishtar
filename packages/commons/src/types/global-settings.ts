import type { Model, OpenAIReasoningEffort } from './ai-models';

export type GlobalSettings = {
  defaultModel: Model;
  supportedModels: Model[];
  temperature: number;
  enableThinking: boolean;
  enableMultiTurnConversation: boolean;
  geminiMaxThinkingTokenCount: number;
  openAIReasoningEffort: OpenAIReasoningEffort;
};
