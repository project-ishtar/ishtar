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

export const fetchMessages = async (
  currentUserUid: string,
  conversationId: string | undefined,
) => {
  if (!conversationId) return [];

  const messagesRef = query(
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

export const updateMessage = (chatContent: ChatContent): Promise<ChatContent> =>
  Promise.resolve(chatContent);
