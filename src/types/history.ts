export type Data = { text: string };
export type Role = 'user' | 'model';

export type History = {
  id: string;
  role: Role;
  data: Data;
};
