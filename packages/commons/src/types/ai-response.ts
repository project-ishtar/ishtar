export type AiResponse = {
  promptId: string;
  responseId: string;
  response?: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
  conversationId: string;
};
