import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { ResearchSummary } from '@/types/research';
import { LinkedResearches } from './linked-researches';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params,
    to: _to,
    ...props
  }: {
    children?: ReactNode;
    params: { tripId: string; researchId: string };
    to: string;
    className?: string;
    'aria-label'?: string;
  }) => (
    <a {...props} href={`/trips/${params.tripId}/research/${params.researchId}`}>
      {children}
    </a>
  )
}));

const state = vi.hoisted(() => ({
  createAndLink: vi.fn(),
  link: vi.fn(),
  linked: [] as unknown[],
  available: [] as unknown[]
}));

vi.mock('@/features/research/hooks/use-linked-researches', () => ({
  useLinkedResearches: () => ({
    available: state.available,
    isLoading: false,
    linked: state.linked
  })
}));
vi.mock('@/features/research/hooks/use-research-actions', () => ({
  useLinkResearch: () => state.link
}));
vi.mock('@/features/research/hooks/use-create-linked-research', () => ({
  useCreateLinkedResearch: () => state.createAndLink
}));

const tripId = 't1' as Id<'trips'>;
const make = (id: string, title: string): ResearchSummary => ({
  brief: null,
  id,
  lastMessage: null,
  linkCount: 0,
  participantCount: 1,
  shortId: `s-${id}`,
  title,
  unread: false,
  updatedAt: 1
});

beforeEach(() => {
  vi.clearAllMocks();
  state.linked = [make('r1', 'Hotels')];
  state.available = [make('r2', 'Museums')];
  state.createAndLink.mockResolvedValue(true);
});

const view = () =>
  render(<LinkedResearches target={{ id: 'i1', kind: 'issue' }} tripId={tripId} />);

test('opens a linked research page', async () => {
  await view();
  const link = page.getByRole('link', { name: 'Open research: Hotels' });
  await expect.element(link).toBeVisible();
  expect(link.element().getAttribute('href')).toBe('/trips/t1/research/s-r1');
});

test('links an existing research to the target', async () => {
  await view();
  await page.getByRole('button', { name: 'Link research' }).click();
  await page.getByTestId(testIds.linkResearchPick).click();
  expect(state.link).toHaveBeenCalledWith('r2', { id: 'i1', kind: 'issue' });
});

test('new research opens the dialog then creates and links', async () => {
  await view();
  await page.getByTestId(testIds.linkResearchNew).click();
  await page.getByTestId(testIds.createResearchSubject).fill('Trains');
  await page.getByRole('button', { name: 'Start research' }).click();
  await expect.poll(() => state.createAndLink.mock.calls.length).toBe(1);
  expect(state.createAndLink).toHaveBeenCalledWith({ brief: undefined, subject: 'Trains' });
});
