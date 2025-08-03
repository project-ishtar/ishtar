import { useAtomValue } from 'jotai/index';
import { conversationsReadAtom } from './conversations-atoms.ts';

export const useGetConversations = () => useAtomValue(conversationsReadAtom);
