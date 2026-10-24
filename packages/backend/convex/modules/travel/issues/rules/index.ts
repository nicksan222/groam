import { ConvexError } from 'convex/values';
import { clauseKindList } from '#convex/modules/travel/issues/rules/kinds/index';
import {
  type ClauseField,
  type ClauseKind,
  type ClauseKindDefinition,
  type ClauseOf,
  type ClauseResult,
  type FactList,
  type IssueRule,
  type PresentedRule,
  type RuleCategory,
  type RuleClause,
  type RuleFacts,
  type RuleGroup,
  type RuleItem,
  type RuleMatch,
  ruleCategories
} from '#convex/modules/travel/issues/rules/types';

/**
 * Composed "done when" rules: a person picks clauses from `clauseKinds`, joins them with all,
 * any, or none, and may group a few. The system checks them against the shared trip, so the issue closes when the rule holds and reopens when it stops holding.
 * Pure, so the web rule builder shares the same wording and defaults.
 */

export type {
  ClauseField,
  ClauseKind,
  ClauseKindDefinition,
  ClauseOf,
  ClauseResult,
  FactList,
  IssueRule,
  PresentedRule,
  RuleCategory,
  RuleClause,
  RuleFacts,
  RuleGroup,
  RuleItem,
  RuleMatch
} from '#convex/modules/travel/issues/rules/types';
export { ruleCategories };

export const MAX_RULE_ITEMS = 8;
export const MAX_GROUP_CLAUSES = 8;
/** The longest sentence the AI drafter turns into a rule; shared with the builder's input. */
export const MAX_RULE_PROMPT_LENGTH = 500;

/** Every kind by name. The rule validator is built from the same list, so none is missing. */
export const clauseKinds = Object.fromEntries(
  clauseKindList.map((definition) => [definition.kind, definition])
) as unknown as { [K in ClauseKind]: ClauseKindDefinition<K> };

/** One kind's definition, typed to that kind; the one place the registry is indexed. */
export function clauseKind<K extends ClauseKind>(kind: K): ClauseKindDefinition<K> {
  return clauseKinds[kind];
}

export function clauseLabel(clause: RuleClause): string {
  return clauseKind(clause.kind).label(clause);
}

function checkClause(clause: RuleClause, facts: RuleFacts): ClauseResult {
  return clauseKind(clause.kind).check(clause, facts);
}

function normalizeClause(clause: RuleClause): RuleClause {
  return clauseKind(clause.kind).normalize(clause);
}

/** The settings a person tunes for `kind`, in sentence order. */
export function clauseFields(kind: ClauseKind): ReadonlyArray<ClauseField> {
  return clauseKind(kind).fields;
}

/** A fresh clause of `kind`, as the builder adds it. */
export function createClause<K extends ClauseKind>(kind: K): ClauseOf<K> {
  return clauseKind(kind).create();
}

/** The kind picker: every kind, grouped by category in display order. */
export function clauseKindsByCategory(): Array<{
  category: RuleCategory;
  kinds: Array<{ description: string; kind: ClauseKind; title: string }>;
  title: string;
}> {
  const kinds = clauseKindList.map(({ kind }) => kind);
  return (Object.keys(ruleCategories) as Array<RuleCategory>).map((category) => ({
    category,
    kinds: kinds
      .filter((kind) => clauseKind(kind).category === category)
      .map((kind) => ({
        description: clauseKind(kind).description,
        kind,
        title: clauseKind(kind).title
      })),
    title: ruleCategories[category]
  }));
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function joinLabels(labels: Array<string>, match: RuleMatch): string {
  const [first, ...rest] = labels;
  if (first === undefined) return '';
  if (match === 'none') return `None of: ${labels.map(lowerFirst).join('; ')}`;
  return [first, ...rest.map(lowerFirst)].join(match === 'all' ? ' and ' : ' or ');
}

export function groupLabel(group: RuleGroup): string {
  return joinLabels(group.clauses.map(clauseLabel), group.match);
}

/** One sentence: "Day 1 has at least 2 activities and (the trip has … or …)". */
export function ruleLabel(rule: IssueRule): string {
  const labels = rule.items.map((item, index) => {
    if (item.kind !== 'group') return clauseLabel(item);
    // Lowercased here, since `joinLabels` cannot see past the parenthesis.
    const label = index === 0 ? groupLabel(item) : lowerFirst(groupLabel(item));
    return item.clauses.length > 1 && rule.items.length > 1 ? `(${label})` : label;
  });
  return joinLabels(labels, rule.match);
}

function combine(match: RuleMatch, results: Array<{ met: boolean }>): boolean {
  switch (match) {
    case 'all': {
      return results.every(({ met }) => met);
    }
    case 'any': {
      return results.some(({ met }) => met);
    }
    case 'none': {
      return !results.some(({ met }) => met);
    }
  }
}

/** Checks bounds and trims text; throws a readable error for anything a person must fix. */
export function normalizeRule(rule: IssueRule): IssueRule {
  if (rule.items.length === 0) throw new ConvexError('Add at least one condition');
  if (rule.items.length > MAX_RULE_ITEMS) {
    throw new ConvexError(`Rules support up to ${MAX_RULE_ITEMS} conditions`);
  }
  return {
    items: rule.items.map((item): RuleItem => {
      if (item.kind !== 'group') return normalizeClause(item);
      if (item.clauses.length === 0) throw new ConvexError('Groups need at least one condition');
      if (item.clauses.length > MAX_GROUP_CLAUSES) {
        throw new ConvexError(`Groups support up to ${MAX_GROUP_CLAUSES} conditions`);
      }
      return { clauses: item.clauses.map(normalizeClause), kind: 'group', match: item.match };
    }),
    match: rule.match
  };
}

/** Why a person cannot hand-close an unmet rule issue, or hand-reopen a met one. */
export function ruleRefusal(label: string, met: boolean): string {
  return met
    ? `Settled automatically: ${label}. Change the trip through an idea to reopen it.`
    : `This closes itself once ${lowerFirst(label)}. Start an idea that gets it there.`;
}

/** The rule with every clause checked, for the issue card and the "Done when" panel. */
export function presentRule(rule: IssueRule, facts: RuleFacts): PresentedRule {
  const items = rule.items.map((item) => {
    if (item.kind !== 'group') {
      return { ...checkClause(item, facts), kind: 'clause' as const, label: clauseLabel(item) };
    }
    const clauses = item.clauses.map((clause) => ({
      ...checkClause(clause, facts),
      label: clauseLabel(clause)
    }));
    return {
      clauses,
      kind: 'group' as const,
      label: groupLabel(item),
      match: item.match,
      met: combine(item.match, clauses)
    };
  });
  const met = combine(rule.match, items);
  const label = ruleLabel(rule);
  return {
    items,
    kind: 'rule',
    label,
    match: rule.match,
    met,
    refusal: ruleRefusal(label, met),
    rule
  };
}

/** Which trip lists a rule reads, so facts load only what some issue needs. */
export function ruleNeeds(rule: IssueRule): Set<FactList> {
  const clauses = rule.items.flatMap((item) => (item.kind === 'group' ? item.clauses : [item]));
  return new Set(clauses.flatMap((clause) => clauseKind(clause.kind).needs));
}

/** Facts with no lists loaded: what a check sees for anything nobody asked to read. */
export function emptyRuleFacts(trip: RuleFacts['trip']): RuleFacts {
  return {
    activities: [],
    destinations: [],
    packing: [],
    stays: [],
    transfers: { activity: [], boundary: [], destination: [] },
    travelers: [],
    trip
  };
}
