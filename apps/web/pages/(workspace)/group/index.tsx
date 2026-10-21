import { Navigate } from '@/lib/navigation/router';

export default function GroupIndexPage() {
  return <Navigate params={{ section: 'group' }} replace to="/settings/$section" />;
}
