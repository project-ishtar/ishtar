import type { Conversation } from '@ishtar/commons/types';
import { useMemo } from 'react';
import { useGetConversations } from './use-get-conversations.ts';
import { Route as AppRoute } from '../../routes/_authenticated/app/{-$conversationId}.tsx';

export const useCurrentConversation = (): Conversation | undefined => {
  const conversations = useGetConversations();
  const { conversationId } = AppRoute.useParams();

  return useMemo(
    () => conversations.find((convo) => convo.id === conversationId),
    [conversations, conversationId],
  );
};
