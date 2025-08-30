import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { DocumentData } from 'firebase/firestore';
import admin from 'firebase-admin';
import { Message } from '@ishtar/commons/types';

export const chatMessageConverter = {
  toFirestore: (message: Message): DocumentData => {
    return {
      role: message.role,
      contents: message.contents,
      tokenCount: message.tokenCount,
      timestamp:
        message.timestamp instanceof Date
          ? admin.firestore.Timestamp.fromDate(message.timestamp)
          : message.timestamp,
      isSummary: message.isSummary,
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<Message>): Message => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      role: data.role,
      contents: data.contents,
      tokenCount: data.tokenCount,
      timestamp: (
        data.timestamp as unknown as admin.firestore.Timestamp
      ).toDate(),
      isSummary: data.isSummary,
    };
  },
};
