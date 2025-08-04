import type { Role } from './conversation.ts';

export type ChatContent = {
  id: string;
  text: string;
  role: Role;
};
