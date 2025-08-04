import { converter } from './converters.ts';
import type { Message } from '@ishtar/commons/types';
import { Timestamp } from 'firebase/firestore';

export const messageConverter = converter<Message>({
  fromFirestore: (id, data) => {
    return {
      id,
      role: data.role,
      content: data.content,
      tokenCount: data.tokenCount,
      timestamp: (data.timestamp as unknown as Timestamp).toDate(),
      isSummary: data.isSummary,
    };
  },
});
