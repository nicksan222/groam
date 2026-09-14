import { Button } from '@groam/ui/components/button';
import { DecisionCard } from '@groam/ui/components/decision-card';
import { IconTile } from '@groam/ui/components/icon-tile';
import { Skeleton } from '@groam/ui/components/skeleton';
import { Spinner } from '@groam/ui/components/spinner';
import { Building2, Check, X } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import type { InvitationAction, InvitationDetails } from './hooks/use-invitation';

export function InvitationCard({
  action,
  actionError,
  invitation,
  isLoading = false,
  landingName,
  onAccept,
  onDecline
}: {
  action?: InvitationAction | null;
  actionError?: string | null;
  invitation?: InvitationDetails;
  isLoading?: boolean;
  landingName?: string | null;
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  if (isLoading || !invitation) {
    return (
      <DecisionCard
        actions={
          <>
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 flex-1 rounded-md" />
          </>
        }
        description={
          <>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </>
        }
        icon={<Skeleton className="size-11 rounded-xl" />}
        title={<Skeleton className="h-7 w-48" />}
      />
    );
  }

  const isPending = action !== null;

  return (
    <DecisionCard
      actions={
        <>
          <Button
            className="flex-1"
            data-testid={testIds.invitationAccept}
            disabled={isPending}
            onClick={onAccept}
          >
            {action === 'accept' ? <Spinner /> : <Check />}
            Accept
          </Button>
          <Button
            className="flex-1"
            data-testid={testIds.invitationDecline}
            disabled={isPending}
            onClick={onDecline}
          >
            {action === 'reject' ? <Spinner /> : <X />}
            Decline
          </Button>
        </>
      }
      description={
        landingName ? (
          `${invitation.inviterEmail} invited you to ${landingName}.`
        ) : (
          <>
            {invitation.inviterEmail} invited {invitation.email} to join as a{' '}
            <span className="font-medium text-foreground">{invitation.role}</span>.
          </>
        )
      }
      error={actionError}
      icon={
        <IconTile className="size-11 rounded-xl">
          <Building2 />
        </IconTile>
      }
      title={landingName ? `Join ${landingName}` : `Join ${invitation.organizationName}`}
    />
  );
}
