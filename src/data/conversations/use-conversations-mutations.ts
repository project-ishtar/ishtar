import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  conversationsQueryKey,
  fetchConversation,
} from './conversations-functions.ts';
import type { Conversation, DraftConversation } from '@ishtar/commons/types';
import { useAuthenticated } from '../../auth/use-auth.ts';
import { useCallback, useMemo } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { firebaseApp } from '../../firebase.ts';
import { conversationConverter } from '../../converters/conversation-converter.ts';

type UseConversationsMutationsResult = {
  fetchAndSetConversation: (
    conversationId: string,
    options?: { onSettled?: (conversation?: Conversation) => void },
  ) => Promise<void>;

  addConversation: (
    draftConversation: DraftConversation,
    options?: { onSettled?: (conversation?: Conversation) => void },
  ) => Promise<void>;

  updateConversation: (
    conversationId: string,
    conversation: Partial<Conversation>,
    options?: { onSettled?: (conversation?: Conversation) => void },
  ) => Promise<void>;

  deleteConversation: (
    conversationId: string,
    options?: { onSettled?: (conversationId?: string) => void },
  ) => Promise<void>;
};

export const useConversationsMutations =
  (): UseConversationsMutationsResult => {
    const queryClient = useQueryClient();
    const currentUserUid = useAuthenticated().currentUserUid;

    const addMutation = useMutation({
      mutationFn: fetchConversation,
      onSuccess: (newConversation) => {
        queryClient.setQueryData<Conversation[]>(
          conversationsQueryKey(currentUserUid),
          (conversations) =>
            !conversations
              ? [newConversation]
              : [...conversations, newConversation],
        );
      },
    });

    const updateMutation = useMutation({
      mutationFn: fetchConversation,
      onSuccess: (newConversation) => {
        queryClient.setQueryData<Conversation[]>(
          conversationsQueryKey(currentUserUid),
          (conversations) => {
            return !conversations
              ? [newConversation]
              : [...conversations].reduce<Conversation[]>((prev, current) => {
                  prev.push(
                    current.id === newConversation.id
                      ? newConversation
                      : current,
                  );

                  return prev;
                }, []);
          },
        );
      },
    });

    const deleteMutation = useMutation({
      mutationFn: async ({ conversationId }: { conversationId: string }) =>
        conversationId,
      onSuccess: (conversationId) => {
        queryClient.setQueryData<Conversation[]>(
          conversationsQueryKey(currentUserUid),
          (conversations) =>
            !conversations
              ? []
              : conversations.filter(
                  (conversation) => conversation.id !== conversationId,
                ),
        );
      },
    });

    const fetchAndSetConversation = useCallback(
      async (
        conversationId: string,
        options?: { onSettled?: (conversation?: Conversation) => void },
      ) => {
        addMutation.mutate(
          { conversationId, currentUserUid },
          {
            onSettled: (data) => {
              options?.onSettled?.(data);
            },
          },
        );
      },
      [addMutation, currentUserUid],
    );

    const addConversation = useCallback(
      async (
        draftConversation: DraftConversation,
        options?: { onSettled?: (conversation?: Conversation) => void },
      ) => {
        const newDocRef = await addDoc(
          collection(
            firebaseApp.firestore,
            'users',
            currentUserUid,
            'conversations',
          ).withConverter(conversationConverter),
          draftConversation,
        );

        await fetchAndSetConversation(newDocRef.id, options);
      },
      [currentUserUid, fetchAndSetConversation],
    );

    const updateConversation = useCallback(
      async (
        conversationId: string,
        conversation: Partial<Conversation>,
        options?: { onSettled?: (conversation?: Conversation) => void },
      ) => {
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

        updateMutation.mutate(
          { conversationId, currentUserUid },
          {
            onSettled: (data) => options?.onSettled?.(data),
          },
        );
      },
      [currentUserUid, updateMutation],
    );

    const deleteConversation = useCallback(
      async (
        conversationId: string,
        options?: { onSettled?: (conversationId?: string) => void },
      ) => {
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

        deleteMutation.mutate(
          { conversationId },
          {
            onSettled: (data) => options?.onSettled?.(data),
          },
        );
      },
      [currentUserUid, deleteMutation],
    );

    return useMemo(
      () => ({
        fetchAndSetConversation,
        addConversation,
        updateConversation,
        deleteConversation,
      }),
      [
        addConversation,
        deleteConversation,
        fetchAndSetConversation,
        updateConversation,
      ],
    );
  };
