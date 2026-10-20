import { api } from '@groam/backend/api';
import { useQuery } from 'convex/react';

/** Preview-safe ownership metadata; content subscriptions require the participation boundary. */
export function useEntityTripReference(
  table: 'tripIssues' | 'tripProposals' | 'discussions' | 'agentRuns',
  reference: string
) {
  return useQuery(api.routes.references.resolve.run, { reference, table });
}
