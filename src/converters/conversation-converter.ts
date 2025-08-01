import type { ChatSettings, Conversation } from '@ishtar/commons/types';
import {
  type PartialWithFieldValue,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';

type ConverterArgs<T, U, V> = {
  toFirestore?: (data: PartialWithFieldValue<T>) => U;
  fromFirestore?: (id: string, data: T) => V;
};

const converter = <T, U = PartialWithFieldValue<T>, V = T>({
  toFirestore,
  fromFirestore,
}: ConverterArgs<T, U, V>) => ({
  toFirestore: (data: PartialWithFieldValue<T>) =>
    toFirestore ? toFirestore(data) : data,
  fromFirestore: (snap: QueryDocumentSnapshot<T>) =>
    fromFirestore ? fromFirestore(snap.id, snap.data()) : snap.data(),
});

export const conversationConverter = converter<Conversation>({
  toFirestore: (conversation) => {
    return {
      title: conversation.title,
      isDeleted: conversation.isDeleted,
      chatSettings: {
        systemInstruction:
          (conversation.chatSettings as ChatSettings)?.systemInstruction ??
          null,
        temperature:
          (conversation.chatSettings as ChatSettings)?.temperature ?? null,
        model: (conversation.chatSettings as ChatSettings)?.model ?? null,
      },
      tokenCount: conversation.tokenCount ?? null,
      createdAt:
        conversation.createdAt instanceof Date
          ? Timestamp.fromDate(conversation.createdAt)
          : conversation.createdAt,
      lastUpdated:
        conversation.lastUpdated instanceof Date
          ? Timestamp.fromDate(conversation.lastUpdated)
          : conversation.lastUpdated,
    };
  },
  fromFirestore: (id, data) => {
    return {
      id,
      title: data.title,
      isDeleted: data.isDeleted,
      chatSettings: {
        systemInstruction: data.chatSettings?.systemInstruction ?? null,
        temperature: data.chatSettings?.temperature ?? null,
        model: data.chatSettings?.model ?? null,
      },
      tokenCount: data.tokenCount,
      createdAt: (data.createdAt as unknown as Timestamp).toDate(),
      lastUpdated: (data.lastUpdated as unknown as Timestamp).toDate(),
    };
  },
});
