import { AppLayout } from './app-layout.tsx';
import { AiContent } from './ai-content.tsx';
import { useState } from 'react';
import { ChatSettings } from './chat-settings.tsx';
import { useAtomValue } from 'jotai';
import { LoadingSpinner } from './loading-spinner.tsx';
import { conversationsStatusAtom } from '../data/conversations/conversations-atoms.ts';
import { useCurrentConversation } from '../data/conversations/use-current-conversation.ts';
import { Navigate, useParams } from 'react-router';
import type { RouteParams } from '../routes/route-params.ts';
import { userStatusAtom } from '../data/current-user/current-user-atom.ts';

export const App = () => {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const currentConversation = useCurrentConversation();
  const params = useParams<RouteParams>();

  const conversationsFetchStatus = useAtomValue(conversationsStatusAtom);
  const userFetchStatus = useAtomValue(userStatusAtom);

  if (conversationsFetchStatus === 'loading' || userFetchStatus === 'loading') {
    return <LoadingSpinner />;
  }

  if (
    conversationsFetchStatus === 'hasData' &&
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
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};
