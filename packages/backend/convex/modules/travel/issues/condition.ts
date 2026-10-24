import type { Infer } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { MAX_ISSUES } from '#convex/modules/travel/issues/limits';
import { issuesOf } from '#convex/modules/travel/issues/read';
import { presentRule, ruleLabel, type RuleFacts } from '#convex/modules/travel/issues/rules/index';
import type { TripIssueValidators } from '#convex/modules/travel/issues/schema';

/**
 * The `tripIssueConditions` table: each issue's "done when", one row at most. Everything that
 * reads or writes a condition goes through here; the rest of the module works on issues with
 * their condition joined on.
 */

export type { RuleFacts } from '#convex/modules/travel/issues/rules/index';

export type IssueCondition = Infer<typeof TripIssueValidators.condition>;
export type PresentedCondition = Infer<typeof TripIssueValidators.presentedCondition>;
/** A condition the system decides: a rule, starter or composed. */
export type CheckedCondition = Extract<IssueCondition, { kind: 'rule' }>;

export function conditionLabel(condition: IssueCondition): string {
  return condition.kind === 'manual' ? condition.text : ruleLabel(condition.rule);
}

/** Whether the system decides the issue's status. */
export function isCheckedCondition(
  condition: IssueCondition | undefined
): condition is CheckedCondition {
  return condition?.kind === 'rule';
}

/** Is a checked condition satisfied by the trip as it is now? */
export function checkedConditionMet(condition: CheckedCondition, facts: RuleFacts): boolean {
  return presentRule(condition.rule, facts).met;
}

export function presentCondition(
  condition: IssueCondition | undefined,
  facts: RuleFacts
): PresentedCondition {
  if (!condition) return null;
  if (condition.kind === 'manual') return { kind: 'manual', label: condition.text, met: null };
  return { ...presentRule(condition.rule, facts), starter: condition.starter === true };
}

export type ConditionedIssue = Omit<Doc<'tripIssues'>, 'condition'> & {
  condition?: IssueCondition;
};

function fromRow(row: Doc<'tripIssueConditions'>): IssueCondition {
  if (row.kind === 'manual') return { kind: 'manual', text: row.text };
  return { kind: 'rule', rule: row.rule, ...(row.starter ? { starter: true } : {}) };
}

async function rowOf(ctx: Pick<QueryCtx, 'db'>, issueId: Id<'tripIssues'>) {
  return await ctx.db
    .query('tripIssueConditions')
    .withIndex('by_issueId', (query) => query.eq('issueId', issueId))
    .unique();
}

export async function conditionOf(
  ctx: Pick<QueryCtx, 'db'>,
  issueId: Id<'tripIssues'>
): Promise<IssueCondition | undefined> {
  const row = await rowOf(ctx, issueId);
  return row ? fromRow(row) : undefined;
}

/** Every condition on a trip by issue, in one read; a trip has at most one per issue. */
export async function tripConditions(
  ctx: Pick<QueryCtx, 'db'>,
  tripId: Id<'trips'>
): Promise<Map<Id<'tripIssues'>, IssueCondition>> {
  const rows = await ctx.db
    .query('tripIssueConditions')
    .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
    .take(MAX_ISSUES);
  return new Map(rows.map((row) => [row.issueId, fromRow(row)]));
}

function joined(issue: Doc<'tripIssues'>, condition: IssueCondition | undefined): ConditionedIssue {
  return condition ? { ...issue, condition } : issue;
}

/** One issue with its condition. */
export async function withCondition(
  ctx: Pick<QueryCtx, 'db'>,
  issue: Doc<'tripIssues'>
): Promise<ConditionedIssue> {
  return joined(issue, await conditionOf(ctx, issue._id));
}

/** Joins `conditions` (from `tripConditions`) onto issues of the same trip. */
export function joinConditions(
  issues: Array<Doc<'tripIssues'>>,
  conditions: Map<Id<'tripIssues'>, IssueCondition>
): Array<ConditionedIssue> {
  return issues.map((issue) => joined(issue, conditions.get(issue._id)));
}

/** Every issue of a trip with its condition. */
export async function conditionedIssuesOf(
  ctx: Pick<QueryCtx, 'db'>,
  tripId: Id<'trips'>
): Promise<Array<ConditionedIssue>> {
  const [issues, conditions] = await Promise.all([
    issuesOf(ctx, tripId),
    tripConditions(ctx, tripId)
  ]);
  return joinConditions(issues, conditions);
}

/** Sets, replaces, or (with undefined) removes an issue's condition. */
export async function writeCondition(
  ctx: Pick<MutationCtx, 'db'>,
  issue: Pick<Doc<'tripIssues'>, '_id' | 'tripId'>,
  condition: IssueCondition | undefined
): Promise<void> {
  const existing = await rowOf(ctx, issue._id);
  if (!condition) {
    if (existing) await ctx.db.delete('tripIssueConditions', existing._id);
    return;
  }
  const row = { ...condition, issueId: issue._id, tripId: issue.tripId };
  if (existing) await ctx.db.replace('tripIssueConditions', existing._id, row);
  else await ctx.db.insert('tripIssueConditions', row);
}
