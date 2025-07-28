// src/App.styles.ts
import { styled } from '@mui/material/styles';
import Container from '@mui/material/Container';

// ... any other styled components you have ...

// Creates a new Container component with custom horizontal padding
export const StyledPaddedContainer = styled(Container)(({ theme }) => ({
  // theme.spacing(4) equals 4 * 8px = 32px
  paddingLeft: theme.spacing(7),
  paddingRight: theme.spacing(7),
}));
