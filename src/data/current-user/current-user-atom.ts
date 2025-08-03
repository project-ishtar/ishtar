import { firebaseApp } from '../../firebase.ts';
import { atomWithLazy } from 'jotai/utils';

export const currentUserIdAtom = atomWithLazy(
  () => firebaseApp.auth.currentUser!.uid!,
);
