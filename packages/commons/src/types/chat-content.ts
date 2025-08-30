import type { Content, Role } from './conversation.ts';

export type ChatContent = {
  id: string;
  contents: Content[];
  role: Role;
};
