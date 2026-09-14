import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkspaceIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import { IdeaListView } from './idea-list-view';

const state = vi.hoisted(() => ({
  isLoading: false,
  loadMore: vi.fn(),
  proposals: [] as WorkspaceIdea[],
  status: 'Exhausted' as 'CanLoadMore' | 'Done' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore'
}));

vi.mock('@groam/ui/ai/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { id: 'org-acme', name: 'Acme Labs' },
    session: { user: { id: 'user-alex' } }
  })
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({
    isLoading: false,
    trips: []
  })
}));

vi.mock('@/features/ideas/hooks/use-workspace-ideas', () => ({
  useCreateIdea: () => vi.fn(),
  useViewerOpenIdeas: () => ({
    isLoading: false,
    proposals: state.proposals.filter((proposal) => proposal.status === 'draft')
  }),
  useWorkspaceIdeas: () => ({
    isLoading: state.isLoading,
    loadMore: state.loadMore,
    proposals: state.proposals,
    status: state.status
  })
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.isLoading = false;
  state.proposals = [];
  state.loadMore = vi.fn();
  state.status = 'Exhausted';
});

afterEach(cleanup);

describe('IdeaListView', () => {
  test('shows a labeled loading state while ideas load', () => {
    state.isLoading = true;
    render(<IdeaListView />);
    expect(screen.getByRole('status', { name: 'Loading ideas…' })).toBeTruthy();
  });

  test('invites the group to start an idea when none exist', () => {
    render(<IdeaListView />);
    expect(screen.getByTestId('empty-screen')).toBeTruthy();
    expect(screen.getByText('Start an idea')).toBeTruthy();
    expect(screen.queryByText('Acme Labs')).toBeNull();
    expect(screen.getByTestId('ideas-title')).toBeTruthy();
    expect(screen.getAllByText(/idea until the group reviews/u).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'New idea' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Delete draft' })).toBeNull();
  });

  test('renders workspace ideas with their trip names', () => {
    state.proposals = [
      {
        author: { name: 'Alex Morgan', userId: 'user-alex' },
        ideaName: 'coast-day',
        id: 'idea-1' as WorkspaceIdea['id'],
        reviewRequested: false,
        sourceTripId: 'trip-1' as WorkspaceIdea['sourceTripId'],
        sourceTripName: 'Atlantic week',
        status: 'in_review',
        title: 'Add a coast day',
        updatedAt: Date.UTC(2026, 7, 17),
        workingTripId: 'working-1' as WorkspaceIdea['workingTripId']
      }
    ];
    render(<IdeaListView />);
    expect(screen.queryByText('Acme Labs')).toBeNull();
    expect(screen.getByTestId('ideas-title')).toBeTruthy();
    expect(screen.getByText('Add a coast day')).toBeTruthy();
    expect(screen.getAllByText('Atlantic week')).toHaveLength(2);
    expect(screen.getByText('In review')).toBeTruthy();
    expect(screen.queryByText('Coast day')).toBeNull();
    expect(screen.getByRole('link', { name: 'Open' }).getAttribute('href')).toBe(
      '/trips/$tripId/ideas/$proposalId/$view'
    );
    expect(screen.queryByRole('button', { name: 'Delete draft' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close without applying' })).toBeNull();
  });

  test('pins the viewer’s draft to the top of the workspace list', () => {
    state.proposals = [
      {
        author: { name: 'Alex Morgan', userId: 'user-alex' },
        ideaName: 'coast-day',
        id: 'idea-review' as WorkspaceIdea['id'],
        reviewRequested: false,
        sourceTripId: 'trip-1' as WorkspaceIdea['sourceTripId'],
        sourceTripName: 'Atlantic week',
        status: 'in_review',
        title: 'Add a coast day',
        updatedAt: Date.UTC(2026, 7, 18),
        workingTripId: 'working-2' as WorkspaceIdea['workingTripId']
      },
      {
        author: { name: 'Alex Morgan', userId: 'user-alex' },
        ideaName: 'extra-night',
        id: 'idea-1' as WorkspaceIdea['id'],
        reviewRequested: false,
        sourceTripId: 'trip-1' as WorkspaceIdea['sourceTripId'],
        sourceTripName: 'Atlantic week',
        status: 'draft',
        title: 'Extend the stay',
        updatedAt: Date.UTC(2026, 7, 17),
        workingTripId: 'working-1' as WorkspaceIdea['workingTripId']
      }
    ];
    render(<IdeaListView />);
    expect(screen.queryByLabelText('Your pending idea')).toBeNull();
    expect(screen.getByText('Your draft')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue editing' })).toBeTruthy();
    expect(screen.getByTestId('idea-continue')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete draft' })).toBeNull();
    const titles = screen
      .getAllByRole('heading', { level: 4 })
      .map((heading) => heading.textContent);
    expect(titles[0]).toBe('Extend the stay');
    expect(document.querySelector('[data-viewer-draft="true"]')?.className).toContain(
      'bg-primary/5'
    );
  });
});
