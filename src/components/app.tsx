import { AppLayout } from './app-layout.tsx';
import { AiContent } from './ai-content.tsx';
import { useEffect, useState } from 'react';
import { ChatSettings } from './chat-settings.tsx';
import { LoadingSpinner } from './loading-spinner.tsx';
import { useCurrentConversation } from '../data/conversations/use-current-conversation.ts';
import { Navigate } from '@tanstack/react-router';
import { useConversations } from '../data/conversations/use-conversations.ts';
import { useCurrentUser } from '../data/current-user/use-current-user.ts';

type AppProps = {
  conversationId?: string;
};

export const App = ({ conversationId }: AppProps) => {
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const { currentUserQuery } = useCurrentUser();
  const { conversationsQuery } = useConversations();

  const currentConversation = useCurrentConversation();

  useEffect(() => {
    if (currentUserQuery.status === 'success') {
      document.title = currentUserQuery.data.displayName;
    }
  }, [currentUserQuery]);

  if (conversationsQuery.isPending || currentUserQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (conversationsQuery.error) {
    throw new Error('Unable to fetch conversationsQuery');
  } else if (currentUserQuery.error) {
    throw new Error('Unable to fetch user');
  }

  if (
    conversationsQuery.status === 'success' &&
    conversationId &&
    !currentConversation
  ) {
    return (
      <Navigate
        to={`/app/{-$conversationId}`}
        params={{ conversationId: undefined }}
      />
    );
  }

  return (
    <>
      <AppLayout
        onSettingsClick={() => setSettingsOpen(true)}
        conversationId={conversationId}
      >
        <AiContent key={conversationId} />
      </AppLayout>
      <ChatSettings
        key={conversationId}
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        conversationId={conversationId}
      />
    </>
  );
};
