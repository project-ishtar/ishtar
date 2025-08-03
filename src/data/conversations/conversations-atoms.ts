import { atom } from 'jotai';
import { atomWithLazy, loadable } from 'jotai/utils';
import type { Conversation } from '@ishtar/commons/types';
import { firebaseApp } from '../../firebase.ts';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { conversationConverter } from '../../converters/conversation-converter.ts';

const fetchConversations = async () => {
  const currentUserId = firebaseApp.auth.currentUser?.uid;

  if (!currentUserId) throw new Error('Current user ID not found');

  const conversationsRef = query(
    collection(
      firebaseApp.firestore,
      'users',
      currentUserId,
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

const conversationsLazyAtom = atomWithLazy(fetchConversations);
const loadableConversations = loadable(conversationsLazyAtom);

export const conversationsReadAtom = atom((get) => {
  const value = get(loadableConversations);
  return value.state === 'hasData' ? value.data : [];
});

export const conversationsWriteAtom = atom(
  null,
  (_, set, value: Conversation[]) => {
    set(conversationsLazyAtom, Promise.resolve(value));
  },
);

export const conversationsStatusAtom = atom(
  (get) => get(loadableConversations).state,
);
