import {
  createClause,
  MAX_GROUP_CLAUSES,
  MAX_RULE_ITEMS
} from '@groam/backend/convex/modules/travel/issues/rules/index';
import type {
  ClauseField,
  ClauseKind,
  IssueRule,
  RuleClause,
  RuleDraft,
  RuleDraftClause,
  RuleDraftGroup,
  RuleDraftItem,
  RuleMatch
} from '@/types/issues';

/**
 * The rule editor's working copy. Rows carry keys so React keeps each row's inputs while others
 * are added or removed; `ruleFromDraft` drops them again for the server, which normalizes.
 */

export { MAX_GROUP_CLAUSES, MAX_RULE_ITEMS };

/** What a new row starts as: the most common planning check. */
const DEFAULT_CLAUSE_KIND: ClauseKind = 'daily_activities';

let nextKey = 0;
function key(): string {
  nextKey += 1;
  return `rule-row-${nextKey}`;
}

function draftClause(clause: RuleClause): RuleDraftClause {
  return { clause, key: key() };
}

export function draftFromRule(rule: IssueRule | null | undefined): RuleDraft {
  if (!rule) return { items: [], match: 'all' };
  return {
    items: rule.items.map((item): RuleDraftItem =>
      item.kind === 'group'
        ? { clauses: item.clauses.map(draftClause), key: key(), kind: 'group', match: item.match }
        : { ...draftClause(item), kind: 'clause' }
    ),
    match: rule.match
  };
}

export function ruleFromDraft(draft: RuleDraft): IssueRule {
  return {
    items: draft.items.map((item) =>
      item.kind === 'group'
        ? { clauses: item.clauses.map(({ clause }) => clause), kind: 'group', match: item.match }
        : item.clause
    ),
    match: draft.match
  };
}

/** A draft with one default row: where editing an issue with no rule yet starts. */
export function startingDraft(): RuleDraft {
  return {
    items: [{ ...draftClause(createClause(DEFAULT_CLAUSE_KIND)), kind: 'clause' }],
    match: 'all'
  };
}

export function canAddItem(draft: RuleDraft): boolean {
  return draft.items.length < MAX_RULE_ITEMS;
}

export function canAddToGroup(group: RuleDraftGroup): boolean {
  return group.clauses.length < MAX_GROUP_CLAUSES;
}

export function addClause(draft: RuleDraft, kind: ClauseKind = DEFAULT_CLAUSE_KIND): RuleDraft {
  if (!canAddItem(draft)) return draft;
  return {
    ...draft,
    items: [...draft.items, { ...draftClause(createClause(kind)), kind: 'clause' }]
  };
}

/** A new group starts with one row and `any`, the usual reason to group. */
export function addGroup(draft: RuleDraft): RuleDraft {
  if (!canAddItem(draft)) return draft;
  const group: RuleDraftItem = {
    clauses: [draftClause(createClause(DEFAULT_CLAUSE_KIND))],
    key: key(),
    kind: 'group',
    match: 'any'
  };
  return { ...draft, items: [...draft.items, group] };
}

export function setRuleMatch(draft: RuleDraft, match: RuleMatch): RuleDraft {
  return { ...draft, match };
}

export function removeItem(draft: RuleDraft, itemKey: string): RuleDraft {
  return { ...draft, items: draft.items.filter((item) => item.key !== itemKey) };
}

/** Updates one group by key; every group-scoped operation shares it. */
function mapGroup(
  draft: RuleDraft,
  groupKey: string,
  update: (group: RuleDraftGroup) => RuleDraftGroup
): RuleDraft {
  return {
    ...draft,
    items: draft.items.map((item) =>
      item.kind === 'group' && item.key === groupKey ? update(item) : item
    )
  };
}

/** Replaces a row's clause, top level or inside any group. */
export function setClause(draft: RuleDraft, rowKey: string, clause: RuleClause): RuleDraft {
  return {
    ...draft,
    items: draft.items.map((item) => {
      if (item.kind === 'clause') return item.key === rowKey ? { ...item, clause } : item;
      return {
        ...item,
        clauses: item.clauses.map((row) => (row.key === rowKey ? { ...row, clause } : row))
      };
    })
  };
}

/** Switching a row's kind starts it over from that kind's defaults. */
export function setClauseKind(draft: RuleDraft, rowKey: string, kind: ClauseKind): RuleDraft {
  return setClause(draft, rowKey, createClause(kind));
}

export function setGroupMatch(draft: RuleDraft, groupKey: string, match: RuleMatch): RuleDraft {
  return mapGroup(draft, groupKey, (group) => ({ ...group, match }));
}

export function addGroupClause(draft: RuleDraft, groupKey: string): RuleDraft {
  return mapGroup(draft, groupKey, (group) =>
    canAddToGroup(group)
      ? { ...group, clauses: [...group.clauses, draftClause(createClause(DEFAULT_CLAUSE_KIND))] }
      : group
  );
}

/** Removing a group's last row removes the group. */
export function removeGroupClause(draft: RuleDraft, groupKey: string, rowKey: string): RuleDraft {
  const next = mapGroup(draft, groupKey, (group) => ({
    ...group,
    clauses: group.clauses.filter((row) => row.key !== rowKey)
  }));
  return {
    ...next,
    items: next.items.filter((item) => item.kind !== 'group' || item.clauses.length > 0)
  };
}

/**
 * Sets one setting from the builder. A blank optional setting drops its key, since the validator
 * rejects `undefined` values.
 */
export function setClauseField(
  clause: RuleClause,
  field: ClauseField,
  value: number | string
): RuleClause {
  const next: Record<string, unknown> = { ...clause, [field.key]: value };
  const optional = field.type === 'text' ? field.optional : field.type === 'choice' && !!field.any;
  if (optional && value === '') Reflect.deleteProperty(next, field.key);
  return next as RuleClause;
}

/** The word that leads a row, so the rule reads down the page: "When …", "and …", "or …". */
export function joinerWord(match: RuleMatch, index: number): string {
  if (index === 0) return 'When';
  return match === 'all' ? 'and' : 'or';
}
