import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
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

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
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

describe('TripIdeasPanel', () => {
  test('renders the ideas header and a link to the workspace list', async () => {
    await render(<TripIdeasPanel onStartIdea={vi.fn()} trip={trip()} />);

    await expect.element(page.getByRole('heading', { name: 'Ideas' })).toBeInTheDocument();
    await expect
      .element(page.getByRole('link', { name: 'All ideas' }))
      .toHaveAttribute('href', '/ideas');
    expect(page.getByRole('button', { name: 'New idea' }).elements().length).toBeGreaterThan(0);
    await expect.element(page.getByRole('button', { name: /Open \d+/u })).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: /Settled \d+/u }))
      .not.toBeInTheDocument();
    await expect.element(page.getByText('Open ideas')).not.toBeInTheDocument();
    await expect.element(page.getByText('Need a tweak')).not.toBeInTheDocument();
    await expect.element(page.getByText('Added to trip')).not.toBeInTheDocument();
  });

  test('uses the same search-and-status toolbar as the workspace ideas list', async () => {
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
    await render(<TripIdeasPanel onStartIdea={vi.fn()} trip={trip()} />);

    const toolbar = page.getByLabelText('Filter ideas');
    await expect.element(toolbar).toHaveClass('flex', 'items-center');
    await expect.element(toolbar).not.toHaveClass('dashboard-panel');
    await expect.element(page.getByRole('button', { name: /All \d+/u })).not.toBeInTheDocument();
    await expect.element(page.getByLabelText('Search ideas')).toBeInTheDocument();
    expect(page.getByLabelText('Filter ideas by status').element().textContent).toContain('Open');
    await expect.element(page.getByText('Add a coast day')).toBeInTheDocument();
  });
});
