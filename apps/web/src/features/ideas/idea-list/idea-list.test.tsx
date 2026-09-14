import type { Id } from '@groam/backend/data-model';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import type { WorkspaceIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import { IdeaList } from './idea-list';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className, to }: { children?: ReactNode; className?: string; to: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn()
}));

afterEach(cleanup);

const proposals: WorkspaceIdea[] = [
  {
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    ideaName: 'coast-day',
    id: 'idea-1' as Id<'tripProposals'>,
    reviewRequested: false,
    sourceTripId: 'trip-1' as WorkspaceIdea['sourceTripId'],
    sourceTripName: 'Atlantic week',
    status: 'in_review',
    title: 'Add a coast day',
    updatedAt: Date.UTC(2026, 7, 17),
    workingTripId: 'working-1' as WorkspaceIdea['workingTripId']
  },
  {
    author: { name: 'Sam Planner', userId: 'user-sam' },
    ideaName: 'museum-stop',
    id: 'idea-2' as Id<'tripProposals'>,
    reviewRequested: false,
    sourceTripId: 'trip-2' as WorkspaceIdea['sourceTripId'],
    sourceTripName: 'City break',
    status: 'draft',
    title: 'Add a museum morning',
    updatedAt: Date.UTC(2026, 7, 10),
    workingTripId: 'working-2' as WorkspaceIdea['workingTripId']
  }
];

function renderList() {
  return render(
    <IdeaList
      emptyFilterMessage={(filter) =>
        filter === 'pending'
          ? 'No open ideas.'
          : filter === 'merged'
            ? 'No settled ideas.'
            : 'No ideas yet.'
      }
      proposals={proposals}
      showTripName
      viewerUserId="user-sam"
    />
  );
}

test('renders a compact search-and-status toolbar instead of stacked filter chrome', () => {
  renderList();

  const toolbar = document.querySelector('[aria-label="Filter ideas"]');
  expect(toolbar?.className).toContain('flex');
  expect(toolbar?.className).toContain('items-center');
  expect(screen.getByText('Add a coast day')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Open \d+/u })).toBeNull();
  expect(screen.queryByRole('button', { name: /Settled \d+/u })).toBeNull();
  expect(screen.getByLabelText('Search ideas')).toBeTruthy();
  expect(toolbar?.className).not.toContain('dashboard-panel');
  const chrome = document.querySelector('[data-slot="data-table"]');
  const table = document.querySelector('[data-slot="table"]');
  const tableContainer = document.querySelector('[data-slot="table-container"]');
  expect(chrome?.className).toContain('overflow-x-auto');
  expect(tableContainer?.className).toContain('w-full');
  expect(tableContainer?.className).not.toContain('w-max');
  expect(table?.className).toContain('w-full');
  expect(table?.className).not.toContain('w-max');
  expect(table?.className).toContain('table-fixed');
  expect(screen.getByLabelText('Filter ideas by status').textContent).toContain('Open');
  expect(screen.getByText('In review')).toBeTruthy();
  expect(screen.getByText('Add a museum morning')).toBeTruthy();
  expect(screen.queryByLabelText('Your pending idea')).toBeNull();
  expect(screen.getByText('Your draft')).toBeTruthy();
  expect(screen.queryByText('Coast day')).toBeNull();
  expect(screen.queryByText('Museum stop')).toBeNull();
  expect(screen.getAllByRole('button', { name: 'Continue editing' })).toHaveLength(1);
  expect(screen.getByTestId('idea-continue')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Open' })).toBeTruthy();
  const titles = screen.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent);
  expect(titles[0]).toBe('Add a museum morning');
  expect(titles[1]).toBe('Add a coast day');
  expect(document.querySelector('[data-viewer-draft="true"]')?.className).toContain('bg-primary/5');
});

test('searches visible idea fields and can clear the filter', () => {
  renderList();

  fireEvent.change(screen.getByLabelText('Search ideas'), { target: { value: 'museum' } });
  expect(screen.queryByText('Add a coast day')).toBeNull();
  expect(screen.getByText('Add a museum morning')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Clear idea filters' }));
  expect(screen.getByText('Add a coast day')).toBeTruthy();
  expect((screen.getByLabelText('Search ideas') as HTMLInputElement).value).toBe('');
});

test('supports custom row rendering and external activation', () => {
  const onRowActivate = vi.fn();
  render(
    <IdeaList
      emptyFilterMessage={() => 'none'}
      onRowActivate={onRowActivate}
      proposals={proposals}
      renderItem={(proposal) => <button type="button">{proposal.title}</button>}
      viewerUserId="user-sam"
    />
  );

  expect(document.querySelector('table')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Add a coast day' })).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'View' })).toBeNull();
});
