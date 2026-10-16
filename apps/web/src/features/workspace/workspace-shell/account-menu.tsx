import { authClient } from '@groam/auth/client';
import { NavUser } from '@groam/ui/components/nav-user';
import { toast } from '@groam/ui/components/toast';
import { useNavigate } from '@tanstack/react-router';
import { use } from 'react';
import { SessionChangeContext } from '@/features/auth/session-change-context';
import { errorMessage } from '@/lib/errors';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';
import { userIdentityLabel } from '@/lib/user-identity';
import { useWorkspace } from './workspace-state';

export function AccountMenu() {
  const { session } = useWorkspace();
  const navigate = useNavigate();
  const changeSession = use(SessionChangeContext);
  const resetAuthForm = useAuthFormStore((store) => store.reset);
  const user = session.user;

  const signOut = async () => {
    // Clear the form before the sign-in screen can show, not after someone starts typing.
    resetAuthForm();
    try {
      const { error } = await changeSession(() => authClient.signOut());
      if (error) toast.error(error.message ?? 'Unable to sign out');
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'Unable to sign out'));
    }
  };

  return (
    <NavUser
      onLogout={() => void signOut()}
      onSettings={() => void navigate({ params: { section: 'profile' }, to: '/settings/$section' })}
      user={{ avatar: user.image ?? '', detail: userIdentityLabel(user), name: user.name }}
    />
  );
}
