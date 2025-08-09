import type { ChatContent, Message } from '@ishtar/commons/types';
import { firebaseApp } from '../../firebase.ts';
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  and,
  doc,
  getDoc,
  startAfter,
  limit,
} from 'firebase/firestore';
import { messageConverter } from '../../converters/message-converter.ts';

export const fetchMessages = async ({
  currentUserUid,
  conversationId,
  messageId,
}: {
  currentUserUid: string;
  conversationId?: string;
  messageId?: string;
}) => {
  if (!conversationId) return [];

  let q = query(
    collection(
      firebaseApp.firestore,
      'users',
      currentUserUid,
      'conversations',
      conversationId,
      'messages',
    ).withConverter(messageConverter),
    and(where('role', '!=', 'system'), where('isSummary', '==', false)),
    orderBy('timestamp', 'desc'),
    limit(10),
  );

  if (messageId) {
    const startAfterDocRef = doc(
      firebaseApp.firestore,
      'users',
      currentUserUid,
      'conversations',
      conversationId,
      'messages',
      messageId,
    );

    const startAfterDocSnapshot = await getDoc(startAfterDocRef);

    if (startAfterDocSnapshot.exists()) {
      q = query(q, startAfter(startAfterDocSnapshot));
    }
  }

  const messagesDocs = await getDocs(q);

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

export const updateMessage = (chatContent: ChatContent): Promise<ChatContent> =>
  Promise.resolve(chatContent);
