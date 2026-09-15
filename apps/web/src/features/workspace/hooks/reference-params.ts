const referenceTables = {
  tripId: 'trips',
  proposalId: 'tripProposals',
  issueId: 'tripIssues',
  discussionId: 'discussions',
  runId: 'agentRuns'
} as const;

export function referenceEntries(params: unknown) {
  if (!params || typeof params !== 'object') return [];
  return Object.entries(referenceTables).flatMap(([key, table]) => {
    const reference = Reflect.get(params, key);
    return typeof reference === 'string' ? [{ key, table, reference }] : [];
  });
}
