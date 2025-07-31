import type { GeminiModel } from './ai-models.ts';

export type ChatSettings = {
  systemInstruction: string | null;
  temperature: number | null;
  model: GeminiModel | null;
};

export type Role = 'user' | 'model' | 'system';

export type Message = {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  tokenCount: number | null;
};

export type Conversation = {
  id: string;
  createdAt: Date;
  lastUpdated: Date;
  title: string;
  isDeleted: boolean;
  chatSettings?: ChatSettings;
  tokenCount: number | null;
};

export type DraftConversation = Omit<Conversation, 'id'>;
