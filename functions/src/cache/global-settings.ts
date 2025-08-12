import { GlobalSettings, type UserRole } from '@ishtar/commons/types';

export const getGlobalSettings = (role: UserRole): GlobalSettings => {
  return role === 'admin'
    ? {
        defaultModel: 'gemini-2.5-flash',
        supportedModels: [
          'gemini-2.5-pro',
          'gpt-5',
          'gemini-2.5-flash',
          'gpt-5-mini',
          'gemini-2.5-flash-lite',
          'gpt-5-nano',
          'gemini-2.0-flash',
          'gemini-2.0-flash-lite',
        ],
        temperature: 1,
        enableMultiTurnConversation: false,
        enableThinking: false,
      }
    : {
        defaultModel: 'gemini-2.0-flash-lite',
        supportedModels: [
          'gpt-5-nano',
          'gemini-2.0-flash',
          'gemini-2.0-flash-lite',
        ],
        temperature: 1,
        enableMultiTurnConversation: false,
        enableThinking: false,
      };
};
