import { authClient } from '@groam/auth/client';
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '@/lib/errors';

async function activateOrganization(organizationId: string) {
  const result = await authClient.organization.setActive({ organizationId });
  if (result.error) throw new Error(result.error.message ?? 'Unable to activate workspace');
  // Ensure Convex/Better Auth session cookies pick up activeOrganizationId before
  // workspace queries mount (avoids "No active organization" after login/reseed).
  await authClient.getSession();
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
    void activateOrganization(firstOrganizationId).catch((cause: unknown) => {
      if (isCurrent) setError(errorMessage(cause, 'Unable to activate workspace'));
    });
    return () => {
      isCurrent = false;
    };
  }, [activeOrganizationId, firstOrganizationId, isPending]);

  const retry = useCallback(() => {
    if (!firstOrganizationId) return;
    setError(null);
    void activateOrganization(firstOrganizationId).catch((cause: unknown) => {
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
