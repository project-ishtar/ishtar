import { AppLayout } from './app-layout.tsx';
import { AiContent } from './ai-content.tsx';
import { useState } from 'react';
import { ChatSettings } from './chat-settings.tsx';
import { LoadingSpinner } from './loading-spinner.tsx';
import { useQuery } from '@tanstack/react-query';
import { currentUserQueryOptions } from '../data/current-user/current-user-functions.ts';
import { useAuthenticated } from '../auth/use-auth.ts';
import { conversationsQueryOptions } from '../data/conversations/conversations-functions.ts';
import { useCurrentConversation } from '../data/conversations/use-current-conversation.ts';
import { Navigate } from '@tanstack/react-router';

type AppProps = {
  conversationId?: string;
};

export const App = ({ conversationId }: AppProps) => {
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const currentUserUid = useAuthenticated().currentUserUid;

  const conversations = useQuery(conversationsQueryOptions(currentUserUid));
  const userQuery = useQuery(currentUserQueryOptions(currentUserUid));

  const currentConversation = useCurrentConversation();

  if (conversations.isPending || userQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (conversations.error) {
    throw new Error('Unable to fetch conversations');
  } else if (userQuery.error) {
    throw new Error('Unable to fetch user');
  }

  if (
    conversations.status === 'success' &&
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
        <AiContent key={conversationId} conversationId={conversationId} />
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
