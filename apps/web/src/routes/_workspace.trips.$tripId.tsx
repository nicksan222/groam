import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_workspace/trips/$tripId')({
  component: Outlet
});
