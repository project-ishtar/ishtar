import { User } from '@ishtar/commons/types';
import { db } from '../index';
import { HttpsError } from 'firebase-functions/https';

const cache: Record<string, User> = {};

export async function getUserById(userId: string): Promise<User> {
  if (cache[userId]) return cache[userId];

  const userDoc = db.collection('users').doc(userId);
  const userSnapshot = await userDoc.get();

  if (userSnapshot.exists) {
    const user = userSnapshot.data() as User;
    cache[userId] = user;

    return user;
  }

  throw new HttpsError(
    'unauthenticated',
    'You must be authenticated to call this function.',
  );
}
