import type { ChatContent, Message } from '@ishtar/commons/types';
import { firebaseApp } from '../../firebase.ts';
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  and,
  startAfter,
  limit,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { messageConverter } from '../../converters/message-converter.ts';

export type Cursor = QueryDocumentSnapshot | undefined;

export type MessagePage = { messages: ChatContent[]; nextCursor: Cursor };

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

  const messages: ChatContent[] = messagesDocs.docs
    .map((doc) => {
      const message = doc.data() as Message;
      return {
        id: message.id,
        role: message.role,
        text: message.content,
      };
    })
    .reverse();

  const lastVisibleDoc = messagesDocs.docs[messagesDocs.docs.length - 1];

  return {
    messages,
    nextCursor: messagesDocs.docs.length < 10 ? undefined : lastVisibleDoc,
  };
};
