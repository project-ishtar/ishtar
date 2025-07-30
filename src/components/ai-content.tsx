import React, { type JSX, useCallback, useRef, useState } from 'react';
import { getAiResponse } from '../ai.ts';
import Markdown from 'react-markdown';
import type { History, Role } from '../types/history.ts';
import TextField from '@mui/material/TextField';
import { StyledPaddedContainer } from './ai-content.styles.ts';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import DownloadIcon from '@mui/icons-material/Download';
import { useColorScheme, useMediaQuery, useTheme } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsIcon from '@mui/icons-material/Settings';
import Tooltip from '@mui/material/Tooltip';
import { ChatSettings } from './chat-settings.tsx';
import CircularProgress from '@mui/material/CircularProgress';
import LoadingButton from '@mui/lab/LoadingButton';
import type {
  AiResponse,
  ChatSettings as ChatSettingsType,
} from '@ishtar/commons/types';

export const AiContent = (): JSX.Element => {
  const [prompt, setPrompt] = useState<string>();
  const [response, setResponse] = useState<AiResponse>();

  const [isPromptSubmitted, setIsPromptSubmitted] = useState(false);

  const [history, setHistory] = useState<History[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const theme = useTheme();
  const isSmallBreakpoint = useMediaQuery(theme.breakpoints.down('md'));

  const colorScheme = useColorScheme();

  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const [chatSettings, setChatSettings] = useState<ChatSettingsType>({
    systemInstruction: '',
  });

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const saveAndCloseSettings = useCallback(
    (newSettings: ChatSettingsType) => {
      setChatSettings(newSettings);
      closeSettings();
    },
    [closeSettings],
  );

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

      const response = await getAiResponse({ prompt, chatSettings });

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
  }, [addHistory, chatSettings, isSmallBreakpoint, prompt]);

  const onInputKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.metaKey && event.key === 'Enter') {
        onSubmit();
      }
    },
    [onSubmit],
  );

  const mainContent = response?.response ? (
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
  );

  const footerContent = (
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
        {history.length > 0 ? (
          <Tooltip title="Download Chat History">
            <IconButton onClick={downloadHistory}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        ) : null}
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
    </StyledPaddedContainer>
  );

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 1, // Manages the space between the icons
        }}
      >
        {/* Theme Toggle Button */}
        <IconButton
          color="inherit"
          onClick={() =>
            colorScheme.setMode(colorScheme.mode === 'dark' ? 'light' : 'dark')
          }
        >
          {theme.palette.mode === 'dark' ? (
            <Tooltip title="Switch to Light Mode">
              <LightModeIcon />
            </Tooltip>
          ) : (
            <Tooltip title="Switch to Dark Mode">
              <DarkModeIcon />
            </Tooltip>
          )}
        </IconButton>
        <IconButton
          aria-label="settings"
          onClick={openSettings}
          color="inherit" // Keep color consistent
        >
          <Tooltip title="Chat Settings">
            <SettingsIcon />
          </Tooltip>
        </IconButton>
      </Box>
      {isSmallBreakpoint ? (
        <StyledPaddedContainer
          maxWidth={false}
          disableGutters
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: response?.response ? 'flex-end' : 'center',
              // The alignItems property below has been removed
            }}
          >
            {mainContent}
          </Box>
          <Box component="footer" sx={{ my: 2 }}>
            {footerContent}
          </Box>
        </StyledPaddedContainer>
      ) : (
        <>
          <StyledPaddedContainer
            maxWidth={false}
            disableGutters
            sx={{
              pb: '180px',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
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
              {mainContent}
            </Box>
          </StyledPaddedContainer>
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
            {footerContent}
          </Box>
        </>
      )}
      <ChatSettings
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        onSave={saveAndCloseSettings}
        chatSettings={chatSettings}
      />
    </>
  );
};
