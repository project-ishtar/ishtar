import type { AiResponse } from '../../types/ai-response.ts';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { AiRequest } from '../../types/ai-request.ts';

export const getAiResponse = async (
  prompt: string,
  systemInstruction: string,
): Promise<AiResponse | undefined> => {
  const callGeminiFunction = httpsCallable<AiRequest, AiResponse>(
    getFunctions(),
    'callGemini',
  );

  try {
    const response = await callGeminiFunction({ prompt, systemInstruction });
    return response.data;
  } catch {
    return undefined;
  }
};
