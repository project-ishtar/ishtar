import React, {
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getAiResponse as callAi } from '../ai.ts';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { v4 as uuid } from 'uuid';
import { useCurrentConversation } from '../data/conversations/use-current-conversation.ts';
import { useAuthenticated } from '../auth/use-auth.ts';
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
  updateMessage,
} from '../data/messages/chat-contents-functions.ts';
import { useConversations } from '../data/conversations/use-conversations.ts';
import { useNavigate } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { NoMessageScreen } from './no-message-screen.tsx';
import { useRenderMessage } from './hooks/use-render-message.tsx';
import { InputField, type InputFieldRef } from './input-field.tsx';
import { useMediaQuery, useTheme } from '@mui/material';

type AiContentProps = {
  conversationId?: string;
};

const TEMP_PROMPT_ID = 'prompt_id';

export const AiContent = ({ conversationId }: AiContentProps): JSX.Element => {
  const [isPromptSubmitted, setIsPromptSubmitted] = useState(false);

  const inputRef = useRef<InputFieldRef>(null);
  const elementHeightCacheRef = useRef(new Map<string, number>());
  const parentRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  const [initScrolled, setInitScrolled] = useState(false);

  const theme = useTheme();
  const isSmallBreakpoint = useMediaQuery(theme.breakpoints.down('md'));

  const currentUserUid = useAuthenticated().currentUserUid;
  const queryClient = useQueryClient();

  const chatContentsQuery = useMemo(
    () => [currentUserUid, 'messages', conversationId],
    [conversationId, currentUserUid],
  );

  const {
    data,
    status,
    hasPreviousPage,
    isFetchingPreviousPage,
    fetchPreviousPage,
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

  const chatContents = useMemo(() => data ?? [], [data]);

  const getResponseFromAi = useCallback(
    async (prompt: string) => await callAi({ prompt, conversationId }),
    [conversationId],
  );

  const messageUpdateMutation2 = useMutation({
    mutationFn: getResponseFromAi,
    onMutate: (prompt) => {
      if (!conversationId) return;

      queryClient.setQueryData<InfiniteData<MessagePage>>(
        chatContentsQuery,
        (oldData) => {
          inputRef.current?.clearPrompt();

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
              { id: TEMP_PROMPT_ID, text: prompt, role: 'user' },
            ],
          };

          return { ...oldData, pages: newPages };
        },
      );
    },

    onSuccess: (response) => {},
  });

  const messageUpdateMutation = useMutation({
    mutationFn: updateMessage,
    onSuccess: (newMessage) => {
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        chatContentsQuery,
        (oldData) => {
          if (!oldData || oldData.pages.length === 0) return;

          const newPages = [...oldData.pages];
          const lastPageIndex = newPages.length - 1;
          const lastPage = newPages[lastPageIndex];

          newPages[lastPageIndex] = {
            ...lastPage,
            messages: [...lastPage.messages, newMessage],
          };

          return {
            ...oldData,
            pages: newPages,
          };
        },
      );
    },
  });

  const { fetchConversation } = useConversations();
  const conversation = useCurrentConversation();
  const navigate = useNavigate();

  const [tokenCount, setTokenCount] = useState({
    inputTokenCount: conversation?.inputTokenCount ?? 0,
    outputTokenCount: conversation?.outputTokenCount ?? 0,
  });

  const rowVirtualizer = useVirtualizer({
    count: chatContents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index) => {
        const message = chatContents[index];

        if (!message) return 150;

        return elementHeightCacheRef.current.get(message.id) ?? 150;
      },
      [chatContents],
    ),
    overscan: 2,
  });

  useEffect(() => {
    if (status === 'success' && !initScrolled) {
      setInitScrolled(true);

      if (chatContents.length > 0) {
        rowVirtualizer.scrollToIndex(chatContents.length - 1);
      }
    }
  }, [chatContents.length, initScrolled, rowVirtualizer, status]);

  useEffect(() => {
    if (
      messageUpdateMutation.status === 'success' &&
      chatContents.length > 0 &&
      chatContents[chatContents.length - 1].role === 'model'
    ) {
      rowVirtualizer.scrollToIndex(chatContents.length - 1, {
        align: 'start',
      });

      if (!isSmallBreakpoint) {
        inputRef.current?.focus();
      }
    }
  }, [
    chatContents,
    isSmallBreakpoint,
    messageUpdateMutation.status,
    rowVirtualizer,
  ]);

  const onSubmit = useCallback(
    async (prompt: string) => {
      if (prompt) {
        setIsPromptSubmitted(true);

        if (conversationId) {
          inputRef.current?.clearPrompt();
          messageUpdateMutation.mutate({
            id: uuid(),
            text: prompt,
            role: 'user',
          });
        }

        const response = await callAi({
          prompt,
          conversationId,
        });

        if (response) {
          if (conversationId) {
            messageUpdateMutation.mutate({
              id: response.responseId,
              role: 'model',
              text: response.response ?? '',
            });

            setTokenCount((prevCount) => ({
              inputTokenCount:
                prevCount.inputTokenCount + (response.inputTokenCount ?? 0),
              outputTokenCount:
                prevCount.outputTokenCount + (response.outputTokenCount ?? 0),
            }));
          } else if (response.conversationId) {
            const conversation = await fetchConversation(
              response.conversationId,
            );

            if (conversation?.id) {
              navigate({
                to: '/app/{-$conversationId}',
                params: { conversationId: conversation.id },
              });
            }
          }
        }
      }

      setIsPromptSubmitted(false);
    },
    [conversationId, fetchConversation, messageUpdateMutation, navigate],
  );

  const onParentScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (
        event.currentTarget.scrollTop === 0 &&
        hasPreviousPage &&
        !isFetchingPreviousPage
      ) {
        fetchPreviousPage();
      }
    },
    [fetchPreviousPage, hasPreviousPage, isFetchingPreviousPage],
  );

  const measureElement = useCallback(
    (element: HTMLDivElement | null | undefined, messageId: string) => {
      if (element) {
        rowVirtualizer.measureElement(element);

        const newHeight = element.offsetHeight;
        const cachedHeight = elementHeightCacheRef.current.get(messageId);

        if (cachedHeight !== newHeight) {
          elementHeightCacheRef.current.set(messageId, newHeight);
        }
      }
    },
    [rowVirtualizer],
  );

  const { renderMessage } = useRenderMessage({ measureElement });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        overflow: 'hidden',
      }}
    >
      <Box
        onScroll={onParentScroll}
        ref={parentRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
        }}
      >
        {status === 'success' && chatContents.length === 0 ? (
          <NoMessageScreen />
        ) : null}
        <Box
          ref={innerRef}
          sx={{
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) =>
            renderMessage({
              virtualItem,
              message: chatContents[virtualItem.index],
            }),
          )}
        </Box>
      </Box>
      <Box
        component="footer"
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <InputField
          autoFocus={!isSmallBreakpoint}
          disabled={isPromptSubmitted}
          onSubmit={onSubmit}
          ref={inputRef}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Typography variant="caption">
            {`${tokenCount.inputTokenCount} input tokens and ${tokenCount.outputTokenCount} output tokens consumed.`}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
