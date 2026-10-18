import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_workspace/trips/$tripId/ideas/$proposalId')({
  component: Outlet
});
