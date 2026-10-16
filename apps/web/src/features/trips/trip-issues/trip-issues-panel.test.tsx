import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
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

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
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

describe('TripIssuesPanel', () => {
  test('shows a loading state while issues are unresolved', async () => {
    issues.issues = undefined;
    await render(<TripIssuesPanel trip={trip()} />);

    await expect.element(page.getByRole('status', { name: 'Loading issues…' })).toBeInTheDocument();
  });

  test('renders the issues header when the list is empty', async () => {
    await render(<TripIssuesPanel trip={trip()} />);

    await expect.element(page.getByRole('heading', { name: 'Issues' })).toBeInTheDocument();
    await expect
      .element(page.getByText('There are no open issues in this trip.'))
      .toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'All issues' })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'New issue' })).toBeInTheDocument();
  });

  test('opens a trip-scoped create-issue dialog from New issue', async () => {
    await render(<TripIssuesPanel trip={trip()} />);

    await page.getByRole('button', { name: 'New issue' }).click();

    await expect.element(page.getByTestId('create-issue-dialog')).toHaveTextContent(tripId);
  });
});
