import { atomFamily, atomWithLazy, unwrap } from 'jotai/utils';
import { atom } from 'jotai';
import type { ChatContent, Message } from '@ishtar/commons/types';
import { firebaseApp } from '../../firebase.ts';
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  and,
  limit,
} from 'firebase/firestore';
import { messageConverter } from '../../converters/message-converter.ts';

const fetchMessages = async (conversationId: string | undefined) => {
  const currentUserId = firebaseApp.auth.currentUser?.uid;

  if (!currentUserId) throw new Error('Current user ID not found');

  if (!conversationId) return [];

  const messagesRef = query(
    collection(
      firebaseApp.firestore,
      'users',
      currentUserId,
      'conversations',
      conversationId,
      'messages',
    ).withConverter(messageConverter),
    and(where('role', '!=', 'system'), where('isSummary', '==', false)),
    orderBy('timestamp', 'desc'),
    limit(30),
  );

  const messagesDocs = await getDocs(messagesRef);

  const messages: Message[] = [];

  messagesDocs.forEach((conversationDoc) => {
    messages.push(conversationDoc.data() as Message);
  });

  return messages
    .map<ChatContent>((message) => ({
      id: message.id,
      role: message.role,
      text: message.content,
    }))
    .reverse();
};

export const messagesLazyAtomFamily = atomFamily((conversationId: string) =>
  atomWithLazy(async () => fetchMessages(conversationId)),
);

export const unwrappedMessagesReadAtom = atomFamily((conversationId: string) =>
  unwrap(messagesLazyAtomFamily(conversationId), (prev) => prev ?? []),
);

export const chatContentsWriteAtom = atomFamily((conversationId: string) =>
  atom(null, async (get, set, chatContent: ChatContent) => {
    const chatContents = await get(messagesLazyAtomFamily(conversationId));
    set(
      messagesLazyAtomFamily(conversationId),
      Promise.resolve([...chatContents, chatContent].slice(-30)),
    );
  }),
);
