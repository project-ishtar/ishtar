import type { GeminiModel } from './ai-models.ts';

export type ChatSettings = {
  systemInstruction?: string;
  temperature?: number;
  model?: GeminiModel;
};

export type Role = 'user' | 'model' | 'system';

export type Message = {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  tokenCount?: number;
};

export type Conversation = {
  id: string;
  createdAt: Date;
  lastUpdated: Date;
  title: string;
  isDeleted: boolean;
  chatSettings?: ChatSettings;
  messages: Message[];
};
