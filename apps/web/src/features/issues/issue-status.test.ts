import { expect, test } from 'vite-plus/test';
import { ISSUE_STATUSES, issueStatusMeta } from './issue-status';

test('orders the lifecycle and names every status for travelers', () => {
  expect(ISSUE_STATUSES.map((status) => issueStatusMeta[status].label)).toEqual([
    'To decide',
    'In progress',
    'Done',
    "Won't do"
  ]);
});
