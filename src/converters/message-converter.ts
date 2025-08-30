import { converter } from './converters.ts';
import type { Message } from '@ishtar/commons/types';
import { Timestamp } from 'firebase/firestore';

export const messageConverter = converter<Message>({
  fromFirestore: (id, data) => {
    return {
      id,
      role: data.role,
      contents: data.contents,
      tokenCount: data.tokenCount,
      timestamp: (data.timestamp as unknown as Timestamp).toDate(),
      isSummary: data.isSummary,
    };
  },
  toFirestore: (message) => {
    return {
      role: message.role,
      contents: message.contents,
      tokenCount: message.tokenCount ?? null,
      isSummary: message.isSummary,
      timestamp:
        message.timestamp instanceof Date
          ? Timestamp.fromDate(message.timestamp)
          : message.timestamp,
    };
  },
});
