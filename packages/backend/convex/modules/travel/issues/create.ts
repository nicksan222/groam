import { ConvexError, type Infer } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import { insertWithShortId } from '#convex/modules/references/index';
import {
  bottomRank,
  issuesOf,
  laneIn,
  MAX_ISSUES,
  RANK_STEP
} from '#convex/modules/travel/issues/board';
import { type IssueCondition, writeCondition } from '#convex/modules/travel/issues/condition';
import { assertTripWritable, boundedText } from '#convex/modules/travel/issues/guard';
import {
  type IssueRule,
  emptyRuleFacts,
  normalizeRule,
  presentRule
} from '#convex/modules/travel/issues/rules/index';
import type { TripIssueValidators } from '#convex/modules/travel/issues/schema';
import { STARTER_ISSUES } from '#convex/modules/travel/issues/starters';
import { syncTripConditions } from '#convex/modules/travel/issues/sync';
import type { MutableTripCtx } from '#convex/modules/travel/trips/ctx';

const MAX_CONDITION_LENGTH = 200;
const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 5_000;

type NewIssue = {
  body: string;
  boardRank: number;
  condition?: IssueCondition;
  labels?: Array<Infer<typeof TripIssueValidators.label>>;
  title: string;
};

/** The single insertion path for hand-made and starter issues. */
async function insertIssue(trip: MutableTripCtx, input: NewIssue): Promise<Id<'tripIssues'>> {
  const issueId = await insertWithShortId(trip, 'tripIssues', {
    author: { name: trip.workspace.viewerName, userId: trip.workspace.userId },
    boardRank: input.boardRank,
    body: boundedText(input.body, MAX_BODY_LENGTH, 'Issue description'),
    humanCommentCount: 0,
    labels: input.labels ?? [],
    organizationId: trip.workspace.organizationId,
    status: 'open',
    systemCommentCount: 0,
    title: boundedText(input.title, MAX_TITLE_LENGTH, 'Issue title'),
    tripId: trip.trip._id,
    updatedAt: Date.now()
  });
  await writeCondition(trip, { _id: issueId, tripId: trip.trip._id }, input.condition);
  return issueId;
}

function assertSharedTrip(trip: MutableTripCtx): void {
  if (trip.trip.proposal) throw new ConvexError('Create issues on the shared trip');
}

/**
 * A person's "done when": a composed rule the system checks, else free text, else none. Giving
 * both is refused, so a condition never has two meanings.
 */
export function personCondition(input: {
  doneWhen?: string;
  rule?: IssueRule;
}): IssueCondition | undefined {
  const { doneWhen, rule } = input;
  if (rule !== undefined) {
    if (doneWhen !== undefined) {
      throw new ConvexError('Give a done-when rule or a description, not both');
    }
    return { kind: 'rule', rule: normalizeRule(rule) };
  }
  if (doneWhen === undefined) return undefined;
  return {
    kind: 'manual',
    text: boundedText(doneWhen, MAX_CONDITION_LENGTH, 'Done-when condition')
  };
}

export type CreateInput = { body: string; doneWhen?: string; rule?: IssueRule; title: string };

/**
 * Creates an issue at the bottom of the open lane with the person's condition. A rule the trip
 * already meets closes the issue straight away, like any later change that meets it.
 */
export async function create(trip: MutableTripCtx, input: CreateInput): Promise<Id<'tripIssues'>> {
  assertSharedTrip(trip);
  assertTripWritable(trip);
  // One read serves both the capacity check and the append position.
  const existing = await issuesOf(trip, trip.trip._id);
  if (existing.length >= MAX_ISSUES) {
    throw new ConvexError(`Trips support up to ${MAX_ISSUES} issues`);
  }
  const condition = personCondition(input);
  const issueId = await insertIssue(trip, {
    body: input.body,
    boardRank: bottomRank(laneIn(existing, 'open')),
    condition,
    title: input.title
  });
  if (condition?.kind === 'rule') await syncTripConditions(trip);
  return issueId;
}

/**
 * Inserts the starters one after another: each insert reserves the next short id, and creation
 * order is display order, so the inserts cannot run side by side.
 */
async function insertStartersInOrder(
  trip: MutableTripCtx,
  queue: ReadonlyArray<[number, (typeof STARTER_ISSUES)[number]]>
): Promise<void> {
  const [next, ...rest] = queue;
  if (!next) return;
  const [index, starter] = next;
  await insertIssue(trip, {
    body: starter.body(trip.trip),
    boardRank: (index + 1) * RANK_STEP,
    condition: { kind: 'rule', rule: starter.rule, starter: true },
    labels: starter.mandatory ? ['mandatory'] : [],
    title: starter.title
  });
  await insertStartersInOrder(trip, rest);
}

/** Opens the starter decisions on a newly created shared trip. */
export async function createStarterIssues(trip: MutableTripCtx): Promise<void> {
  assertSharedTrip(trip);
  // A new trip has no lists yet, so the evaluator that closes issues also decides what to skip.
  const facts = emptyRuleFacts(trip.trip);
  const starters = STARTER_ISSUES.filter((starter) => !presentRule(starter.rule, facts).met);
  // Inserted last-first so lists that show the newest first also read in display order.
  await insertStartersInOrder(trip, [...starters.entries()].toReversed());
}
