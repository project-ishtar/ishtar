import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Slider,
} from '@mui/material';
import Button from '@mui/material/Button';
import { useState } from 'react';
import type {
  ChatSettings as ChatSettingsType,
  GeminiModel,
} from '@ishtar/commons/types';

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

  const [temperature, setTemperature] = useState(1);

  const [model, setModel] = useState<GeminiModel>('gemini-2.0-flash-lite');

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box
          component="form"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4, // Increased gap between each setting
            mt: 2,
          }}
        >
          {/* Group 1: System Instruction */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
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

          {/* Group 2: Temperature */}
          <Box>
            <Typography variant="body2" color="text.secondary">
              Define the AI's Temperature.
            </Typography>
            <Slider
              value={temperature}
              onChange={(_e, value) => setTemperature(Number(value))}
              valueLabelDisplay="auto"
              step={0.1}
              marks
              min={0.1}
              max={2}
              // 2. Reduced width and centered with horizontal margin
              sx={{ width: '95%', mx: 'auto' }}
            />
          </Box>

          {/* Group 3: AI Model */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Define the AI Model.
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="ai-model-select-label">AI Model</InputLabel>
              <Select
                labelId="ai-model-select-label"
                value={model}
                label="AI Model" // This should match the InputLabel
                onChange={(event: SelectChangeEvent<GeminiModel>) =>
                  setModel(event.target.value)
                }
              >
                <MenuItem value="gemini-2.0-flash">gemini-2.0-flash</MenuItem>
                <MenuItem value="gemini-2.0-flash-lite">
                  gemini-2.0-flash-lite
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
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
