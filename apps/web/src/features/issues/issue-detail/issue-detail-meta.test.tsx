import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { IssueDetailData } from './issue-detail-data';
import { IssueDetailMeta } from './issue-detail-meta';

const state = vi.hoisted(() => ({ isPending: false }));
const setStatus = vi.hoisted(() => vi.fn());

vi.mock('@/features/issues/hooks/use-issue-mutations', () => ({
  useIssueMutations: () => ({ setStatus })
}));

vi.mock('@/features/workspace/hooks/use-async-pending', () => ({
  useAsyncPending: () => ({
    isPending: state.isPending,
    run: (task: () => Promise<unknown>) => task()
  })
}));

function makeIssue(overrides: Partial<IssueDetailData> = {}): IssueDetailData {
  return {
    assignee: null,
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    body: '',
    canAssign: true,
    canManage: true,
    closedAt: null,
    comments: [],
    condition: null,
    dueAt: null,
    id: 'issue-1' as Id<'tripIssues'>,
    idea: null,
    labels: [],
    rank: 0,
    status: 'open',
    title: 'Coast day',
    tripId: 'trip-1' as Id<'trips'>,
    tripName: 'Atlantic week',
    updatedAt: Date.now() - 86_400_000,
    ...overrides
  } as IssueDetailData;
}

beforeEach(() => {
  state.isPending = false;
  setStatus.mockReset();
  setStatus.mockResolvedValue(undefined);
});

describe('IssueDetailMeta', () => {
  test('shows who opened the issue and when', async () => {
    await render(<IssueDetailMeta issue={makeIssue()} />);
    await expect.element(page.getByText('Alex Morgan')).toBeVisible();
    await expect
      .element(page.getByText(/opened by/u))
      .toHaveTextContent('opened by Alex Morgan · yesterday');
  });

  test('shows labels', async () => {
    await render(<IssueDetailMeta issue={makeIssue({ labels: ['mandatory'] })} />);
    await expect.element(page.getByText('Mandatory')).toBeVisible();
  });

  test('changes status through the select', async () => {
    await render(<IssueDetailMeta issue={makeIssue()} />);
    await page.getByRole('combobox', { name: 'Issue status' }).click();
    await page
      .getByTestId(testIds.issueStatusSelectOption)
      .filter({ hasText: 'In progress' })
      .click();
    await expect.poll(() => setStatus.mock.calls).toEqual([['issue-1', 'in_progress']]);
  });

  test('is read-only without manage rights', async () => {
    await render(<IssueDetailMeta issue={makeIssue({ canManage: false, status: 'closed' })} />);
    await expect.element(page.getByTestId(testIds.issueStatus)).toHaveTextContent('Done');
    await expect.element(page.getByRole('combobox')).not.toBeInTheDocument();
  });

  test('disables the select while a change is pending', async () => {
    state.isPending = true;
    await render(<IssueDetailMeta issue={makeIssue()} />);
    await expect.element(page.getByRole('combobox', { name: 'Issue status' })).toBeDisabled();
  });
});
