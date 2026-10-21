import type { Id } from '@groam/backend/data-model';
import { PageLoading } from '@groam/ui/components/page-loading';
import type { ReactNode } from 'react';
import { useEntityTripReference } from '@/features/trips/hooks/use-entity-trip-reference';
import { TripParticipationBoundary } from './trip-participation-boundary';

/** Resolve routing metadata before mounting any protected entity content hooks. */
export function EntityParticipationBoundary({
  children,
  expectedAgentId,
  expectedTripId,
  expectedKind,
  loadingLabel,
  missing,
  reference,
  table
}: {
  children: ReactNode;
  expectedAgentId?: string;
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
  const tripId = 'tripId' in resolved ? resolved.tripId : undefined;
  if (
    expectedAgentId !== undefined &&
    (!('agentId' in resolved) || resolved.agentId !== expectedAgentId)
  )
    return missing;
  if (expectedKind && (!('kind' in resolved) || resolved.kind !== expectedKind)) return missing;
  if (expectedTripId && tripId !== expectedTripId) return missing;
  if (!tripId) return table === 'discussions' || table === 'agentRuns' ? children : missing;
  return <TripParticipationBoundary tripId={tripId}>{() => children}</TripParticipationBoundary>;
}
