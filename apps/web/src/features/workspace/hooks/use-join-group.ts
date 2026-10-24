import { api } from '@groam/backend/api';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { errorMessage } from '@/lib/errors';
import { activateOrganization } from './use-organization-activation';

export function useJoinGroup({ onJoined }: { onJoined?: () => void } = {}) {
  const redeemInvitation = useMutation(api.routes.organizations.invitations.redeem.run);
  const form = useFormSubmit({ fallbackError: 'Unable to join group' });
  const [code, setCode] = useState('');
  const [unopened, setUnopened] = useState<{
    membership: 'existing' | 'joined';
    organizationId: string;
  } | null>(null);

  const join = async () => {
    if (!code.trim() && !unopened) return;
    let activation = unopened;
    try {
      if (!activation) {
        activation = await redeemInvitation({ code });
        setUnopened(activation);
        setCode('');
      }
      await activateOrganization(activation.organizationId);
      setUnopened(null);
      onJoined?.();
    } catch (caughtError: unknown) {
      throw new Error(joinGroupError(caughtError, activation), { cause: caughtError });
    }
  };

  return {
    code,
    error: form.error,
    hasPendingActivation: unopened !== null,
    isPending: form.isPending,
    setCode,
    submit: form.handle(join)
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
