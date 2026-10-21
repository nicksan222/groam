# Proposal author index rollout

The pending-ideas feed needs `tripProposals.by_organizationId_and_author_userId_and_updatedAt`.
Existing deployments may contain enough proposals for a synchronous index backfill to delay deployment. This prerequisite stages the index without adding any consumers.

## Required deployment sequence

1. Deploy the commit containing this staged index to each intended Convex deployment before deploying the dependent payments-backend PR. Merging the PR alone does not backfill a deployment.
2. In that deployment’s Convex dashboard, open **Data → tripProposals → Indexes** and wait for this index’s backfill to complete. Check each deployment independently.
3. Only after completion, deploy the dependent PR that removes `staged: true` and enables the pending-ideas query. Do not skip the intermediate deployment when merging or releasing the stack.

Fresh deployments should follow the same sequence; an empty table finishes quickly. No document migration or data reset is required. A staged index cannot be queried, and this prerequisite adds no query consumer.

If the application release is delayed, leave the staged index in place. After promotion, retain the enabled index when rolling back application consumers; no data rollback is needed.

See the [Convex staged-index documentation](https://docs.convex.dev/database/reading-data/indexes#staged-indexes). Production deployment requires the operator’s normal deployment authorization; this PR does not deploy anything.
