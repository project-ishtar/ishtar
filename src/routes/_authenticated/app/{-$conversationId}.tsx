import { createFileRoute } from '@tanstack/react-router';
import { App } from '../../../components/app.tsx';

export const Route = createFileRoute('/_authenticated/app/{-$conversationId}')({
  component: RouteComponent,
});

function RouteComponent() {
  const { conversationId } = Route.useParams();

  return <App conversationId={conversationId} />;
}
