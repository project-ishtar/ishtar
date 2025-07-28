import React, { type JSX, useCallback, useRef, useState } from 'react';
import { getAiResponse } from '../google/gemini/gemini.ts';
import Markdown from 'react-markdown';
import type { AiResponse } from '../types/ai-response.ts';
import type { History, Role } from '../types/history.ts';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { StyledPaddedContainer } from './ai-content.styles.ts';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import DownloadIcon from '@mui/icons-material/Download';
import { type PaletteMode, useMediaQuery, useTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import HourglassBottomTwoToneIcon from '@mui/icons-material/HourglassBottomTwoTone';

type AiContentProps = {
  onThemeChange: (theme: PaletteMode) => void;
  systemInstruction: string;
};

export const AiContent = ({
  onThemeChange,
  systemInstruction,
}: AiContentProps): JSX.Element => {
  const [prompt, setPrompt] = useState<string>();
  const [response, setResponse] = useState<AiResponse>();

  const [isPromptSubmitted, setIsPromptSubmitted] = useState(false);

  const [history, setHistory] = useState<History[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const theme = useTheme();
  const isSmallBreakpoint = useMediaQuery(theme.breakpoints.down('md'));

  const addHistory = useCallback(
    (id: string, role: Role, text: string) =>
      setHistory((prevHistory) => [
        ...prevHistory,
        { id, role: role, data: { text } },
      ]),
    [],
  );

  const downloadHistory = useCallback(() => {
    const dataString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(history),
    )}`;

    const aNode = document.createElement('a');
    aNode.setAttribute('href', dataString);
    aNode.setAttribute('download', 'history.json');

    document.body.appendChild(aNode);
    aNode.click();
    aNode.remove();
  }, [history]);

  const onPromptChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPrompt(event.target.value);
    },
    [],
  );

  const onSubmit = useCallback(async () => {
    if (prompt) {
      addHistory(Math.random().toString(36), 'user', prompt);

      setIsPromptSubmitted(true);

      const response = await getAiResponse(prompt, systemInstruction);

      if (response) {
        setResponse({
          id: response.id,
          response: response.response,
          tokenCount: response.tokenCount,
        });

        addHistory(response.id, 'model', response.response ?? '');
        setPrompt('');
      }
    }

    setIsPromptSubmitted(false);

    if (!isSmallBreakpoint) {
      inputRef.current?.focus();
    }
  }, [addHistory, isSmallBreakpoint, prompt, systemInstruction]);

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
      <StyledPaddedContainer
        maxWidth={false}
        disableGutters
        sx={{ pb: '180px' }}
      >
        <Box component="main" sx={{ my: 2 }}>
          {response?.response ? (
            <Box sx={{ mt: '20vh' }}>
              <Markdown>{response.response}</Markdown>
            </Box>
          ) : (
            // Otherwise, show this initial welcome message
            <Box sx={{ textAlign: 'center', mt: '20vh' }}>
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
          sx={(theme) => ({
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'background.paper',
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 -4px 12px rgba(0, 0, 0, 0.4)'
                : '0 -2px 10px rgba(0, 0, 0, 0.1)',
          })}
        >
          <StyledPaddedContainer maxWidth={false} disableGutters sx={{ py: 2 }}>
            <TextField
              autoFocus
              onChange={onPromptChange}
              onKeyDown={onInputKeyDown}
              placeholder="Prompt"
              value={prompt}
              multiline
              fullWidth
              inputRef={inputRef}
              sx={{ mb: 2 }}
            />

            {/* A simple Box to group the buttons */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                onClick={onSubmit}
                variant="outlined"
                color="success"
                disabled={!prompt}
              >
                Submit
              </Button>
              {isPromptSubmitted ? (
                <IconButton>
                  <HourglassBottomTwoToneIcon />
                </IconButton>
              ) : null}
              {history.length > 0 ? (
                <IconButton onClick={downloadHistory}>
                  <DownloadIcon />
                </IconButton>
              ) : null}
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  alignItems: 'center',
                  ml: 'auto',
                }}
              >
                <IconButton
                  color="inherit"
                  onClick={() =>
                    onThemeChange(
                      theme.palette.mode === 'dark' ? 'light' : 'dark',
                    )
                  }
                >
                  {theme.palette.mode === 'dark' ? (
                    <Brightness7Icon />
                  ) : (
                    <Brightness4Icon />
                  )}
                </IconButton>

                {response?.tokenCount ? (
                  <Typography variant="caption">
                    {`${response.tokenCount} tokens used`}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          </StyledPaddedContainer>
        </Box>
      </StyledPaddedContainer>
    </>
  );
};
