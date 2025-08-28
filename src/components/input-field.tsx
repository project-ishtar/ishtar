import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import CircularProgress from '@mui/material/CircularProgress';

type InputFieldProps = {
  autoFocus?: boolean;
  disabled?: boolean;
  onSubmit: (prompt: string) => Promise<void>;
};

export type InputFieldRef = {
  clearPrompt: () => void;
  focus: () => void;
};

export const InputField = forwardRef<InputFieldRef, InputFieldProps>(
  ({ autoFocus = false, disabled = false, onSubmit }, ref) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [prompt, setPrompt] = useState('');

    const doSubmit = useCallback(() => {
      onSubmit(prompt);
    }, [onSubmit, prompt]);

    const onInputKeyDown = useCallback(
      async (event: React.KeyboardEvent) => {
        if (event.metaKey && event.key === 'Enter' && !(!prompt || disabled)) {
          await doSubmit();
        }
      },
      [prompt, disabled, doSubmit],
    );

    useImperativeHandle(
      ref,
      () => ({
        clearPrompt: () => setPrompt(''),
        focus: () => inputRef.current?.focus(),
      }),
      [],
    );

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderRadius: '28px',
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          p: '12px 16px',
        }}
      >
        <InputBase
          inputRef={inputRef}
          autoFocus={autoFocus}
          disabled={disabled}
          multiline
          maxRows={5}
          fullWidth
          placeholder="Prompt"
          value={prompt}
          onKeyDown={onInputKeyDown}
          onChange={(e) => setPrompt(e.target.value)}
          sx={{
            flexGrow: 1,
            fontSize: '1.1rem',
            '& .MuiInputBase-input': { padding: 0 },
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <IconButton size="small" disabled>
            <AttachFileIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          {!prompt && disabled ? (
            <IconButton size="large">
              <CircularProgress size={24} />
            </IconButton>
          ) : null}
          {prompt ? (
            <IconButton
              disabled={disabled}
              onClick={doSubmit}
              size="large"
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <SendIcon sx={{ transform: 'translateX(2px)' }} />
            </IconButton>
          ) : null}
        </Box>
      </Box>
    );
  },
);
