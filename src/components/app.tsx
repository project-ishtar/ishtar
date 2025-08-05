import { AppLayout } from './app-layout.tsx';
import { AiContent } from './ai-content.tsx';
import { useState } from 'react';
import { ChatSettings } from './chat-settings.tsx';
import { LoadingSpinner } from './loading-spinner.tsx';
import { Navigate, useParams } from 'react-router';
import type { RouteParams } from '../routes/route-params.ts';
import { useQuery } from '@tanstack/react-query';
import { currentUserQueryOptions } from '../data/current-user/current-user-functions.ts';
import { useAuth } from '../auth/use-auth.ts';
import { conversationsQueryOptions } from '../data/conversations/conversations-functions.ts';
import { useCurrentConversation } from '../data/conversations/use-current-conversation.ts';

export const App = () => {
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const currentUserUid = useAuth().currentUserUid;
  const params = useParams<RouteParams>();

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
    params.conversationId &&
    !currentConversation
  ) {
    return <Navigate to="/app" />;
  }

  return (
    <>
      <AppLayout onSettingsClick={() => setSettingsOpen(true)}>
        <AiContent key={params.conversationId} />
      </AppLayout>
      <ChatSettings
        currentUser={userQuery.data}
        key={params.conversationId}
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};
