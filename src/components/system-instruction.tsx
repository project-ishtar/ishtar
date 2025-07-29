import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useState } from 'react';

type SystemInstructionProps = {
  onSystemInstructionSet: (systemInstruction: string) => void;
};

export const SystemInstruction = ({
  onSystemInstructionSet,
}: SystemInstructionProps) => {
  const [systemInstruction, setSystemInstruction] = useState('');

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        px: 2, // Add horizontal padding for small screens
      }}
    >
      {/* This new Box controls the content's width */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          width: '100%',
          maxWidth: '800px', // Set a max-width for large screens
        }}
      >
        <Typography
          variant="h5"
          component="h2"
          sx={{ mb: 1, textAlign: 'center' }}
        >
          Set your System Instruction
        </Typography>

        <TextField
          autoFocus
          onChange={(event) => setSystemInstruction(event.target.value)}
          value={systemInstruction}
          placeholder="Who do you want to chat with..."
          fullWidth // Use fullWidth to fill the parent Box
          multiline
          minRows={7}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="success"
            onClick={() => onSystemInstructionSet(systemInstruction)}
            disabled={!systemInstruction}
          >
            Set
          </Button>
        </Box>
      </Box>
    </Container>
  );
};
