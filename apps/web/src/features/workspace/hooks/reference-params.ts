import type { ReferenceCache, ResolvedReference } from '@/types/references';

const referenceTables = {
  tripId: 'trips',
  proposalId: 'tripProposals',
  issueId: 'tripIssues',
  discussionId: 'discussions',
  researchId: 'discussions',
  runId: 'agentRuns'
} as const;

export function referenceEntries(params: unknown) {
  if (!params || typeof params !== 'object') return [];
  return Object.entries(referenceTables).flatMap(([key, table]) => {
    const reference = Reflect.get(params, key);
    return typeof reference === 'string' ? [{ key, table, reference }] : [];
  });
}

/** Remembers a resolution under the reference used, its long id, and its short id. */
export function rememberReference(
  cache: ReferenceCache,
  table: string,
  reference: string,
  resolved: ResolvedReference
) {
  for (const alias of [reference, resolved.id, resolved.shortId]) {
    cache.set(`${table}:${alias}`, resolved);
  }
}
