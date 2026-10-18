import { api } from '@groam/backend/api';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import type { InvitationCode } from '@/types/invitation-codes';

export function useInvitationCodes(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, [enabled]);

  const codes = useQuery(api.routes.organizations.invitations.list.run, enabled ? { now } : 'skip');
  const revokeMutation = useMutation(api.routes.organizations.invitations.revoke.run);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<InvitationCode['id'] | null>(null);

  const revoke = async (invitationCodeId: InvitationCode['id']) => {
    setError(null);
    setPendingId(invitationCodeId);
    try {
      await revokeMutation({ invitationCodeId });
    } catch (caughtError: unknown) {
      setError(errorMessage(caughtError, 'Unable to revoke invitation code'));
    } finally {
      setPendingId(null);
    }
  };

  return {
    codes: codes ?? [],
    error,
    isLoading: codes === undefined && enabled,
    pendingId,
    revoke
  };
}
