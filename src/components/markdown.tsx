import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';
import { Box, useTheme } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const Markdown = ({ text }: { text: string }) => {
  const theme = useTheme();

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      children={text}
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
          const match = /language-(\w+)/.exec(className || '');
          return match ? (
            <SyntaxHighlighter
              PreTag="div"
              children={String(children).replace(/\n$/, '')}
              language={match[1]}
              style={theme.palette.mode === 'dark' ? dark : undefined}
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
  );
};
