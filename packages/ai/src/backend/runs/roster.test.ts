import { expect, test } from 'vite-plus/test';
import { RUN_STATUS_LABEL } from '#ai/backend/runs/ids';
import {
  canRerunIssueAgent,
  canRetryAgentRunFromZero,
  countActiveAgentRuns,
  isActiveAgentRun,
  rosterStatusFromRuns
} from './roster';

test('derives roster status from the newest runs first', () => {
  expect(rosterStatusFromRuns([{ status: 'complete' }, { status: 'failed' }])).toBe('idle');
  expect(rosterStatusFromRuns([{ status: 'failed' }, { status: 'complete' }])).toBe('failed');
  expect(rosterStatusFromRuns([{ status: 'running' }, { status: 'failed' }])).toBe('working');
});

test('counts active runs without a second pass', () => {
  expect(
    countActiveAgentRuns([{ status: 'queued' }, { status: 'running' }, { status: 'complete' }])
  ).toBe(2);
});

test('retries from zero only when an issue run failed', () => {
  expect(canRetryAgentRunFromZero({ issueId: 'issue-1', status: 'failed' })).toBe(true);
  expect(canRetryAgentRunFromZero({ issueId: 'issue-1', status: 'aborted' })).toBe(false);
  expect(canRetryAgentRunFromZero({ issueId: 'issue-1', status: 'complete' })).toBe(false);
  expect(canRetryAgentRunFromZero({ issueId: null, status: 'failed' })).toBe(false);
});

test('re-runs a finished issue agent, not a failed or active one', () => {
  expect(canRerunIssueAgent({ issueId: 'issue-1', status: 'complete' })).toBe(true);
  expect(canRerunIssueAgent({ issueId: 'issue-1', status: 'aborted' })).toBe(true);
  expect(canRerunIssueAgent({ issueId: 'issue-1', status: 'failed' })).toBe(false);
  expect(canRerunIssueAgent({ issueId: 'issue-1', status: 'running' })).toBe(false);
  expect(canRerunIssueAgent({ issueId: null, status: 'complete' })).toBe(false);
});

test('a waiting run is active and keeps the agent working', () => {
  expect(isActiveAgentRun({ status: 'waiting' })).toBe(true);
  expect(rosterStatusFromRuns([{ status: 'waiting' }])).toBe('working');
  expect(RUN_STATUS_LABEL.waiting).toBe('Waiting');
});
