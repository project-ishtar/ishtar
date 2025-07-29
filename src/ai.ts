import type { AiResponse } from './types/ai-response.ts';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { AiRequest } from './types/ai-request.ts';
import { FirebaseError } from 'firebase/app';
import type { ChatSettings } from './types/chat-settings.ts';

export const getAiResponse = async ({
  prompt,
  chatSettings,
}: {
  prompt: string;
  chatSettings?: ChatSettings;
}): Promise<AiResponse | undefined> => {
  const callAi = httpsCallable<AiRequest, AiResponse>(getFunctions(), 'callAi');

  try {
    const response = await callAi({
      prompt,
      systemInstruction: chatSettings?.systemInstruction,
    });
    return response.data;
  } catch (err: unknown) {
    if (err instanceof FirebaseError) {
      console.log(err);
      return undefined;
    }
  }
};
