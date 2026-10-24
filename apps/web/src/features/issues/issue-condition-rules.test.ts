import { describe, expect, test } from 'vite-plus/test';
import {
  manualCondition,
  ruleCondition,
  starterCondition
} from '@/features/issues/issue-condition-fixtures';
import type { IssueCondition, IssueStatus } from '@/types/issues';
import { isStarterCondition, isSystemChecked, statusChangeRefusal } from './issue-condition-rules';

const unmet = starterCondition(false, 'Closes once the trip has a destination.');
const met = starterCondition(true, 'Settled by the trip.');

const cases = [
  {
    condition: unmet,
    expected: unmet.refusal,
    from: 'open',
    name: 'closing while unmet',
    to: 'closed'
  },
  {
    condition: unmet,
    expected: unmet.refusal,
    from: 'in_progress',
    name: "won't do while unmet",
    to: 'wont_do'
  },
  {
    condition: met,
    expected: met.refusal,
    from: 'closed',
    name: 'reopening while met',
    to: 'open'
  },
  {
    condition: met,
    expected: met.refusal,
    from: 'closed',
    name: 'in progress while met',
    to: 'in_progress'
  },
  {
    condition: met,
    expected: met.refusal,
    from: 'closed',
    name: "won't do while met",
    to: 'wont_do'
  },
  {
    condition: unmet,
    expected: null,
    from: 'open',
    name: 'working on it while unmet',
    to: 'in_progress'
  },
  { condition: unmet, expected: null, from: 'open', name: 'staying put while unmet', to: 'open' },
  { condition: met, expected: null, from: 'closed', name: 'staying put while met', to: 'closed' },
  {
    condition: manualCondition(),
    expected: null,
    from: 'closed',
    name: 'a manual condition',
    to: 'open'
  },
  { condition: null, expected: null, from: 'open', name: 'no condition', to: 'closed' }
] satisfies Array<{
  condition: IssueCondition | null;
  expected: string | null;
  from: IssueStatus;
  name: string;
  to: IssueStatus;
}>;

describe('statusChangeRefusal', () => {
  test.each(cases)('$name', ({ condition, expected, from, to }) => {
    expect(statusChangeRefusal(condition, from, to)).toBe(expected);
  });
});

describe('statusChangeRefusal for composed rules', () => {
  test.each<{ from: IssueStatus; met: boolean; name: string; refused: boolean; to: IssueStatus }>([
    { from: 'open', met: false, name: 'closing while unmet', refused: true, to: 'closed' },
    { from: 'closed', met: true, name: 'reopening while met', refused: true, to: 'open' },
    {
      from: 'open',
      met: false,
      name: 'working on it while unmet',
      refused: false,
      to: 'in_progress'
    },
    { from: 'open', met: false, name: "won't do while unmet", refused: false, to: 'wont_do' },
    { from: 'closed', met: true, name: "won't do while met", refused: false, to: 'wont_do' },
    {
      from: 'wont_do',
      met: false,
      name: "back from won't do while unmet",
      refused: false,
      to: 'open'
    }
  ])('$name', ({ from, met, refused, to }) => {
    const condition = ruleCondition(met);
    expect(statusChangeRefusal(condition, from, to)).toBe(refused ? condition.refusal : null);
  });
});

describe('condition kinds', () => {
  test('only a starter rule is locked', () => {
    expect(isStarterCondition(starterCondition())).toBe(true);
    expect(isStarterCondition(ruleCondition())).toBe(false);
    expect(isStarterCondition(manualCondition())).toBe(false);
    expect(isStarterCondition(null)).toBe(false);
  });

  test('every rule is system-checked, a manual condition is not', () => {
    expect(isSystemChecked(starterCondition())).toBe(true);
    expect(isSystemChecked(ruleCondition())).toBe(true);
    expect(isSystemChecked(manualCondition())).toBe(false);
  });
});
