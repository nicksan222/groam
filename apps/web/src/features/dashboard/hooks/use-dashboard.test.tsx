import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useDashboard } from './use-dashboard';

const trips = vi.hoisted(() => ({
  useTrips: vi.fn(),
  useWorkspaceTripProposals: vi.fn()
}));
const workspace = vi.hoisted(() => ({
  useWorkspace: vi.fn()
}));
const agent = vi.hoisted(() => ({
  useSetAgentContext: vi.fn()
}));

vi.mock('@/features/trips/hooks/use-trips', () => trips);
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => workspace);
vi.mock('@groam/ui/ai/context/agent-context', () => agent);

beforeEach(() => {
  vi.clearAllMocks();
  workspace.useWorkspace.mockReturnValue({
    activeOrganization: { name: 'Groam Demo', members: [] },
    session: { user: { id: 'user-1' } }
  });
  trips.useTrips.mockReturnValue({ isLoading: false, trips: [] });
  trips.useWorkspaceTripProposals.mockReturnValue({ isLoading: false, proposals: [] });
});

describe('useDashboard', () => {
  test('presents the empty home action when there is no trip data', () => {
    const { result } = renderHook(() => useDashboard());
    expect(result.current.presentation).toEqual({ kind: 'empty' });
    expect(result.current.homeAction).toEqual({ text: 'Create a trip', to: '/trips' });
    expect(agent.useSetAgentContext).toHaveBeenCalled();
  });

  test('points next decision at the first waiting proposal', () => {
    trips.useTrips.mockReturnValue({
      isLoading: false,
      trips: [
        {
          archivedAt: null,
          id: 'trip-1',
          name: 'Portugal',
          outstandingActionCount: 0
        }
      ]
    });
    trips.useWorkspaceTripProposals.mockReturnValue({
      isLoading: false,
      proposals: [
        {
          author: { name: 'Ada', userId: 'user-2' },
          id: 'proposal-1',
          reviewRequested: true,
          status: 'in_review',
          title: 'Coast day'
        }
      ]
    });

    const { result } = renderHook(() => useDashboard());
    expect(result.current.presentation.kind).toBe('ready');
    expect(result.current.homeAction).toEqual({
      params: { proposalId: 'proposal-1' },
      text: 'Next decision',
      to: '/ideas/$proposalId'
    });
  });
});
