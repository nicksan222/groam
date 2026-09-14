import type { Id } from '@groam/backend/data-model';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { IdeaDetailView } from './idea-detail-view';

const proposalId = 'proposal-1' as Id<'tripProposals'>;

const state = vi.hoisted(() => ({
  proposal: undefined as null | Record<string, unknown> | undefined,
  trip: null as { id: string; name: string } | null
}));

vi.mock('@groam/ui/ai/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  Navigate: ({ to }: { to: string }) => <div>navigate:{to}</div>,
  useNavigate: () => vi.fn()
}));

vi.mock('convex/react', () => ({
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

afterEach(cleanup);

describe('IdeaDetailView', () => {
  test('shows a loading state while the idea is unresolved', () => {
    render(<IdeaDetailView proposalId={proposalId} />);
    expect(screen.getByRole('status', { name: 'Loading idea…' })).toBeTruthy();
  });

  test('shows a not-found state when the idea is missing', () => {
    state.proposal = null;
    render(<IdeaDetailView proposalId={proposalId} />);
    expect(screen.getByText('Idea not found')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to ideas' })).toBeTruthy();
  });

  test('redirects a found idea to the nested clone', () => {
    state.proposal = {
      id: proposalId,
      ideaName: 'coast-day',
      sourceTripId: 'trip-1',
      status: 'in_review',
      title: 'Add a coast day'
    };
    state.trip = { id: 'trip-1', name: 'Atlantic week' };
    render(<IdeaDetailView proposalId={proposalId} />);

    expect(screen.getByText('navigate:/trips/$tripId/ideas/$proposalId/$view')).toBeTruthy();
  });
});
