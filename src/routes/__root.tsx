import { createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type {
  AuthenticatedAuthContextProps,
  UnAuthenticatedAuthContextProps,
} from '../auth/auth-context.tsx';

type RouteContext = {
  queryClient: QueryClient;
  auth: UnAuthenticatedAuthContextProps | AuthenticatedAuthContextProps;
};

export const Route = createRootRouteWithContext<RouteContext>()({});
