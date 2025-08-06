import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginPage } from '../components/login-page.tsx';
import { z } from 'zod';

export const Route = createFileRoute('/login')({
  component: RouteComponent,
  validateSearch: z.object({
    redirect: z.string().optional().catch(''),
  }),
  beforeLoad: ({ context, search }) => {
    const { auth } = context;

    if (auth.isAuthenticated) {
      throw redirect({ to: search.redirect ?? '/app/{-$conversationId}' });
    }
  },
});

function RouteComponent() {
  return <LoginPage />;
}
