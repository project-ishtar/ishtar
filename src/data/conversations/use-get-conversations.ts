import { useAuth } from '../../auth/use-auth.ts';
import { useQuery } from '@tanstack/react-query';
import { conversationsQueryOptions } from './conversations-functions.ts';
import type { Conversation } from '@ishtar/commons/types';

export const useGetConversations = (): Conversation[] => {
  const currentUserUid = useAuth().currentUserUid;
  const conversations = useQuery(conversationsQueryOptions(currentUserUid));
  return conversations.status === 'success' ? conversations.data : [];
};
