import type { Id } from '@groam/backend/data-model';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripVersionsPanel } from '@/features/trips/trip-versions/trip-versions-panel';
import {
  WorkspaceContext,
  type WorkspaceContextValue
} from '@/features/workspace/workspace-shell/workspace-state';

const versions = vi.hoisted(() => ({
  createVersion: vi.fn(),
  proposals: [] as
    | Array<{
        author: { name: string; userId: string };
        conflictCount: number;
        feedbackCount: number;
        id: Id<'tripProposals'>;
        ideaName: string;
        issueId: Id<'tripIssues'> | null;
        status: 'closed' | 'conflicted' | 'draft' | 'in_review' | 'merged';
        title: string;
        unresolvedFeedbackCount: number;
        updatedAt: number;
        workingTripId: Id<'trips'>;
      }>
    | undefined
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children?: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn()
}));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersion: vi.fn(),
  useTripVersions: () => ({
    createVersion: versions.createVersion,
    proposals: versions.proposals
  })
}));

const tripId = 'trip-1' as Id<'trips'>;
const proposalId = 'proposal-1' as Id<'tripProposals'>;

function trip(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    permissions: {
      canArchive: false,
      canEdit: true,
      canEditCover: true,
      canPropose: true,
      canRestore: false,
      isReadOnly: false
    },
    id: tripId,
    name: 'Atlantic week',
    role: 'organizer',
    ...overrides
  } as TripDetail;
}

function listProposal(
  overrides: Partial<NonNullable<(typeof versions)['proposals']>[number]> = {}
) {
  return {
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    conflictCount: 0,
    feedbackCount: 0,
    id: proposalId,
    ideaName: 'coast-day',
    issueId: null,
    status: 'in_review' as const,
    title: 'Add a coast day',
    unresolvedFeedbackCount: 0,
    updatedAt: Date.parse('2026-06-01T12:00:00.000Z'),
    workingTripId: 'working-1' as Id<'trips'>,
    ...overrides
  };
}

function renderIdea(ui: ReactNode, viewerName = 'Lea Demo', viewerUserId = 'user-lea') {
  return render(
    <WorkspaceContext.Provider
      value={{ session: { user: { id: viewerUserId, name: viewerName } } } as WorkspaceContextValue}
    >
      {ui}
    </WorkspaceContext.Provider>
  );
}

beforeEach(() => {
  versions.createVersion.mockReset();
  versions.proposals = [];
});

afterEach(cleanup);

describe('TripVersionsPanel', () => {
  test('shows New idea when the trip can start ideas', () => {
    renderIdea(<TripVersionsPanel onStartIdea={vi.fn()} trip={trip()} />);
    expect(screen.getAllByRole('button', { name: 'New idea' }).length).toBeGreaterThan(0);
  });

  test('lists ideas with titles and Open', () => {
    versions.proposals = [listProposal()];
    renderIdea(<TripVersionsPanel onStartIdea={vi.fn()} trip={trip()} />);
    expect(screen.getByText('Add a coast day')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open' })).toBeTruthy();
  });

  test('shows Continue for the viewer’s draft', () => {
    versions.proposals = [
      listProposal({ status: 'draft', author: { name: 'Lea Demo', userId: 'user-lea' } })
    ];
    renderIdea(<TripVersionsPanel onStartIdea={vi.fn()} trip={trip()} />);
    expect(screen.getByRole('button', { name: /Continue/u })).toBeTruthy();
  });

  test('calls onStartIdea from the New idea button', () => {
    const onStartIdea = vi.fn();
    renderIdea(<TripVersionsPanel onStartIdea={onStartIdea} trip={trip()} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'New idea' })[0]!);
    expect(onStartIdea).toHaveBeenCalled();
  });
});
