import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_workspace/group/')({
  component: GroupIndexRoute
});

function GroupIndexRoute() {
  return <Navigate params={{ section: 'group' }} replace to="/settings/$section" />;
}
