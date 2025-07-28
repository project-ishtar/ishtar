import type { AiResponse } from '../../types/ai-response.ts';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { AiRequest } from '../../types/ai-request.ts';
import { nonMonogamyWifeWithHusband3 as systemInstruction } from './system-instructions.ts';

export const getAiResponse = async (
  prompt: string,
): Promise<AiResponse | undefined> => {
  const functions = getFunctions();
  const callGeminiFunction = httpsCallable<AiRequest, AiResponse>(
    functions,
    'callGemini',
  );

  const response = await callGeminiFunction({ prompt, systemInstruction });
  return response.data;
};
