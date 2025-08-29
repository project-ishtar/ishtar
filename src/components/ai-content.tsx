import React, {
  type JSX,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useCurrentConversation } from '../data/conversations/use-current-conversation.ts';
import { useVirtualizer } from '@tanstack/react-virtual';
import { NoMessageScreen } from './no-message-screen.tsx';
import { useRenderMessage } from './hooks/use-render-message.tsx';
import { InputField, type InputFieldRef } from './input-field.tsx';
import { useMediaQuery, useTheme } from '@mui/material';
import { useChatContents } from '../data/messages/use-chat-contents.ts';

export const AiContent = (): JSX.Element => {
  const inputFieldRef = useRef<InputFieldRef>(null);
  const elementHeightCacheRef = useRef(new Map<string, number>());
  const parentRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  const [initScrolled, setInitScrolled] = useState(false);

  const theme = useTheme();
  const isSmallBreakpoint = useMediaQuery(theme.breakpoints.down('md'));

  const updateTokenCount = useCallback(
    (inputTokenCount: number, outputTokenCount: number) =>
      setTokenCount((prevCount) => ({
        inputTokenCount: prevCount.inputTokenCount + inputTokenCount,
        outputTokenCount: prevCount.outputTokenCount + outputTokenCount,
      })),
    [],
  );

  const {
    chatContents,
    hasPreviousPage,
    isFetchingPreviousPage,
    fetchPreviousPage,
    status,
    mutationStatus,
    mutate,
  } = useChatContents({
    inputFieldRef,
    onTokenCountUpdate: updateTokenCount,
  });

  const conversation = useCurrentConversation();

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
      mutationStatus === 'success' &&
      chatContents.length > 0 &&
      chatContents[chatContents.length - 1].role === 'model'
    ) {
      rowVirtualizer.scrollToIndex(chatContents.length - 1, {
        align: 'start',
      });

      if (!isSmallBreakpoint) {
        inputFieldRef.current?.focus();
      }
    }
  }, [chatContents, isSmallBreakpoint, mutationStatus, rowVirtualizer]);

  const onSubmit = useCallback(
    async (prompt: string) => {
      if (prompt) {
        mutate(prompt);
      }
    },
    [mutate],
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
          disabled={mutationStatus === 'pending'}
          onSubmit={onSubmit}
          ref={inputFieldRef}
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
