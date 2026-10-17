import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import type { WaitCondition, WaitKind, WaitSnapshot } from '#convex/modules/assistant/waits/schema';
import type { Workspace } from '#convex/modules/auth/workspace';

export type ConditionOf<K extends WaitKind> = Extract<WaitCondition, { kind: K }>;

/** Where the waiting run lives; conditions check their target against it. */
export type WaitScope = {
  discussionId: Id<'discussions'> | null;
  organizationId: string;
  tripId: Id<'trips'> | null;
  /** The run's creator, whose access bounds what the run may watch. */
  viewer: Workspace;
};

export type WaitEvaluation = {
  met: boolean;
  progress: string | null;
  snapshot: WaitSnapshot;
  summary: string;
};

export type WaitReadCtx = QueryCtx | MutationCtx;

/**
 * Per-signal scratch space: loaders a condition may reuse across refs in one transaction (the
 * roster, trip RSVPs), keyed by the condition that owns them.
 */
export type WaitLoadMemo = Map<string, unknown>;

export function memoized<T>(memo: WaitLoadMemo, key: string, make: () => T): T {
  if (!memo.has(key)) memo.set(key, make());
  return memo.get(key) as T;
}

/**
 * `load` reads only what `refId` names, so every wait on one ref shares a single load; `judge`
 * applies one wait's rule to it without reading.
 */
export type WaitConditionDefinition<K extends WaitKind, Loaded> = {
  judge: (condition: ConditionOf<K>, loaded: Loaded) => WaitEvaluation;
  kind: K;
  label: (ctx: WaitReadCtx, condition: ConditionOf<K>) => Promise<string>;
  load: (ctx: WaitReadCtx, condition: ConditionOf<K>, memo: WaitLoadMemo) => Promise<Loaded>;
  refId: (condition: ConditionOf<K>) => string;
  validate: (
    ctx: MutationCtx,
    condition: ConditionOf<K>,
    scope: WaitScope
  ) => Promise<{ tripId: Id<'trips'> | null }>;
};

/** A definition with its load type erased, for the registry. */
export type WaitConditionEntry<K extends WaitKind> = Omit<
  WaitConditionDefinition<K, unknown>,
  'judge'
> & { judge: (condition: ConditionOf<K>, loaded: never) => WaitEvaluation };

export function defineWaitCondition<K extends WaitKind, Loaded>(
  definition: WaitConditionDefinition<K, Loaded>
): WaitConditionDefinition<K, Loaded> {
  return definition;
}
