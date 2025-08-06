import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  conversationsQueryKey,
  fetchConversation,
} from './conversations-functions.ts';
import type { Conversation } from '@ishtar/commons/types';
import { useAuthenticated } from '../../auth/use-auth.ts';
import { useNavigate } from '@tanstack/react-router';

type UseConversationsMutationProps = {
  onSettled?: () => void;
};

export const useConversationsMutation = (
  props?: UseConversationsMutationProps,
) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const currentUserUid = useAuthenticated().currentUserUid;

  return useMutation({
    mutationFn: fetchConversation,
    onSuccess: (newConversation) => {
      queryClient.setQueryData<Conversation[]>(
        conversationsQueryKey(currentUserUid),
        (conversations) => {
          if (!conversations) return [newConversation];
          return [...conversations, newConversation];
        },
      );
    },
    onSettled: (newConversation) => {
      if (newConversation?.id) {
        navigate({
          to: '/app/{-$conversationId}',
          params: { conversationId: newConversation.id },
        });
        props?.onSettled?.();
      }
    },
  });
};
