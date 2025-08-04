import { useAtomValue } from 'jotai';
import { currentUserUidAtom } from './current-user-atom.ts';

export const useGetCurrentUserId = () => useAtomValue(currentUserUidAtom);
