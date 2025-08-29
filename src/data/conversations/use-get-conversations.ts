import type { Conversation } from '@ishtar/commons/types';
import { useConversations } from './use-conversations.ts';

export const useGetConversations = (): Conversation[] => {
  const { conversationsQuery } = useConversations();
  return conversationsQuery.status === 'success' ? conversationsQuery.data : [];
};
