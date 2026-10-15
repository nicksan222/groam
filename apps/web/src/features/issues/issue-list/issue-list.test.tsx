import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { expectPhoneListRow } from '@/testing/phone-list';
import { IssueList, type IssueListItem } from './issue-list';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, className, to }: { children?: ReactNode; className?: string; to: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
  useNavigate: () => navigate
}));

const issues: IssueListItem[] = [
  {
    assignee: null,
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    id: 'issue-1' as Id<'tripIssues'>,
    idea: null,
    status: 'open',
    title: 'Coast day',
    tripName: 'Atlantic week',
    updatedAt: Date.UTC(2026, 7, 17)
  },
  {
    assignee: null,
    author: { name: 'Sam Planner', userId: 'user-sam' },
    id: 'issue-2' as Id<'tripIssues'>,
    idea: null,
    status: 'open',
    title: 'Museum morning',
    tripName: 'City break',
    updatedAt: Date.UTC(2026, 7, 10)
  }
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

test('renders a compact search-and-status toolbar instead of stacked filter chrome', async () => {
  await renderList();

  const toolbar = document.querySelector('[aria-label="Filter issues"]');
  expect(toolbar?.className).toContain('flex');
  expect(toolbar?.className).toContain('items-center');
  expect(toolbar?.className).not.toContain('dashboard-panel');
  expect(document.querySelector('table')).toBeTruthy();
  await expect.element(page.getByRole('button', { name: 'Issue' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: /Open \d+/u })).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: /Closed \d+/u })).not.toBeInTheDocument();
  await expect.element(page.getByLabelText('Search issues')).toBeInTheDocument();
  expect(page.getByLabelText('Filter issues by status').element().textContent).toContain('Open');
  await expect.element(page.getByText('Coast day')).toBeInTheDocument();
  await expect.element(page.getByText('Museum morning')).toBeInTheDocument();
});

test('searches visible issue fields and can clear the filter', async () => {
  await renderList();

  await page.getByLabelText('Search issues').fill('museum');
  await expect.element(page.getByText('Coast day')).not.toBeInTheDocument();
  await expect.element(page.getByText('Museum morning')).toBeInTheDocument();

  await page.getByRole('button', { name: 'Clear issue filters' }).click();
  await expect.element(page.getByText('Coast day')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Search issues')).toHaveValue('');
});

describe('on a phone', () => {
  afterEach(() => page.viewport(1280, 800));

  const firstRow = () =>
    page
      .getByRole('row')
      .filter({ has: page.getByRole('link', { name: /Coast day|Museum morning/u }) })
      .first();

  test('keeps titles readable, drops secondary columns and opens a row on tap', async () => {
    await page.viewport(390, 844);
    await renderList();
    await expectPhoneListRow(firstRow());
    await expect.element(page.getByText('Opened by')).not.toBeVisible();

    // The title is a real link, so a tap navigates without needing row activation.
    await expect.element(firstRow().getByRole('link')).toHaveAttribute('href', '/issues/$issueId');
  });

  test('shows the author and assignee columns again on a wide screen', async () => {
    await renderList();
    const cells = [...firstRow().element().querySelectorAll('td')];
    expect(cells.filter((cell) => cell.checkVisibility()).length).toBeGreaterThan(2);
    await expect.element(page.getByText('Opened by')).toBeVisible();
  });
});
