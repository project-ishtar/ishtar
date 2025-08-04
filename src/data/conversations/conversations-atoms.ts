import { atom } from 'jotai';
import { atomWithRefresh, loadable } from 'jotai/utils';
import type { Conversation } from '@ishtar/commons/types';
import { firebaseApp } from '../../firebase.ts';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { conversationConverter } from '../../converters/conversation-converter.ts';
import { currentUserUidAtom } from '../current-user/current-user-atom.ts';

const fetchConversations = async (currentUserUid: string) => {
  const conversationsRef = query(
    collection(
      firebaseApp.firestore,
      'users',
      currentUserUid,
      'conversations',
    ).withConverter(conversationConverter),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'asc'),
  );

  const conversationDocs = await getDocs(conversationsRef);

  const conversationsArr: Conversation[] = [];

  conversationDocs.forEach((conversationDoc) => {
    conversationsArr.push(conversationDoc.data() as Conversation);
  });

  return conversationsArr;
};

export const conversationsAtom = atomWithRefresh(async (get) => {
  const currentUserUid = get(currentUserUidAtom);
  return currentUserUid ? await fetchConversations(currentUserUid) : [];
});

const loadableConversations = loadable(conversationsAtom);

export const conversationsReadAtom = atom((get) => {
  const value = get(loadableConversations);
  return value.state === 'hasData' ? value.data : [];
});

export const conversationsStatusAtom = atom(
  (get) => get(loadableConversations).state,
);
