import { AppLayout } from './app-layout.tsx';
import { AiContent } from './ai-content.tsx';
import { ProtectedRoute } from '../routes/protected-route.tsx';
import { useState } from 'react';
import { ChatSettings } from './chat-settings.tsx';

export const App = () => {
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  return (
    <ProtectedRoute>
      <AppLayout onSettingsClick={() => setSettingsOpen(true)}>
        <AiContent />
      </AppLayout>
      <ChatSettings
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </ProtectedRoute>
  );
};
