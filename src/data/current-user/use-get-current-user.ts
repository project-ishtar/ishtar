import { useAtomValue } from 'jotai';
import { userAtom } from './current-user-atom.ts';

export const useGetCurrentUser = () => useAtomValue(userAtom);
