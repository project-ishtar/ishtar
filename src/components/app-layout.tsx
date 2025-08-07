import { useEffect, useState, type ReactNode, useCallback } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import {
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  useColorScheme,
  useMediaQuery,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import EditSquareIcon from '@mui/icons-material/EditSquare';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsIcon from '@mui/icons-material/Settings';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { useGetConversations } from '../data/conversations/use-get-conversations.ts';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useAuthenticated } from '../auth/use-auth.ts';
import { useConversationsMutations } from '../data/conversations/use-conversations-mutations.ts';

const drawerWidth = 240;

// A styled component for the main content area that will resize
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  ...(open && {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
    width: `calc(100% - ${drawerWidth}px)`,
  }),
}));

type AppLayoutProps = {
  children: ReactNode;
  onSettingsClick: () => void;
  conversationId?: string;
};

export const AppLayout = ({
  children,
  onSettingsClick,
  conversationId,
}: AppLayoutProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [isDrawerOpen, setDrawerOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const colorScheme = useColorScheme();
  const conversations = useGetConversations();

  const router = useRouter();
  const navigate = useNavigate();

  const { deleteConversation } = useConversationsMutations();

  const { logout } = useAuthenticated();

  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, id: string) => {
      setAnchorEl(event.currentTarget);
      setSelectedConversationId(id);
    },
    [],
  );

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    await router.invalidate();
  }, [logout, router]);

  const handleDrawerToggle = useCallback(() => {
    setDrawerOpen(!isDrawerOpen);
  }, [isDrawerOpen]);

  const doDeleteConversation = useCallback(async () => {
    if (selectedConversationId) {
      await deleteConversation(selectedConversationId, {
        onSettled: () => {
          if (selectedConversationId === conversationId) {
            navigate({
              to: '/app/{-$conversationId}',
              params: { conversationId: undefined },
            });
          }
        },
      });
    }

    handleMenuClose();
  }, [
    conversationId,
    deleteConversation,
    handleMenuClose,
    navigate,
    selectedConversationId,
  ]);

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="persistent"
        open={isDrawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box>
          <List>
            <ListItem>
              <ListItemButton
                onClick={() =>
                  navigate({
                    to: '/app/{-$conversationId}',
                    params: { conversationId: undefined },
                  })
                }
                disabled={!conversationId}
              >
                <ListItemIcon>
                  <EditSquareIcon />
                </ListItemIcon>
                <ListItemText primary="New Chat" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          <List>
            {conversations.map((conversation) => (
              <ListItem
                key={conversation.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="more options"
                    onClick={(event) => handleMenuOpen(event, conversation.id)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                }
              >
                <ListItemButton
                  onClick={() =>
                    navigate({
                      to: '/app/{-$conversationId}',
                      params: { conversationId: conversation.id },
                    })
                  }
                  selected={conversation.id === conversationId}
                >
                  <ListItemText primary={conversation.title} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          <List>
            <ListItem>
              <ListItemButton onClick={signOut}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      <Main open={isDrawerOpen} sx={{ maxWidth: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1,
            position: 'sticky',
            top: 0,
            zIndex: theme.zIndex.appBar,
            bgcolor: 'background.default', // Use the default page background color
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />{' '}
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
          <IconButton color="inherit" onClick={onSettingsClick}>
            <SettingsIcon />
          </IconButton>
        </Box>
        {children}
      </Main>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={doDeleteConversation} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};
