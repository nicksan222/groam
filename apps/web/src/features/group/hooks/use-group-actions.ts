import { authClient } from '@groam/auth/client';
import { cancelInvitationKey } from '@/features/group/group-shell/group-action-keys';
import { errorMessage } from '@/lib/errors';
import { useGroupActionsStore } from '@/lib/stores/group-actions-store';

export function useGroupActions({ organizationId }: { organizationId: string }) {
  const pendingAction = useGroupActionsStore((state) => state.pendingAction);
  const error = useGroupActionsStore((state) => state.error);
  const setPendingAction = useGroupActionsStore((state) => state.setPendingAction);
  const setError = useGroupActionsStore((state) => state.setError);

  const runAction = async (key: string, action: () => Promise<void>, fallback: string) => {
    setError(null);
    setPendingAction(key);
    try {
      await action();
    } catch (caughtError: unknown) {
      setError(errorMessage(caughtError, fallback));
    } finally {
      setPendingAction(null);
    }
  };

  const cancelInvitation = (invitationId: string) =>
    runAction(
      cancelInvitationKey(invitationId),
      async () => {
        const result = await authClient.organization.cancelInvitation({ invitationId });
        if (result.error) throw new Error(result.error.message ?? 'Unable to cancel invitation');
      },
      'Unable to cancel invitation'
    );

  const leaveGroup = () =>
    runAction(
      'leave-group',
      async () => {
        const result = await authClient.organization.leave({ organizationId });
        if (result.error) throw new Error(result.error.message ?? 'Unable to leave group');
      },
      'Unable to leave group'
    );

  const removeMember = (memberIdOrEmail: string) =>
    runAction(
      `remove-${memberIdOrEmail}`,
      async () => {
        const result = await authClient.organization.removeMember({
          memberIdOrEmail,
          organizationId
        });
        if (result.error) throw new Error(result.error.message ?? 'Unable to remove member');
      },
      'Unable to remove member'
    );

  const updateMemberRole = (memberId: string, role: string) =>
    runAction(
      `role-${memberId}`,
      async () => {
        const result = await authClient.organization.updateMemberRole({
          memberId,
          organizationId,
          role
        });
        if (result.error) throw new Error(result.error.message ?? 'Unable to change role');
      },
      'Unable to change role'
    );

  return {
    cancelInvitation,
    error,
    leaveGroup,
    pendingAction,
    removeMember,
    updateMemberRole
  };
}
