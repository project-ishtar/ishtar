import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { type GenerateContentConfig, GoogleGenAI } from '@google/genai';
import type { AiRequest, AiResponse } from '@ishtar/commons/types';
import { safetySettings } from './gemini/safety-settings';
import { v4 as uuid } from 'uuid';
import admin from 'firebase-admin';
import { GlobalSettings } from './firebase/types';

admin.initializeApp();
const db = admin.firestore();

const GLOBAL_SETTINGS_DOC_PATH = '_settings/global';

const functionOptions = {
  secrets: ['GEMINI_API_KEY'],
};

const chatConfig: GenerateContentConfig = {
  safetySettings,
};

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

    const { prompt, chatSettings } = request.data;
    const {
      systemInstruction,
      model: reqModel,
      temperature,
    } = chatSettings ?? {};

    let llmModel;

    if (!reqModel) {
      const globalSettingsDoc = await db.doc(GLOBAL_SETTINGS_DOC_PATH).get();
      const globalSettings = globalSettingsDoc.data() as GlobalSettings;

      llmModel = globalSettings.defaultGeminiModel;
    } else {
      llmModel = reqModel;
    }

    if (!llmModel) {
      throw new HttpsError('permission-denied', 'No LLM model found.');
    }

    const response = await ai.models.generateContent({
      model: llmModel,
      contents: prompt,
      config: { ...chatConfig, systemInstruction, temperature },
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
    };
  },
);
