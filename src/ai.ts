import { getFunctions, httpsCallable } from 'firebase/functions';
import type { AiRequest, AiResponse } from '@ishtar/commons/types';

export const getAiResponse = async ({
  promptMessageId,
  conversationId,
}: {
  promptMessageId: string;
  conversationId: string;
}): Promise<AiResponse> => {
  const callAi = httpsCallable<AiRequest, AiResponse>(getFunctions(), 'callAi');

  const response = await callAi({
    promptMessageId,
    conversationId,
  });

  return response.data;
};
