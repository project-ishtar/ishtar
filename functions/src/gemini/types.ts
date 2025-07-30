export type Role = 'user' | 'model' | 'system';

export type Message = {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
};
