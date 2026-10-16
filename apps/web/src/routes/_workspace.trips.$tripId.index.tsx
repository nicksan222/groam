import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_workspace/trips/$tripId/')({
  component: TripIndexRoute
});

function TripIndexRoute() {
  // Keep the reference as written; ReferenceProvider canonicalizes it once.
  const { tripId } = Route.useParams();
  return <Navigate params={{ section: 'overview', tripId }} replace to="/trips/$tripId/$section" />;
}
