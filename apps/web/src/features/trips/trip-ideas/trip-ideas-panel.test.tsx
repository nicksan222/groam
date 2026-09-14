import type { Id } from '@groam/backend/data-model';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripIdeasPanel } from '@/features/trips/trip-ideas/trip-ideas-panel';

const versions = vi.hoisted(() => ({
  createVersion: vi.fn(),
  proposals: [] as
    | Array<{
        author: { name: string; userId: string };
        conflictCount: number;
        feedbackCount: number;
        id: Id<'tripProposals'>;
        ideaName: string;
        issueId: null;
        status: 'closed' | 'conflicted' | 'draft' | 'in_review' | 'merged';
        title: string;
        unresolvedFeedbackCount: number;
        updatedAt: number;
        workingTripId: Id<'trips'>;
      }>
    | undefined
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn()
}));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersion: vi.fn(),
  useTripVersions: () => ({
    createVersion: versions.createVersion,
    proposals: versions.proposals
  })
}));

vi.mock('@/features/trips/trip-ideas/create-trip-idea-dialog', () => ({
  CreateTripIdeaDialog: () => null
}));

const tripId = 'trip-1' as Id<'trips'>;

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

beforeEach(() => {
  vi.clearAllMocks();
  versions.proposals = [];
  versions.createVersion.mockResolvedValue(null);
});

afterEach(cleanup);

describe('TripIdeasPanel', () => {
  test('renders the ideas header and a link to the workspace list', () => {
    render(<TripIdeasPanel onStartIdea={vi.fn()} trip={trip()} />);

    expect(screen.getByRole('heading', { name: 'Ideas' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'All ideas' }).getAttribute('href')).toBe('/ideas');
    expect(screen.getAllByRole('button', { name: 'New idea' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Open \d+/u })).toBeNull();
    expect(screen.queryByRole('button', { name: /Settled \d+/u })).toBeNull();
    expect(screen.queryByText('Open ideas')).toBeNull();
    expect(screen.queryByText('Need a tweak')).toBeNull();
    expect(screen.queryByText('Added to trip')).toBeNull();
  });

  test('uses the same search-and-status toolbar as the workspace ideas list', () => {
    versions.proposals = [
      {
        author: { name: 'Alex Morgan', userId: 'user-alex' },
        conflictCount: 0,
        feedbackCount: 0,
        id: 'proposal-1' as Id<'tripProposals'>,
        ideaName: 'coast-day',
        issueId: null,
        status: 'in_review',
        title: 'Add a coast day',
        unresolvedFeedbackCount: 0,
        updatedAt: Date.UTC(2026, 7, 17),
        workingTripId: 'working-1' as Id<'trips'>
      }
    ];
    render(<TripIdeasPanel onStartIdea={vi.fn()} trip={trip()} />);

    const toolbar = document.querySelector('[aria-label="Filter ideas"]');
    expect(toolbar?.className).toContain('flex');
    expect(toolbar?.className).toContain('items-center');
    expect(toolbar?.className).not.toContain('dashboard-panel');
    expect(screen.queryByRole('button', { name: /All \d+/u })).toBeNull();
    expect(screen.getByLabelText('Search ideas')).toBeTruthy();
    expect(screen.getByLabelText('Filter ideas by status').textContent).toContain('Open');
    expect(screen.getByText('Add a coast day')).toBeTruthy();
  });
});
