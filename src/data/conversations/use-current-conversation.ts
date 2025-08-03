import type { Conversation } from '@ishtar/commons/types';
import { useParams } from 'react-router';
import type { RouteParams } from '../../routes/route-params.ts';
import { useMemo } from 'react';
import { useGetConversations } from './use-get-conversations.ts';

export const useCurrentConversation = (): Conversation | undefined => {
  const conversations = useGetConversations();
  const params = useParams<RouteParams>();

  return useMemo(
    () => conversations.find((convo) => convo.id === params.conversationId),
    [conversations, params.conversationId],
  );
};
