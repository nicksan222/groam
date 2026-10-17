import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { ResearchSummary } from '@/types/research';
import { ResearchListView } from './research-list-view';

const state = vi.hoisted(() => ({
  createResearch: vi.fn(),
  isLoading: false,
  navigate: vi.fn(),
  researches: [] as unknown[]
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => state.navigate }));
vi.mock('@/features/research/hooks/use-trip-researches', () => ({
  useTripResearches: () => ({ isLoading: state.isLoading, researches: state.researches })
}));
vi.mock('@/features/research/hooks/use-research-actions', () => ({
  useCreateResearch: () => state.createResearch
}));

const tripId = 'trip-1' as Id<'trips'>;
const research: ResearchSummary = {
  brief: 'Compare hotels',
  id: 'r1',
  lastMessage: null,
  linkCount: 0,
  participantCount: 1,
  shortId: 'rs1',
  title: 'Hotels in Rome',
  unread: false,
  updatedAt: 1
};

beforeEach(() => {
  vi.clearAllMocks();
  state.isLoading = false;
  state.researches = [];
  state.createResearch.mockResolvedValue('r2');
});

test('shows a labeled loading state', async () => {
  state.isLoading = true;
  await render(<ResearchListView tripId={tripId} />);
  await expect.element(page.getByRole('status', { name: 'Loading researches…' })).toBeVisible();
});

test('shows the empty state', async () => {
  await render(<ResearchListView tripId={tripId} />);
  await expect.element(page.getByText('No research yet')).toBeVisible();
});

test('opens a research by its short id', async () => {
  state.researches = [research];
  await render(<ResearchListView tripId={tripId} />);
  await page.getByText('Hotels in Rome').click();
  expect(state.navigate).toHaveBeenCalledWith({
    params: { researchId: 'rs1', tripId },
    to: '/trips/$tripId/research/$researchId'
  });
});

test('creates a research and opens it', async () => {
  await render(<ResearchListView tripId={tripId} />);
  await page.getByTestId(testIds.researchCreate).click();
  await page.getByTestId(testIds.createResearchSubject).fill('Museums');
  await page.getByRole('button', { name: 'Start research' }).click();
  await expect.poll(() => state.createResearch.mock.calls.length).toBe(1);
  expect(state.createResearch).toHaveBeenCalledWith({ brief: undefined, subject: 'Museums' });
  await expect
    .poll(() => state.navigate.mock.calls[0]?.[0])
    .toEqual({ params: { researchId: 'r2', tripId }, to: '/trips/$tripId/research/$researchId' });
});
