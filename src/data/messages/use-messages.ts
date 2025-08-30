import { Route } from '../../routes/_authenticated/app/{-$conversationId}.tsx';
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  type Cursor,
  fetchMessages,
  type MessagePage,
  persistMessage,
} from './messages-functions.ts';
import { type RefObject, useCallback, useMemo } from 'react';
import { getAiResponse as callAi } from '../../ai.ts';
import type { InputFieldRef } from '../../components/input-field.tsx';
import { useNavigate } from '@tanstack/react-router';
import { useConversations } from '../conversations/use-conversations.ts';
import type { Content, Message } from '@ishtar/commons/types';
import { isAllowedType, isDocument, isImage } from '../../utilities/file.ts';
import { useCurrentUser } from '../current-user/use-current-user.ts';

const TEMP_PROMPT_ID = 'prompt_id';

type UseMessagesProps = {
  inputFieldRef: RefObject<InputFieldRef | null>;
  onTokenCountUpdate: (
    inputTokenCount: number,
    outputTokenCount: number,
  ) => void;
};

type UseMessagesResult = {
  messages: Message[];
  status: 'error' | 'success' | 'pending';
  mutationStatus: 'idle' | 'pending' | 'error' | 'success';
  hasPreviousPage: boolean;
  isFetchingPreviousPage: boolean;
  fetchPreviousPage: () => Promise<void>;
  mutate: (prompt: string, files: File[]) => void;
};

export const useMessages = ({
  inputFieldRef,
  onTokenCountUpdate,
}: UseMessagesProps): UseMessagesResult => {
  const { currentUserUid } = useCurrentUser();
  const { conversationId } = Route.useParams();
  const navigate = useNavigate();
  const { fetchConversation } = useConversations();

  const queryClient = useQueryClient();

  const chatContentsQuery = [currentUserUid, 'messages', conversationId];

  const {
    data,
    status,
    hasPreviousPage,
    isFetchingPreviousPage,
    fetchPreviousPage: doFetchPreviousPage,
  } = useInfiniteQuery({
    queryKey: chatContentsQuery,
    queryFn: ({ pageParam }) =>
      fetchMessages({
        currentUserUid,
        conversationId,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getPreviousPageParam: (firstPage) => firstPage.nextCursor,
    getNextPageParam: (): Cursor => undefined,
    select: (data) => data.pages.flatMap((page) => page.messages),
    staleTime: Infinity,
  });

  const messages = useMemo(() => data ?? [], [data]);

  const processPromptSubmit = useCallback(
    async ({ prompt, files }: { prompt: string; files: File[] }) => {
      const userContent: Content[] = [];

      if (files.length > 0) {
        files
          .filter((file) => isAllowedType(file.type))
          .forEach((file) => {
            if (isImage(file.type)) {
              userContent.push({
                type: 'image',
                imageUrl: { url: URL.createObjectURL(file) },
              });
            } else if (isDocument(file.type)) {
              userContent.push({
                type: 'text',
                text: 'Extracted PDF Text',
                sourceFileUrl: URL.createObjectURL(file),
              });
            }
          });
      }

      userContent.push({ type: 'text', text: prompt });

      persistMessage({
        currentUserUid,
        conversationId,
        draftMessage: {
          role: 'user',
          contents: userContent,
          isSummary: false,
          timestamp: new Date(),
          tokenCount: null,
        },
      });

      return await callAi({ prompt, conversationId });
    },
    [conversationId],
  );

  const messageUpdateMutation = useMutation({
    mutationFn: processPromptSubmit,
    onMutate: (prompt) => {
      if (!conversationId) return;

      queryClient.setQueryData<InfiniteData<MessagePage>>(
        chatContentsQuery,
        (oldData) => {
          inputFieldRef.current?.setPrompt('');

          if (!oldData || oldData.pages.length === 0) {
            return { pages: [], pageParams: [undefined] };
          }

          const newPages = [...oldData.pages];
          const lastPageIndex = newPages.length - 1;
          const lastPage = newPages[lastPageIndex];

          newPages[lastPageIndex] = {
            ...lastPage,
            messages: [
              ...lastPage.messages,
              {
                id: TEMP_PROMPT_ID,
                contents: [{ type: 'text', text: prompt }],
                role: 'user',
                tokenCount: null,
                isSummary: false,
                timestamp: new Date(),
              },
            ],
          };

          return { ...oldData, pages: newPages };
        },
      );
    },

    onSuccess: async (response, prompt) => {
      if (conversationId) {
        onTokenCountUpdate(
          response?.inputTokenCount ?? 0,
          response?.outputTokenCount ?? 0,
        );

        queryClient.setQueryData<InfiniteData<MessagePage>>(
          chatContentsQuery,
          (oldData) => {
            if (!oldData || oldData.pages.length === 0)
              throw new Error('No pages found');

            const newPages = [...oldData.pages];
            const lastPageIndex = newPages.length - 1;
            const lastPage = newPages[lastPageIndex];

            if (response?.response) {
              newPages[lastPageIndex] = {
                ...lastPage,
                messages: [
                  ...lastPage.messages.filter(
                    (message) => message.id !== TEMP_PROMPT_ID,
                  ),
                  {
                    id: response.promptId,
                    contents: [{ type: 'text', text: prompt }],
                    role: 'user',
                    tokenCount: null,
                    isSummary: false,
                    timestamp: new Date(),
                  },
                  {
                    id: response.responseId,
                    contents: [{ type: 'text', text: response.response }],
                    role: 'model',
                    tokenCount: null,
                    isSummary: false,
                    timestamp: new Date(),
                  },
                ],
              };
            } else {
              newPages[lastPageIndex] = {
                ...lastPage,
                messages: [
                  ...lastPage.messages.filter(
                    (message) => message.id !== TEMP_PROMPT_ID,
                  ),
                ],
              };

              inputFieldRef.current?.setPrompt(prompt);
            }

            return { ...oldData, pages: newPages };
          },
        );
      } else if (response.conversationId) {
        const conversation = await fetchConversation(response.conversationId);

        if (conversation?.id) {
          await navigate({
            to: '/app/{-$conversationId}',
            params: { conversationId: conversation.id },
          });
        }
      }
    },

    onError: (_, prompt) => {
      inputFieldRef.current?.setPrompt(prompt);

      queryClient.setQueryData<InfiniteData<MessagePage>>(
        chatContentsQuery,
        (oldData) => {
          if (!oldData || oldData.pages.length === 0) {
            return { pages: [], pageParams: [undefined] };
          }

          const newPages = [...oldData.pages];
          const lastPageIndex = newPages.length - 1;
          const lastPage = newPages[lastPageIndex];

          newPages[lastPageIndex] = {
            ...lastPage,
            messages: [
              ...lastPage.messages.filter(
                (message) => message.id !== TEMP_PROMPT_ID,
              ),
            ],
          };

          return { ...oldData, pages: newPages };
        },
      );
    },
  });

  const fetchPreviousPage = useCallback(async () => {
    await doFetchPreviousPage();
  }, [doFetchPreviousPage]);

  const mutate = useCallback(
    (prompt: string, files: File[]) =>
      messageUpdateMutation.mutate({ prompt, files }),
    [messageUpdateMutation],
  );

  return useMemo(
    () => ({
      messages,
      status,
      mutationStatus: messageUpdateMutation.status,
      hasPreviousPage,
      isFetchingPreviousPage,
      fetchPreviousPage,
      mutate,
    }),
    [
      messages,
      fetchPreviousPage,
      hasPreviousPage,
      isFetchingPreviousPage,
      messageUpdateMutation.status,
      mutate,
      status,
    ],
  );
};
