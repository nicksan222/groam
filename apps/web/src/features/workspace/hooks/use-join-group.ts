import { authClient } from '@groam/auth/client';
import { api } from '@groam/backend/api';
import { useMutation } from 'convex/react';
import { type FormEvent, useState } from 'react';
import { errorMessage } from '@/lib/errors';

export function useJoinGroup({ onJoined }: { onJoined?: () => void } = {}) {
  const redeemInvitation = useMutation(api.routes.organizations.invitations.redeem.run);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim() || isPending) return;
    setError(null);
    setIsPending(true);
    try {
      const { organizationId } = await redeemInvitation({ code });
      const activation = await authClient.organization.setActive({ organizationId });
      if (activation.error) {
        throw new Error(activation.error.message ?? 'Unable to open the joined group');
      }
      setCode('');
      onJoined?.();
    } catch (caughtError: unknown) {
      setError(errorMessage(caughtError, 'Unable to join group'));
    } finally {
      setIsPending(false);
    }
  };

  return { code, error, isPending, setCode, submit };
}
