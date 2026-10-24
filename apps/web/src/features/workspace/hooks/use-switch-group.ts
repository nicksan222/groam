import { toast } from '@groam/ui/components/toast';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { errorMessage } from '@/lib/errors';
import { useNavigate } from '@/lib/navigation/router';

/**
 * Makes another group the active one. Resolves true once it is, and toasts the reason when it
 * cannot. From the sidebar the traveler is sent Home together with the switch, so the old
 * group's trip page never shows under the new group; from Settings they stay where they are.
 */
export function useSwitchGroup() {
  const { switchOrganization } = useWorkspace();
  const navigate = useNavigate();
  return async (organizationId: string, { goHome = true } = {}) => {
    try {
      await Promise.all([
        switchOrganization(organizationId),
        goHome ? navigate({ to: '/' }) : undefined
      ]);
      return true;
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Unable to switch group'));
      return false;
    }
  };
}
