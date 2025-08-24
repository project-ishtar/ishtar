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
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useVirtualizer } from '@tanstack/react-virtual';
import remarkGfm from 'remark-gfm';

type AiContentProps = {
  conversationId?: string;
};

export const AiContent = ({ conversationId }: AiContentProps): JSX.Element => {
  const [prompt, setPrompt] = useState<string>();
  const [isPromptSubmitted, setIsPromptSubmitted] = useState(false);

  const [renderedLastMessage, setRenderedLastMessage] = useState(false);
  const [fetchedAllMessages, setFetchedAllMessages] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  const rowRefsMap = useRef(new Map<number, HTMLDivElement>());

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
    onSettled: () => {
      rowVirtualizer.scrollToIndex(chatContents.length - 1, {
        align: 'start',
        behavior: 'smooth',
      });
    },
  });

  const fetchMoreMessagesMutation = useMutation({
    mutationFn: fetchMessages,
    onSuccess: (prevMessages) => {
      queryClient.setQueryData<ChatContent[]>(chatContentsQuery, (messages) =>
        messages ? [...prevMessages, ...messages] : [...prevMessages],
      );
    },
    onSettled: (data) => {
      if (data && data.length) {
        rowVirtualizer.scrollToIndex(data.length, {
          align: 'start',
        });
      }
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
    onChange: (instance) => {
      if (innerRef.current && instance) {
        innerRef.current.style.height = `${instance.getTotalSize()}px`;

        instance.getVirtualItems().forEach((virtualRow) => {
          const rowRef = rowRefsMap.current.get(virtualRow.index);
          if (!rowRef) return;
          rowRef.style.transform = `translateY(${virtualRow.start}px)`;
        });
      }
    },
  });

  const indices = rowVirtualizer.getVirtualIndexes();

  useEffect(() => {
    if (fetchMessagesStatus === 'success') {
      rowVirtualizer?.measure();
    }
  }, [fetchMessagesStatus, rowVirtualizer]);

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

  useEffect(() => {
    if (chatContents.length > 0 && !renderedLastMessage) {
      rowVirtualizer.scrollToIndex(chatContents.length - 1, {
        align: 'start',
      });

      setRenderedLastMessage(true);
    }
  }, [chatContents.length, renderedLastMessage, rowVirtualizer]);

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
        renderedLastMessage &&
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
      renderedLastMessage,
    ],
  );

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
        {chatContents.length > 0 ? (
          <Box
            ref={innerRef}
            sx={{
              width: '100%',
              position: 'relative',
            }}
          >
            {indices.map((index) => {
              const message = chatContents[index];
              if (!message) return null;

              if (index === chatContents.length - 1 && !renderedLastMessage) {
                setRenderedLastMessage(true);
              }

              return (
                <Box
                  key={message.id}
                  data-index={index}
                  ref={(el: HTMLDivElement) => {
                    if (el) {
                      rowVirtualizer.measureElement(el);
                      rowRefsMap.current.set(index, el);
                    }
                  }}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    display: 'flex',
                    justifyContent:
                      message.role === 'user' ? 'flex-end' : 'flex-start',
                    padding: '8px 0',
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      maxWidth: '98%',
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
                      <Markdown
                        remarkPlugins={[remarkGfm]}
                        children={message.text}
                        components={{
                          pre: ({ children }) => (
                            <Box sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                              <pre
                                style={{
                                  margin: 0,
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {children}
                              </pre>
                            </Box>
                          ),
                          code(props) {
                            const { children, className, ...rest } = props;
                            const match = /language-(\w+)/.exec(
                              className || '',
                            );
                            return match ? (
                              <SyntaxHighlighter
                                PreTag="div"
                                children={String(children).replace(/\n$/, '')}
                                language={match[1]}
                                style={
                                  theme.palette.mode === 'dark'
                                    ? dark
                                    : undefined
                                }
                              />
                            ) : (
                              <code
                                {...rest}
                                className={className}
                                style={{ wordWrap: 'break-word' }}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      />
                    ) : (
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.text}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flexGrow: 1,
              textAlign: 'center',
              height: '100%',
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
