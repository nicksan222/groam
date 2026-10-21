import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { WorkspaceIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import { testIds } from '@/lib/test-ids';
import { IdeaList } from './idea-list';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/navigation/router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal, navigate);
});

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

test('renders a semantic list and prioritizes your draft without extra row chrome', async () => {
  await renderList();
  await expect.element(page.getByRole('list', { name: 'Ideas' })).toBeInTheDocument();
  await expect.element(page.getByRole('table')).not.toBeInTheDocument();
  await expect.element(page.getByLabelText('Search ideas')).toBeVisible();
  await expect.element(page.getByLabelText('Filter ideas by status')).toBeVisible();
  await expect.element(page.getByText('Your draft')).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Continue editing' })).toBeVisible();
  expect(page.getByTestId(testIds.ideaRow).elements()[0]?.getAttribute('data-viewer-draft')).toBe(
    'true'
  );
});

test('searches idea context and clears the filter', async () => {
  await renderList();
  await page.getByLabelText('Search ideas').fill('museum');
  await expect.element(page.getByText('Add a coast day')).not.toBeInTheDocument();
  await expect.element(page.getByText('Add a museum morning')).toBeVisible();
  await page.getByRole('button', { name: 'Clear idea filters' }).click();
  await expect.element(page.getByText('Add a coast day')).toBeVisible();
  await expect.element(page.getByLabelText('Search ideas')).toHaveValue('');
});

test('supports custom records', async () => {
  await render(
    <IdeaList
      emptyFilterMessage={() => 'none'}
      proposals={proposals}
      renderItem={(proposal) => <span>{proposal.title}</span>}
      viewerUserId="user-sam"
    />
  );
  await expect.element(page.getByRole('list', { name: 'Ideas' })).toBeInTheDocument();
  await expect.element(page.getByText('Add a coast day')).toBeVisible();
});

test('keeps phone records equal in height and opens your draft once', async () => {
  await useViewport(390, 844);
  await renderList();
  const rows = page.getByTestId(testIds.ideaRow).elements();
  expect(rows[0]?.getBoundingClientRect().width).toBeGreaterThan(300);
  expect(rows[0]?.getBoundingClientRect().height).toBe(rows[1]?.getBoundingClientRect().height);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
  await page.getByRole('button', { name: 'Add a museum morning' }).click();
  expect(navigate).toHaveBeenCalledOnce();
});

test('sorts titles and can restore draft priority', async () => {
  await renderList();
  await page.getByLabelText('Sort ideas').click();
  await page.getByRole('option', { name: 'Title A–Z' }).click();
  expect(page.getByTestId(testIds.ideaRow).elements()[0]?.getAttribute('data-idea-name')).toBe(
    'coast-day'
  );
  await page.getByLabelText('Sort ideas').click();
  await page.getByRole('option', { name: 'Default order' }).click();
  expect(page.getByTestId(testIds.ideaRow).elements()[0]?.getAttribute('data-idea-name')).toBe(
    'museum-stop'
  );
});

test('honors custom title activation for a non-draft idea', async () => {
  const onRowActivate = vi.fn();
  await render(
    <IdeaList
      emptyFilterMessage={() => 'No ideas'}
      proposals={proposals}
      onRowActivate={onRowActivate}
      viewerUserId="user-sam"
    />
  );
  await page.getByRole('button', { name: 'Add a coast day' }).click();
  expect(onRowActivate).toHaveBeenCalledWith(proposals[0]);
});
