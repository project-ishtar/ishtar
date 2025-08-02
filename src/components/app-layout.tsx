import { useEffect, useState, type ReactNode } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { Tooltip, useColorScheme, useMediaQuery } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAtomValue } from 'jotai/index';
import {
  conversationsAtom,
  isGlobalSettingsLoadedAtom,
} from '../data/atoms.ts';
import { useNavigate } from 'react-router';

const drawerWidth = 240;

// A styled component for the main content area that will resize
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    /* ... */
  }),
  marginLeft: `-${drawerWidth}px`,
  // Add these three lines
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  ...(open && {
    transition: theme.transitions.create('margin', {
      /* ... */
    }),
    marginLeft: 0,
  }),
}));

type AppLayoutProps = {
  children: ReactNode;
  onSettingsClick: () => void;
};

export const AppLayout = ({ children, onSettingsClick }: AppLayoutProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [isDrawerOpen, setDrawerOpen] = useState(!isMobile);

  const colorScheme = useColorScheme();

  const conversations = useAtomValue(conversationsAtom);
  const isGlobalSettingsLoaded = useAtomValue(isGlobalSettingsLoadedAtom);

  const navigate = useNavigate();

  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setDrawerOpen(!isDrawerOpen);
  };

  const drawerContent = (
    <Box sx={{ p: 1 }}>
      <List>
        <ListItem>
          <ListItemButton>
            <ListItemText primary="New Chat" />
          </ListItemButton>
        </ListItem>
        {conversations.map((conversation) => (
          <ListItem
            key={conversation.id}
            onClick={() => navigate(`/app/${conversation.id}`)}
          >
            <ListItemButton>
              <ListItemText primary={conversation.title} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="persistent" // Persistent is best for this effect
        open={isDrawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Main open={isDrawerOpen}>
        {/* The toggle button is now at the top of the main content */}
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />{' '}
          {/* This spacer pushes the next items to the right */}
          <IconButton
            color="inherit"
            onClick={() =>
              colorScheme.setMode(
                colorScheme.mode === 'dark' ? 'light' : 'dark',
              )
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
          {isGlobalSettingsLoaded ? (
            <IconButton color="inherit" onClick={onSettingsClick}>
              <SettingsIcon />
            </IconButton>
          ) : null}
        </Box>
        {children}
      </Main>
    </Box>
  );
};
