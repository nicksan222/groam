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
      setError(joinGroupError(caughtError, activation));
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

function joinGroupError(
  error: unknown,
  activation: { membership: 'existing' | 'joined'; organizationId: string } | null
) {
  const message = errorMessage(error, 'Unable to join group');
  if (!activation) return message;
  const prefix =
    activation.membership === 'existing'
      ? 'You already belong to this group'
      : 'You joined the group';
  return `${prefix}, but it could not be opened. Try again. ${message}`;
}
