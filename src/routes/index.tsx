import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    const { auth } = context;

    if (auth.isAuthenticated) {
      throw redirect({
        to: '/app/{-$conversationId}',
      });
    } else {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
  },
});
