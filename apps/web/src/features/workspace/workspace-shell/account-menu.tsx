import { NavUser } from '@groam/ui/components/nav-user';
import { useNavigate } from '@tanstack/react-router';
import { use } from 'react';
import { SignOutContext } from '@/features/auth/sign-out-context';
import { userIdentityLabel } from '@/lib/user-identity';
import { useWorkspace } from './workspace-state';

export function AccountMenu() {
  const { session } = useWorkspace();
  const navigate = useNavigate();
  const signOut = use(SignOutContext);
  const user = session.user;

  return (
    <NavUser
      onLogout={() => void signOut()}
      onSettings={() => void navigate({ params: { section: 'profile' }, to: '/settings/$section' })}
      user={{ avatar: user.image ?? '', detail: userIdentityLabel(user), name: user.name }}
    />
  );
}
