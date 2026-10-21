import { Navigate, useParams } from '@/lib/navigation/router';

export default function TripIndexPage() {
  // Keep the reference as written; ReferenceProvider canonicalizes it once.
  const { tripId = '' } = useParams<{ tripId: string }>();
  return <Navigate params={{ section: 'board', tripId }} replace to="/trips/$tripId/$section" />;
}
