import { useSetAtom } from 'jotai/index';
import { conversationsAtom } from './conversations-atoms.ts';

export const useRefreshConversations = () => useSetAtom(conversationsAtom);
