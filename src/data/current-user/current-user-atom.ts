import { firebaseApp } from '../../firebase.ts';
import { atomWithLazy, loadable } from 'jotai/utils';
import { doc, getDoc } from 'firebase/firestore';
import { userConverter } from '../../converters/user-converter.ts';
import type { User } from '@ishtar/commons/types';
import { atom } from 'jotai';

const fetchCurrentUser = async () => {
  const currentUserId = firebaseApp.auth.currentUser?.uid;

  if (!currentUserId) throw new Error('Current user ID not found');

  const userRef = doc(
    firebaseApp.firestore,
    'users',
    currentUserId,
  ).withConverter(userConverter);

  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    throw new Error('Unable to fetch user.');
  }

  return userSnapshot.data() as User;
};

const userLazyAtom = atomWithLazy(fetchCurrentUser);
const loadableUser = loadable(userLazyAtom);

export const currentUserIdAtom = atomWithLazy(
  () => firebaseApp.auth.currentUser!.uid!,
);

export const userStatusAtom = atom((get) => get(loadableUser).state);

export const userAtom = atom((get): User => {
  const atomValue = get(loadableUser);
  return atomValue.state !== 'hasData' ? ({} as User) : atomValue.data;
});
