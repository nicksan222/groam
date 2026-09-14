import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_workspace/group/$section')({
  component: GroupSectionRoute
});

function GroupSectionRoute() {
  return <Navigate params={{ section: 'group' }} replace to="/settings/$section" />;
}
