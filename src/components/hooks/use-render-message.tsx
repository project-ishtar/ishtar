import type { ChatContent } from '@ishtar/commons/types';
import type { VirtualItem } from '@tanstack/react-virtual';
import { type JSX, useCallback } from 'react';
import { Markdown } from '../markdown.tsx';
import { Typography, Box } from '@mui/material';

type RenderMessageArgs = {
  virtualItem: VirtualItem;
  message?: ChatContent;
};

type UseRenderMessageReturn = {
  renderMessage: (args: RenderMessageArgs) => JSX.Element | null;
};

type UseRenderMessageProps = {
  measureElement: (
    node: HTMLDivElement | null | undefined,
    messageId: string,
  ) => void;
};

export const useRenderMessage = ({
  measureElement,
}: UseRenderMessageProps): UseRenderMessageReturn => {
  const renderModelText = (message: ChatContent) =>
    message.contents
      .filter((content) => content.type === 'text')
      .map((content) => <Markdown text={content.text} />);

  const renderUserText = (message: ChatContent) =>
    message.contents
      .filter((content) => content.type === 'text')
      .map((content) => (
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{content.text}</Typography>
      ));

  const renderMessage = useCallback(
    ({ virtualItem, message }: RenderMessageArgs): JSX.Element | null => {
      if (!message) return null;

      return (
        <Box
          key={message.id}
          data-index={virtualItem.index}
          ref={(el: HTMLDivElement) => measureElement(el, message.id)}
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
            <>
              {message.role === 'model'
                ? renderModelText(message)
                : renderUserText(message)}
            </>
          </Box>
        </Box>
      );
    },
    [measureElement],
  );

  return { renderMessage };
};
