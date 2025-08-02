import { useAtom } from 'jotai';
import { conversationsAtom } from './atoms.ts';
import { useCallback, useMemo } from 'react';
import type { Conversation } from '@ishtar/commons/types';

export type UseConversationsReturn = {
  addConversation: (conversation: Conversation) => void;
  deleteConversation: (conversationId: string) => void;
  updateConversation: (
    conversationId: string,
    partialConversation: Partial<Conversation>,
  ) => void;
};

export const useConversations = (): UseConversationsReturn => {
  const [conversations, setConversations] = useAtom(conversationsAtom);

  const addConversation = useCallback(
    (conversation: Conversation) => {
      setConversations([...conversations, conversation]);
    },
    [conversations, setConversations],
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      setConversations(
        conversations.filter(
          (conversation) => conversation.id !== conversationId,
        ),
      );
    },
    [conversations, setConversations],
  );

  const updateConversation = useCallback(
    (conversationId: string, partialConversation: Partial<Conversation>) => {
      setConversations(
        conversations.reduce<Conversation[]>((convos, conversation) => {
          convos.push(
            conversation.id === conversationId
              ? ({
                  ...conversation,
                  partialConversation,
                } as Conversation)
              : conversation,
          );

          return [...convos];
        }, []),
      );
    },
    [conversations, setConversations],
  );

  return useMemo(
    () => ({ addConversation, deleteConversation, updateConversation }),
    [addConversation, deleteConversation, updateConversation],
  );
};
