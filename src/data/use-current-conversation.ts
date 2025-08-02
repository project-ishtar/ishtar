import type { Conversation } from '@ishtar/commons/types';
import { useAtomValue } from 'jotai';
import { conversationsAtom } from './atoms.ts';
import { useParams } from 'react-router';
import type { RouteParams } from '../routes/route-params.ts';
import { useMemo } from 'react';

export const useCurrentConversation = (): Conversation | undefined => {
  const conversations = useAtomValue(conversationsAtom);
  const params = useParams<RouteParams>();

  return useMemo(
    () => conversations.find((convo) => convo.id === params.conversationId),
    [conversations, params.conversationId],
  );
};
