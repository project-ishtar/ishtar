import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import Button from '@mui/material/Button';
import { useState } from 'react';
import type { ChatSettings as ChatSettingsType } from '@ishtar/commons/types';

type ChatSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSettings: ChatSettingsType) => void;
  chatSettings?: ChatSettingsType;
};

export const ChatSettings = ({
  isOpen,
  onClose,
  onSave,
  chatSettings,
}: ChatSettingsProps) => {
  const [systemInstruction, setSystemInstruction] = useState(
    chatSettings?.systemInstruction ?? '',
  );

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: { sm: 500 },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Define the AI's behavior and personality for the conversation.
          </Typography>
          <TextField
            autoFocus
            value={systemInstruction}
            onChange={(e) => setSystemInstruction(e.target.value)}
            multiline
            minRows={7}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => onSave({ systemInstruction })}
          variant="contained"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
