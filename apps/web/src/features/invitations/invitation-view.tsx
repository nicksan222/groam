import { useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useNavigate } from '@tanstack/react-router';
import { Building2 } from 'lucide-react';
import { useClaimInvitation } from './hooks/use-claim-invitation';
import { useInvitation } from './hooks/use-invitation';
import { InvitationCard } from './invitation-card';

function inviteLandingCopy() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const trip = params.get('trip');
  const group = params.get('group');
  if (trip) return trip;
  if (group) return group;
  return null;
}

export function InvitationView({ invitationId }: { invitationId: string }) {
  const navigate = useNavigate();
  const claimInvitation = useClaimInvitation();
  const landing = inviteLandingCopy();
  const goHome = () => navigate({ to: '/' });
  const afterRespond = async (nextAction: 'accept' | 'reject') => {
    if (nextAction === 'accept') {
      const tripId = await claimInvitation(invitationId);
      if (tripId) {
        await navigate({
          params: { section: 'overview', tripId },
          to: '/trips/$tripId/$section'
        });
        return;
      }
    }
    await goHome();
  };
  const { action, actionError, invitation, isLoading, loadError, respond } = useInvitation({
    invitationId,
    onResolved: afterRespond
  });

  useSetAgentContext({
    capabilities: [],
    data: {
      error: loadError ?? actionError,
      invitation: invitation
        ? {
            groupName: invitation.organizationName,
            inviterEmail: invitation.inviterEmail,
            role: invitation.role
          }
        : null,
      isLoading: !loadError && !invitation
    },
    description: 'Explain the visible group invitation and what accepting or declining means.',
    key: `invitation:${invitationId}`,
    title: invitation ? `Invitation · ${invitation.organizationName}` : 'Group invitation'
  });

  if (isLoading && !invitation && !loadError) return <PageLoading label="Loading invitation…" />;

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/20 p-6">
      {loadError ? (
        <EmptyScreen
          border
          buttonOnClick={() => void goHome()}
          buttonText="Return to Groam"
          className="max-w-md"
          description={loadError}
          headline="Invitation unavailable"
          icon={Building2}
        />
      ) : (
        <InvitationCard
          action={action}
          actionError={actionError}
          invitation={invitation ?? undefined}
          isLoading={isLoading && !invitation}
          landingName={landing}
          onAccept={() => void respond('accept')}
          onDecline={() => void respond('reject')}
        />
      )}
    </main>
  );
}
