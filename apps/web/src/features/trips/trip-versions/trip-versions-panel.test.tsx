import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
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

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
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

async function renderIdea(ui: ReactNode, viewerName = 'Lea Demo', viewerUserId = 'user-lea') {
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

describe('TripVersionsPanel', () => {
  test('shows New idea when the trip can start ideas', async () => {
    await renderIdea(<TripVersionsPanel onStartIdea={vi.fn()} trip={trip()} />);
    expect(page.getByRole('button', { name: 'New idea' }).elements().length).toBeGreaterThan(0);
  });

  test('lists ideas with titles and Open', async () => {
    versions.proposals = [listProposal()];
    await renderIdea(<TripVersionsPanel onStartIdea={vi.fn()} trip={trip()} />);
    await expect.element(page.getByText('Add a coast day')).toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'Open' })).toBeInTheDocument();
  });

  test('shows Continue for the viewer’s draft', async () => {
    versions.proposals = [
      listProposal({ status: 'draft', author: { name: 'Lea Demo', userId: 'user-lea' } })
    ];
    await renderIdea(<TripVersionsPanel onStartIdea={vi.fn()} trip={trip()} />);
    await expect.element(page.getByRole('button', { name: /Continue/u })).toBeInTheDocument();
  });

  test('calls onStartIdea from the New idea button', async () => {
    const onStartIdea = vi.fn();
    await renderIdea(<TripVersionsPanel onStartIdea={onStartIdea} trip={trip()} />);
    await page.getByRole('button', { name: 'New idea' }).first().click();
    expect(onStartIdea).toHaveBeenCalled();
  });
});
