import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { CommandPalette } from './command-palette';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({ trips: [] })
}));

vi.mock('@/features/ideas/hooks/use-workspace-ideas', () => ({
  useWorkspaceIdeas: () => ({
    proposals: [
      {
        id: 'idea-1',
        sourceTripId: 'trip-coast',
        sourceTripName: 'Summer trip',
        title: 'Coast day'
      }
    ]
  })
}));

vi.mock('@/features/issues/hooks/use-workspace-issues', () => ({
  useWorkspaceIssues: () => ({ issues: [] })
}));

vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useDiscussions: () => ({ discussions: [] })
}));

vi.mock('@/features/agents/hooks/use-agent-roster', () => ({
  useAgentRoster: () => ({ agents: [] })
}));

beforeEach(() => {
  navigate.mockReset();
});

afterEach(cleanup);

test('command palette jumps to the nested idea clone', () => {
  render(<CommandPalette />);
  fireEvent.keyDown(window, { key: 'k', metaKey: true });
  fireEvent.click(screen.getByRole('button', { name: /Coast day/u }));
  expect(navigate).toHaveBeenCalledWith({
    params: { proposalId: 'idea-1', tripId: 'trip-coast', view: 'overview' },
    search: {},
    to: '/trips/$tripId/ideas/$proposalId/$view'
  });
});
