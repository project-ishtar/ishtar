import { useParams } from 'react-router';
import type { RouteParams } from '../../routes/route-params.ts';
import { useAtomValue } from 'jotai';
import {
  unwrappedMessagesReadAtom,
  chatContentsWriteAtom,
} from './chat-contents-atoms.ts';
import type { ChatContent } from '@ishtar/commons/types';
import { useCallback } from 'react';
import { useSetAtom } from 'jotai/index';

export const useChatContents = (): [
  ChatContent[],
  (chatContent: ChatContent) => Promise<void>,
] => {
  const params = useParams<RouteParams>();

  const chatContents = useAtomValue(
    unwrappedMessagesReadAtom(params.conversationId ?? ''),
  );

  const setChatContentsFunc = useSetAtom(
    chatContentsWriteAtom(params.conversationId ?? ''),
  );

  const setChatContent = useCallback(
    async (chatContent: ChatContent) => {
      await setChatContentsFunc(chatContent);
    },
    [setChatContentsFunc],
  );

  return [chatContents, setChatContent];
};
