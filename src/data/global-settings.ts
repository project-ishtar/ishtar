import type { GlobalSettings, UserRole } from '@ishtar/commons/types';

export const getGlobalSettings = (role: UserRole): GlobalSettings => {
  return role === 'admin'
    ? {
        defaultGeminiModel: 'gemini-2.5-flash',
        supportedGeminiModels: [
          'gemini-2.5-pro',
          'gemini-2.5-flash',
          'gemini-2.5-flash-lite',
          'gemini-2.0-flash',
          'gemini-2.0-flash-lite',
        ],
        temperature: 1,
        enableMultiTurnConversation: false,
        enableThinking: false,
      }
    : {
        defaultGeminiModel: 'gemini-2.0-flash-lite',
        supportedGeminiModels: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
        temperature: 1,
        enableMultiTurnConversation: false,
        enableThinking: false,
      };
};
