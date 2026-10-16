import { authClient } from '@groam/auth/client';
import { useCallback, useEffect, useState } from 'react';
// oxlint-disable-next-line react-doctor/no-flush-sync -- The hidden workspace must commit, dropping its subscriptions, before the group switch starts; the app uses no View Transitions.
import { flushSync } from 'react-dom';
import { errorMessage } from '@/lib/errors';
import { useGroupActivationStore } from '@/lib/stores/group-activation-store';

async function setActiveOrganization(organizationId: string) {
  const result = await authClient.organization.setActive({ organizationId });
  if (result.error) throw new Error(result.error.message ?? 'Unable to activate workspace');
  // Ensure Convex/Better Auth session cookies pick up activeOrganizationId before
  // workspace queries mount (avoids "No active organization" after login/reseed).
  await authClient.getSession({ query: { disableCookieCache: true } });
}

/**
 * Switches the open workspace to another group. The server switches the session's group before
 * the client hears of it, so the workspace pauses first: its queries would otherwise rerun in the
 * new group with the old group's pagination cursors.
 */
export async function activateOrganization(organizationId: string) {
  flushSync(() => useGroupActivationStore.setState({ organizationId }));
  try {
    await setActiveOrganization(organizationId);
  } catch (error: unknown) {
    useGroupActivationStore.setState({ organizationId: null });
    throw error;
  }
}

export function useOrganizationActivation({
  activeOrganizationId,
  firstOrganizationId,
  isPending
}: {
  activeOrganizationId?: string;
  firstOrganizationId?: string;
  isPending: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeOrganizationId || !firstOrganizationId || isPending) return;
    let isCurrent = true;
    // No workspace is open yet, so there is nothing to pause.
    void setActiveOrganization(firstOrganizationId).catch((cause: unknown) => {
      if (isCurrent) setError(errorMessage(cause, 'Unable to activate workspace'));
    });
    return () => {
      isCurrent = false;
    };
  }, [activeOrganizationId, firstOrganizationId, isPending]);

  const retry = useCallback(() => {
    if (!firstOrganizationId) return;
    setError(null);
    void setActiveOrganization(firstOrganizationId).catch((cause: unknown) => {
      setError(errorMessage(cause, 'Unable to activate workspace'));
    });
  }, [firstOrganizationId]);

  const switchOrganization = useCallback(
    (organizationId: string) => activateOrganization(organizationId),
    []
  );

  return {
    error: activeOrganizationId ? null : error,
    retry,
    switchOrganization
  };
}
