import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  conversationsQueryKey,
  conversationsQueryOptions,
  fetchConversation as fetchConversationFromDb,
} from './conversations-functions.ts';
import type { Conversation, DraftConversation } from '@ishtar/commons/types';
import { useAuthenticated } from '../../auth/use-auth.ts';
import { useCallback, useMemo } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { firebaseApp } from '../../firebase.ts';
import { conversationConverter } from '../../converters/conversation-converter.ts';

type UseConversationsResult = {
  conversationsQuery: UseQueryResult<Conversation[], Error>;

  fetchConversation: (conversationId: string) => Promise<Conversation>;

  persistConversation: (
    draftConversation: DraftConversation,
  ) => Promise<Conversation>;

  updateConversation: (
    conversationId: string,
    conversation: Partial<Conversation>,
  ) => Promise<Conversation>;

  deleteConversation: (conversationId: string) => Promise<void>;
};

export const useConversations = (): UseConversationsResult => {
  const queryClient = useQueryClient();
  const currentUserUid = useAuthenticated().currentUserUid;

  const conversationsQuery = useQuery(
    conversationsQueryOptions(currentUserUid),
  );

  const fetchMutation = useMutation({
    mutationFn: fetchConversationFromDb,
    onSuccess: (newConversation) => {
      queryClient.setQueryData<Conversation[]>(
        conversationsQueryKey(currentUserUid),
        (conversations) => {
          if (!conversations) return [newConversation];

          const conversationsArr = [...conversations];

          const index = conversationsArr.findIndex(
            (conversation) => conversation.id === newConversation.id,
          );

          if (index === -1) {
            conversationsArr.push(newConversation);
          } else {
            conversationsArr[index] = newConversation;
          }

          return conversationsArr;
        },
      );
    },
  });

  const fetchConversation = useCallback(
    async (conversationId: string) => {
      return fetchMutation.mutateAsync({ currentUserUid, conversationId });
    },
    [fetchMutation, currentUserUid],
  );

  const persistConversation = useCallback(
    async (draftConversation: DraftConversation) => {
      const newDocRef = await addDoc(
        collection(
          firebaseApp.firestore,
          'users',
          currentUserUid,
          'conversations',
        ).withConverter(conversationConverter),
        draftConversation,
      );

      return await fetchConversation(newDocRef.id);
    },
    [currentUserUid, fetchConversation],
  );

  const updateConversation = useCallback(
    async (conversationId: string, conversation: Partial<Conversation>) => {
      await updateDoc(
        doc(
          firebaseApp.firestore,
          'users',
          currentUserUid,
          'conversations',
          conversationId,
        ).withConverter(conversationConverter),
        conversation,
      );

      return await fetchConversation(conversationId);
    },
    [currentUserUid, fetchConversation],
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      await updateDoc(
        doc(
          firebaseApp.firestore,
          'users',
          currentUserUid,
          'conversations',
          conversationId,
        ).withConverter(conversationConverter),
        { isDeleted: true },
      );

      queryClient.setQueryData<Conversation[]>(
        conversationsQueryKey(currentUserUid),
        (conversations) => {
          if (!conversations) return [];
          return conversations.filter(
            (conversation) => conversation.id !== conversationId,
          );
        },
      );
    },
    [currentUserUid, queryClient],
  );

  return useMemo(
    () => ({
      conversationsQuery,
      fetchConversation,
      persistConversation,
      updateConversation,
      deleteConversation,
    }),
    [
      conversationsQuery,
      fetchConversation,
      persistConversation,
      updateConversation,
      deleteConversation,
    ],
  );
};
