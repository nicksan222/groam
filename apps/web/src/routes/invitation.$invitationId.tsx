import { createFileRoute } from '@tanstack/react-router';
import { InvitationView } from '@/features/invitations/invitation-view';

export const Route = createFileRoute('/invitation/$invitationId')({
  component: InvitationRoute
});

function InvitationRoute() {
  const { invitationId } = Route.useParams();
  return <InvitationView invitationId={invitationId} />;
}
