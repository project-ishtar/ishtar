import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen.ts';
import { useAuth } from './auth/use-auth.ts';
import { LoadingSpinner } from './components/loading-spinner.tsx';
import { defaultAuthValues } from './auth/auth-context.tsx';

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  context: {
    queryClient: queryClient,
    auth: defaultAuthValues,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export const InnerApp = () => {
  const auth = useAuth();

  if (auth.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ auth }} />
    </QueryClientProvider>
  );
};
