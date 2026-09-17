import { authClient } from '@groam/auth/client';
import { NavUser } from '@groam/ui/components/nav-user';
import { useNavigate } from '@tanstack/react-router';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';
import { userIdentityLabel } from '@/lib/user-identity';
import { useWorkspace } from './workspace-state';

export function AccountMenu() {
  const { session } = useWorkspace();
  const navigate = useNavigate();
  const resetAuthForm = useAuthFormStore((store) => store.reset);
  const user = session.user;

  const signOut = async () => {
    const result = await authClient.signOut();
    if (!result.error) resetAuthForm();
  };

  return (
    <NavUser
      onLogout={() => void signOut()}
      onSettings={() => void navigate({ params: { section: 'profile' }, to: '/settings/$section' })}
      user={{ avatar: user.image ?? '', detail: userIdentityLabel(user), name: user.name }}
    />
  );
}
