import { v } from 'convex/values';
import { clauseKindList } from '#convex/modules/travel/issues/rules/kinds/index';

/**
 * Validators for composed "done when" rules. Each clause kind brings its own validator from its
 * file under `kinds/`; this joins them with grouping and the presented shapes.
 */

/** Every item holds, at least one does, or none does. */
const match = v.union(v.literal('all'), v.literal('any'), v.literal('none'));

/** One yes/no question a planner asks of the shared trip; counts are minimums. */
const ruleClause = v.union(...clauseKindList.map(({ validator }) => validator));

const ruleGroup = v.object({ clauses: v.array(ruleClause), kind: v.literal('group'), match });

/** A person's composed "done when": clauses and one level of grouped clauses. */
const rule = v.object({ items: v.array(v.union(ruleClause, ruleGroup)), match });

/** One checked clause; `detail` says what is missing, such as "Day 2 has 1". */
const presentedClause = v.object({
  detail: v.union(v.string(), v.null()),
  label: v.string(),
  met: v.boolean()
});

const presentedRule = v.object({
  items: v.array(
    v.union(
      presentedClause.extend({ kind: v.literal('clause') }),
      v.object({
        clauses: v.array(presentedClause),
        kind: v.literal('group'),
        label: v.string(),
        match,
        met: v.boolean()
      })
    )
  ),
  kind: v.literal('rule'),
  label: v.string(),
  match,
  met: v.boolean(),
  /** What a person gets told when they try to close it unmet or reopen it met. */
  refusal: v.string(),
  rule
});

export const RuleValidators = {
  match,
  presentedRule,
  rule,
  ruleClause,
  ruleGroup
};
