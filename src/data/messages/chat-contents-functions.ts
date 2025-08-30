import type { Message } from '@ishtar/commons/types';
import { firebaseApp } from '../../firebase.ts';
import {
  and,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type QueryDocumentSnapshot,
  startAfter,
  where,
} from 'firebase/firestore';
import { messageConverter } from '../../converters/message-converter.ts';

export type Cursor = QueryDocumentSnapshot | undefined;

export type MessagePage = { messages: Message[]; nextCursor: Cursor };

export const fetchMessages = async ({
  currentUserUid,
  conversationId,
  cursor,
}: {
  currentUserUid: string;
  conversationId?: string;
  cursor?: Cursor;
}): Promise<MessagePage> => {
  if (!conversationId) return { messages: [], nextCursor: undefined };

  const messagesCollection = collection(
    firebaseApp.firestore,
    'users',
    currentUserUid,
    'conversations',
    conversationId,
    'messages',
  ).withConverter(messageConverter);

  let q = query(
    messagesCollection,
    and(where('role', '!=', 'system'), where('isSummary', '==', false)),
    orderBy('timestamp', 'desc'),
    limit(10),
  );

  if (cursor) {
    q = query(q, startAfter(cursor));
  }

  const messagesDocs = await getDocs(q);

  const messages: Message[] = messagesDocs.docs
    .map((doc) => doc.data() as Message)
    .reverse();

  const lastVisibleDoc = messagesDocs.docs[messagesDocs.docs.length - 1];

  return {
    messages,
    nextCursor: messagesDocs.docs.length < 10 ? undefined : lastVisibleDoc,
  };
};
