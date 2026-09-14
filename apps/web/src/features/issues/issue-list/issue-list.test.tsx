import type { Id } from '@groam/backend/data-model';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { IssueList, type IssueListItem } from './issue-list';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className, to }: { children?: ReactNode; className?: string; to: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn()
}));

afterEach(cleanup);

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

function renderList() {
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

test('renders a compact search-and-status toolbar instead of stacked filter chrome', () => {
  renderList();

  const toolbar = document.querySelector('[aria-label="Filter issues"]');
  expect(toolbar?.className).toContain('flex');
  expect(toolbar?.className).toContain('items-center');
  expect(toolbar?.className).not.toContain('dashboard-panel');
  expect(document.querySelector('table')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Issue' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Open \d+/u })).toBeNull();
  expect(screen.queryByRole('button', { name: /Closed \d+/u })).toBeNull();
  expect(screen.getByLabelText('Search issues')).toBeTruthy();
  expect(screen.getByLabelText('Filter issues by status').textContent).toContain('Open');
  expect(screen.getByText('Coast day')).toBeTruthy();
  expect(screen.getByText('Museum morning')).toBeTruthy();
});

test('searches visible issue fields and can clear the filter', () => {
  renderList();

  fireEvent.change(screen.getByLabelText('Search issues'), { target: { value: 'museum' } });
  expect(screen.queryByText('Coast day')).toBeNull();
  expect(screen.getByText('Museum morning')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Clear issue filters' }));
  expect(screen.getByText('Coast day')).toBeTruthy();
  expect((screen.getByLabelText('Search issues') as HTMLInputElement).value).toBe('');
});
