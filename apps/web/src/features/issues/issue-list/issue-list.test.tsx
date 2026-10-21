import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { IssueListItem } from '@/types/issues';
import { IssueList } from './issue-list';

const listItem = {
  assignee: null,
  author: { name: 'Alex Morgan', userId: 'user-alex' },
  canAssign: true,
  canManage: true,
  condition: null,
  dueAt: null,
  id: 'issue-1' as Id<'tripIssues'>,
  idea: null,
  labels: [],
  rank: 0,
  shortId: 'isuabc',
  status: 'open',
  title: 'Coast day',
  updatedAt: Date.UTC(2026, 7, 17)
} satisfies Omit<IssueListItem, 'tripName'>;

const issueListItem = (over: Partial<IssueListItem> = {}): IssueListItem => ({
  ...listItem,
  tripName: 'Atlantic week',
  ...over
});

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/navigation/router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal, navigate);
});

const issues = [
  issueListItem(),
  issueListItem({
    author: { name: 'Sam Planner', userId: 'user-sam' },
    id: 'issue-2' as Id<'tripIssues'>,
    title: 'Museum morning',
    tripName: 'City break',
    updatedAt: Date.UTC(2026, 7, 10)
  })
];

async function renderList() {
  return render(
    <IssueList
      emptyFilterMessage={(filter) =>
        filter === 'open'
          ? 'There are no open issues in this group.'
          : filter === 'closed'
            ? 'There are no closed issues in this group.'
            : 'There are no issues in this group.'
      }
      issues={issues}
    />
  );
}

test('renders a searchable semantic list with status filtering and sorting', async () => {
  await renderList();
  await expect.element(page.getByRole('list', { name: 'Issues' })).toBeInTheDocument();
  await expect.element(page.getByRole('table')).not.toBeInTheDocument();
  await expect.element(page.getByLabelText('Search issues')).toBeVisible();
  await expect.element(page.getByLabelText('Filter issues by status')).toBeVisible();
  await expect.element(page.getByLabelText('Sort issues')).toBeVisible();
  expect(page.getByTestId(testIds.issueRow).elements()).toHaveLength(2);
});

test('searches issue context and clears the filter', async () => {
  await renderList();
  await page.getByLabelText('Search issues').fill('City break');
  await expect.element(page.getByText('Coast day')).not.toBeInTheDocument();
  await expect.element(page.getByText('Museum morning')).toBeVisible();
  await page.getByRole('button', { name: 'Clear issue filters' }).click();
  await expect.element(page.getByText('Coast day')).toBeVisible();
  await expect.element(page.getByLabelText('Search issues')).toHaveValue('');
});

test('sorts by activity and restores the original order', async () => {
  await renderList();
  await page.getByLabelText('Sort issues').click();
  await page.getByRole('option', { name: 'Oldest updated' }).click();
  expect(page.getByTestId(testIds.issueRow).elements()[0]?.getAttribute('data-issue-title')).toBe(
    'Museum morning'
  );
  await page.getByLabelText('Sort issues').click();
  await page.getByRole('option', { name: 'Default order' }).click();
  expect(page.getByTestId(testIds.issueRow).elements()[0]?.getAttribute('data-issue-title')).toBe(
    'Coast day'
  );
});

test('uses the full phone width without horizontal scrolling or variable row heights', async () => {
  await useViewport(390, 844);
  await renderList();
  const rows = page.getByTestId(testIds.issueRow).elements();
  expect(rows[0]?.getBoundingClientRect().width).toBeGreaterThan(300);
  expect(rows[0]?.getBoundingClientRect().height).toBe(rows[1]?.getBoundingClientRect().height);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
  await expect
    .element(page.getByRole('link', { name: 'Coast day' }))
    .toHaveAttribute('href', '/issues/issue-1');
});

test('honors custom issue activation', async () => {
  const onRowActivate = vi.fn();
  await render(
    <IssueList
      emptyFilterMessage={() => 'No issues'}
      issues={issues}
      onRowActivate={onRowActivate}
    />
  );
  await page.getByRole('button', { name: 'Coast day' }).click();
  expect(onRowActivate).toHaveBeenCalledWith(issues[0]);
});
