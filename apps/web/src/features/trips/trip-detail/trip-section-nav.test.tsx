import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { TripSectionNav } from './trip-section-nav';

const data = vi.hoisted(() => ({
  issues: undefined as Array<{ status: string }> | undefined,
  proposals: undefined as Array<{ author: { userId: string }; status: string }> | undefined
}));

vi.mock('@/features/research/hooks/use-trip-researches', () => ({
  useTripResearches: () => ({ isLoading: false, researches: [] })
}));

vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: () => ({ issues: data.issues })
}));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersions: () => ({ proposals: data.proposals })
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'user-alex' } } })
}));

function tabText(testId: string) {
  return page.getByTestId(testId).element().textContent;
}

const tripId = 'trip-1' as Id<'trips'>;

beforeEach(() => {
  data.issues = [];
  data.proposals = [];
});

test('lists the tabs in order with Board first', async () => {
  await render(<TripSectionNav onOpen={vi.fn()} section="board" tripId={tripId} />);
  const tabs = page.getByRole('navigation', { name: 'Trip sections' }).getByRole('button');
  expect(tabs.elements().map((tab) => tab.getAttribute('data-testid'))).toEqual([
    testIds.tripSectionBoard,
    testIds.tripSectionOverview,
    testIds.tripSectionIssues,
    testIds.tripSectionIdeas,
    testIds.tripSectionPolls,
    testIds.tripSectionResearch,
    testIds.tripSectionActivity
  ]);
  expect(tabs.elements().map((tab) => tab.textContent?.replace(/\s+/gu, ' ').trim())).toEqual([
    'Board',
    'Overview',
    'Issues(0)',
    'Ideas(0)',
    'Polls',
    'Research(0)',
    'Activity'
  ]);
});

test('marks only the current section as active', async () => {
  await render(<TripSectionNav onOpen={vi.fn()} section="ideas" tripId={tripId} />);
  await expect.element(page.getByTestId(testIds.tripSectionIdeas)).toHaveClass('border-primary');
  await expect
    .element(page.getByTestId(testIds.tripSectionBoard))
    .not.toHaveClass('border-primary');
});

test('counts active issues and open ideas', async () => {
  data.issues = [
    { status: 'open' },
    { status: 'in_progress' },
    { status: 'closed' },
    { status: 'wont_do' }
  ];
  data.proposals = [
    { author: { userId: 'user-alex' }, status: 'draft' },
    { author: { userId: 'user-sam' }, status: 'draft' },
    { author: { userId: 'user-sam' }, status: 'in_review' },
    { author: { userId: 'user-sam' }, status: 'merged' }
  ];
  await render(<TripSectionNav onOpen={vi.fn()} section="board" tripId={tripId} />);
  await expect.poll(() => tabText(testIds.tripSectionIssues)).toContain('(2)');
  await expect.poll(() => tabText(testIds.tripSectionIdeas)).toContain('(2)');
});

test('opens a tab on click', async () => {
  const onOpen = vi.fn();
  await render(<TripSectionNav onOpen={onOpen} section="board" tripId={tripId} />);
  await page.getByTestId(testIds.tripSectionActivity).click();
  expect(onOpen).toHaveBeenCalledWith('activity');
});

test('shows disabled tabs with pending counts while loading', async () => {
  await render(<TripSectionNav isLoading section="board" />);
  await expect.element(page.getByTestId(testIds.tripSectionIssues)).toBeDisabled();
  await expect.poll(() => tabText(testIds.tripSectionIssues)).toContain('(…)');
  await expect.element(page.getByTestId(testIds.tripSectionBoard)).toHaveClass('border-primary');
});
