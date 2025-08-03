import { useAtomValue } from 'jotai';
import { currentUserIdAtom } from './current-user-atom.ts';

export const useGetCurrentUserId = () => useAtomValue(currentUserIdAtom);
