import type { Doc } from '#convex-generated/dataModel';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { bottomRank, issuesOf, laneIn, RANK_STEP } from '#convex/modules/travel/issues/board';
import { appendSystemComment } from '#convex/modules/travel/issues/comments';
import {
  checkedConditionMet,
  conditionLabel,
  isCheckedCondition,
  joinConditions,
  tripConditions
} from '#convex/modules/travel/issues/condition';
import { issueEventMessage } from '#convex/modules/travel/issues/events';
import { loadConditionFacts } from '#convex/modules/travel/issues/facts';
import { isResolved, type TripIssueStatus } from '#convex/modules/travel/issues/status';
import type { MutableTripCtx } from '#convex/modules/travel/trips/ctx';

/**
 * Whether a trip patch can change a condition's answer; stay writes call `syncTripConditions`.
 * An idea merge always patches `destination` after writing the itinerary and packing list, so
 * rules over those are re-checked then; the shared trip changes no other way. RSVPs change on
 * the shared trip directly, so the travelers module syncs after them.
 */
export function affectsConditions(patch: Partial<Doc<'trips'>>): boolean {
  return ['budget', 'destination', 'duration', 'startDate'].some((field) => field in patch);
}

/** The status a checked-condition issue should move to, or null if it is already right. */
function reconciledStatus(status: TripIssueStatus, met: boolean): 'closed' | 'open' | null {
  if (met && !isResolved(status)) return 'closed';
  if (!met && status === 'closed') return 'open';
  return null;
}

/**
 * Brings every checked-condition issue (starter or composed rule) of the shared trip in line
 * with the trip's facts: active issues whose condition now holds close, and closed ones whose
 * condition no longer holds reopen. Idea working copies never sync. Issues the team discarded (`wont_do`) stay discarded.
 * Moved cards land at the bottom of their new lane.
 */
export async function syncTripConditions(ctx: MutableTripCtx): Promise<void> {
  if (ctx.trip.proposal) return;
  // Most trip writes touch a trip with no checked condition, so the small table is read first.
  const conditions = await tripConditions(ctx, ctx.trip._id);
  if (![...conditions.values()].some(isCheckedCondition)) return;
  const issues = joinConditions(await issuesOf(ctx, ctx.trip._id), conditions);
  const facts = await loadConditionFacts(ctx, issues);
  const actor = { name: ctx.workspace.viewerName, userId: ctx.workspace.userId };
  const now = Date.now();
  const nextRank = new Map<TripIssueStatus, number>();
  // Ranks are planned in board order first, so each moved card lands below the one before it.
  const moves = issues.flatMap((issue) => {
    const { condition } = issue;
    if (!isCheckedCondition(condition)) return [];
    const status = reconciledStatus(issue.status, checkedConditionMet(condition, facts));
    if (!status) return [];
    const boardRank = nextRank.get(status) ?? bottomRank(laneIn(issues, status));
    nextRank.set(status, boardRank + RANK_STEP);
    return [{ boardRank, issue, label: conditionLabel(condition), status }];
  });
  await Promise.all(
    moves.map(async ({ boardRank, issue, label, status }) => {
      await ctx.db.patch('tripIssues', issue._id, {
        boardRank,
        closedAt: status === 'closed' ? now : undefined,
        status,
        updatedAt: now
      });
      await appendSystemComment(
        ctx,
        issue._id,
        actor,
        issueEventMessage(actor.name, {
          change: status === 'closed' ? 'resolved' : 'reopened',
          kind: 'auto',
          label
        })
      );
      await AgentWaits.signal(ctx, { kind: 'issue', refId: issue._id });
    })
  );
}
