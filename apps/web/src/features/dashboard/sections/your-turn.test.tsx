import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { TripsTurn, TurnItem } from '@/types/dashboard';
import { YourTurn } from './your-turn';

vi.mock('@/lib/navigation/router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'user-alex' } } })
}));

const issue = {
  dueAt: null,
  id: 'issue-1',
  kind: 'issue',
  mandatory: false,
  status: 'open',
  title: 'Book flights',
  tripId: 'trip-1',
  tripName: 'Lisbon getaway',
  tripShortId: 'lis123',
  updatedAt: 1
} as unknown as TurnItem;
const idea = {
  authorUserId: 'user-alex',
  dueAt: null,
  id: 'idea-1',
  kind: 'idea',
  status: 'draft',
  title: 'Add a coast day',
  tripId: 'trip-1',
  tripName: 'Lisbon getaway',
  tripShortId: 'lis123',
  updatedAt: 1,
  workingTripId: 'work-1'
} as unknown as TurnItem;
const poll = {
  dueAt: null,
  id: 'poll-1',
  kind: 'poll',
  title: 'Where should we eat?',
  tripId: 'trip-1',
  tripName: 'Lisbon getaway',
  tripShortId: 'lis123',
  updatedAt: 1
} as unknown as TurnItem;

function turnOf(items: TurnItem[], overrides: Partial<TripsTurn> = {}) {
  return {
    checked: 1,
    items,
    total: items.length,
    trips: [],
    truncated: false,
    ...overrides
  } as unknown as TripsTurn;
}

describe('YourTurn', () => {
  test('holds a placeholder while it loads, not an empty message', async () => {
    await render(<YourTurn turn={undefined} />);
    await expect
      .element(page.getByRole('status', { name: 'Loading what is waiting on you…' }))
      .toBeVisible();
    await expect.element(page.getByText('Nothing is waiting on you.')).not.toBeInTheDocument();
  });

  test('says so quietly when nothing is waiting', async () => {
    await render(<YourTurn turn={turnOf([])} />);
    await expect.element(page.getByText('Nothing is waiting on you.')).toBeVisible();
  });

  test('leaves the page when it could not be read', async () => {
    await render(<YourTurn turn={null} />);
    await expect.element(page.getByText('Your turn')).not.toBeInTheDocument();
    await expect.element(page.getByText('Nothing is waiting on you.')).not.toBeInTheDocument();
  });

  test('lists each item with its trip, kind, status and a link to where it is settled', async () => {
    await render(<YourTurn turn={turnOf([issue, idea, poll])} />);
    const rows = page.getByTestId(testIds.homeTurnRow);
    expect(rows.elements()).toHaveLength(3);
    await expect
      .element(page.getByRole('link', { name: 'Book flights' }))
      .toHaveAttribute('href', '/issues/issue-1');
    await expect
      .element(page.getByRole('link', { name: 'Add a coast day' }))
      .toHaveAttribute('href', '/trips/lis123/ideas/idea-1/overview');
    await expect
      .element(page.getByRole('link', { name: 'Where should we eat?' }))
      .toHaveAttribute('href', '/trips/lis123/polls');
    await expect.element(page.getByText('Your draft')).toBeVisible();
    await expect.element(page.getByText('Voting')).toBeVisible();
    expect(page.getByText('Lisbon getaway').elements()).toHaveLength(3);
  });

  test('shows a due date on a dated item', async () => {
    await render(
      <YourTurn turn={turnOf([{ ...issue, dueAt: Date.now() + 5 * 86_400_000 } as TurnItem])} />
    );
    await expect.element(page.getByText(/Decide by/u)).toBeVisible();
  });

  test('lists five rows, then toggles every loaded one open and closed', async () => {
    const items = Array.from({ length: 7 }, (_, index) => ({
      ...issue,
      id: `issue-${index}`,
      title: `Chore ${index}`
    })) as TurnItem[];
    await render(<YourTurn turn={turnOf(items)} />);
    expect(page.getByTestId(testIds.homeTurnRow).elements()).toHaveLength(5);
    await expect.element(page.getByText('Chore 5')).not.toBeInTheDocument();

    await page.getByRole('button', { name: 'Show all 7' }).click();
    expect(page.getByTestId(testIds.homeTurnRow).elements()).toHaveLength(7);
    await expect.element(page.getByText('Chore 6')).toBeVisible();

    await page.getByRole('button', { name: 'Show fewer' }).click();
    expect(page.getByTestId(testIds.homeTurnRow).elements()).toHaveLength(5);
  });

  test('offers no toggle for five rows or fewer', async () => {
    await render(<YourTurn turn={turnOf([issue, idea, poll])} />);
    await expect.element(page.getByTestId(testIds.homeTurnToggle)).not.toBeInTheDocument();
  });

  test('ends with one quiet note for what the query did not return', async () => {
    await render(<YourTurn turn={turnOf([issue], { total: 4 })} />);
    await expect
      .poll(() => page.getByTestId(testIds.homeTurnNote).element().textContent)
      .toBe('3 more in other trips');
  });

  test('puts the toggle and the notes on one footer row, with no em dash', async () => {
    const items = Array.from({ length: 7 }, (_, index) => ({
      ...issue,
      id: `issue-${index}`
    })) as TurnItem[];
    await render(<YourTurn turn={turnOf(items, { checked: 12, total: 25, truncated: true })} />);
    const toggle = page.getByTestId(testIds.homeTurnToggle).element();
    const note = page.getByTestId(testIds.homeTurnNote);
    expect(note.element().parentElement).toBe(toggle.parentElement);
    await expect
      .element(note)
      .toHaveTextContent('18 more in other trips · from your 12 most recent trips');
    expect(note.element().textContent).not.toContain('—');
  });

  test('says only that trips were truncated when every loaded item shows', async () => {
    await render(<YourTurn turn={turnOf([issue], { checked: 12, truncated: true })} />);
    await expect
      .poll(() => page.getByTestId(testIds.homeTurnNote).element().textContent)
      .toBe('from your 12 most recent trips');
  });

  test('says nothing more when everything is loaded', async () => {
    await render(<YourTurn turn={turnOf([issue])} />);
    await expect.element(page.getByTestId(testIds.homeTurnNote)).not.toBeInTheDocument();
  });

  test('does not say nothing is waiting when only some trips were read', async () => {
    await render(<YourTurn turn={turnOf([], { checked: 12, truncated: true })} />);
    await expect
      .element(page.getByText('Nothing waiting in your 12 most recent trips.'))
      .toBeVisible();
    await expect.element(page.getByText('Nothing is waiting on you.')).not.toBeInTheDocument();
  });
});
