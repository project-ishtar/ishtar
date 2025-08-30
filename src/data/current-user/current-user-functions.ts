import { doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '../../firebase.ts';
import { userConverter } from '../../converters/user-converter.ts';
import type { User } from '@ishtar/commons/types';

export const fetchCurrentUser = async (currentUserUid: string) => {
  const userRef = doc(
    firebaseApp.firestore,
    'users',
    currentUserUid,
  ).withConverter(userConverter);

  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    throw new Error('Unable to fetch user.');
  }

  return userSnapshot.data() as User;
};
