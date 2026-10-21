import { Navigate } from '@/lib/navigation/router';

export default function GroupSectionPage() {
  return <Navigate params={{ section: 'group' }} replace to="/settings/$section" />;
}
