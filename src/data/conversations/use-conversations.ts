import { useCallback, useMemo } from 'react';
import type { Conversation } from '@ishtar/commons/types';
import { useSetAtom } from 'jotai/index';
import { conversationsWriteAtom } from './conversations-atoms.ts';
import { useGetConversations } from './use-get-conversations.ts';
import { useGetCurrentUserId } from '../current-user/use-get-current-user-id.ts';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '../../firebase.ts';
import { conversationConverter } from '../../converters/conversation-converter.ts';

export type UseConversationsReturn = {
  addConversation: (conversation: Conversation) => void;
  deleteConversation: (conversationId: string) => void;
  updateConversation: (
    conversationId: string,
    partialConversation: Partial<Conversation>,
  ) => void;
  fetchAndAppendConversation: (conversationId: string) => Promise<Conversation>;
};

export const useConversations = (): UseConversationsReturn => {
  const conversations = useGetConversations();
  const setConversations = useSetAtom(conversationsWriteAtom);
  const currentUserId = useGetCurrentUserId();

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
          if (conversation.id === conversationId) {
            convos.push({ ...conversation, ...partialConversation });
          } else {
            convos.push(conversation);
          }
          return [...convos];
        }, []),
      );
    },
    [conversations, setConversations],
  );

  const fetchAndAppendConversation = useCallback(
    async (conversationId: string): Promise<Conversation> => {
      const conversationRef = doc(
        firebaseApp.firestore,
        'users',
        currentUserId,
        'conversations',
        conversationId,
      ).withConverter(conversationConverter);

      const conversationSnapshot = await getDoc(conversationRef);
      const conversation = conversationSnapshot.data() as Conversation;

      addConversation(conversation);

      return conversation;
    },
    [addConversation, currentUserId],
  );

  return useMemo(
    () => ({
      addConversation,
      deleteConversation,
      updateConversation,
      fetchAndAppendConversation,
    }),
    [
      addConversation,
      deleteConversation,
      fetchAndAppendConversation,
      updateConversation,
    ],
  );
};
