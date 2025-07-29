import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { type GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { AiRequest, AiResponse, GeminiModel } from './gemini/types';
import { safetySettings } from './gemini/safety-settings';
import { v4 as uuid } from 'uuid';

const functionOptions = {
  secrets: ['GEMINI_API_KEY'],
};

const chatConfig: GenerateContentConfig = {
  safetySettings,
};

const model: GeminiModel = 'gemini-2.5-flash-lite';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const callAi = onCall<AiRequest>(
  functionOptions,
  async (request): Promise<AiResponse> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be authenticated to call this function.',
      );
    }

    const { prompt, systemInstruction } = request.data;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { ...chatConfig, systemInstruction },
    });

    if (!response) {
      throw new HttpsError(
        'internal',
        'The AI model failed to generate a response. Please try again.',
      );
    }

    if (response.promptFeedback?.blockReason) {
      throw new HttpsError(
        'permission-denied',
        response.promptFeedback.blockReasonMessage ??
          'AI refused to generate a response.',
      );
    }

    return {
      id: response.responseId ?? uuid(),
      response: response.text,
      tokenCount: response.usageMetadata?.totalTokenCount ?? 0,
      timestamp: new Date(),
    };
  },
);
