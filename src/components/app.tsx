import { AppLayout } from './app-layout.tsx';
import { AiContent } from './ai-content.tsx';
import { useEffect, useState } from 'react';
import { ChatSettings } from './chat-settings.tsx';
import type { Conversation } from '@ishtar/commons/types';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from 'firebase/firestore';
import { firebaseApp } from '../firebase.ts';
import { conversationConverter } from '../converters/conversation-converter.ts';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  conversationsAtom,
  isGlobalSettingsLoadedAtom,
} from '../data/atoms.ts';

export const App = () => {
  const [isLoading, setLoading] = useState(true);
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const setConversations = useSetAtom(conversationsAtom);
  const isGlobalSettingsLoaded = useAtomValue(isGlobalSettingsLoadedAtom);

  useEffect(() => {
    const currentUserId = firebaseApp.auth.currentUser?.uid;

    let unsubscribe: Unsubscribe;

    if (currentUserId && isLoading) {
      const conversationsRef = query(
        collection(
          firebaseApp.firestore,
          'users',
          currentUserId,
          'conversations',
        ).withConverter(conversationConverter),
        orderBy('createdAt', 'asc'),
      );

      unsubscribe = onSnapshot(conversationsRef, (conversationDocs) => {
        const conversationsArr: Conversation[] = [];

        conversationDocs.forEach((conversationDoc) => {
          conversationsArr.push(conversationDoc.data() as Conversation);
        });

        setConversations(conversationsArr);

        if (isLoading) {
          setLoading(false);
        }
      });
    }

    return () => {
      unsubscribe?.();
    };
  }, [isLoading, setConversations]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress size={100} />
      </Box>
    );
  }

  return (
    <>
      <AppLayout onSettingsClick={() => setSettingsOpen(true)}>
        <AiContent />
      </AppLayout>
      {isGlobalSettingsLoaded ? (
        <ChatSettings
          isOpen={isSettingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      ) : undefined}
    </>
  );
};
