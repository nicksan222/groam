import type { Id } from '@groam/backend/data-model';
import { PageLoading } from '@groam/ui/components/page-loading';
import type { ReactNode } from 'react';
import { useEntityTripReference } from '@/features/trips/hooks/use-entity-trip-reference';
import { TripParticipationBoundary } from './trip-participation-boundary';

/** Resolve routing metadata before mounting any protected entity content hooks. */
export function EntityParticipationBoundary({
  children,
  expectedTripId,
  expectedKind,
  loadingLabel,
  missing,
  reference,
  table
}: {
  children: ReactNode;
  expectedTripId?: Id<'trips'>;
  expectedKind?: 'research';
  loadingLabel: string;
  missing: ReactNode;
  reference: string;
  table: 'tripIssues' | 'tripProposals' | 'discussions' | 'agentRuns';
}) {
  const resolved = useEntityTripReference(table, reference);
  if (resolved === undefined) return <PageLoading label={loadingLabel} />;
  if (!resolved) return missing;
  if (expectedKind && (!('kind' in resolved) || resolved.kind !== expectedKind)) return missing;
  if (expectedTripId && (!('tripId' in resolved) || resolved.tripId !== expectedTripId))
    return missing;
  if (!('tripId' in resolved) || !resolved.tripId)
    return table === 'discussions' || table === 'agentRuns' ? children : missing;
  return (
    <TripParticipationBoundary tripId={resolved.tripId}>{() => children}</TripParticipationBoundary>
  );
}
