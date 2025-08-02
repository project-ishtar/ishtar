import { atom } from 'jotai';
import { loadable } from 'jotai/utils';
import type { Conversation, GlobalSettings } from '@ishtar/commons/types';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '../firebase.ts';

export const conversationsAtom = atom<Conversation[]>([]);

export const globalSettingsAtom = loadable(
  atom(async () => {
    const globalSettingsRef = doc(firebaseApp.firestore, '_settings/global');
    const globalSettingsDoc = await getDoc(globalSettingsRef);

    return globalSettingsDoc.data() as GlobalSettings;
  }),
);

export const isGlobalSettingsLoadedAtom = atom<boolean>((get) => {
  const globalSettings = get(globalSettingsAtom);
  return globalSettings.state === 'hasData';
});
