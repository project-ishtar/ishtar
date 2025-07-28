import { onCall } from 'firebase-functions/v2/https';
import { Chat, type GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { AiRequest, AiResponse, GeminiModel } from './gemini/types';
import { safetySettings } from './gemini/safety-settings';
import { v4 as uuid } from 'uuid';

const functionOptions = {
  secrets: ['GEMINI_API_KEY'],
};

const chatConfig: GenerateContentConfig = {
  temperature: 1.5,
  safetySettings,
};

const model: GeminiModel = 'gemini-2.5-flash';

let ai: GoogleGenAI;
let chat: Chat;

export const callGemini = onCall<AiRequest>(
  functionOptions,
  async (request): Promise<AiResponse | undefined> => {
    if (!ai) {
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      chat = ai.chats.create({ model, config: chatConfig });
    }

    const { prompt, systemInstruction } = request.data;

    const response = await chat.sendMessage({
      message: prompt,
      config: { ...chatConfig, systemInstruction },
    });

    return {
      id: response.responseId ?? uuid(),
      response: response.text,
      tokenCount: (
        await ai.models.countTokens({
          model,
          contents: chat.getHistory(),
        })
      ).totalTokens,
    };
  },
);
