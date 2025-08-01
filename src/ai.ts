import { getFunctions, httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import type { AiRequest, AiResponse } from '@ishtar/commons/types';

export const getAiResponse = async ({
  prompt,
  conversationId,
}: {
  prompt: string;
  conversationId?: string;
}): Promise<AiResponse | undefined> => {
  const callAi = httpsCallable<AiRequest, AiResponse>(getFunctions(), 'callAi');

  try {
    const response = await callAi({
      prompt,
      conversationId,
    });

    return response.data;
  } catch (err: unknown) {
    if (err instanceof FirebaseError) {
      console.log(err);
      return undefined;
    }
  }
};
