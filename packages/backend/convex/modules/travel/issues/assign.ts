import { assistantAgents, isIssueAssignableAgentId } from '@groam/ai/agents';
import { ConvexError } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { workspaceRoster } from '#convex/modules/auth/workspace';
import {
  type Assignee,
  assigneeKey,
  assignmentMessage,
  issueAgentAssignee
} from '#convex/modules/travel/issues/assignee';
import { appendSystemComment } from '#convex/modules/travel/issues/comments';
import { create } from '#convex/modules/travel/issues/create';
import { actorOf, writableIssueWithTrip } from '#convex/modules/travel/issues/guard';
import { isTripAdmin, type MutableTripCtx, type TripCtx } from '#convex/modules/travel/trips/ctx';

/**
 * The assignee as stored: a person must belong to the group and is named as the roster names
 * them, and an agent is named as the catalog does, so a client never picks the displayed name.
 */
async function resolvedAssignee(
  trip: TripCtx,
  assignee: NonNullable<Assignee> | null
): Promise<NonNullable<Assignee> | null> {
  if (assignee === null) return null;
  if (assignee.kind === 'agent') {
    return {
      agentId: assignee.agentId,
      kind: 'agent',
      name: assistantAgents[assignee.agentId].label
    };
  }
  const { members } = await workspaceRoster(trip, trip.workspace);
  const member = members.find(({ userId }) => userId === assignee.userId);
  if (!member) throw new ConvexError('Assignees must be members of this group');
  return { kind: 'user', name: member.name, userId: member.userId };
}

/** Creates an issue on the shared trip, hands it to the Issue agent, and starts the run. */
export async function createAssignedToIssueAgent(
  ctx: MutableTripCtx,
  title: string,
  body: string
): Promise<Id<'tripIssues'>> {
  const issueId = await create(ctx, { body, title });
  const issue = await ctx.db.get('tripIssues', issueId);
  if (!issue) throw new ConvexError('Trip issue not found');
  await ctx.db.patch('tripIssues', issueId, {
    assignee: issueAgentAssignee,
    updatedAt: Date.now()
  });
  const runId = await AgentRuns.queueIssueRun(ctx, {
    agentId: assistantAgents.issue.id,
    createdBy: issue.author,
    issueId,
    kickoff: 'queue',
    organizationId: issue.organizationId,
    title: issue.title,
    tripId: ctx.trip._id
  });
  await ctx.scheduler.runAfter(0, internal.modules.assistant.standalone.execute.run, { runId });
  return issueId;
}

export async function setAssignee(
  ctx: MutationCtx,
  issueId: Id<'tripIssues'>,
  requested: NonNullable<Assignee> | null
): Promise<Id<'agentRuns'> | null> {
  const { issue, trip } = await writableIssueWithTrip(ctx, issueId);
  if (!isTripAdmin(trip)) {
    throw new ConvexError('Only the trip creator or a group admin can assign trip issues');
  }
  const assignee = await resolvedAssignee(trip, requested);
  const actor = actorOf(trip);
  const agentId =
    assignee?.kind === 'agent' && isIssueAssignableAgentId(assignee.agentId)
      ? assignee.agentId
      : null;
  const queueRun = async () => {
    if (agentId === null) return null;
    const runId = await AgentRuns.queueIssueRun(ctx, {
      agentId,
      createdBy: actor,
      issueId,
      kickoff: 'assign',
      organizationId: issue.organizationId,
      title: issue.title,
      tripId: issue.tripId
    });
    // claimRun is idempotent, so a client-side start for the same run is a no-op.
    await ctx.scheduler.runAfter(0, internal.modules.assistant.standalone.execute.run, { runId });
    return runId;
  };
  if (assigneeKey(issue.assignee) === assigneeKey(assignee)) return await queueRun();
  await ctx.db.patch('tripIssues', issueId, {
    assignee: assignee ?? undefined,
    updatedAt: Date.now()
  });
  await appendSystemComment(
    ctx,
    issueId,
    actor,
    assignmentMessage(actor.name, issue.assignee, assignee)
  );
  if (agentId !== null) return await queueRun();
  await AgentRuns.abortActiveForIssue(ctx, issueId);
  return null;
}
