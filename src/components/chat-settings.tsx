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
} from '@ishtar/commons/types';
import { useNavigate, useParams } from 'react-router';
import { firebaseApp } from '../firebase';
import { getDoc, doc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { getGlobalSettings } from '../db/cached-global-settings.ts';
import { conversationConverter } from '../converters/conversation-converter.ts';

type ChatSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const ChatSettings = ({ isOpen, onClose }: ChatSettingsProps) => {
  const params = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const [isLoading, setLoading] = useState(true);
  const [chatTitle, setChatTitle] = useState('');
  const [systemInstruction, setSystemInstruction] = useState<string>();
  const [temperature, setTemperature] = useState(1);
  const [model, setModel] = useState<GeminiModel>();
  const [supportedModels, setSupportedModels] = useState<GeminiModel[]>([
    'gemini-2.0-flash-lite',
  ]);

  const setGeminiModels = useCallback(async () => {
    const globalSettings = await getGlobalSettings();

    if (globalSettings?.supportedGeminiModels) {
      setSupportedModels(globalSettings.supportedGeminiModels);
    }
  }, []);

  const initializeData = useCallback(async () => {
    const currentUserId = firebaseApp.auth?.currentUser?.uid;
    const conversationId = params.conversationId;

    if (conversationId && currentUserId) {
      const conversationDocRef = doc(
        firebaseApp.firestore,
        'users',
        currentUserId,
        'conversations',
        conversationId,
      ).withConverter(conversationConverter);

      const conversationDocSnap = await getDoc(conversationDocRef);

      if (conversationDocSnap.exists()) {
        const conversation = conversationDocSnap.data() as Conversation;

        setChatTitle(conversation?.title);
        setSystemInstruction(
          conversation?.chatSettings?.systemInstruction ?? undefined,
        );
        setTemperature(conversation?.chatSettings?.temperature ?? 1);
        setModel(conversation?.chatSettings?.model ?? 'gemini-2.0-flash-lite');
      }
    } else {
      const globalSettings = await getGlobalSettings();

      setChatTitle(`New Chat - ${Date.now()}`);
      setTemperature(globalSettings.temperature ?? 1);
      setModel(globalSettings?.defaultGeminiModel ?? 'gemini-2.0-flash-lite');
    }

    setLoading(false);
  }, [params.conversationId]);

  useEffect(() => {
    setGeminiModels();
    initializeData();
  }, [initializeData, setGeminiModels]);

  const onSave = useCallback(async () => {
    const currentUserId = firebaseApp.auth?.currentUser?.uid;
    const conversationId = params.conversationId;

    if (currentUserId) {
      if (!conversationId) {
        const newConversation: DraftConversation = {
          createdAt: new Date(),
          lastUpdated: new Date(),
          title: chatTitle,
          isDeleted: false,
          summarizedMessageId: null,
          chatSettings: {
            temperature,
            model: model ?? null,
            systemInstruction: systemInstruction ?? null,
          },
          tokenCount: 0,
        };
        const newDoc = await addDoc(
          collection(
            firebaseApp.firestore,
            'users',
            currentUserId,
            'conversations',
          ).withConverter(conversationConverter),
          newConversation,
        );

        navigate(`/app/${newDoc.id}`);
      } else {
        await updateDoc(
          doc(
            firebaseApp.firestore,
            'users',
            currentUserId,
            'conversations',
            conversationId,
          ).withConverter(conversationConverter),
          {
            lastUpdated: new Date(),
            title: chatTitle,
            chatSettings: {
              temperature,
              model: model ?? null,
              systemInstruction: systemInstruction ?? null,
            },
          },
        );
      }

      onClose();
    }
  }, [
    chatTitle,
    model,
    navigate,
    onClose,
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
                {supportedModels.map((model) => (
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
