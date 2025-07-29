import { getFunctions, httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import type {
  AiRequest,
  AiResponse,
  ChatSettings,
} from '@ishtar/commons/types';

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
      chatSettings,
    });
    return response.data;
  } catch (err: unknown) {
    if (err instanceof FirebaseError) {
      console.log(err);
      return undefined;
    }
  }
};
