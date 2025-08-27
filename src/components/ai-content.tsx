import React, {
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getAiResponse } from '../ai.ts';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useMediaQuery, useTheme } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import LoadingButton from '@mui/lab/LoadingButton';
import type { ChatContent } from '@ishtar/commons/types';
import { v4 as uuid } from 'uuid';
import { useCurrentConversation } from '../data/conversations/use-current-conversation.ts';
import { useAuthenticated } from '../auth/use-auth.ts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMessages,
  updateMessage,
} from '../data/messages/chat-contents-functions.ts';
import { useConversationsMutations } from '../data/conversations/use-conversations-mutations.ts';
import { useNavigate } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { NoMessageScreen } from './no-message-screen.tsx';
import { useRenderMessage } from './use-render-message.tsx';

type AiContentProps = {
  conversationId?: string;
};

export const AiContent = ({ conversationId }: AiContentProps): JSX.Element => {
  const [prompt, setPrompt] = useState<string>();
  const [isPromptSubmitted, setIsPromptSubmitted] = useState(false);

  const [fetchedAllMessages, setFetchedAllMessages] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const { data: chatContents = [], status: fetchMessagesStatus } = useQuery({
    queryKey: chatContentsQuery,
    queryFn: () => fetchMessages({ currentUserUid, conversationId }),
  });

  const messageUpdateMutation = useMutation({
    mutationFn: updateMessage,
    onSuccess: (newMessage) => {
      queryClient.setQueryData<ChatContent[]>(chatContentsQuery, (messages) =>
        messages ? [...messages, newMessage] : [newMessage],
      );
    },
  });

  const fetchMoreMessagesMutation = useMutation({
    mutationFn: fetchMessages,
    onSuccess: (prevMessages) => {
      queryClient.setQueryData<ChatContent[]>(chatContentsQuery, (messages) =>
        messages ? [...prevMessages, ...messages] : [...prevMessages],
      );
    },
  });

  const { fetchAndSetConversation } = useConversationsMutations();
  const conversation = useCurrentConversation();
  const navigate = useNavigate();

  const [tokenCount, setTokenCount] = useState({
    inputTokenCount: conversation?.inputTokenCount ?? 0,
    outputTokenCount: conversation?.outputTokenCount ?? 0,
  });

  const rowVirtualizer = useVirtualizer({
    count: chatContents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 2,
  });

  useEffect(() => {
    if (fetchMessagesStatus === 'success' && !initScrolled) {
      setInitScrolled(true);

      if (chatContents.length > 0) {
        rowVirtualizer.scrollToIndex(chatContents.length - 1, {
          align: 'start',
        });
      }
    }
  }, [chatContents.length, fetchMessagesStatus, initScrolled, rowVirtualizer]);

  useEffect(() => {
    if (
      messageUpdateMutation.status === 'success' &&
      chatContents.length > 0 &&
      chatContents[chatContents.length - 1].role === 'model'
    ) {
      rowVirtualizer.scrollToIndex(chatContents.length - 1, {
        align: 'start',
      });
    }
  }, [chatContents, messageUpdateMutation.status, rowVirtualizer]);

  useEffect(() => {
    if (
      fetchMessagesStatus === 'success' &&
      chatContents.length < 10 &&
      !fetchedAllMessages
    ) {
      setFetchedAllMessages(true);
    } else if (
      fetchMoreMessagesMutation.status === 'success' &&
      fetchMoreMessagesMutation.data.length < 10 &&
      !fetchedAllMessages
    ) {
      setFetchedAllMessages(true);
    }
  }, [
    chatContents.length,
    fetchMessagesStatus,
    fetchMoreMessagesMutation.data,
    fetchMoreMessagesMutation.status,
    fetchedAllMessages,
  ]);

  const onPromptChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPrompt(event.target.value);
    },
    [],
  );

  const onSubmit = useCallback(async () => {
    if (prompt) {
      setIsPromptSubmitted(true);

      if (conversationId) {
        setPrompt('');
        messageUpdateMutation.mutate({
          id: uuid(),
          text: prompt,
          role: 'user',
        });
      }

      const response = await getAiResponse({
        prompt,
        conversationId: conversationId,
      });

      if (response) {
        if (conversationId) {
          messageUpdateMutation.mutate({
            id: response.id,
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
          await fetchAndSetConversation(response.conversationId, {
            onSettled: (conversation) => {
              if (conversation?.id) {
                navigate({
                  to: '/app/{-$conversationId}',
                  params: { conversationId: conversation.id },
                });
              }
            },
          });
        }
      }
    }

    setIsPromptSubmitted(false);
  }, [
    conversationId,
    fetchAndSetConversation,
    messageUpdateMutation,
    navigate,
    prompt,
  ]);

  const onInputKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (
        event.metaKey &&
        event.key === 'Enter' &&
        !(!prompt || isPromptSubmitted)
      ) {
        onSubmit();
      }
    },
    [onSubmit, prompt, isPromptSubmitted],
  );

  const onParentScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (
        event.currentTarget.scrollTop === 0 &&
        !fetchedAllMessages &&
        fetchMoreMessagesMutation.status !== 'pending'
      ) {
        fetchMoreMessagesMutation.mutate({
          currentUserUid,
          conversationId,
          messageId: chatContents[0].id,
        });
      }
    },
    [
      chatContents,
      conversationId,
      currentUserUid,
      fetchMoreMessagesMutation,
      fetchedAllMessages,
    ],
  );

  const { renderMessage } = useRenderMessage();

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
        {chatContents.length === 0 ? <NoMessageScreen /> : null}
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
              measureElement: rowVirtualizer.measureElement,
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
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            autoFocus={!isSmallBreakpoint}
            onChange={onPromptChange}
            onKeyDown={onInputKeyDown}
            placeholder="Prompt"
            value={prompt}
            multiline
            maxRows={5}
            inputRef={inputRef}
            sx={{ flexGrow: 1 }}
          />
          <LoadingButton
            onClick={onSubmit}
            variant="outlined"
            color="success"
            disabled={!prompt || isPromptSubmitted}
            loading={isPromptSubmitted}
            loadingIndicator={<CircularProgress size={20} color="info" />}
          >
            <SendIcon />
          </LoadingButton>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Typography variant="caption">
            {`${tokenCount.inputTokenCount} input tokens and ${tokenCount.outputTokenCount} output tokens consumed.`}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
