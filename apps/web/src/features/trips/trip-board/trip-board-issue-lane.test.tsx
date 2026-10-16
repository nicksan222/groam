import { DndContext } from '@dnd-kit/core';
import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripBoardContextValue, TripBoardDragItem, TripBoardIssue } from '@/types/trip-board';
import { TripBoardContext } from './trip-board-context';
import { TripBoardDragContext } from './trip-board-drag-state';
import { TripBoardIssueLane } from './trip-board-issue-lane';
vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params = {},
    search,
    to,
    ...rest
  }: {
    children?: ReactNode;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    to: string;
  }) => (
    <a
      {...rest}
      href={
        Object.entries(params).reduce((href, [key, value]) => href.replace(`$${key}`, value), to) +
        (search && Object.keys(search).length > 0
          ? `?${new URLSearchParams(search as Record<string, string>)}`
          : '')
      }
    >
      {children}
    </a>
  )
}));
const context = (over: Partial<TripBoardContextValue> = {}): TripBoardContextValue => ({
  rights: { archived: false, canPropose: true },
  tripId: 'trip-1' as Id<'trips'>,
  viewerUserId: 'user-alex',
  ...over
});

const makeIssue = (id: string, over: Partial<TripBoardIssue> = {}) =>
  ({
    assignee: null,
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    canAssign: true,
    canManage: true,
    condition: null,
    dueAt: null,
    id: id as Id<'tripIssues'>,
    idea: null,
    labels: [],
    rank: 0,
    status: 'open',
    title: id,
    updatedAt: Date.UTC(2026, 7, 17),
    ...over
  }) as unknown as TripBoardIssue;

vi.mock('@/features/issues/hooks/use-issue-mutations', () => ({
  useIssueMutations: () => ({ assign: vi.fn(), setStatus: vi.fn() })
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { members: [] },
    session: { user: { id: 'user-alex', name: 'Alex Traveler' } }
  })
}));

function renderLane({
  archived = false,
  drag,
  issues,
  status = 'open'
}: {
  archived?: boolean;
  drag?: { item: TripBoardDragItem; lane: string };
  issues: TripBoardIssue[] | undefined;
  status?: 'closed' | 'in_progress' | 'open' | 'wont_do';
}) {
  return render(
    <DndContext>
      <TripBoardContext.Provider value={context({ rights: { archived, canPropose: true } })}>
        <TripBoardDragContext.Provider
          value={
            drag
              ? ({
                  item: drag.item,
                  target: { index: 0, lane: drag.lane, unchanged: false }
                } as never)
              : { item: null, target: null }
          }
        >
          <TripBoardIssueLane
            empty="No open issues"
            footer={<span>Lane footer</span>}
            issues={issues}
            meta={<span>Lane meta</span>}
            status={status}
          />
        </TripBoardDragContext.Provider>
      </TripBoardContext.Provider>
    </DndContext>
  );
}

describe('TripBoardIssueLane', () => {
  test('lists each issue with the lane footer and meta', async () => {
    await renderLane({ issues: [makeIssue('Book flights'), makeIssue('Pick hotel')] });
    await expect.element(page.getByRole('link', { name: 'Book flights' })).toBeVisible();
    await expect.element(page.getByRole('link', { name: 'Pick hotel' })).toBeVisible();
    await expect.element(page.getByText('Lane footer')).toBeVisible();
    await expect.element(page.getByText('Lane meta')).toBeVisible();
    await expect.element(page.getByTestId('trip-board-lane')).toHaveAttribute('data-lane', 'open');
  });

  test.each([
    ['loaded as empty', [] as TripBoardIssue[], 'No open issues'],
    ['still loading', undefined, null]
  ])('when %s', async (_, issues, note) => {
    await renderLane({ issues });
    if (note) await expect.element(page.getByText(note)).toBeVisible();
    else await expect.element(page.getByText('No open issues')).not.toBeInTheDocument();
    await expect.element(page.getByTestId('trip-board-draggable')).not.toBeInTheDocument();
  });

  test.each([
    ['a viewer who can manage', { canManage: true }, false, 1],
    ['a viewer who cannot manage but can propose', { canManage: false }, false, 1],
    ['an archived trip', { canManage: true }, true, 0]
  ])('makes cards liftable for %s', async (_, over, archived, liftable) => {
    await renderLane({ archived, issues: [makeIssue('i1', over)] });
    await expect.element(page.getByRole('link', { name: 'i1' })).toBeVisible();
    await expect
      .poll(() => document.querySelectorAll('[data-testid="trip-board-draggable"]').length)
      .toBe(liftable);
  });

  test("uses the quiet container for Won't do", async () => {
    await renderLane({ issues: [makeIssue('i1', { status: 'wont_do' })], status: 'wont_do' });
    await expect.element(page.getByTestId('trip-board-lane')).toHaveClass('border-dashed');
    await expect.element(page.getByTestId('issue-card')).toHaveClass('bg-card/60');
  });

  test('opens a landing slot in place of the empty note while a card hovers it', async () => {
    const item: TripBoardDragItem = {
      archived: false,
      canPropose: true,
      issue: makeIssue('lifted', { status: 'open' }),
      kind: 'issue'
    };
    await renderLane({ drag: { item, lane: 'in_progress' }, issues: [], status: 'in_progress' });
    await expect
      .element(page.getByTestId('trip-board-lane'))
      .toHaveAttribute('data-drop', 'allowed');
    await expect.element(page.getByText('No open issues')).not.toBeInTheDocument();
  });
});
