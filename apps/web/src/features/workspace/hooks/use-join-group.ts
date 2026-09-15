import { api } from '@groam/backend/api';
import { useMutation } from 'convex/react';
import { type FormEvent, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import { activateOrganization } from './use-organization-activation';

export function useJoinGroup({ onJoined }: { onJoined?: () => void } = {}) {
  const redeemInvitation = useMutation(api.routes.organizations.invitations.redeem.run);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [joinedOrganizationId, setJoinedOrganizationId] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if ((!code.trim() && !joinedOrganizationId) || isPending) return;
    setError(null);
    setIsPending(true);
    let organizationId = joinedOrganizationId;
    try {
      if (!organizationId) {
        ({ organizationId } = await redeemInvitation({ code }));
        setJoinedOrganizationId(organizationId);
        setCode('');
      }
      await activateOrganization(organizationId);
      setJoinedOrganizationId(null);
      onJoined?.();
    } catch (caughtError: unknown) {
      const message = errorMessage(caughtError, 'Unable to join group');
      setError(
        organizationId
          ? `You joined the group, but it could not be opened. Try again. ${message}`
          : message
      );
    } finally {
      setIsPending(false);
    }
  };

  return { code, error, hasJoined: joinedOrganizationId !== null, isPending, setCode, submit };
}
