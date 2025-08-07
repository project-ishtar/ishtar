import React, { type JSX, useCallback, useMemo, useRef, useState } from 'react';
import { getAiResponse } from '../ai.ts';
import Markdown from 'react-markdown';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Container, useMediaQuery, useTheme } from '@mui/material';
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

type AiContentProps = {
  conversationId?: string;
};

export const AiContent = ({ conversationId }: AiContentProps): JSX.Element => {
  const [prompt, setPrompt] = useState<string>();
  const [isPromptSubmitted, setIsPromptSubmitted] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const theme = useTheme();
  const isSmallBreakpoint = useMediaQuery(theme.breakpoints.down('md'));

  const currentUserUid = useAuthenticated().currentUserUid;

  const queryClient = useQueryClient();

  const chatContentsQuery = useMemo(
    () => [currentUserUid, 'messages', conversationId],
    [conversationId, currentUserUid],
  );

  const { data: chatContents } = useQuery({
    queryKey: chatContentsQuery,
    queryFn: () => fetchMessages(currentUserUid, conversationId),
  });

  const messagesMutation = useMutation({
    mutationFn: updateMessage,
    onSuccess: (newMessage) => {
      queryClient.setQueryData<ChatContent[]>(chatContentsQuery, (messages) =>
        messages ? [...messages, newMessage] : [newMessage],
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const shouldSubmitButtonBeDisabled = !prompt || isPromptSubmitted;

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
        messagesMutation.mutate({ id: uuid(), text: prompt, role: 'user' });
      }

      const response = await getAiResponse({
        prompt,
        conversationId: conversationId,
      });

      if (response) {
        if (conversationId) {
          messagesMutation.mutate({
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

        messagesEndRef.current?.scrollIntoView({ block: 'center' });
      }
    }

    setIsPromptSubmitted(false);
  }, [
    conversationId,
    fetchAndSetConversation,
    messagesMutation,
    navigate,
    prompt,
  ]);

  const onInputKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (
        event.metaKey &&
        event.key === 'Enter' &&
        !shouldSubmitButtonBeDisabled
      ) {
        onSubmit();
      }
    },
    [onSubmit, shouldSubmitButtonBeDisabled],
  );

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          overflowWrap: 'break-word',
          wordWrap: 'break-word',
          '& pre, & code': {
            whiteSpace: 'pre-wrap',
          },
        }}
      >
        {chatContents?.length ? (
          chatContents?.map((message: ChatContent) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent:
                  message.role === 'user' ? 'flex-end' : 'flex-start',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  maxWidth: '100%',
                  bgcolor:
                    message.role === 'user'
                      ? 'primary.main'
                      : 'background.default',
                  color:
                    message.role === 'user'
                      ? 'primary.contrastText'
                      : 'text.primary',
                }}
              >
                {message.role === 'model' ? (
                  <Markdown>{message.text}</Markdown>
                ) : (
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.text}
                  </Typography>
                )}
              </Box>
            </Box>
          ))
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" gutterBottom>
              How can I help you today?
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Your AI assistant is ready. Enter a prompt below to begin.
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>
      <Box
        component="footer"
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
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
            inputRef={inputRef}
            sx={{ flexGrow: 1 }}
          />
          <LoadingButton
            onClick={onSubmit}
            variant="outlined"
            color="success"
            disabled={shouldSubmitButtonBeDisabled}
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
    </Container>
  );
};
