import React, {
  type JSX,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import { useParams, useNavigate } from 'react-router';
import type { RouteParams } from '../routes/route-params.ts';
import { useConversations } from '../data/conversations/use-conversations.ts';
import { useChatContents } from '../data/messages/use-chat-contents.ts';
import { v4 as uuid } from 'uuid';
import { chatContentsWriteAtom } from '../data/messages/chat-contents-atoms.ts';

export const AiContent = (): JSX.Element => {
  const [prompt, setPrompt] = useState<string>();
  const [totalTokenCount, setTotalTokenCount] = useState<number>();
  const [isPromptSubmitted, setIsPromptSubmitted] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const theme = useTheme();
  const isSmallBreakpoint = useMediaQuery(theme.breakpoints.down('md'));

  const { conversationId } = useParams<RouteParams>();
  const navigate = useNavigate();

  const { fetchAndAppendConversation } = useConversations();
  const [chatContents, setChatContent] = useChatContents();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const lastChatContentId =
    chatContents.length > 0
      ? chatContents[chatContentsWriteAtom.length - 1].id
      : undefined;

  const shouldSubmitButtonBeDisabled = !prompt || isPromptSubmitted;

  useEffect(() => {
    if (lastChatContentId) {
      messagesEndRef.current?.scrollIntoView();
    }
  }, [lastChatContentId]);

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
        await setChatContent({ id: uuid(), text: prompt, role: 'user' });
      }

      const response = await getAiResponse({
        prompt,
        conversationId: conversationId,
      });

      if (response) {
        if (conversationId) {
          await setChatContent({
            id: response.id,
            role: 'model',
            text: response.response ?? '',
          });

          setTotalTokenCount(response.tokenCount);
        } else if (response.conversationId) {
          await fetchAndAppendConversation(response.conversationId);
          navigate(`/app/${response.conversationId}`);
        }
      }
    }

    setIsPromptSubmitted(false);
  }, [
    fetchAndAppendConversation,
    navigate,
    conversationId,
    prompt,
    setChatContent,
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
        }}
      >
        {chatContents.length > 0 ? (
          chatContents.map((message: ChatContent) => (
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
                  maxWidth: '80%',
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          {totalTokenCount ? (
            <Typography variant="caption">
              {`${totalTokenCount} tokens used`}
            </Typography>
          ) : null}
        </Box>
      </Box>
    </Container>
  );
};
