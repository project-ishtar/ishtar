import { styled } from '@mui/material/styles';
import Container from '@mui/material/Container';

export const StyledPaddedContainer = styled(Container)(({ theme }) => ({
  paddingLeft: theme.spacing(3),
  paddingRight: theme.spacing(3),
  [theme.breakpoints.up('md')]: {
    paddingLeft: theme.spacing(7),
    paddingRight: theme.spacing(7),
  },
}));
