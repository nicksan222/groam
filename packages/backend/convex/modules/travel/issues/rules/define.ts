import { type ObjectType, type PropertyValidators, v } from 'convex/values';
import type {
  ClauseField,
  ClauseResult,
  FactList,
  RuleCategory,
  RuleFacts
} from '#convex/modules/travel/issues/rules/types';

/** A clause of kind `K` with settings `A`, as stored. */
export type Clause<K extends string, A extends PropertyValidators> = { kind: K } & ObjectType<A>;

/**
 * Everything one clause kind is, in one place. `args` validates its settings and is part of the
 * stored rule shape. `create` gives the builder's defaults and `normalize` checks bounds and trims
 * text, throwing a readable error; both may be left out when there is nothing to tune. `check`
 * answers the clause against the trip, reading only the lists named in `needs`.
 */
export type ClauseKindSpec<K extends string, A extends PropertyValidators> = {
  args: A;
  category: RuleCategory;
  check: (clause: Clause<K, A>, facts: RuleFacts) => ClauseResult;
  create?: () => ObjectType<A>;
  /** One line for the kind picker and the AI drafter. */
  description: string;
  /** The settings a person tunes in the builder, in the order the sentence reads. */
  fields?: ReadonlyArray<ClauseField<keyof A & string>>;
  kind: K;
  /** The plain-English clause, as rules read. */
  label: (clause: Clause<K, A>) => string;
  needs: ReadonlyArray<FactList>;
  normalize?: (clause: Clause<K, A>) => ObjectType<A>;
  /** The kind picker's name for it. */
  title: string;
};

/** Defines a clause kind; add it to `kinds/index.ts` and every rule surface picks it up. */
export function defineClauseKind<K extends string, A extends PropertyValidators>(
  spec: ClauseKindSpec<K, A>
) {
  const { args, create, kind, normalize, ...rest } = spec;
  const withKind = (settings: ObjectType<A>) => ({ ...settings, kind }) as Clause<K, A>;
  return {
    ...rest,
    create: () => withKind(create ? create() : ({} as ObjectType<A>)),
    fields: spec.fields ?? [],
    kind,
    normalize: (clause: Clause<K, A>) => withKind(normalize ? normalize(clause) : clause),
    validator: v.object({ ...args, kind: v.literal(kind) })
  };
}
