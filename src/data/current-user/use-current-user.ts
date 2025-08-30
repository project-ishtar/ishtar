import { useAuthenticated } from '../../auth/use-auth.ts';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchCurrentUser } from './current-user-functions.ts';
import { useCallback, useMemo } from 'react';
import type { User } from '@ishtar/commons/types';

type UseCurrentUserResult = {
  currentUserUid: string;
  currentUserQuery: UseQueryResult<User, Error>;
  getCurrentUserOrThrow: () => User;
};

export const useCurrentUser = (): UseCurrentUserResult => {
  const currentUserUid = useAuthenticated().currentUserUid;

  const currentUserQuery = useQuery({
    queryKey: ['user', currentUserUid],
    queryFn: () => fetchCurrentUser(currentUserUid),
  });

  const getCurrentUserOrThrow = useCallback(() => {
    if (currentUserQuery.status === 'success') {
      return currentUserQuery.data;
    }

    throw new Error('Unable to retrieve user.');
  }, [currentUserQuery.data, currentUserQuery.status]);

  return useMemo(
    () => ({ currentUserUid, currentUserQuery, getCurrentUserOrThrow }),
    [currentUserQuery, currentUserUid, getCurrentUserOrThrow],
  );
};
