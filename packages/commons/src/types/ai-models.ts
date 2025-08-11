export type GeminiModel =
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite';

export type OpenAIModel = 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano';

export type Model = GeminiModel | OpenAIModel;

export type OpenAIReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';
