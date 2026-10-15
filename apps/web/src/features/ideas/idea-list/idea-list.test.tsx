import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { WorkspaceIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import { IdeaList } from './idea-list';

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

async function renderList() {
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

test('renders a compact search-and-status toolbar instead of stacked filter chrome', async () => {
  await renderList();

  const toolbar = page.getByLabelText('Filter ideas');
  await expect.element(toolbar).toHaveClass('flex', 'items-center');
  await expect.element(page.getByText('Add a coast day')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: /Open \d+/u })).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: /Settled \d+/u })).not.toBeInTheDocument();
  await expect.element(page.getByLabelText('Search ideas')).toBeInTheDocument();
  await expect.element(toolbar).not.toHaveClass('dashboard-panel');
  const chrome = document.querySelector('[data-slot="data-table"]');
  const table = document.querySelector('[data-slot="table"]');
  const tableContainer = document.querySelector('[data-slot="table-container"]');
  expect(chrome?.className).toContain('overflow-x-auto');
  expect(tableContainer?.className).toContain('w-full');
  expect(tableContainer?.className).not.toContain('w-max');
  expect(table?.className).toContain('w-full');
  expect(table?.className).not.toContain('w-max');
  expect(table?.className).toContain('table-fixed');
  expect(page.getByLabelText('Filter ideas by status').element().textContent).toContain('Open');
  await expect.element(page.getByText('In review')).toBeInTheDocument();
  await expect.element(page.getByText('Add a museum morning')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Your pending idea')).not.toBeInTheDocument();
  await expect.element(page.getByText('Your draft')).toBeInTheDocument();
  await expect.element(page.getByText('Coast day')).not.toBeInTheDocument();
  await expect.element(page.getByText('Museum stop')).not.toBeInTheDocument();
  expect(page.getByRole('button', { name: 'Continue editing' }).elements()).toHaveLength(1);
  await expect.element(page.getByTestId('idea-continue')).toBeInTheDocument();
  await expect.element(page.getByRole('link', { name: 'Open' })).toBeInTheDocument();
  const titles = page
    .getByRole('heading', { level: 4 })
    .elements()
    .map((heading) => heading.textContent);
  expect(titles[0]).toBe('Add a museum morning');
  expect(titles[1]).toBe('Add a coast day');
  expect(document.querySelector('[data-viewer-draft="true"]')?.className).toContain('bg-primary/5');
});

test('searches visible idea fields and can clear the filter', async () => {
  await renderList();

  await page.getByLabelText('Search ideas').fill('museum');
  await expect.element(page.getByText('Add a coast day')).not.toBeInTheDocument();
  await expect.element(page.getByText('Add a museum morning')).toBeInTheDocument();

  await page.getByRole('button', { name: 'Clear idea filters' }).click();
  await expect.element(page.getByText('Add a coast day')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Search ideas')).toHaveValue('');
});

test('supports custom row rendering and external activation', async () => {
  const onRowActivate = vi.fn();
  await render(
    <IdeaList
      emptyFilterMessage={() => 'none'}
      onRowActivate={onRowActivate}
      proposals={proposals}
      renderItem={(proposal) => <button type="button">{proposal.title}</button>}
      viewerUserId="user-sam"
    />
  );

  await expect.element(page.getByRole('table')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Add a coast day' })).toBeInTheDocument();
  await expect.element(page.getByRole('link', { name: 'View' })).not.toBeInTheDocument();
});

describe('on a phone', () => {
  afterEach(() => page.viewport(1280, 800));

  const firstRow = () =>
    page
      .getByRole('row')
      .filter({ has: page.getByRole('heading', { level: 4 }) })
      .first();

  test('keeps titles readable, drops secondary columns and opens a row on tap', async () => {
    await page.viewport(390, 844);
    await renderList();
    await expect.element(firstRow()).toBeVisible();

    const cells = [...firstRow().element().querySelectorAll('td')];
    await expect.poll(() => cells[0]?.getBoundingClientRect().width).toBeGreaterThan(200);
    // Only the title and status stay; the trip name moves under the title.
    expect(cells.filter((cell) => cell.checkVisibility())).toHaveLength(2);
    await expect.element(firstRow().getByText('City break').first()).toBeVisible();
    await expect.element(page.getByText('Started by')).not.toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Columns' })).not.toBeInTheDocument();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth
    );

    await firstRow().getByRole('heading', { level: 4 }).click();
    expect(navigate).toHaveBeenCalledOnce();
  });

  test('shows the trip and author columns again on a wide screen', async () => {
    await renderList();
    const cells = [...firstRow().element().querySelectorAll('td')];
    expect(cells.filter((cell) => cell.checkVisibility()).length).toBeGreaterThan(2);
    await expect.element(page.getByText('Started by')).toBeVisible();
  });
});
