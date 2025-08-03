import { converter } from './converters.ts';
import type { User } from '@ishtar/commons/types';
import { Timestamp } from 'firebase/firestore';

export const userConverter = converter<User>({
  fromFirestore: (id, data) => {
    return {
      id,
      displayName: data.displayName,
      email: data.email,
      hasCompletedOnboarding: data.hasCompletedOnboarding,
      photoURL: data.photoURL,
      role: data.role,
      createdAt: (data.createdAt as unknown as Timestamp).toDate(),
      lastActive: (data.lastActive as unknown as Timestamp).toDate(),
    };
  },
});
