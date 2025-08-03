import { AppLayout } from './app-layout.tsx';
import { AiContent } from './ai-content.tsx';
import { useCallback, useEffect, useState } from 'react';
import { ChatSettings } from './chat-settings.tsx';
import type { Conversation } from '@ishtar/commons/types';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { firebaseApp } from '../firebase.ts';
import { conversationConverter } from '../converters/conversation-converter.ts';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  conversationsAtom,
  isGlobalSettingsLoadedAtom,
} from '../data/atoms.ts';
import { LoadingSpinner } from './loading-spinner.tsx';

export const App = () => {
  const [isLoading, setLoading] = useState(true);
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const setConversations = useSetAtom(conversationsAtom);
  const isGlobalSettingsLoaded = useAtomValue(isGlobalSettingsLoadedAtom);

  const initConversations = useCallback(async () => {
    const currentUserId = firebaseApp.auth.currentUser?.uid;

    if (currentUserId && isLoading) {
      const conversationsRef = query(
        collection(
          firebaseApp.firestore,
          'users',
          currentUserId,
          'conversations',
        ).withConverter(conversationConverter),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'asc'),
      );

      const conversationDocs = await getDocs(conversationsRef);

      const conversationsArr: Conversation[] = [];

      conversationDocs.forEach((conversationDoc) => {
        conversationsArr.push(conversationDoc.data() as Conversation);
      });

      setConversations(conversationsArr);

      if (isLoading) {
        setLoading(false);
      }
    }
  }, [isLoading, setConversations]);

  useEffect(() => {
    initConversations();
  }, [initConversations]);

  if (isLoading) {
    return <LoadingSpinner />;
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
