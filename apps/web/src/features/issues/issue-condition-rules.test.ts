import { describe, expect, test } from 'vite-plus/test';
import type { IssueCondition, IssueStatus } from '@/types/issues';
import { statusChangeRefusal } from './issue-condition-rules';

const autoCondition = (
  met = false,
  refusal = met ? 'Settled by the trip.' : 'Closes once the trip has a destination.'
) =>
  ({
    check: 'destination',
    kind: 'auto',
    label: 'The trip has a destination',
    met,
    refusal
  }) satisfies IssueCondition;

const manualCondition = (label = 'Flights confirmed') =>
  ({ kind: 'manual', label, met: null }) satisfies IssueCondition;

const unmet = autoCondition(false, 'Closes once the trip has a destination.');
const met = autoCondition(true, 'Settled by the trip.');

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
