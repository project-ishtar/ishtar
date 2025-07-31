import React, { type JSX, useCallback, useRef, useState } from 'react';
import { getAiResponse } from '../ai.ts';
import Markdown from 'react-markdown';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Container, useMediaQuery, useTheme } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import LoadingButton from '@mui/lab/LoadingButton';
import type { AiResponse } from '@ishtar/commons/types';
import { useParams, useNavigate } from 'react-router';

export const AiContent = (): JSX.Element => {
  const [prompt, setPrompt] = useState<string>();
  const [response, setResponse] = useState<AiResponse>();

  const [isPromptSubmitted, setIsPromptSubmitted] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const theme = useTheme();
  const isSmallBreakpoint = useMediaQuery(theme.breakpoints.down('md'));

  const params = useParams();
  const navigate = useNavigate();

  const onPromptChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPrompt(event.target.value);
    },
    [],
  );

  const onSubmit = useCallback(async () => {
    if (prompt) {
      setIsPromptSubmitted(true);

      const response = await getAiResponse({
        prompt,
        conversationId: params.conversationId,
      });

      if (response) {
        setResponse({
          id: response.id,
          response: response.response,
          tokenCount: response.tokenCount,
          conversationId: response.conversationId,
        });

        setPrompt('');

        if (params.conversationId !== response.conversationId) {
          navigate(`/app/${response.conversationId}`);
        }
      }
    }

    setIsPromptSubmitted(false);
  }, [navigate, params.conversationId, prompt]);

  const onInputKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.metaKey && event.key === 'Enter') {
        onSubmit();
      }
    },
    [onSubmit],
  );

  return (
    <>
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: response?.response ? 'flex-end' : 'center',
        }}
      >
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: response?.response ? 'flex-end' : 'center',
          }}
        >
          {response?.response ? (
            <Box>
              <Markdown>{response.response}</Markdown>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
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
            // p: 2,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <TextField
            autoFocus={!isSmallBreakpoint}
            onChange={onPromptChange}
            onKeyDown={onInputKeyDown}
            placeholder="Prompt"
            value={prompt}
            multiline
            fullWidth
            inputRef={inputRef}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <LoadingButton
              onClick={onSubmit}
              variant="outlined"
              color="success"
              disabled={!prompt || isPromptSubmitted}
              loading={isPromptSubmitted}
              loadingIndicator={<CircularProgress size={20} color="info" />}
            >
              Submit
            </LoadingButton>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                ml: 'auto',
              }}
            >
              {response?.tokenCount ? (
                <Typography variant="caption">
                  {`${response.tokenCount} tokens used`}
                </Typography>
              ) : null}
            </Box>
          </Box>
        </Box>
      </Container>
    </>
  );
};
