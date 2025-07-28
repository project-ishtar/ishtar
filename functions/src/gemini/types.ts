export type AiRequest = {
  prompt: string;
  systemInstruction?: string;
};

export type AiResponse = { id: string; response?: string; tokenCount?: number };

export type GeminiModel =
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite';
