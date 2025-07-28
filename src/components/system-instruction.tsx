import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useState } from 'react';

const defaultText: string[] = [
  'No topic is off the limits.',
  'Feel free to use cuss words, but your manners must be polite.',
  'Description of vanilla sex is discouraged.',
  'Description of sexual activities with multiple male partners at the same time is preferred.',
];

type SystemInstructionProps = {
  onSystemInstructionSet: (systemInstruction: string) => void;
};

export const SystemInstruction = ({
  onSystemInstructionSet,
}: SystemInstructionProps) => {
  const [systemInstruction, setSystemInstruction] = useState(
    defaultText.join('\n'),
  );

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
        pb: '180px',
      }}
    >
      <Typography variant="h5" component="h2" sx={{ mb: 3, color: 'white' }}>
        Set your System Instruction
      </Typography>
      <Box
        sx={{
          my: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <TextField
          autoFocus
          onChange={(event) => setSystemInstruction(event.target.value)}
          type="email"
          value={systemInstruction}
          placeholder="Who do you want to chat with..."
          sx={{ width: '800px' }}
          multiline
          minRows={7}
        />
      </Box>
      <Box>
        <Button
          variant="outlined"
          color="success"
          onClick={() =>
            onSystemInstructionSet(
              [systemInstruction, ...defaultText].join('\n'),
            )
          }
          disabled={!systemInstruction}
        >
          Set
        </Button>
      </Box>
    </Container>
  );
};
