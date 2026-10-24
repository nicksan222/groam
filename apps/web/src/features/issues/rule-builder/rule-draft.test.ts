import { describe, expect, test } from 'vite-plus/test';
import type { ClauseField, IssueRule } from '@/types/issues';
import {
  addClause,
  addGroup,
  addGroupClause,
  canAddItem,
  draftFromRule,
  MAX_RULE_ITEMS,
  removeGroupClause,
  removeItem,
  ruleFromDraft,
  setClause,
  setClauseKind,
  setGroupMatch,
  setClauseField,
  startingDraft
} from './rule-draft';

const rule: IssueRule = {
  items: [
    { kind: 'within_budget' },
    {
      clauses: [{ boundary: 'arrival', kind: 'boundary_transfer' }, { kind: 'legs_covered' }],
      kind: 'group',
      match: 'any'
    }
  ],
  match: 'all'
};

describe('rule drafts', () => {
  test('round-trip a saved rule with unique row keys', () => {
    const draft = draftFromRule(rule);
    expect(ruleFromDraft(draft)).toEqual(rule);
    const keys = draft.items.flatMap((item) =>
      item.kind === 'group' ? [item.key, ...item.clauses.map((row) => row.key)] : [item.key]
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('start with one row and add rows and groups up to the limit', () => {
    let draft = startingDraft();
    expect(draft.items).toHaveLength(1);
    draft = addGroup(draft);
    expect(draft.items[1]).toMatchObject({ kind: 'group', match: 'any' });
    while (canAddItem(draft)) draft = addClause(draft);
    expect(draft.items).toHaveLength(MAX_RULE_ITEMS);
    expect(addClause(draft)).toBe(draft);
    expect(addGroup(draft)).toBe(draft);
  });

  test('edit rows at the top level and inside groups', () => {
    let draft = draftFromRule(rule);
    const [top, group] = draft.items;
    if (top?.kind !== 'clause' || group?.kind !== 'group') throw new Error('bad fixture');
    const inner = group.clauses[0];
    if (!inner) throw new Error('bad fixture');

    draft = setClauseKind(draft, top.key, 'packing_packed');
    draft = setClause(draft, inner.key, { boundary: 'both', kind: 'boundary_transfer' });
    draft = setGroupMatch(draft, group.key, 'none');
    draft = addGroupClause(draft, group.key);
    const saved = ruleFromDraft(draft);
    expect(saved.items[0]).toEqual({ kind: 'packing_packed' });
    expect(saved.items[1]).toMatchObject({
      clauses: [{ boundary: 'both' }, { kind: 'legs_covered' }, { kind: 'daily_activities' }],
      match: 'none'
    });
  });

  test('drop a group with its last row, and remove top-level rows', () => {
    let draft = draftFromRule({
      items: [
        { kind: 'within_budget' },
        { clauses: [{ kind: 'legs_covered' }], kind: 'group', match: 'any' }
      ],
      match: 'all'
    });
    const [top, group] = draft.items;
    if (top?.kind !== 'clause' || group?.kind !== 'group' || !group.clauses[0]) {
      throw new Error('bad fixture');
    }
    draft = removeGroupClause(draft, group.key, group.clauses[0].key);
    expect(draft.items).toHaveLength(1);
    draft = removeItem(draft, top.key);
    expect(draft.items).toEqual([]);
  });

  test('set settings and drop blank optional ones', () => {
    const clause = { count: 1, kind: 'daily_activities' } as const;
    const count: ClauseField = { key: 'count', label: 'Count', type: 'number' };
    const title: ClauseField = {
      key: 'titleIncludes',
      label: 'Title',
      optional: true,
      placeholder: 'dinner',
      type: 'text'
    };
    const place: ClauseField = { key: 'text', label: 'Place', placeholder: 'Lisbon', type: 'text' };
    expect(setClauseField(clause, count, 3)).toEqual({ ...clause, count: 3 });
    const dinner = setClauseField(clause, title, 'dinner');
    expect(dinner).toEqual({ ...clause, titleIncludes: 'dinner' });
    expect(setClauseField(dinner, title, '')).toEqual(clause);
    expect(setClauseField({ kind: 'destination_named', text: 'Rome' }, place, '')).toEqual({
      kind: 'destination_named',
      text: ''
    });
  });
});
