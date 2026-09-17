import { authClient } from '@groam/auth/client';
import { useMemo } from 'react';
import type { WorkspaceContextValue } from '@/features/workspace/workspace-shell/workspace-state';
import { useOrganizationActivation } from './use-organization-activation';

/** Central Better Auth workspace subscription used by the application shell. */
export function useWorkspaceData() {
  const sessionQuery = authClient.useSession();
  const organizationsQuery = authClient.useListOrganizations();
  const activeOrganizationQuery = authClient.useActiveOrganization();
  const organizations = useMemo(() => organizationsQuery.data ?? [], [organizationsQuery.data]);
  const activeOrganization = activeOrganizationQuery.data;
  const {
    error: activationError,
    retry: retryActivation,
    switchOrganization
  } = useOrganizationActivation({
    activeOrganizationId: sessionQuery.data?.session.activeOrganizationId ?? undefined,
    firstOrganizationId: organizations[0]?.id,
    isPending: activeOrganizationQuery.isPending
  });

  const value = useMemo<WorkspaceContextValue | null>(() => {
    const session = sessionQuery.data;
    if (!activeOrganization || !session) return null;
    if (activeOrganization.id !== session.session.activeOrganizationId) return null;
    return {
      activeOrganization,
      activeRole:
        activeOrganization.members.find((member) => member.userId === session.user.id)?.role ??
        'member',
      organizations,
      session,
      switchOrganization
    };
  }, [activeOrganization, organizations, sessionQuery.data, switchOrganization]);

  return {
    activationError,
    isPending:
      sessionQuery.isPending ||
      organizationsQuery.isPending ||
      activeOrganizationQuery.isPending ||
      (organizations.length > 0 && !value && !activationError),
    isSignedOut: !sessionQuery.isPending && !sessionQuery.data,
    retryActivation,
    value,
    viewerName: sessionQuery.data?.user.name ?? 'there'
  };
}
