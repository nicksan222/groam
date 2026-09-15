import { authClient } from '@groam/auth/client';
import { NavUser } from '@groam/ui/components/nav-user';
import { useNavigate } from '@tanstack/react-router';
import { useWorkspace } from './workspace-state';

export function AccountMenu() {
  const { session } = useWorkspace();
  const navigate = useNavigate();
  const user = session.user;

  return (
    <NavUser
      onLogout={() => void authClient.signOut()}
      onSettings={() => void navigate({ params: { section: 'profile' }, to: '/settings/$section' })}
      user={{ avatar: user.image ?? '', email: user.email, name: user.name }}
    />
  );
}
