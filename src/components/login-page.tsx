import React, { useCallback, useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useRouter } from '@tanstack/react-router';
import { useAuth } from '../auth/use-auth.ts';

export const LoginPage = () => {
  const router = useRouter();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = useCallback(async () => {
    await auth.login(email, password);
    await router.invalidate();
  }, [auth, email, password, router]);

  const onEmailChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(event.target.value);
    },
    [],
  );

  const onPasswordChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(event.target.value);
    },
    [],
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
        Login to continue
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
          onChange={onEmailChange}
          type="email"
          value={email}
          placeholder="Email"
          sx={{ width: '300px' }}
        />
        <TextField
          onChange={onPasswordChange}
          type="password"
          value={password}
          placeholder="Password"
        />
      </Box>
      <Box>
        <Button
          variant="outlined"
          color="success"
          onClick={signIn}
          disabled={!email || !password}
        >
          Login
        </Button>
      </Box>
    </Container>
  );
};
