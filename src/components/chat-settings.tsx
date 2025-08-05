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
import { useCallback, useEffect, useState } from 'react';
import type {
  Conversation,
  DraftConversation,
  GeminiModel,
  User,
} from '@ishtar/commons/types';
import { useParams } from 'react-router';
import { firebaseApp } from '../firebase';
import { doc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { conversationConverter } from '../converters/conversation-converter.ts';
import { getGlobalSettings } from '../data/global-settings.ts';
import type { RouteParams } from '../routes/route-params.ts';
import { useCurrentConversation } from '../data/conversations/use-current-conversation.ts';
import { useConversationsMutation } from '../data/conversations/user-conversations-mutation.ts';
import { useAuth } from '../auth/use-auth.ts';

type ChatSettingsProps = {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
};

export const ChatSettings = ({
  isOpen,
  onClose,
  currentUser,
}: ChatSettingsProps) => {
  const params = useParams<RouteParams>();

  const currentUserUid = useAuth().currentUserUid;

  const globalSettings = getGlobalSettings(currentUser.role);

  const [isLoading, setLoading] = useState(true);
  const [chatTitle, setChatTitle] = useState('');
  const [systemInstruction, setSystemInstruction] = useState<string>();
  const [temperature, setTemperature] = useState(globalSettings.temperature);
  const [model, setModel] = useState<GeminiModel>(
    globalSettings.defaultGeminiModel,
  );

  const conversation = useCurrentConversation();

  const conversationsMutation = useConversationsMutation({
    onSettled: onClose,
  });

  useEffect(() => {
    const currentUserId = firebaseApp.auth?.currentUser?.uid;
    const conversationId = params.conversationId;

    if (conversationId && currentUserId) {
      if (conversation) {
        setChatTitle(conversation.title);
        setSystemInstruction(
          conversation.chatSettings?.systemInstruction ?? '',
        );
        setTemperature(
          conversation.chatSettings?.temperature ?? globalSettings.temperature,
        );
        setModel(
          conversation?.chatSettings?.model ??
            globalSettings.defaultGeminiModel,
        );
      }
    } else {
      setChatTitle(`New Chat - ${Date.now()}`);
      setTemperature(globalSettings.temperature);
      setModel(globalSettings.defaultGeminiModel);
    }

    setLoading(false);
  }, [
    conversation,
    globalSettings.defaultGeminiModel,
    globalSettings.temperature,
    params.conversationId,
  ]);

  const onSave = useCallback(async () => {
    const conversationId = params.conversationId;

    if (!conversationId) {
      const newConversation: DraftConversation = {
        createdAt: new Date(),
        lastUpdated: new Date(),
        title: chatTitle,
        isDeleted: false,
        summarizedMessageId: null,
        chatSettings: {
          temperature,
          model: model,
          systemInstruction: systemInstruction ?? null,
        },
        inputTokenCount: 0,
        outputTokenCount: 0,
      };
      const newDocRef = await addDoc(
        collection(
          firebaseApp.firestore,
          'users',
          currentUserUid,
          'conversations',
        ).withConverter(conversationConverter),
        newConversation,
      );

      conversationsMutation.mutate({
        currentUserUid,
        conversationId: newDocRef.id,
      });
    } else {
      const convoToUpdate: Partial<Conversation> = {
        lastUpdated: new Date(),
        title: chatTitle,
        chatSettings: {
          temperature,
          model: model,
          systemInstruction: systemInstruction ?? null,
        },
      };

      await updateDoc(
        doc(
          firebaseApp.firestore,
          'users',
          currentUserUid,
          'conversations',
          conversationId,
        ).withConverter(conversationConverter),
        convoToUpdate,
      );

      conversationsMutation.mutate({ currentUserUid, conversationId });
    }
  }, [
    chatTitle,
    conversationsMutation,
    currentUserUid,
    model,
    params.conversationId,
    systemInstruction,
    temperature,
  ]);

  if (isLoading) return null;

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
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Title of the Chat.
            </Typography>
            <TextField
              autoFocus
              value={chatTitle}
              onChange={(e) => setChatTitle(e.target.value)}
              fullWidth
            />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Define the AI's behavior and personality for the conversation.
            </Typography>
            <TextField
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              multiline
              minRows={7}
              fullWidth
            />
          </Box>
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
              sx={{ width: '95%', mx: 'auto' }}
            />
          </Box>
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
                {globalSettings.supportedGeminiModels.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained" disabled={!chatTitle}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
