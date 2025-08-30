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
import type { AiResponse, Content, Message } from '@ishtar/commons/types';
import { isAllowedType, isDocument, isImage } from '../../utilities/file.ts';
import { useCurrentUser } from '../current-user/use-current-user.ts';
import { useNewConversation } from '../conversations/use-new-conversation.ts';
import { AiFailureError } from '../../errors/ai-failure-error.ts';

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
  const { conversationId: currentConversationId } = Route.useParams();
  const navigate = useNavigate();

  const { currentUserUid } = useCurrentUser();

  const { persistConversation } = useConversations();
  const { getNewDefaultConversation } = useNewConversation();

  const queryClient = useQueryClient();

  const messagesQuery = [currentUserUid, 'messages', currentConversationId];

  const {
    data,
    status,
    hasPreviousPage,
    isFetchingPreviousPage,
    fetchPreviousPage: doFetchPreviousPage,
  } = useInfiniteQuery({
    queryKey: messagesQuery,
    queryFn: ({ pageParam }) =>
      fetchMessages({
        currentUserUid,
        conversationId: currentConversationId,
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
    async ({
      prompt,
      files,
    }: {
      prompt: string;
      files: File[];
    }): Promise<{
      conversationId: string;
      promptMessage: Message;
      response: AiResponse;
    }> => {
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

      const conversationId =
        currentConversationId ??
        (await persistConversation(getNewDefaultConversation()));

      let promptMessage: Message;

      try {
        promptMessage = await persistMessage({
          currentUserUid,
          conversationId: conversationId,
          draftMessage: {
            role: 'user',
            contents: userContent,
            isSummary: false,
            timestamp: new Date(),
            tokenCount: null,
          },
        });
      } catch (error) {
        throw new AiFailureError('Failed while persisting prompt message', {
          conversationId,
          originalError: error,
        });
      }

      let response: AiResponse;

      try {
        response = await callAi({
          promptMessageId: promptMessage.id,
          conversationId,
        });
      } catch (error) {
        throw new AiFailureError('Error in the Ai function', {
          conversationId,
          promptMessage,
          originalError: error,
        });
      }

      return { conversationId, promptMessage, response };
    },
    [
      currentConversationId,
      currentUserUid,
      getNewDefaultConversation,
      persistConversation,
    ],
  );

  const messageUpdateMutation = useMutation({
    mutationFn: processPromptSubmit,
    onMutate: (prompt) => {
      if (!currentConversationId) return;

      queryClient.setQueryData<InfiniteData<MessagePage>>(
        messagesQuery,
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
                contents: [{ type: 'text', text: prompt.prompt }],
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

    onSuccess: async (data, variables) => {
      if (currentConversationId) {
        onTokenCountUpdate(
          data.response?.inputTokenCount ?? 0,
          data.response?.outputTokenCount ?? 0,
        );

        queryClient.setQueryData<InfiniteData<MessagePage>>(
          messagesQuery,
          (oldData) => {
            if (!oldData || oldData.pages.length === 0)
              throw new Error('No pages found');

            const newPages = [...oldData.pages];
            const lastPageIndex = newPages.length - 1;
            const lastPage = newPages[lastPageIndex];

            if (data?.response.response) {
              newPages[lastPageIndex] = {
                ...lastPage,
                messages: [
                  ...lastPage.messages.filter(
                    (message) => message.id !== TEMP_PROMPT_ID,
                  ),
                  data.promptMessage,
                  {
                    id: data.response.responseId,
                    contents: [{ type: 'text', text: data.response.response }],
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
                  data.promptMessage,
                ],
              };

              inputFieldRef.current?.setPrompt(variables.prompt);
            }

            return { ...oldData, pages: newPages };
          },
        );
      } else if (data.conversationId) {
        await navigate({
          to: '/app/{-$conversationId}',
          params: { conversationId: data.conversationId },
        });
      }
    },

    onError: async (error, variables) => {
      if (error instanceof AiFailureError) {
        inputFieldRef.current?.setPrompt(variables.prompt);

        if (currentConversationId) {
          queryClient.setQueryData<InfiniteData<MessagePage>>(
            messagesQuery,
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
        } else if (error.conversationId) {
          await navigate({
            to: '/app/{-$conversationId}',
            params: { conversationId: error.conversationId },
          });
        }
      }
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
