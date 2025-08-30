import type { Message } from '@ishtar/commons/types';

export class AiFailureError extends Error {
  conversationId?: string;
  promptMessage?: Message;
  cause: unknown;

  constructor(
    message: string,
    details: {
      conversationId?: string;
      promptMessage?: Message;
      originalError: unknown;
    },
  ) {
    super(message, { cause: details.originalError });

    this.conversationId = details.conversationId;
    this.promptMessage = details.promptMessage;
    this.cause = details.originalError;
  }
}
