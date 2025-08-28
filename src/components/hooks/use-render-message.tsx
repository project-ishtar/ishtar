import type { ChatContent } from '@ishtar/commons/types';
import type { VirtualItem } from '@tanstack/react-virtual';
import { type JSX, useCallback } from 'react';
import { Markdown } from '../markdown.tsx';
import { Typography, Box } from '@mui/material';

type RenderMessageArgs = {
  virtualItem: VirtualItem;
  message?: ChatContent;
  measureElement: (node: Element | null | undefined) => void;
};

type UseRenderMessageReturn = {
  renderMessage: (args: RenderMessageArgs) => JSX.Element | null;
};

export const useRenderMessage = (): UseRenderMessageReturn => {
  const renderMessage = useCallback(
    ({
      virtualItem,
      message,
      measureElement,
    }: {
      virtualItem: VirtualItem;
      message?: ChatContent;
      measureElement: (node: Element | null | undefined) => void;
    }): JSX.Element | null => {
      if (!message) return null;

      return (
        <Box
          key={message.id}
          data-index={virtualItem.index}
          ref={measureElement}
          sx={{
            transform: `translateY(${virtualItem.start}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            display: 'flex',
            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            padding: '8px 0',
          }}
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              maxWidth: '98%',
              bgcolor:
                message.role === 'user' ? 'primary.main' : 'background.default',
              color:
                message.role === 'user'
                  ? 'primary.contrastText'
                  : 'text.primary',
            }}
          >
            {message.role === 'model' ? (
              <Markdown text={message.text} />
            ) : (
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                {message.text}
              </Typography>
            )}
          </Box>
        </Box>
      );
    },
    [],
  );

  return { renderMessage };
};
