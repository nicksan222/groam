import { api } from '@groam/backend/api';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
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
  const { error, isPending, run } = useAsyncAction({
    fallbackError: 'Unable to revoke invitation code'
  });
  // Which code the running revoke is for; shown only while one runs.
  const [target, setTarget] = useState<InvitationCode['id'] | null>(null);

  const revoke = async (invitationCodeId: InvitationCode['id']) => {
    await run(async () => {
      setTarget(invitationCodeId);
      await revokeMutation({ invitationCodeId });
    });
  };

  return {
    codes: codes ?? [],
    error,
    isLoading: codes === undefined && enabled,
    pendingId: isPending ? target : null,
    revoke
  };
}
