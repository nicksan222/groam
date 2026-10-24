import type { MutationCtx } from '#convex-generated/server';
import { issueCondition } from '#convex/modules/assistant/waits/conditions/issue';
import { pollCondition } from '#convex/modules/assistant/waits/conditions/poll';
import { proposalCondition } from '#convex/modules/assistant/waits/conditions/proposal';
import { rsvpCondition } from '#convex/modules/assistant/waits/conditions/rsvp';
import { timerCondition } from '#convex/modules/assistant/waits/conditions/timer';
import type {
  WaitConditionEntry,
  WaitEvaluation,
  WaitLoadMemo,
  WaitReadCtx,
  WaitScope
} from '#convex/modules/assistant/waits/conditions/types';
import type { WaitCondition, WaitKind } from '#convex/modules/assistant/waits/schema';

/** One definition per kind. Outside this folder, use the functions below, never the map. */
const waitConditionKinds = {
  issue: issueCondition,
  poll: pollCondition,
  proposal: proposalCondition,
  rsvp: rsvpCondition,
  timer: timerCondition
} satisfies { [K in WaitKind]: WaitConditionEntry<K> };

type ErasedDefinition = {
  judge: (condition: WaitCondition, loaded: unknown) => WaitEvaluation;
  label: (ctx: WaitReadCtx, condition: WaitCondition) => Promise<string>;
  load: (ctx: WaitReadCtx, condition: WaitCondition, memo: WaitLoadMemo) => Promise<unknown>;
  refId: (condition: WaitCondition) => string;
  validate: (
    ctx: MutationCtx,
    condition: WaitCondition,
    scope: WaitScope
  ) => Promise<{ tripId: WaitScope['tripId'] }>;
};

function definitionFor(condition: WaitCondition): ErasedDefinition {
  return waitConditionKinds[condition.kind] as unknown as ErasedDefinition;
}

export function conditionRefId(condition: WaitCondition): string {
  return definitionFor(condition).refId(condition);
}

export async function evaluateCondition(
  ctx: WaitReadCtx,
  condition: WaitCondition,
  memo: WaitLoadMemo = new Map()
): Promise<WaitEvaluation> {
  const definition = definitionFor(condition);
  return definition.judge(condition, await definition.load(ctx, condition, memo));
}

/**
 * Evaluates conditions that all watch the same ref (one `signal` batch) with a single load, so
 * a batch of poll waits reads the poll's tally once, not once per wait.
 */
export async function evaluateSameRef(
  ctx: WaitReadCtx,
  conditions: WaitCondition[],
  memo: WaitLoadMemo
): Promise<WaitEvaluation[]> {
  const [first] = conditions;
  if (!first) return [];
  const loaded = await definitionFor(first).load(ctx, first, memo);
  return conditions.map((condition) => definitionFor(condition).judge(condition, loaded));
}

export async function conditionLabel(ctx: WaitReadCtx, condition: WaitCondition): Promise<string> {
  return await definitionFor(condition).label(ctx, condition);
}

export async function validateCondition(
  ctx: MutationCtx,
  condition: WaitCondition,
  scope: WaitScope
): Promise<{ tripId: WaitScope['tripId'] }> {
  return await definitionFor(condition).validate(ctx, condition, scope);
}
