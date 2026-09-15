import type { Id } from '@groam/backend/data-model';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripIssuesPanel } from '@/features/trips/trip-issues/trip-issues-panel';

const issues = vi.hoisted(() => ({
  createIssue: vi.fn(),
  issues: [] as
    | Array<{
        assignee: null;
        author: { name: string; userId: string };
        id: Id<'tripIssues'>;
        idea: null;
        status: 'closed' | 'open';
        title: string;
        updatedAt: number;
      }>
    | undefined
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn()
}));

vi.mock('@/features/issues/hooks/use-workspace-issues', () => ({
  useCreateIssue: () => vi.fn()
}));

vi.mock('@/features/issues/issue-list/create-issue-dialog', () => ({
  CreateIssueDialog: ({ open, tripId }: { open: boolean; tripId?: Id<'trips'> }) =>
    open ? <div data-testid="create-issue-dialog">{tripId}</div> : null
}));

vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssue: vi.fn(),
  useTripIssues: () => ({
    createIssue: issues.createIssue,
    issues: issues.issues
  })
}));

const tripId = 'trip-1' as Id<'trips'>;

function trip(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    id: tripId,
    name: 'Atlantic week',
    role: 'organizer',
    ...overrides
  } as TripDetail;
}

beforeEach(() => {
  vi.clearAllMocks();
  issues.issues = [];
  issues.createIssue.mockResolvedValue(null);
});

afterEach(cleanup);

describe('TripIssuesPanel', () => {
  test('shows a loading state while issues are unresolved', () => {
    issues.issues = undefined;
    render(<TripIssuesPanel trip={trip()} />);

    expect(screen.getByRole('status', { name: 'Loading issues…' })).toBeTruthy();
  });

  test('renders the issues header when the list is empty', () => {
    render(<TripIssuesPanel trip={trip()} />);

    expect(screen.getByRole('heading', { name: 'Issues' })).toBeTruthy();
    expect(screen.getByText('There are no open issues in this trip.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'All issues' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New issue' })).toBeTruthy();
  });

  test('opens a trip-scoped create-issue dialog from New issue', () => {
    render(<TripIssuesPanel trip={trip()} />);

    fireEvent.click(screen.getByRole('button', { name: 'New issue' }));

    expect(screen.getByTestId('create-issue-dialog').textContent).toBe(tripId);
  });
});
