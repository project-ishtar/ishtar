export type UserRole = 'basic' | 'admin';

export type User = {
  id: string;
  displayName: string;
  email: string;
  hasCompletedOnboarding: boolean;
  photoURL: string;
  role: UserRole;
  createdAt: Date;
  lastActive: Date;
};
