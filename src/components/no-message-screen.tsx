import { Typography, Box } from '@mui/material';

export const NoMessageScreen = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      flexGrow: 1,
      textAlign: 'center',
      height: '100%',
    }}
  >
    <Typography variant="h4" gutterBottom>
      How can I help you today?
    </Typography>
    <Typography variant="body1" color="text.secondary">
      Your AI assistant is ready. Enter a prompt below to begin.
    </Typography>
  </Box>
);
