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
  const [pendingActivation, setPendingActivation] = useState<{
    membership: 'existing' | 'joined';
    organizationId: string;
  } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if ((!code.trim() && !pendingActivation) || isPending) return;
    setError(null);
    setIsPending(true);
    let activation = pendingActivation;
    try {
      if (!activation) {
        activation = await redeemInvitation({ code });
        setPendingActivation(activation);
        setCode('');
      }
      await activateOrganization(activation.organizationId);
      setPendingActivation(null);
      onJoined?.();
    } catch (caughtError: unknown) {
      const message = errorMessage(caughtError, 'Unable to join group');
      setError(
        activation
          ? activation.membership === 'existing'
            ? `You already belong to this group, but it could not be opened. Try again. ${message}`
            : `You joined the group, but it could not be opened. Try again. ${message}`
          : message
      );
    } finally {
      setIsPending(false);
    }
  };

  return {
    code,
    error,
    hasPendingActivation: pendingActivation !== null,
    isPending,
    setCode,
    submit
  };
}
