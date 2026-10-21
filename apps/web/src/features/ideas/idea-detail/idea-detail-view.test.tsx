import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IdeaDetailView } from './idea-detail-view';

const proposalId = 'proposal-1' as Id<'tripProposals'>;

const state = vi.hoisted(() => ({
  proposal: undefined as null | Record<string, unknown> | undefined,
  trip: null as { id: string; name: string } | null
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  Navigate: ({ to }: { to: string }) => <div>navigate:{to}</div>,
  useNavigate: () => vi.fn()
}));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useQuery: () => state.trip
}));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersion: () => ({
    proposal: state.proposal
  })
}));

vi.mock('@/features/trips/trip-versions/trip-version-detail', () => ({
  TripVersionDetail: ({ proposalId: id }: { proposalId: string }) => <div>Idea detail {id}</div>
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.proposal = undefined;
  state.trip = null;
});

describe('IdeaDetailView', () => {
  test('shows a loading state while the idea is unresolved', async () => {
    await render(<IdeaDetailView proposalId={proposalId} />);
    await expect.element(page.getByRole('status', { name: 'Loading idea…' })).toBeInTheDocument();
  });

  test('shows a not-found state when the idea is missing', async () => {
    state.proposal = null;
    await render(<IdeaDetailView proposalId={proposalId} />);
    await expect.element(page.getByText('Idea not found')).toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'Back to ideas' })).toBeInTheDocument();
  });

  test('redirects a found idea to the nested clone', async () => {
    state.proposal = {
      id: proposalId,
      ideaName: 'coast-day',
      sourceTripId: 'trip-1',
      status: 'in_review',
      title: 'Add a coast day'
    };
    state.trip = { id: 'trip-1', name: 'Atlantic week' };
    await render(<IdeaDetailView proposalId={proposalId} />);

    await expect
      .element(page.getByText('navigate:/trips/$tripId/ideas/$proposalId/$view'))
      .toBeInTheDocument();
  });
});
