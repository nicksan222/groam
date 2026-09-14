import { authClient } from '@groam/auth/client';
import { useEffect, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import type { InvitationAction, InvitationDetails } from '@/types/invitations';

export type { InvitationAction, InvitationDetails };

export function useInvitation({
  invitationId,
  onResolved
}: {
  invitationId: string;
  onResolved?: (action: InvitationAction) => Promise<void> | void;
}) {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [action, setAction] = useState<InvitationAction | null>(null);

  useEffect(() => {
    let active = true;
    setInvitation(null);
    setLoadError(null);
    setActionError(null);
    setAction(null);

    void authClient.organization
      .getInvitation({ query: { id: invitationId } })
      .then((result) => {
        if (!active) return;
        if (result.error || !result.data) {
          setLoadError(result.error?.message ?? 'Invitation not found');
          return;
        }
        setInvitation(result.data);
      })
      .catch((caughtError: unknown) => {
        if (active) setLoadError(errorMessage(caughtError, 'Unable to load invitation'));
      });

    return () => {
      active = false;
    };
  }, [invitationId]);

  const respond = async (nextAction: InvitationAction) => {
    setAction(nextAction);
    setActionError(null);
    try {
      const result =
        nextAction === 'accept'
          ? await authClient.organization.acceptInvitation({ invitationId })
          : await authClient.organization.rejectInvitation({ invitationId });
      if (result.error) {
        throw new Error(result.error.message ?? `Unable to ${nextAction} invitation`);
      }
      await onResolved?.(nextAction);
    } catch (caughtError: unknown) {
      setActionError(errorMessage(caughtError, `Unable to ${nextAction} invitation`));
      setAction(null);
    }
  };

  return {
    action,
    actionError,
    invitation,
    isLoading: loadError === null && invitation === null,
    loadError,
    respond
  };
}
