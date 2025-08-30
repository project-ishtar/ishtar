import { useCurrentUser } from '../current-user/use-current-user.ts';
import { useCallback } from 'react';
import type { DraftConversation } from '@ishtar/commons/types';
import { getGlobalSettings } from '../global-settings.ts';

type UseNewConversationResult = {
  getNewDefaultConversation: () => DraftConversation;
};

export const useNewConversation = (): UseNewConversationResult => {
  const currentUser = useCurrentUser().getCurrentUserOrThrow();
  const globalSettings = getGlobalSettings(currentUser.role);

  const getNewDefaultConversation = useCallback(() => {
    const now = Date.now();
    const date = new Date(now);

    const newConversation: DraftConversation = {
      createdAt: date,
      lastUpdated: date,
      isDeleted: false,
      title: `New Chat - ${now}`,
      summarizedMessageId: null,
      inputTokenCount: 0,
      outputTokenCount: 0,
      chatSettings: {
        model: globalSettings.defaultModel,
        temperature: globalSettings.temperature,
        systemInstruction: null,
        enableMultiTurnConversation: globalSettings.enableMultiTurnConversation,
        enableThinking: globalSettings.enableThinking,
        thinkingCapacity: null,
      },
    };

    return newConversation;
  }, [
    globalSettings.defaultModel,
    globalSettings.enableMultiTurnConversation,
    globalSettings.enableThinking,
    globalSettings.temperature,
  ]);

  return { getNewDefaultConversation };
};
