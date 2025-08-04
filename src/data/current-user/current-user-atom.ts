import { firebaseApp } from '../../firebase.ts';
import { loadable } from 'jotai/utils';
import { doc, getDoc } from 'firebase/firestore';
import { userConverter } from '../../converters/user-converter.ts';
import type { User } from '@ishtar/commons/types';
import { atom } from 'jotai';

const fetchCurrentUser = async (currentUserUid: string) => {
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

export const currentUserUidAtom = atom<string | null>(null);

const userLazyAtom = atom(async (get) => {
  const currentUserUid = get(currentUserUidAtom);
  return currentUserUid ? await fetchCurrentUser(currentUserUid) : null;
});

const loadableUser = loadable(userLazyAtom);

export const userStatusAtom = atom((get) => get(loadableUser).state);

export const userAtom = atom((get): User => {
  const atomValue = get(loadableUser);
  return atomValue.state !== 'hasData'
    ? ({} as User)
    : ((atomValue.data ?? {}) as User);
});
