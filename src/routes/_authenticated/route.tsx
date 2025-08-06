import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    const { auth } = context;

    if (!auth.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
