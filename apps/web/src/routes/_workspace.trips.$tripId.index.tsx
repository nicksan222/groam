import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';

export const Route = createFileRoute('/_workspace/trips/$tripId/')({
  component: TripIndexRoute
});

function TripIndexRoute() {
  const { tripId } = useResolvedParams(Route.useParams());
  return <Navigate params={{ section: 'overview', tripId }} replace to="/trips/$tripId/$section" />;
}
