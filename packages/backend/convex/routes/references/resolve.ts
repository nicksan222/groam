import { v } from 'convex/values';
import type { Doc } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import type { Workspace } from '#convex/modules/auth/workspace';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { recordByReference, referenceTable } from '#convex/modules/references/index';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

export const run = workspaceQuery({
  args: { table: referenceTable, reference: v.string() },
  returns: v.union(
    v.object({
      id: v.string(),
      /** Discussions only: lets the web app route a research to its trip page. */
      kind: v.optional(v.union(v.literal('group'), v.literal('assistant'), v.literal('research'))),
      shortId: v.string(),
      tripId: v.optional(v.id('trips'))
    }),
    v.null()
  ),
  handler: async (ctx, { table, reference }) => {
    const record = await recordByReference(ctx, table, reference);
    if (!record || record.organizationId !== ctx.workspace.organizationId) return null;
    if (table === 'tripProposals' || table === 'tripIssues') {
      return entityReference(
        ctx,
        record as Doc<'tripProposals'> | Doc<'tripIssues'>,
        ctx.workspace
      );
    }
    if (table === 'agentRuns') {
      return AgentRuns.previewReference(ctx, record._id as Doc<'agentRuns'>['_id'], ctx.workspace);
    }
    if (table === 'discussions') {
      return discussionReference(ctx, record as Doc<'discussions'>, ctx.workspace);
    }
    return { id: record._id, shortId: record.shortId };
  }
});

/** Only routing metadata is public to unpaid organization members; content keeps its full gate. */
async function researchReference(
  ctx: QueryCtx,
  discussion: Extract<Doc<'discussions'>, { kind: 'research' }>,
  workspace: Workspace
) {
  if (discussion.deletingAt !== undefined) return null;
  if (!(await findVisibleTrip(ctx, discussion.tripId, workspace, { allowUnpaid: true })))
    return null;
  return {
    id: discussion._id,
    kind: discussion.kind,
    shortId: discussion.shortId,
    tripId: discussion.tripId
  };
}

/** Preview routing has the same workspace boundary as the shared trip shell. */
async function entityReference(
  ctx: QueryCtx,
  entity: Doc<'tripProposals'> | Doc<'tripIssues'>,
  workspace: Workspace
) {
  const owningTripId = 'sourceTripId' in entity ? entity.sourceTripId : entity.tripId;
  const trip = await findVisibleTrip(ctx, owningTripId, workspace, { allowUnpaid: true });
  if (!trip) return null;
  const tripId = trip.proposal?.sourceTripId ?? trip._id;
  if (!(await findVisibleTrip(ctx, tripId, workspace, { allowUnpaid: true }))) return null;
  return { id: entity._id, shortId: entity.shortId, tripId };
}

async function discussionReference(
  ctx: QueryCtx,
  discussion: Doc<'discussions'>,
  workspace: Workspace
) {
  if (discussion.kind === 'research') return researchReference(ctx, discussion, workspace);
  if (discussion.kind === 'group' && discussion.tripId) {
    const member = await ctx.db
      .query('discussionMembers')
      .withIndex('by_discussionId_and_userId', (q) =>
        q.eq('discussionId', discussion._id).eq('userId', workspace.userId)
      )
      .unique();
    if (!member) return null;
    const trip = await findVisibleTrip(ctx, discussion.tripId, workspace, { allowUnpaid: true });
    if (!trip) return null;
    const tripId = trip.proposal?.sourceTripId ?? trip._id;
    if (!(await findVisibleTrip(ctx, tripId, workspace, { allowUnpaid: true }))) return null;
    return { id: discussion._id, kind: discussion.kind, shortId: discussion.shortId, tripId };
  }
  try {
    const { discussion: allowed } = await DiscussionAccess.forWorkspace(
      ctx,
      discussion._id,
      workspace
    );
    return { id: allowed._id, kind: allowed.kind, shortId: allowed.shortId };
  } catch {
    return null;
  }
}
