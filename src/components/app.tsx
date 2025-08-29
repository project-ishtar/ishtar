import { AppLayout } from './app-layout.tsx';
import { AiContent } from './ai-content.tsx';
import { useEffect, useState } from 'react';
import { ChatSettings } from './chat-settings.tsx';
import { LoadingSpinner } from './loading-spinner.tsx';
import { useQuery } from '@tanstack/react-query';
import { currentUserQueryOptions } from '../data/current-user/current-user-functions.ts';
import { useAuthenticated } from '../auth/use-auth.ts';
import { useCurrentConversation } from '../data/conversations/use-current-conversation.ts';
import { Navigate } from '@tanstack/react-router';
import { useConversations } from '../data/conversations/use-conversations.ts';

type AppProps = {
  conversationId?: string;
};

export const App = ({ conversationId }: AppProps) => {
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const currentUserUid = useAuthenticated().currentUserUid;

  const { conversationsQuery } = useConversations();
  const userQuery = useQuery(currentUserQueryOptions(currentUserUid));

  const currentConversation = useCurrentConversation();

  useEffect(() => {
    if (userQuery.status === 'success') {
      document.title = userQuery.data.displayName;
    }
  }, [userQuery]);

  if (conversationsQuery.isPending || userQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (conversationsQuery.error) {
    throw new Error('Unable to fetch conversationsQuery');
  } else if (userQuery.error) {
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
        currentUser={userQuery.data}
        key={conversationId}
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        conversationId={conversationId}
      />
    </>
  );
};
